from typing import List
from sqlalchemy import delete, update, extract, select, or_, func, case, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, with_loader_criteria
from broker import broker
from models import (
    AssetOptimizationParameter,
    Asset,
    AssetFile,
    Organization,
    User,
    UserOrganization,
    PdfInvoice,
    Settlement,
    SummaryStatement,
)
from utils import (
    Res,
    audit_logs,
    compare_and_build_sectioned_audit_payload,
    build_sectioned_audit_payload,
    FileStorageManager,
    paginate,
)
from redis.asyncio import Redis
from python_common.constants.country_list import countries_list
from python_common.constants.enums import Country
from services.organization_service import OrganizationService
import re
from dtos.asset_dto import (
    AssetCreate,
    AssetEdit,
    AssetOptimizationUpdate,
    GenerateMergeFile,
    GenerateOptmizedFile,
    AssetGenerateAnalytics,
)
from constants.enums import (
    AssetStatus,
    AssetSteps,
    AssetType,
    AssetFileType,
    UserRole,
    Platform,
    APDAuditLogScenario as AuditLogScenario,
    APDAuditLogModules as AuditLogModules,
)
from constants.dependency_class import (
    OptimizedDataFrame,
    YearlyOptimizedDataFrame,
    MergedDataFrame,
    YearlyMergedDataFrame,
    IARDataFrame,
)
from constants.defaults import UPLOAD_PATHS
import pandas as pd
from io import BytesIO
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from fastapi import UploadFile, BackgroundTasks
from fastapi.responses import StreamingResponse, Response
import traceback
import os
import math
from pulp import *
from pulp import LpProblem, LpMaximize, LpVariable, lpSum, PULP_CBC_CMD, value
import logging
from utils.template_utils import template_utils
from utils.mail_utils import MailUtils
from config import WEB_APP_URL
import numpy as np
import calendar
from worker.tasks import asset_computation_task, asset_analytics_deletion_task
import time

t1 = time.time()

logger = logging.getLogger(__name__)


class AssetService:
    BASIC_INFORMATION_AUDIT_SECTION = "BASIC INFORMATION"
    BASIC_INFORMATION_AUDIT_FIELD_MAP = {
        "name": "Asset Name",
        "type": "Asset Type",
        "capacity": "Capacity",
        "location": "Location",
        "country": "Country",
        "organization": "Organization Name",
        "status": "Asset Status",
    }

    def _format_asset_audit_value(self, key: str, value):
        if value is None:
            return None

        if key == "type":
            try:
                return AssetType(value).name
            except Exception:
                return value

        if key == "capacity":
            return f"{value} MW"

        if key == "country":
            return countries_list.get(value, {}).get("label", value)

        if key == "organization":
            return value.name if hasattr(value, "name") else value

        if key == "status":
            try:
                return AssetStatus(value).name
            except Exception:
                return value

        return value

    def _build_basic_information_audit_snapshot(
        self,
        *,
        name=None,
        asset_type=None,
        capacity=None,
        location=None,
        country=None,
        organization=None,
        status=None,
    ) -> dict:
        return {
            "name": self._format_asset_audit_value("name", name),
            "type": self._format_asset_audit_value("type", asset_type),
            "capacity": self._format_asset_audit_value("capacity", capacity),
            "location": self._format_asset_audit_value("location", location),
            "country": self._format_asset_audit_value("country", country),
            "organization": self._format_asset_audit_value("organization", organization),
            "status": self._format_asset_audit_value("status", status),
        }

    async def _generate_view_analysis(self, asset_id: int, month: int, year: int):
        await asset_computation_task.kiq(
            asset_id=asset_id,
            month=month,
            year=year,
            dependencies=[
                OptimizedDataFrame.__name__,
                YearlyOptimizedDataFrame.__name__,
            ],
        )

    async def _get_asset_alert_seen_before(
        self,
        user_db: AsyncSession,
        asset: Asset,
        current_user: dict,
    ) -> bool:
        """
        Returns whether the analyst has already seen the post-approval alert.

        The first time an analyst opens their approved asset, this method returns
        False for the current response and persists the seen flag so future
        requests return True.
        """
        if current_user.get("role") != UserRole.ANALYST.value:
            return True

        if asset.submitted_by != current_user.get("id"):
            return True

        if asset.status not in [AssetStatus.ACTIVE.value, AssetStatus.INACTIVE.value]:
            return True

        # re fetching user since we need to update + this will bind the user object to this db session allowing us to edit the changes into it
        user = await user_db.get(User, current_user.get("id"))
        alert_key = "is_asset_alert_seen_before"

        meta_data = dict(user.meta_data or {})
        is_seen_before = bool(meta_data.get(alert_key))

        if not is_seen_before:
            meta_data[alert_key] = True
            user.meta_data = meta_data
            await user_db.commit()
            await user_db.refresh(user)

        return is_seen_before

    def _format_aggregator_report_filename(self, timestamp: any) -> str:
        # Case 1: pandas Timestamp
        if isinstance(timestamp, pd.Timestamp):
            return timestamp.to_pydatetime().isoformat()

        # Case 2: Python datetime
        if isinstance(timestamp, datetime):
            return timestamp.isoformat()

        # Case 3: string
        if isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            return timestamp.isoformat()

        raise TypeError(f"Unsupported type for timestamp: {type(timestamp)}")

    def _get_datetime(self, timestamp: any) -> any:
        dt = None
        if isinstance(timestamp, pd.Timestamp):
            dt = timestamp.to_pydatetime()

        # Case 2: Python datetime
        elif isinstance(timestamp, datetime):
            dt = timestamp

        elif isinstance(timestamp, str):
            timestamp = datetime.strptime(timestamp, "%d-%m-%Y %H:%M")
            dt = timestamp
        else:
            raise TypeError(f"Unsupported type for timestamp: {type(timestamp)}")

        return dt.replace(tzinfo=timezone.utc)

    def _get_audit_module(self, asset) -> AuditLogModules:
        if asset.status in [AssetStatus.ACTIVE.value, AssetStatus.INACTIVE.value]:
            return AuditLogModules.ASSET_MANAGEMENT_AMD
        return AuditLogModules.ASSET_ONBOARDING

    def _get_utc_range(self, year, month):
        start = datetime(year, month, 1, tzinfo=timezone.utc)

        if month == 12:
            end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

        return start, end

    async def start_analysis_computation(
        self,
        db: AsyncSession,
        data: AssetGenerateAnalytics,
        current_user: dict,
        background_tasks: BackgroundTasks,
    ):
        background_tasks.add_task(
            asset_computation_task.kiq,
            asset_id=data.asset_id,
            month=data.month,
            year=data.year,
            dependencies=data.dependencies,
            db=db,
        )

        return Res.success('S-10000')


    async def get_assets(
        self,
        db: AsyncSession,
        current_user: dict,
        page=1,
        limit=10,
        search=None,
        type=None,
        organization=None,
        country=None,
        status=None,
    ):

        query = (
            select(Asset, Organization)
            .outerjoin(Organization, Organization.id == Asset.organization_id)
            .options(selectinload(Asset.files))
            .options(selectinload(Asset.invoices))
            .options(
                with_loader_criteria(
                    PdfInvoice,
                    PdfInvoice.is_deleted.is_(False),
                    include_aliases=True,
                )
            )
        )

        if current_user.get("role") in [UserRole.ANALYST.value, UserRole.MANAGER.value]:
            organization_map_query = await db.execute(
                select(UserOrganization).where(
                    UserOrganization.user_id == current_user.get("id")
                )
            )
            analyst_organization_map = organization_map_query.scalars().first()
            if not analyst_organization_map:
                # return this error code when user is not assigned to any orgnization
                return Res.error("E-10272", http_status_code=403)
            query = query.where(
                Asset.organization_id == analyst_organization_map.organization_id
            )

        if search:
            query = query.where(
                or_(
                    Asset.name.ilike(f"%{search}%"),
                    Asset.asset_id.ilike(f"%{search}%"),
                    Asset.state.ilike(f"%{search}%"),
                )
            )

        if type is not None:
            query = query.where(Asset.type == type)

        if organization:
            query = query.where(Asset.organization_id == organization)

        if country:
            query = query.where(Asset.country_id == country)

        if status is not None:
            query = query.where(Asset.status == status)

        result = await paginate(
            db=db,
            base_query=query,
            page=page,
            limit=limit,
            order_by=[Asset.created_at.desc()],
            scalar=False,
        )

        # Extracting total_assets and records from the pagination result
        total_assets = result.total_results
        if total_assets == 0:
            org_name = "your organization"

            if current_user.get("role") in [UserRole.ANALYST.value, UserRole.MANAGER.value]:
                if analyst_organization_map:
                    org_obj_result = await db.execute(select(Organization).where(Organization.id == analyst_organization_map.organization_id))
                    org_obj = org_obj_result.scalars().first()
                    if org_obj:
                        org_name = org_obj.name
            elif organization:
                org_obj_result = await db.execute(select(Organization).where(Organization.id == organization))
                org_obj = org_obj_result.scalars().first()
                if org_obj:
                    org_name = org_obj.name

            return Res.success(
                "S-10026",
                data={
                    "assets": [],
                    "total_assets": 0,
                    "current_page": page,
                    "total_pages": 0,
                    "organization_name": org_name
                },
            )

        rows = result.records

        assets_list = []
        for asset, org in rows:
            asset_files = asset.files

            # get only merged files
            merged_files = [
                f
                for f in asset_files
                if f.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value
            ]

            # get file count
            file_count = len(merged_files)

            # only treat an IAR as available when the active upload exists
            has_iar = any(
                f.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value and f.is_active
                for f in asset_files
            )

            # invoices
            invoices = asset.invoices

            # override status
            status = asset.status

            # evaluate available months
            available_periods = sorted(
                [
                    {
                        "month": f.month,
                        "year": f.year,
                    }
                    for f in merged_files
                    if f.month and f.year
                ],
                key=lambda x: (x["year"], x["month"]),
                reverse=True,
            )

            available_invoice_periods = sorted(
                [
                    {
                        "month": i.month,
                        "year": i.year,
                    }
                    for i in invoices
                    if i.month and i.year
                ],
                key=lambda x: (x["year"], x["month"]),
                reverse=True,
            )

            assets_list.append(
                {
                    "id": asset.id,
                    "asset_id": asset.asset_id,
                    "name": asset.name,
                    "type": asset.type,
                    "capacity": asset.capacity,
                    "status": status,
                    "organization": {
                        "id": org.id if org else None,
                        "name": org.name if org else None,
                    },
                    "country": {
                        "id": asset.country_id,
                        "name": (
                            countries_list.get(asset.country_id, {}).get("label")
                            if asset.country_id
                            else None
                        ),
                    },
                    "location": asset.state,
                    "analysis_available": file_count > 0,
                    "has_iar": has_iar,
                    "available_periods": available_periods,
                    "available_invoice_periods": available_invoice_periods,
                    "current_step": asset.current_step,
                    "submitted_by": asset.submitted_by,
                    "submitted_at": (
                        asset.submitted_at.isoformat() if asset.submitted_at else None
                    ),
                    "activated_by": asset.activated_by,
                    "activated_at": (
                        asset.activated_at.isoformat() if asset.activated_at else None
                    ),
                    "created_at": (
                        asset.created_at.isoformat() if asset.created_at else None
                    ),
                    "updated_at": (
                        asset.updated_at.isoformat() if asset.updated_at else None
                    ),
                }
            )

        return Res.success(
            "S-10026",
            data={
                "assets": assets_list,
                "total_assets": total_assets,
                "current_page": result.current_page,
                "total_pages": result.total_pages,
            },
        )

    async def reassign_asset(
        self, db: AsyncSession, redis: Redis, asset_id: int, organization_id: int, current_user: dict
    ):

        # CHECK ASSET
        asset_query = await db.execute(
            select(Asset, Organization)
            .outerjoin(Organization, Asset.organization_id == Organization.id)
            .where(Asset.id == asset_id)
        )
        asset, old_organization = asset_query.first()

        if not asset:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        if asset.status == AssetStatus.PENDING_APPROVAL.value:
            return Res.error(
                "E-10139", message="Pending approval asset cannot be reassigned",
                http_status_code=409
            )

        # CHECK ORGANIZATION
        org_query = await db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        organization = org_query.scalar_one_or_none()

        if not organization:
            return Res.error("E-10035", message="Organization not found", http_status_code=404)

        if not organization.status:
            return Res.error("E-10021", message="Organization inactive", http_status_code=409)

        name_check = await db.execute(
            select(Asset).where(
                func.lower(Asset.name) == func.lower(asset.name),
                Asset.organization_id == organization_id,
                Asset.id != asset.id,  # Just in case it's already in the target org
            )
        )
        if name_check.scalar_one_or_none():
            return Res.error(
                "E-10239",
                message=f'This organization already has an asset named "{asset.name}"',
                data={"asset_name": asset.name},
                http_status_code=409,
            )

        # UPDATE
        old_org_name = old_organization.name if old_organization else "Unassigned"
        asset.organization_id = organization_id

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get(
                "user_id"
            ),  # Replace with actual user ID from auth context
            user_role=current_user.get("role"),
            module=self._get_audit_module(asset),
            action=AuditLogScenario.ASSET_REASSIGNED,
            before={"Organization": old_org_name},
            after=f"Organization: {organization.name}",
            resource_id=asset.asset_id,
        )

        await db.commit()
        await db.refresh(asset)

        return Res.success(
            "S-10016",
            data={
                "asset_id": asset.id,
                "organization": {"id": organization.id, "name": organization.name},
            },
        )

    async def assets_users(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        asset_id: str,
        limit: int = 10,
        page: int = 1,
        search: str = None,
        role: int = None,
        status: bool = None,
        sort: str = None,
    ):
        # Convert string to list (handles "AST-001" or "AST-001,AST-002")
        asset_id_list = [id.strip() for id in asset_id.split(",")]

        asset_query = await db.execute(
            select(Asset).where(Asset.asset_id.in_(asset_id_list))
        )
        assets = asset_query.scalars().all()

        if not assets:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        org_ids = list({a.organization_id for a in assets if a.organization_id})

        if not org_ids:
            return Res.error(
                "E-10035", message="Asset not assigned to any organization", http_status_code=409
            )

        org_service = OrganizationService()
        return await org_service.get_organization_users(
            db=db,
            user_db=user_db,
            org_id=org_ids,
            page=page,
            limit=limit,
            search=search,
            role=role,
            status=status,
            sort=sort,
        )

    async def multiple_assets_users(
        self,
        db: AsyncSession,
        user_db: AsyncSession,
        assets_id: List[int],
        search: str = None,
        current_user: dict = None,
    ):
        asset_query = await db.execute(select(Asset).where(Asset.id.in_(assets_id)))
        assets = asset_query.scalars().all()

        if not assets:
            return Res.error("E-10014", message="Asset not found", http_status_code=404)

        org_ids = list({a.organization_id for a in assets if a.organization_id})

        if not org_ids:
            return Res.error(
                "E-10014", message="Asset not assigned to any organization", http_status_code=409
            )

        org_service = OrganizationService()
        return await org_service.get_multiple_organization_users(
            db=db,
            user_db=user_db,
            org_ids=org_ids,
            search=search,
            current_user=current_user,
        )

    async def get_asset_details(
        self, db: AsyncSession, redis: Redis, user_db: AsyncSession, asset_id: int, current_user: dict, skip_audit: bool = False
    ):
        # PLATFORM CHECK
        if Platform.AMD.value not in current_user["platform"]:
            return Res.error(
                "E-10013", message="You are not authorized to perform this action", http_status_code=403
            )

        # Asset Query
        asset_query = (
            select(Asset, Organization, AssetOptimizationParameter)
            .outerjoin(Organization, Organization.id == Asset.organization_id)
            .outerjoin(
                AssetOptimizationParameter,
                AssetOptimizationParameter.asset_id == Asset.id,
            )
            .where(Asset.id == asset_id)
        )

        result = await db.execute(asset_query)
        row = result.first()

        if not row:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        asset, org, opt = row

        if current_user.get("role") in [UserRole.ANALYST.value, UserRole.MANAGER.value]:
            organization_map_query = await db.execute(
                select(UserOrganization).where(
                    UserOrganization.user_id == current_user.get("id")
                )
            )
            analyst_organization_map = organization_map_query.scalars().first()
            if asset.organization_id != analyst_organization_map.organization_id:
                return Res.error(
                    "E-10013", message="You are not authorized to access this asset", http_status_code=403
                )

        # Audit Logs for Asset View
        if not skip_audit and asset.status in [AssetStatus.DRAFT.value, AssetStatus.ANALYSIS_READY.value]:
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=AuditLogModules.ASSET_ONBOARDING,
                action=AuditLogScenario.VIEWED_ASSET_BASIC_INFORMATION,
                before=None,
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Viewed Section": "Basic Information",
                    "Status": AssetStatus(asset.status).name,
                },
                resource_id=asset.asset_id,
            )
        elif not skip_audit and asset.status == AssetStatus.PENDING_APPROVAL.value:
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.VIEWED_PENDING_APPROVAL_ASSET,
                before=None,
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Status": AssetStatus(asset.status).name,
                },
                resource_id=asset.asset_id,
            )
        elif not skip_audit and asset.status in [AssetStatus.ACTIVE.value, AssetStatus.INACTIVE.value]:
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.VIEWED_ACTIVE_ASSET,
                before=None,
                after={
                    "Asset ID": asset.asset_id,
                    "Asset Name": asset.name,
                    "Status": AssetStatus(asset.status).name,
                },
                resource_id=asset.asset_id,
            )

        async def resolve_asset_users(key: str):
            user_id = getattr(asset, key)
            if user_id:
                asset_user = await user_db.get(User, user_id)
                if asset_user:
                    return {
                        "id": asset_user.id,
                        "name": asset_user.name,
                    }
            return None

        created_by = await resolve_asset_users("created_by")
        approved_by = await resolve_asset_users("activated_by")
        submited_by = await resolve_asset_users("submitted_by")
        is_asset_alert_seen_before = await self._get_asset_alert_seen_before(
            user_db, asset, current_user
        )

        # Get Target Month Year Period
        if asset.active_month and asset.active_year:
            target_month = asset.active_month
            target_year = asset.active_year
        else:
            latest_period_query = (
                select(
                    AssetFile.year.label("year"),
                    AssetFile.month.label("month"),
                )
                .where(AssetFile.asset_id == asset_id)
                .order_by(
                    desc(AssetFile.year),
                    desc(AssetFile.month),
                )
                .limit(1)
            )

            result = await db.execute(latest_period_query)
            latest = result.first()

            target_year = int(latest.year) if latest else None
            target_month = int(latest.month) if latest else None

        # Files Query
        files_query = select(AssetFile).where(
            AssetFile.asset_id == asset_id,
            AssetFile.type != AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
        )

        # keep the month query
        if target_month:
            files_query = files_query.where(AssetFile.month == target_month)

        if target_year:
            files_query = files_query.where(AssetFile.year == target_year)
        # Remove the if condition that filters by month/year

        files_query = files_query.order_by(
            desc(AssetFile.year),  # Order by year first
            desc(AssetFile.month),  # Then by month
            desc(AssetFile.uploaded_at),  # Then by upload date
        )

        result = await db.execute(files_query)
        files = result.scalars().all()

        files_map = {}

        for f in files:
            # Keep only the most recent file for each type
            if f.type not in files_map:
                files_map[f.type] = f
            else:
                # If we already have a file of this type, compare dates
                existing = files_map[f.type]
                # Check if this file is more recent
                if (f.year, f.month) > (existing.year, existing.month):
                    files_map[f.type] = f
                elif (f.year, f.month) == (existing.year, existing.month):
                    # Same period, keep the one with later upload
                    if f.uploaded_at > existing.uploaded_at:
                        files_map[f.type] = f

        # IAR File
        iar_query = (
            select(AssetFile)
            .where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                AssetFile.is_active.is_(True),
            )
            .order_by(AssetFile.uploaded_at.desc())
            .limit(1)
        )

        result = await db.execute(iar_query)
        iar_file = result.scalar_one_or_none()

        # =========== Invoice File Query ===========
        invoice_query = select(PdfInvoice).where(
            PdfInvoice.asset_id == asset_id,
            PdfInvoice.is_deleted.is_(False),
        )

        if asset.active_invoice_month:
            invoice_query = invoice_query.where(
                PdfInvoice.month == asset.active_invoice_month
            )

        if asset.active_invoice_year:
            invoice_query = invoice_query.where(
                PdfInvoice.year == asset.active_invoice_year
            )

        invoice_query = invoice_query.order_by(PdfInvoice.uploaded_on.desc()).limit(1)
        invoice_result = await db.execute(invoice_query)
        invoice = invoice_result.scalar_one_or_none()

        # =========== Invoice Settlement File Query ===========
        invoice_settlement_query = select(Settlement).where(
            Settlement.asset_id == asset_id,
            Settlement.is_deleted.is_(False),
        )

        if asset.active_invoice_month:
            invoice_settlement_query = invoice_settlement_query.where(
                Settlement.month == asset.active_invoice_month
            )

        if asset.active_invoice_year:
            invoice_settlement_query = invoice_settlement_query.where(
                Settlement.year == asset.active_invoice_year
            )

        invoice_settlement_query = invoice_settlement_query.order_by(
            Settlement.uploaded_on.desc()
        ).limit(1)
        invoice_settlement_result = await db.execute(invoice_settlement_query)
        invoice_settlement = invoice_settlement_result.scalar_one_or_none()

        # =========== Invoice Summary Statement File Query ===========
        invoice_summary_statement_query = select(SummaryStatement).where(
            SummaryStatement.asset_id == asset_id,
            SummaryStatement.is_deleted.is_(False),
        )
        if asset.active_invoice_month:
            invoice_summary_statement_query = invoice_summary_statement_query.where(
                SummaryStatement.month == asset.active_invoice_month
            )

        if asset.active_invoice_year:
            invoice_summary_statement_query = invoice_summary_statement_query.where(
                SummaryStatement.year == asset.active_invoice_year
            )

        invoice_summary_statement_query = invoice_summary_statement_query.order_by(
            SummaryStatement.uploaded_on.desc()
        ).limit(1)
        invoice_summary_statement_result = await db.execute(
            invoice_summary_statement_query
        )
        invoice_summary_statement = (
            invoice_summary_statement_result.scalar_one_or_none()
        )

        # Fetch Available Periods
        periods_query = (
            select(
                AssetFile.year.label("year"),
                AssetFile.month.label("month"),
            )
            .where(
                AssetFile.asset_id == asset_id,
                AssetFile.type
                == AssetFileType.MERGED_SCADA_AGGREGATOR.value,  # ✅ key change
                AssetFile.month.isnot(None),
                AssetFile.year.isnot(None),
            )
            .distinct()
            .order_by(
                desc(AssetFile.year),
                desc(AssetFile.month),
            )
        )

        periods_query_result = await db.execute(periods_query)
        available_periods = periods_query_result.fetchall()

        # Fetch invoice available periods query
        invoice_periods_query = (
            select(
                PdfInvoice.year.label("year"),
                PdfInvoice.month.label("month"),
            )
            .where(
                PdfInvoice.asset_id == asset_id,
                PdfInvoice.is_deleted.is_(False),
                PdfInvoice.month.isnot(None),
                PdfInvoice.year.isnot(None),
            )
            .distinct()
            .order_by(
                desc(PdfInvoice.year),
                desc(PdfInvoice.month),
            )
        )

        # summary statement available periods query
        summary_statement_periods_query = (
            select(
                SummaryStatement.year.label("year"),
                SummaryStatement.month.label("month"),
            )
            .where(
                SummaryStatement.asset_id == asset_id,
                SummaryStatement.is_deleted.is_(False),
                SummaryStatement.month.isnot(None),
                SummaryStatement.year.isnot(None),
            )
            .distinct()
            .order_by(
                desc(SummaryStatement.year),
                desc(SummaryStatement.month),
            )
        )

        invoice_periods_query_result = await db.execute(invoice_periods_query)
        available_invoice_periods = invoice_periods_query_result.fetchall()

        summary_statement_periods_query_result = await db.execute(
            summary_statement_periods_query
        )
        available_summary_statement_periods = (
            summary_statement_periods_query_result.fetchall()
        )

        def format_report_file(f):
            if not f:
                return None
            return {
                "id": f.id,
                "name": f.name,
                "size": f.size,
                "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                "projection_summary": {
                    "start_timestamp": (
                        f.projection_start_date.isoformat()
                        if f.projection_start_date
                        else None
                    ),
                    "end_timestamp": (
                        f.projection_end_date.isoformat()
                        if f.projection_end_date
                        else None
                    ),
                },
                "total_rows": f.row,
                "month": f.month,
                "year": f.year,
            }

        def format_generated_file(f):
            if not f:
                return None
            return {"id": f.id, "name": f.name, "month": f.month, "year": f.year}

        # Basic details
        data = {
            "id": asset.id,
            "asset_id": asset.asset_id,
            "name": asset.name,
            "type": asset.type,
            "capacity": asset.capacity,
            "status": asset.status,
            "organization": {
                "id": org.id if org else None,
                "name": org.name if org else None,
            },
            "country": {
                "id": asset.country_id,
                "name": countries_list.get(asset.country_id).get("label"),
            },
            "location": asset.state,
            "current_step": (
                getattr(asset, "current_step", None)
                if asset.type != AssetType.SOLAR.value
                else AssetSteps.BASIC_INFORMATION.value
            ),
            "has_iar": bool(iar_file),
            "submitted_by": submited_by,
            "activated_by": approved_by,
            "created_by": created_by,
            "submitted_at": (
                asset.submitted_at.isoformat() if asset.submitted_at else None
            ),
            "activated_at": (
                asset.activated_at.isoformat() if asset.activated_at else None
            ),
            "created_at": asset.created_at.isoformat() if asset.created_at else None,
            "updated_at": asset.updated_at.isoformat() if asset.updated_at else None,
            "is_asset_alert_seen_before": is_asset_alert_seen_before,
        }
        if asset.type != AssetType.SOLAR.value:
            # Optmization Params
            data["max_charging_rate"] = opt.max_charging_rate_mw if opt else None
            data["max_discharging_rate"] = opt.max_discharging_rate_mw if opt else None
            data["usable_capacity"] = opt.usable_capacity_mwh if opt else None
            data["soc_min"] = opt.soc_min_pct if opt else None
            data["soc_max"] = opt.soc_max_pct if opt else None
            data["round_trip_efficiency"] = (
                opt.round_trip_efficiency_pct if opt else None
            )
            data["max_daily_cycles"] = opt.max_daily_cycles if opt else None

            # Files
            data["aggregator_report_file"] = format_report_file(
                files_map.get(AssetFileType.AGGREGATOR_REPORT.value)
            )
            data["scada_report_file"] = format_report_file(
                files_map.get(AssetFileType.SCADA_REPORT.value)
            )
            data["iar_report_file"] = format_report_file(iar_file)
            data["merged_dataset_file"] = format_generated_file(
                files_map.get(AssetFileType.MERGED_SCADA_AGGREGATOR.value)
            )
            data["optimized_dataset_file"] = format_generated_file(
                files_map.get(AssetFileType.OPTIMIZED_DATASET.value)
            )
            data["invoice_file"] = (
                {
                    "id": invoice.id,
                    "invoice_file_name": invoice.invoice_file_name,
                    "invoice_file_size": invoice.size,
                    "type": invoice.type,
                    "invoice_number": invoice.invoice_number,
                    "invoice_date": (
                        invoice.invoice_date.strftime("%d %b %Y")
                        if invoice.invoice_date
                        else None
                    ),
                    "invoice_amount": invoice.invoice_amount,
                    "capacity_payment_month": invoice.capacity_payment_month,
                    "capacity_payment_year": invoice.capacity_payment_year,
                    "uploaded_on": (
                        invoice.uploaded_on.isoformat() if invoice.uploaded_on else None
                    ),
                    "month": invoice.month,
                    "year": invoice.year,
                }
                if invoice
                else None
            )

            data["invoice_settlement_file"] = (
                {
                    "id": invoice_settlement.id,
                    "settlement_file_name": invoice_settlement.file_name,
                    "settlement_file_size": invoice_settlement.file_size,
                    "extracted_invoice_number": invoice_settlement.extracted_invoice_number,
                    "extracted_invoice_date": (
                        invoice_settlement.extracted_invoice_date.strftime("%d %b %Y")
                        if invoice_settlement.extracted_invoice_date
                        else None
                    ),
                    "invoice_payment_date": (
                        invoice_settlement.invoice_payment_date.strftime("%d %b %Y")
                        if invoice_settlement.invoice_payment_date
                        else None
                    ),
                    "uploaded_on": (
                        invoice_settlement.uploaded_on.isoformat()
                        if invoice_settlement.uploaded_on
                        else None
                    ),
                    "month": invoice_settlement.month,
                    "year": invoice_settlement.year,
                }
                if invoice_settlement
                else None
            )

            data["invoice_summary_statement"] = (
                {
                    "id": invoice_summary_statement.id,
                    "summary_id": invoice_summary_statement.statement_id,
                    "file_name": invoice_summary_statement.file_name,
                    "file_size": invoice_summary_statement.file_size,
                    "revenue_values": {
                        "total_energy_revenue": invoice_summary_statement.total_energy_revenue
                        or 0,
                        "total_ancillary_revenue": invoice_summary_statement.total_ancillary_revenue
                        or 0,
                        "reported_net_revenue": invoice_summary_statement.reported_net_revenue
                        or 0,
                    },
                    "uploaded_on": (
                        invoice_summary_statement.uploaded_on.isoformat()
                        if invoice_summary_statement.uploaded_on
                        else None
                    ),
                    "month": invoice_summary_statement.month,
                    "year": invoice_summary_statement.year,
                }
                if invoice_summary_statement
                else None
            )

            # Time-Periods
            data["active_period"] = (
                {
                    "month": int(asset.active_month),
                    "year": int(asset.active_year),
                }
                if asset.active_month is not None and asset.active_year is not None
                else None
            )

            data["invoice_active_period"] = (
                {
                    "month": int(asset.active_invoice_month),
                    "year": int(asset.active_invoice_year),
                }
                if asset.active_invoice_month is not None
                and asset.active_invoice_year is not None
                else None
            )

            data["available_periods"] = (
                [
                    {
                        "month": int(p.month),
                        "year": int(p.year),
                    }
                    for p in available_periods
                ]
                if available_periods is not None
                else []
            )

            data["available_invoice_periods"] = (
                [
                    {
                        "month": int(p.month),
                        "year": int(p.year),
                    }
                    for p in available_invoice_periods
                ]
                if available_invoice_periods is not None
                else []
            )

            data["available_summary_statement_periods"] = (
                [
                    {
                        "month": int(p.month),
                        "year": int(p.year),
                    }
                    for p in available_summary_statement_periods
                ]
                if available_summary_statement_periods is not None
                else []
            )

        return Res.success("S-10026", data=data)

    async def onboard_new_asset(
        self, db: AsyncSession, redis: Redis, payload: AssetCreate, current_user: dict
    ):
        if payload.country_id not in countries_list:
            return Res.error("E-10055", message="Invalid country selected", http_status_code=400)

        org_query = await db.execute(
            select(Organization).where(Organization.id == payload.organization_id)
        )
        organization = org_query.scalar_one_or_none()

        if not organization:
            return Res.error("E-10035", message="Organization not found", http_status_code=404)
        if not organization.status:
            return Res.error("E-10021", message="Organization inactive", http_status_code=409)

        name_check = await db.execute(
            select(Asset).where(
                func.lower(func.trim(Asset.name)) == func.lower(payload.name.strip()),
                Asset.organization_id == payload.organization_id,
            )
        )
        if name_check.scalars().first():
            return Res.error("E-10060", message="Asset name already exists", http_status_code=409)

        new_asset = Asset(
            name=payload.name,
            type=payload.type.value,
            capacity=payload.capacity,
            state=payload.location,
            country_id=payload.country_id,
            organization_id=payload.organization_id,
            status=(
                AssetStatus.ACTIVE.value
                if payload.type == AssetType.SOLAR
                else AssetStatus.DRAFT.value
            ),
            current_step=AssetSteps.BASIC_INFORMATION.value,
            created_by=current_user.get("id"),
        )

        db.add(new_asset)
        await db.flush()
        await db.refresh(new_asset)

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.ASSET_ONBOARDING,
            action=AuditLogScenario.ASSET_ONBOARDED,
            before={
                "Asset Name": "Not Available",
                "Asset Type": "Not Available",
                "Capacity": "Not Available",
                "Location": "Not Available",
                "Country": "Not Available",
                "Organization Name": "Not Available",
                "Asset Status": "Not Created",
            },
            after={
                "Asset Name": new_asset.name,
                "Asset Type": AssetType(new_asset.type).name,
                "Capacity": f"{new_asset.capacity} MW",
                "Location": new_asset.state,
                "Country": countries_list.get(new_asset.country_id, {}).get("label"),
                "Organization Name": organization.name,
                "Asset Status": AssetStatus(new_asset.status).name,
            },
            resource_id=new_asset.asset_id,
        )

        await db.commit()
        await db.refresh(new_asset)

        return Res.success(
            "S-10025",
            data={
                "id": new_asset.id,
                "asset_id": new_asset.asset_id,
                "name": new_asset.name,
                "type": new_asset.type,
                "capacity": new_asset.capacity,
                "location": new_asset.state,
                "country": {
                    "id": new_asset.country_id,
                    "name": countries_list.get(new_asset.country_id).get("label"),
                },
                "organization": {"id": organization.id, "name": organization.name},
                "status": new_asset.status,
                "current_step": max(
                    new_asset.current_step, AssetSteps.BASIC_INFORMATION.value
                ),
                "created_at": new_asset.created_at.isoformat(),
                "updated_at": new_asset.updated_at.isoformat(),
            },
        )

    async def edit_asset(
        self,
        asset_id: int,
        db: AsyncSession,
        redis: Redis,
        payload: AssetEdit,
        current_user: dict,
    ):
        # PLATFORM CHECK
        if Platform.AMD not in current_user["platform"]:
            return Res.error(
                "E-10013", message="You are not authorized to perform this action", http_status_code=403
            )

        payload_fields = payload.model_fields_set
        allowed_fields = {
            "current_step",
            "active_month",
            "active_year",
            "active_invoice_month",
            "active_invoice_year",
        }

        if (
            current_user.get("role") == UserRole.ANALYST.value
            and not payload_fields < allowed_fields
        ):
            return Res.error("E-10013", http_status_code=403)

        # FETCH ASSET
        query = select(Asset).where(Asset.id == asset_id)
        result = await db.execute(query)
        asset = result.scalar_one_or_none()

        # store asset id for audit logs before asset is potentially set to None after update
        asset_id = asset.asset_id if asset else None

        if not asset:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        old_organization = await db.get(Organization, asset.organization_id)
        if payload.type is not None:
            new_type_val = (
                payload.type.value if hasattr(payload.type, "value") else payload.type
            )
            old_type_val = asset.type
            old_status_val = asset.status

            if new_type_val != old_type_val:
                # HARD DELETE FROM DB
                await db.execute(
                    delete(AssetOptimizationParameter).where(
                        AssetOptimizationParameter.asset_id == asset.id
                    )
                )
                asset.current_step = AssetSteps.BASIC_INFORMATION.value

                if new_type_val == AssetType.SOLAR.value:
                    asset.status = AssetStatus.ACTIVE.value
                    audit_after = "Asset type changed to Solar. Data purged. Status set to ACTIVE."
                else:
                    asset.status = AssetStatus.DRAFT.value
                    audit_after = f"Asset type changed from Solar. Status set to DRAFT."

                # LOG THE PURGE
                await audit_logs(
                    db=db,
                    redis=redis,
                    user_id=current_user.get("user_id"),
                    user_role=current_user.get("role"),
                    module=self._get_audit_module(asset),
                    action=AuditLogScenario.ASSET_UPDATED,
                    before=build_sectioned_audit_payload(
                        self.BASIC_INFORMATION_AUDIT_SECTION,
                        {
                            "Asset Type": self._format_asset_audit_value(
                                "type", old_type_val
                            ),
                            "Asset Status": self._format_asset_audit_value(
                                "status", old_status_val
                            ),
                        },
                    ),
                    after=build_sectioned_audit_payload(
                        self.BASIC_INFORMATION_AUDIT_SECTION,
                        {
                            "Asset Type": self._format_asset_audit_value(
                                "type", new_type_val
                            ),
                            "Asset Status": self._format_asset_audit_value(
                                "status", asset.status
                            ),
                            "Reset Reason": audit_after,
                        },
                    ),
                    resource_id=asset_id,
                )

        # CHECK ORGANIZATION STATUS
        with db.no_autoflush:
            org_id = payload.organization_id or asset.organization_id
            if org_id:
                org_query = await db.execute(
                    select(Organization).where(Organization.id == org_id)
                )
                organization = org_query.scalar_one_or_none()
                if not organization:
                    return Res.error("E-10035", message="Organization not found", http_status_code=404)
                if not organization.status:
                    return Res.error(
                        "E-10021",
                        message="This Organization is not active, Please select a diff organization",
                        http_status_code=409,
                    )

            # UNIQUENESS CHECK (NAME + ORGANIZATION REASSIGNMENT) ---
            if (payload.name and payload.name != asset.name) or (
                payload.organization_id
                and payload.organization_id != asset.organization_id
            ):
                check_name = payload.name or asset.name
                check_org_id = payload.organization_id or asset.organization_id

                name_check = await db.execute(
                    select(Asset).where(
                        func.lower(func.trim(Asset.name))
                        == func.lower(check_name.strip()),
                        Asset.organization_id == check_org_id,
                        Asset.id != asset.id,
                    )
                )
                if name_check.scalars().first():
                    return Res.error(
                        "E-10125",
                        message=f"This organization already has an asset named {check_name}.",
                        data={"asset_name": check_name},
                        http_status_code=409,
                    )
        asset_before_snapshot = self._build_basic_information_audit_snapshot(
            name=asset.name,
            asset_type=asset.type,
            capacity=asset.capacity,
            location=asset.state,
            country=asset.country_id,
            organization=old_organization,
            status=asset.status,
        )

        # UPDATE FIELDS
        fields_map = {
            "name": ("name", "Name"),
            "type": ("type", "Type"),
            "capacity": ("capacity", "Capacity"),
            "location": ("state", "Location"),
            "country_id": ("country_id", "Country ID"),
            "organization_id": ("organization_id", "Organization ID"),
            "current_step": ("current_step", "Current Step"),
            "status": ("status", "Status"),
            "active_month": ("active_month", "Active Month"),
            "active_year": ("active_year", "Active Year"),
            "active_invoice_month": ("active_invoice_month", "Invoice Active Year"),
            "active_invoice_year": ("active_invoice_year", "Invoice Active Year"),
        }

        for payload_field, (model_attr, label) in fields_map.items():
            new_val = getattr(payload, payload_field)
            if new_val is not None:
                if payload_field == "country_id" and new_val not in countries_list:
                    return Res.error("E-10055", message="Invalid country selected", http_status_code=400)

                if payload_field == "status" and asset.status in [
                    AssetStatus.ACTIVE.value,
                    AssetStatus.INACTIVE.value,
                ]:
                    new_val = (
                        AssetStatus.ACTIVE.value
                        if new_val
                        else AssetStatus.INACTIVE.value
                    )

                old_val = getattr(asset, model_attr)
                # INFO: for enum vlues
                final_val = new_val.value if hasattr(new_val, "value") else new_val

                if final_val != old_val:
                    setattr(asset, model_attr, final_val)

        asset_after_snapshot = self._build_basic_information_audit_snapshot(
            name=asset.name,
            asset_type=asset.type,
            capacity=asset.capacity,
            location=asset.state,
            country=asset.country_id,
            organization=organization if "organization" in locals() and organization else asset.organization_id,
            status=asset.status,
        )
        before_audit_payload, after_audit_payload = (
            compare_and_build_sectioned_audit_payload(
                self.BASIC_INFORMATION_AUDIT_SECTION,
                asset_before_snapshot,
                asset_after_snapshot,
                field_map=self.BASIC_INFORMATION_AUDIT_FIELD_MAP,
            )
        )

        if before_audit_payload:
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.ASSET_UPDATED,
                before=before_audit_payload,
                after=after_audit_payload,
                resource_id=asset_id,
            )

        # Check if only status is updated
        only_status_updated = False

        serialized_payload = payload.model_dump()
        serialized_payload = {
            k: v for k, v in serialized_payload.items() if v is not None
        }  # filter key, value with non null values
        serialized_payload_keys = list(serialized_payload.keys())

        if (
            len(serialized_payload_keys) == 1 and serialized_payload_keys[0] == "status"
        ):  # check only status is passed in payload
            only_status_updated = True

        data = {
            "id": asset.id,
            "asset_id": asset_id,
            "name": asset.name,
            "type": asset.type,
            "capacity": asset.capacity,
            "location": asset.state,
            "country": {
                "id": asset.country_id,
                "name": countries_list.get(asset.country_id).get("label"),
            },
            "organization": {"id": organization.id, "name": organization.name},
            "status": asset.status,
            "active_period": {
                "month": asset.active_month,
                "year": asset.active_year,
            },
            "invoice_active_period": {
                "month": asset.active_invoice_month,
                "year": asset.active_invoice_year,
            },
            "current_step": asset.current_step,
            "created_at": asset.created_at.isoformat(),
            "updated_at": asset.updated_at.isoformat(),
        }

        await db.commit()
        await db.refresh(asset)

        # return diff code for only activating/deactivating asset
        if only_status_updated:
            return Res.success("S-10048" if payload.status else "S-10049", data=data)

        return Res.success(
            "S-10028",
            data=data,
        )

    async def save_optimization_parameters(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        payload: AssetOptimizationUpdate,
        current_user: dict,
    ):
        asset_query = await db.execute(select(Asset).where(Asset.id == asset_id))
        asset = asset_query.scalar_one_or_none()

        if not asset:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        if asset.type == AssetType.SOLAR.value:
            return Res.error(
                "E-10079",
                message="Optimization parameters are only applicable for BESS or Solar+BESS assets.",
                http_status_code=422,
            )

        # Calculate Power Asymmetry Ratio
        asymmetry_ratio = (
            payload.max_discharging_rate / payload.max_charging_rate
        ) * 100

        stmt = select(AssetOptimizationParameter).where(
            AssetOptimizationParameter.asset_id == asset_id
        )
        result = await db.execute(stmt)
        opt_params = result.scalar_one_or_none()

        if opt_params:
            old_values = {
                "max_charging_rate": opt_params.max_charging_rate_mw,
                "max_discharging_rate": opt_params.max_discharging_rate_mw,
                "usable_capacity": opt_params.usable_capacity_mwh,
                "soc_min": opt_params.soc_min_pct,
                "soc_max": opt_params.soc_max_pct,
                "round_trip_efficiency": opt_params.round_trip_efficiency_pct,
                "max_daily_cycles": opt_params.max_daily_cycles,
            }
        else:
            old_values = None
            opt_params = AssetOptimizationParameter(asset_id=asset_id)
            db.add(opt_params)

        opt_params.max_charging_rate_mw = payload.max_charging_rate
        opt_params.max_discharging_rate_mw = payload.max_discharging_rate
        opt_params.power_asymmetry_ratio = asymmetry_ratio
        opt_params.usable_capacity_mwh = payload.usable_capacity
        opt_params.soc_min_pct = payload.soc_min
        opt_params.soc_max_pct = payload.soc_max
        opt_params.round_trip_efficiency_pct = payload.round_trip_efficiency
        opt_params.max_daily_cycles = payload.max_daily_cycles

        # if asset has reached REVIEW step, it means optimization parameters were already saved once, so we don't downgrade the step. For all other steps, we move it to OPTIMIZATION_CONFIGURATION
        if asset.current_step != AssetSteps.REVIEW.value:
            asset.current_step = AssetSteps.OPTIMIZATION_CONFIGURATION.value

        await db.flush()
        await db.refresh(asset)

        fields = [
            ("Maximum Charging Rate", "max_charging_rate", "MW"),
            ("Maximum Discharging Rate", "max_discharging_rate", "MW"),
            ("Usable Capacity", "usable_capacity", "MWh"),
            ("Minimum SOC", "soc_min", "%"),
            ("Maximum SOC", "soc_max", "%"),
            ("Round Trip Efficiency", "round_trip_efficiency", "%"),
            ("Maximum Base Cycles", "max_daily_cycles", ""),
        ]
        new_values = {
            "max_charging_rate": payload.max_charging_rate,
            "max_discharging_rate": payload.max_discharging_rate,
            "usable_capacity": payload.usable_capacity,
            "soc_min": payload.soc_min,
            "soc_max": payload.soc_max,
            "round_trip_efficiency": payload.round_trip_efficiency,
            "max_daily_cycles": payload.max_daily_cycles,
        }

        optimization_section = "OPTIMIZATION PARAMETERS"

        if old_values is None:
            action = AuditLogScenario.OPTIMIZATION_PARAMETERS_CONFIRMED
            before = {
                optimization_section: {
                    label: f"{new_values[key]} {unit}".strip()
                    for label, key, unit in fields
                }
            }
            after = {optimization_section: "No changes made"}
        else:
            changed_before = {}
            changed_after = {}
            for label, key, unit in fields:
                old = old_values[key]
                new = new_values[key]
                if old != new:
                    changed_before[label] = (
                        f"{old} {unit}".strip() if old is not None else "Not Set"
                    )
                    changed_after[label] = f"{new} {unit}".strip()

            if changed_before:
                action = AuditLogScenario.ASSET_OPTIMIZATION_UPDATED
                before = {optimization_section: changed_before}
                after = {optimization_section: changed_after}
            else:
                action = AuditLogScenario.OPTIMIZATION_PARAMETERS_CONFIRMED
                before = {
                    optimization_section: {
                        label: f"{old_values[key]} {unit}".strip()
                        for label, key, unit in fields
                    }
                }
                after = {optimization_section: "No changes made"}

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=self._get_audit_module(asset),
            action=action,
            before=before,
            after=after,
            resource_id=asset.asset_id,
        )

        await db.commit()
        await db.refresh(opt_params)

        return Res.success(
            "S-10027",
            data={
                "id": asset.id,
                "asset_id": asset.asset_id,
                "current_step": max(
                    asset.current_step, AssetSteps.OPTIMIZATION_CONFIGURATION.value
                ),
                "max_charging_rate": opt_params.max_charging_rate_mw,
                "max_discharging_rate": opt_params.max_discharging_rate_mw,
                "usable_capacity": opt_params.usable_capacity_mwh,
                "soc_min": opt_params.soc_min_pct,
                "soc_max": opt_params.soc_max_pct,
                "round_trip_efficiency": opt_params.round_trip_efficiency_pct,
                "max_daily_cycles": opt_params.max_daily_cycles,
            },
        )

    def _is_blank(self, value):
        return pd.isna(value) or str(value).strip() == "" or str(value).lower() == "nan"

    def _to_float(self, value):
        try:
            if self._is_blank(value):
                return None
            return float(value)
        except Exception:
            return None

    async def upload_aggregator_report(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        file: UploadFile,
        current_user: dict,
        validation_month: int = None,
        validation_year: int = None,
    ):
        try:
            file_bytes = await file.read()
            size_bytes = len(file_bytes)
            original_name = file.filename

            # Basic Asset & Type Validations
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10079")

            # File Size & Type
            if not (1024 <= size_bytes <= 100 * 1024 * 1024):
                return Res.error(
                    "E-10085", data={"file": {"name": "File size limit mismatch"}},
                    http_status_code=413
                )
            if not original_name.lower().endswith((".xlsx", ".xls")):
                return Res.error(
                    "E-10084", data={"file": {"name": "Invalid file type"}},
                    http_status_code=415
                )

            # Name Validation
            if "Backing Data" not in original_name and not original_name.startswith(
                "Northwold_"
            ):
                return Res.error(
                    "E-10087",
                    data={
                        "file": {
                            "name": 'Invalid file name format. Expected "Backing Data" or "Northwold_" prefix'
                        }
                    },
                    http_status_code=422,
                )

            # Read and Parse Excel
            try:
                xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
                if len(xl.sheet_names) != 1:
                    return Res.error(
                        "E-10087",
                        message="Aggregator file must contain only one sheet.",
                        http_status_code=422
                    )

                df = pd.read_excel(xl, sheet_name=xl.sheet_names[0])
                df.columns = [str(c).strip() for c in df.columns]

                if df.empty:
                    return Res.error("E-10087", message="Uploaded file is empty.", http_status_code=422)

                # Full Validation Call
                validation_errors = self._validate_aggregator_excel(
                    df, asset.capacity, asset
                )
                if validation_errors:
                    formatted_errors = [
                        f"{err['column']} (Row {err['row']}): {err['message']}"
                        for err in validation_errors
                    ]
                    return Res.error(
                        "E-10087",
                        data={
                            "file": {"name": original_name},
                            "validation_errors": formatted_errors,
                        },
                        http_status_code=422,
                    )

            except Exception:
                traceback.print_exc()
                return Res.error(
                    "E-10087", message="Failed to parse excel file content.", http_status_code=422
                )

            # Ensure valid timestamps for DB query
            df["Timestamp"] = pd.to_datetime(
                df["Timestamp"], format="%d-%m-%Y %H:%M", errors="coerce"
            )
            start_date = pd.to_datetime(df["Timestamp"].min()).tz_localize("UTC")
            end_date = pd.to_datetime(df["Timestamp"].max()).tz_localize("UTC")

            # If they are already datetimes, convert them if they are naive
            if start_date.tzinfo is None:
                start_date = start_date.tz_localize("UTC")
            if end_date.tzinfo is None:
                end_date = end_date.tz_localize("UTC")
            if pd.isna(start_date) or pd.isna(end_date):
                return Res.error(
                    "E-10087", message="Could not extract valid date range from file.", http_status_code=422
                )

            file_month = start_date.month
            file_year = start_date.year

            if (validation_month and file_month != validation_month) or (
                validation_year and file_year != validation_year
            ):
                return Res.error(
                    "E-10087",
                    data={
                        "validation_errors": [
                            f"File content month/year ({file_month}/{file_year}) does not match the expected month/year ({validation_month}/{validation_year})."
                        ]
                    },
                    http_status_code=422,
                )

            # Check for existing record
            existing_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.AGGREGATOR_REPORT.value,
                    AssetFile.month == file_month,
                    AssetFile.year == file_year,
                )
            )
            record = existing_query.scalars().first()
            was_existing = record is not None
            old_name = record.name if was_existing else None

            # Upload to Storage
            stored_name = f"{uuid4().hex}-{original_name}"
            storage_path = f"assets/asset-{asset_id}/aggregator-reports/"
            FileStorageManager.upload_file(
                file_bytes, stored_name, storage_path, is_encrypted=False
            )

            if record:
                record.name = original_name
                record.key = f"{storage_path}{stored_name}"
                record.size = size_bytes
                record.row = len(df)
                record.month = file_month
                record.year = file_year
                record.uploaded_at = datetime.now()
                record.is_active = True
            else:
                record = AssetFile(
                    asset_id=asset_id,
                    type=AssetFileType.AGGREGATOR_REPORT.value,
                    month=file_month,
                    year=file_year,
                    name=original_name,
                    key=f"{storage_path}{stored_name}",
                    size=size_bytes,
                    row=len(df),
                    storage_server=FileStorageManager.STORAGE_TYPE,
                    projection_start_date=start_date,
                    projection_end_date=end_date,
                    is_active=True,
                )
                db.add(record)
                await db.flush()

            # Deactivate previous merged datasets for this period
            await db.execute(
                update(AssetFile)
                .where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == file_month,
                    AssetFile.year == file_year,
                )
                .values(is_active=False)
            )

            # Audit Logs
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=(
                    AuditLogScenario.AGGREGATOR_FILE_REPLACED
                    if was_existing
                    else AuditLogScenario.AGGREGATOR_FILE_UPLOADED
                ),
                before={
                    "Aggregator Report": old_name if was_existing else "Not Uploaded",
                    "Merged Dataset": "Available" if was_existing else "Not Available",
                    "Optimized Dataset": (
                        "Available" if was_existing else "Not Available"
                    ),
                },
                after={
                    "Aggregator Report": original_name,
                    "Merged Dataset": "Regenerated" if was_existing else "Generated",
                    "Optimized Dataset": "Regenerated" if was_existing else "Generated",
                },
                resource_id=asset.asset_id,
            )
            await db.commit()

            return Res.success(
                "S-10029",
                message="Aggregator report uploaded successfully",
                data={
                    "id": record.id,
                    "asset_id": asset.id,
                    "name": original_name,
                    "size": size_bytes,
                    "uploaded_at": datetime.now().isoformat(),
                    "projection_summary": {
                        "start_timestamp": start_date.isoformat(),
                        "end_timestamp": end_date.isoformat(),
                    },
                    "total_rows": len(df),
                    "month": file_month,
                    "year": file_year,
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    def _validate_aggregator_excel(self, df, capacity, asset):
        errors = []

        # Pre-processing: Strip all strings to handle invisible junk
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].astype(str).str.strip()

        # Normalize Column Names
        norm = lambda c: (
            re.sub(r"\s+", " ", str(c).replace("\xa0", " ")).strip().lower()
        )
        mapping = {norm(c): c for c in df.columns}

        required_cols = [
            "Timestamp",
            "Credited Energy Volume Battery MWh Output",
            "Battery SoC",
            "Day Ahead Price (EPEX)",
            "GB-ISEM Intraday 1 Price",
            "DA HH Price",
            "SSP",
            "SBP",
            "IDC Price",
            "Imbalance Revenue",
            "Imbalance Charge",
            "DA MW",
            "EPEX DA Revenues",
            "EPEX 30 DA MW",
            "EPEX 30 DA Revenue",
            "IDA1 Revenue",
            "IDA1 MW",
            "IDC MW",
            "IDC Revenue",
            "SFFR Availability",
            "SFFR Clearing Price",
            "SFFR revenues",
            "DCL Availability",
            "DCL Clearing Price",
            "DCL revenues",
            "DCH Availability",
            "DCH Clearing Price",
            "DCH revenues",
            "DML Availability",
            "DML Clearing Price",
            "DML revenues",
            "DMH Availability",
            "DMH Clearing Price",
            "DMH revenues",
            "DRL Availability",
            "DRL Clearing Price",
            "DRL revenues",
            "DRH Availability",
            "DRH Clearing Price",
            "DRH revenues",
        ]

        # Missing Column Check
        for col in required_cols:
            if norm(col) not in mapping:
                errors.append(
                    {
                        "column": col,
                        "row": None,
                        "message": f"Required column '{col}' is missing.",
                    }
                )
        if errors:
            return errors

        df = df.rename(columns={mapping[norm(col)]: col for col in required_cols})
        df = df.dropna(subset=["Timestamp"]).reset_index(drop=True)

        is_uk = asset.country_id == Country.UNITED_KINGDOM.value

        # ── Timestamp Parsing ─────────────────────────────────────────────────────
        df["Timestamp_Parsed"] = pd.to_datetime(
            df["Timestamp"], format="%d-%m-%Y %H:%M", errors="coerce"
        )

        fallback_mask = df["Timestamp_Parsed"].isna() & df["Timestamp"].notna()
        if fallback_mask.any():
            df.loc[fallback_mask, "Timestamp_Parsed"] = pd.to_datetime(
                df.loc[fallback_mask, "Timestamp"], errors="coerce"
            )

        # Report rows that still could not be parsed
        parse_err_mask = df["Timestamp_Parsed"].isna() & df["Timestamp"].notna()
        errors += [
            {
                "column": "Timestamp",
                "row": idx + 2,
                "message": f"Invalid datetime format in 'Timestamp' at row {idx + 2}. Expected format is DD-MM-YYYY HH:MM.",
            }
            for idx in df[parse_err_mask].index
        ]

        if not df["Timestamp_Parsed"].notna().any():
            return errors

        # ── DST Detection ─────────────────────────────────────────────────────────
        sample_year = df["Timestamp_Parsed"].dropna().iloc[0].year

        dst_clock_back_date = None
        last_sunday_mar = None
        if is_uk and sample_year:
            dst_clock_back_date = self._last_sunday(sample_year, 10)
            last_sunday_mar = self._last_sunday(sample_year, 3)

        # ── Timestamp Sequence / Interval / Duplicate ─────────────────────────────
        valid_df = df[df["Timestamp_Parsed"].notna()].copy()
        # Keep original index — do NOT reset so we can detect DST gaps
        ts_col = valid_df["Timestamp_Parsed"]

        # DST window mask — only 01:00 and 01:30 on clock-back day
        # (aggregator is 30-min, so only these two timestamps repeat)
        if dst_clock_back_date:
            dst_date_str = dst_clock_back_date.strftime("%Y-%m-%d")
            ts_date_str = ts_col.dt.strftime("%Y-%m-%d")
            dst_window_mask = (
                (ts_date_str == dst_date_str)
                & (ts_col.dt.hour.isin([0, 1]))  # cover both 00:xx and 01:xx
                & (ts_col.dt.minute.isin([0, 30]))
            )
        else:
            dst_window_mask = pd.Series([False] * len(valid_df), index=valid_df.index)
        # Duplicate check — vectorised
        ts_counts = ts_col.map(ts_col.value_counts())

        # Duplicates outside DST window are errors
        non_dst_dup_mask = (ts_counts > 1) & ~dst_window_mask
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Duplicate timestamp detected at row {i + 2}.",
            }
            for i in valid_df[non_dst_dup_mask].index
        ]

        # DST window — more than 2 occurrences is an error
        dst_dup_mask = dst_window_mask & (ts_counts > 2)
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"More duplicate timestamps found than expected for UK clock-back day at row {i + 2}.",
            }
            for i in valid_df[dst_dup_mask].index
        ]

        # Sequence and interval: exclude ALL DST window rows and non-DST duplicates
        # Keep original index intact so we know where DST gaps are
        check_df = valid_df[~dst_window_mask & ~non_dst_dup_mask].copy()
        check_ts = check_df["Timestamp_Parsed"]

        # Ascending order check — vectorised
        seq_mask = (check_ts <= check_ts.shift(1)) & check_ts.shift(1).notna()
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Timestamp sequence is not in ascending order at row {i + 2}.",
            }
            for i in check_df[seq_mask].index
        ]
        index_gap_mask = pd.Series(check_df.index, index=check_df.index).diff() > 1

        delta_min = check_ts.diff().dt.total_seconds() / 60

        # Spring forward: 60-min gap on last Sunday of March is allowed
        if last_sunday_mar is not None:
            spring_forward_mask = (check_ts.dt.date == last_sunday_mar) & (
                abs(delta_min - 60) < 0.1
            )
        else:
            spring_forward_mask = pd.Series(
                [False] * len(check_df), index=check_df.index
            )

        interval_mask = (
            (abs(delta_min - 30) > 0.1)
            & delta_min.notna()
            & ~index_gap_mask
            & ~spring_forward_mask
        )
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Timestamp must follow 30-minute intervals at row {i + 2}.",
            }
            for i in check_df[interval_mask].index
        ]

        # ── Row Count Validation ──────────────────────────────────────────────────
        if not check_df.empty:
            import calendar

            first_ts = check_ts.iloc[0]
            is_october_file = (ts_col.dt.month == 10).any()

            if is_uk and is_october_file:
                if len(df) != 1490:
                    errors.append(
                        {
                            "column": "Dataset",
                            "row": None,
                            "message": f"Aggregator row count does not match expected count for UK DST clock-back month. Expected 1490 rows, got {len(df)}.",
                        }
                    )
            else:
                days_in_month = calendar.monthrange(first_ts.year, first_ts.month)[1]
                expected_rows = days_in_month * 48
                if len(df) != expected_rows:
                    errors.append(
                        {
                            "column": "Dataset",
                            "row": None,
                            "message": f"Aggregator row count does not match expected count. Expected {expected_rows} rows, got {len(df)}.",
                        }
                    )

        # ── Helper ────────────────────────────────────────────────────────────────
        def is_blank(series):
            return (
                series.isna()
                | (series.astype(str).str.strip() == "")
                | (series.astype(str).str.lower() == "nan")
            )

        def add_errors(mask, col, msg_fn):
            errors.extend(
                {"column": col, "row": idx + 2, "message": msg_fn(idx)}
                for idx in df[mask].index
            )

        # ── Battery SoC — must be blank ───────────────────────────────────────────
        add_errors(
            ~is_blank(df["Battery SoC"]),
            "Battery SoC",
            lambda idx: (
                f"Invalid numeric value in 'Battery SoC' at row {idx + 2}. Column must be blank."
            ),
        )

        # ── Credited Energy Volume ────────────────────────────────────────────────
        add_errors(
            is_blank(df["Credited Energy Volume Battery MWh Output"]),
            "Credited Energy Volume Battery MWh Output",
            lambda idx: (
                f"Blank value found in 'Credited Energy Volume Battery MWh Output' at row {idx + 2}."
            ),
        )
        credited = pd.to_numeric(
            df["Credited Energy Volume Battery MWh Output"], errors="coerce"
        )
        add_errors(
            credited.isna()
            & ~is_blank(df["Credited Energy Volume Battery MWh Output"]),
            "Credited Energy Volume Battery MWh Output",
            lambda idx: (
                f"Invalid numeric value in 'Credited Energy Volume Battery MWh Output' at row {idx + 2}."
            ),
        )

        # ── Price Columns ─────────────────────────────────────────────────────────
        PRICE_COLS = [
            "Day Ahead Price (EPEX)",
            "GB-ISEM Intraday 1 Price",
            "DA HH Price",
            "SSP",
            "SBP",
        ]
        for col in PRICE_COLS:
            add_errors(
                is_blank(df[col]),
                col,
                lambda idx, c=col: f"Blank value found in '{c}' at row {idx + 2}.",
            )
            numeric_vals = pd.to_numeric(df[col], errors="coerce")
            add_errors(
                numeric_vals.isna() & ~is_blank(df[col]),
                col,
                lambda idx, c=col: f"Invalid numeric value in '{c}' at row {idx + 2}.",
            )

        # SBP >= SSP — vectorised
        ssp = pd.to_numeric(df["SSP"], errors="coerce")
        sbp = pd.to_numeric(df["SBP"], errors="coerce")
        add_errors(
            (ssp > sbp) & ssp.notna() & sbp.notna(),
            "SBP",
            lambda idx: f"SBP value is less than SSP at row {idx + 2}.",
        )

        # ── Trading MW Columns ────────────────────────────────────────────────────
        for col in ["EPEX 30 DA MW", "IDA1 MW"]:
            add_errors(
                is_blank(df[col]),
                col,
                lambda idx, c=col: f"Blank value found in '{c}' at row {idx + 2}.",
            )
            numeric_vals = pd.to_numeric(df[col], errors="coerce")
            add_errors(
                numeric_vals.isna() & ~is_blank(df[col]),
                col,
                lambda idx, c=col: f"Invalid numeric value in '{c}' at row {idx + 2}.",
            )

        # DA MW must be zero — IDC MW commented out
        # for col in ["DA MW", "IDC MW"]:
        for col in ["DA MW"]:
            vals = pd.to_numeric(df[col], errors="coerce")
            add_errors(
                vals.isna() | (vals != 0),
                col,
                lambda idx, c=col: (
                    f"Invalid numeric value in '{c}' at row {idx + 2}. Must be zero."
                ),
            )

        # ── Revenue Columns ───────────────────────────────────────────────────────
        # EPEX DA Revenues must be blank
        add_errors(
            ~is_blank(df["EPEX DA Revenues"]),
            "EPEX DA Revenues",
            lambda idx: (
                f"Invalid numeric value in 'EPEX DA Revenues' at row {idx + 2}. Must be blank."
            ),
        )

        # Other revenue columns
        for col in [
            "EPEX 30 DA Revenue",
            "IDA1 Revenue",
            "Imbalance Revenue",
            "Imbalance Charge",
        ]:
            add_errors(
                is_blank(df[col]),
                col,
                lambda idx, c=col: f"Blank value found in '{c}' at row {idx + 2}.",
            )
            numeric_vals = pd.to_numeric(df[col], errors="coerce")
            add_errors(
                numeric_vals.isna() & ~is_blank(df[col]),
                col,
                lambda idx, c=col: f"Invalid numeric value in '{c}' at row {idx + 2}.",
            )

        # ── Ancillary Service Columns ─────────────────────────────────────────────
        # ANCILLARY_SVCS = ["SFFR", "DCL", "DCH", "DML", "DMH", "DRL", "DRH"]
        ANCILLARY_SVCS = ["DCL", "DCH", "DML", "DMH", "DRL", "DRH"]

        for svc in ANCILLARY_SVCS:
            avail_col = f"{svc} Availability"
            price_col = f"{svc} Clearing Price"
            rev_col = f"{svc} revenues"

            avail = pd.to_numeric(df[avail_col], errors="coerce")
            price = pd.to_numeric(df[price_col], errors="coerce")
            rev = pd.to_numeric(df[rev_col], errors="coerce")

            # Availability — blank
            add_errors(
                is_blank(df[avail_col]),
                avail_col,
                lambda idx, c=avail_col: (
                    f"Blank value found in '{c}' at row {idx + 2}."
                ),
            )
            # Availability — invalid numeric
            add_errors(
                avail.isna() & ~is_blank(df[avail_col]),
                avail_col,
                lambda idx, c=avail_col: (
                    f"Invalid numeric value in '{c}' at row {idx + 2}."
                ),
            )
            # Availability — negative
            add_errors(
                avail.notna() & (avail < 0),
                avail_col,
                lambda idx, c=avail_col: f"'{c}' cannot be negative at row {idx + 2}.",
            )
            # Availability — exceeds capacity
            add_errors(
                avail.notna() & (avail > capacity),
                avail_col,
                lambda idx, c=avail_col: (
                    f"'{c}' exceeds asset capacity at row {idx + 2}."
                ),
            )

            # Clearing Price — blank
            add_errors(
                is_blank(df[price_col]),
                price_col,
                lambda idx, c=price_col: (
                    f"Blank value found in '{c}' at row {idx + 2}."
                ),
            )
            # Clearing Price — invalid numeric
            add_errors(
                price.isna() & ~is_blank(df[price_col]),
                price_col,
                lambda idx, c=price_col: (
                    f"Invalid numeric value in '{c}' at row {idx + 2}."
                ),
            )

            # Revenue — blank
            add_errors(
                is_blank(df[rev_col]),
                rev_col,
                lambda idx, c=rev_col: f"Blank value found in '{c}' at row {idx + 2}.",
            )
            # Revenue — invalid numeric
            add_errors(
                rev.isna() & ~is_blank(df[rev_col]),
                rev_col,
                lambda idx, c=rev_col: (
                    f"Invalid numeric value in '{c}' at row {idx + 2}."
                ),
            )

            # Revenue cross-column checks — vectorised
            valid_mask = avail.notna() & price.notna() & rev.notna()

            # If availability is 0, revenue must be 0
            add_errors(
                valid_mask & (avail == 0) & (rev != 0),
                rev_col,
                lambda idx, c=rev_col: (
                    f"Revenue found in '{c}' when availability is zero at row {idx + 2}."
                ),
            )

            # Revenue formula mismatch
            expected_rev = avail * price * 0.5
            diff_rev = (rev - expected_rev).abs()
            add_errors(
                valid_mask & (avail != 0) & (diff_rev > 0.5),
                rev_col,
                lambda idx, c=rev_col: (
                    f"Revenue in '{c}' does not match availability and clearing price at row {idx + 2}."
                ),
            )

        return errors

    def _last_sunday(self, year, month):
        """Get the last Sunday of a given month and year"""
        from datetime import date

        # Get the last day of the month
        last_day = calendar.monthrange(year, month)[1]

        # Start from the last day and go backwards until we find a Sunday
        for day in range(last_day, last_day - 7, -1):
            d = date(year, month, day)
            if d.weekday() == 6:  # 6 = Sunday in Python's datetime (Monday=0)
                return d
        return None

    async def remove_aggregator_report(
        self, db: AsyncSession, redis: Redis, asset_id: int, current_user: dict
    ):
        # 1. Fetch only ACTIVE records
        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.AGGREGATOR_REPORT.value,
                AssetFile.is_active == True,  # <--- FILTER ACTIVE
            )
        )
        a_file = file_query.scalars().first()

        if not a_file:
            return Res.error("E-10097", message="Aggregator file not uploaded.", http_status_code=404)

        merged_file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                # onlt remove file for that time period
                extract("month", AssetFile.projection_start_date)
                == extract("month", a_file.projection_start_date),
            )
        )
        merged_file = merged_file_query.scalars().first()

        # 2. Soft Delete (Flagging instead of deleting)
        a_file.is_active = False
        if merged_file:
            # for delete merged file since not needed
            await db.delete(merged_file)
            # merged_file.is_active = False

        asset = await db.get(Asset, asset_id)
        if asset:
            # if asset has reached REVIEW step, it means optimization parameters were already saved once,
            # so we don't downgrade the step. For all other steps, we move it to OPTIMIZATION_CONFIGURATION
            if asset.current_step != AssetSteps.REVIEW.value:
                asset.current_step = AssetSteps.OPTIMIZATION_CONFIGURATION.value

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=self._get_audit_module(asset),
            action=AuditLogScenario.AGGREGATOR_REPORT_REMOVED,
            before={
                "Aggregator Report": a_file.name,
                "Merged Dataset": merged_file.name if merged_file else "Not Available",
                "Optimized Dataset": "Not Available",
            },
            after={
                "Aggregator Report": "Not Uploaded",
                "Merged Dataset": "Not Available",
                "Optimized Dataset": "Not Available",
            },
            resource_id=asset.asset_id,
        )

        await db.commit()
        return Res.success("S-10034", message="Aggregator file removed successfully")

    async def upload_scada_report(
        self,
        db: AsyncSession,
        redis: Redis,
        asset_id: int,
        file: UploadFile,
        current_user: dict,
        validation_month: int = None,
        validation_year: int = None,
    ):
        try:
            file_bytes = await file.read()
            size_bytes = len(file_bytes)
            original_name = file.filename

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)

            # 1. Filename Pattern Validation
            if not re.match(r"^[a-z]{3}-\d{2}-.*\.xlsx$", original_name.lower()):
                return Res.error(
                    "E-10090",
                    message="Invalid file name. Expected format: mon-yy-*.xlsx",
                    http_status_code=422,
                )

            # 2. File Size Validation
            if size_bytes < 1024:
                return Res.error(
                    "E-10094", message="SCADA file size must be at least 1 KB.", http_status_code=422
                )
            if size_bytes > 100 * 1024 * 1024:
                return Res.error(
                    "E-10095", message="SCADA file size should not exceed 100 MB.", http_status_code=413
                )

            # 3. Excel Parsing & Validation
            try:
                xl = pd.ExcelFile(BytesIO(file_bytes), engine="openpyxl")
                if len(xl.sheet_names) != 1:
                    return Res.error(
                        "E-10087",
                        message="Invalid file structure. Only one sheet is allowed.",
                        http_status_code=422
                    )

                df = pd.read_excel(xl, sheet_name=xl.sheet_names[0])
                df.columns = [str(c).strip() for c in df.columns]
                if df.empty:
                    return Res.error("E-10087", message="Uploaded file is empty.", http_status_code=422)

                # Validate SCADA
                validation_errors = self._validate_scada_excel(df, asset)
                if validation_errors:
                    formatted_errors = [
                        f"{err['column']} (Row {err['row']}): {err['message']}"
                        for err in validation_errors
                    ]
                    return Res.error(
                        "E-10087",
                        data={
                            "file": {"name": original_name},
                            "validation_errors": formatted_errors,
                        },
                        http_status_code=422,
                    )
            except Exception:
                traceback.print_exc()
                return Res.error(
                    "E-10087", message="Failed to parse excel file content.",
                    http_status_code=422
                )

            # 4. Parse Timestamp (incoming format: YYYY-MM-DD HH:MM:SS)
            df["Timestamp"] = pd.to_datetime(
                df["Timestamp"], format="%Y-%m-%d %H:%M:%S", errors="coerce"
            )
            df["Timestamp"] = df["Timestamp"].dt.strftime("%d/%m/%Y %H:%M:%S")
            temp_ts = pd.to_datetime(df["Timestamp"], format="%d/%m/%Y %H:%M:%S")
            projection_start = temp_ts.min().tz_localize("UTC")
            projection_end = temp_ts.max().tz_localize("UTC")
            file_month = projection_start.month
            file_year = projection_start.year

            if (validation_month and file_month != validation_month) or (
                validation_year and file_year != validation_year
            ):
                return Res.error(
                    "E-10087",
                    data={
                        "validation_errors": [
                            f"File content month/year ({file_month}/{file_year}) does not match the expected month/year ({validation_month}/{validation_year})."
                        ]
                    },
                    http_status_code=422,
                )

            # Save the reformatted DataFrame as the file to store
            output_buffer = BytesIO()
            df.to_excel(output_buffer, index=False, engine="openpyxl")
            output_buffer.seek(0)
            file_bytes_to_store = output_buffer.read()

            # 7. Storage & DB Sync
            stored_name = f"{uuid4().hex}-{original_name}"
            storage_path = f"assets/asset-{asset_id}/scada-reports/"

            existing_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.SCADA_REPORT.value,
                    AssetFile.month == file_month,
                    AssetFile.year == file_year,
                )
            )
            record = existing_query.scalars().first()
            was_existing = record is not None
            old_name = record.name if was_existing else "Not Uploaded"

            # Store the reformatted file (DD/MM/YYYY HH:MM:SS}
            FileStorageManager.upload_file(
                file_bytes_to_store, stored_name, storage_path, is_encrypted=False
            )

            if record:
                record.name = original_name
                record.projection_start_date = projection_start
                record.projection_end_date = projection_end
                record.key = f"{storage_path}{stored_name}"
                record.size = len(file_bytes_to_store)
                record.month = file_month
                record.year = file_year
                record.uploaded_at = datetime.now()
            else:
                record = AssetFile(
                    asset_id=asset_id,
                    type=AssetFileType.SCADA_REPORT.value,
                    month=file_month,
                    year=file_year,
                    projection_start_date=projection_start,
                    projection_end_date=projection_end,
                    name=original_name,
                    key=f"{storage_path}{stored_name}",
                    size=len(file_bytes_to_store),
                    row=len(df),
                    storage_server=FileStorageManager.STORAGE_TYPE,
                    is_active=True,
                )
                db.add(record)

            await db.flush()

            # 8. Audit Log
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=(
                    AuditLogScenario.SCADA_FILE_REPLACED
                    if was_existing
                    else AuditLogScenario.SCADA_REPORT_UPLOADED
                ),
                before={
                    "SCADA Report": old_name,
                    "Merged Dataset": "Available" if was_existing else "Not Available",
                    "Optimized Dataset": (
                        "Available" if was_existing else "Not Available"
                    ),
                },
                after={
                    "SCADA Report": original_name,
                    "Merged Dataset": "Regenerated" if was_existing else "Generated",
                    "Optimized Dataset": "Regenerated" if was_existing else "Generated",
                },
                resource_id=asset.asset_id,
            )

            await db.commit()

            ts_parsed = pd.to_datetime(
                df["Timestamp"], format="%d/%m/%Y %H:%M:%S", errors="coerce"
            )
            return Res.success(
                "S-10030",
                message="SCADA report uploaded successfully.",
                data={
                    "id": record.id,
                    "asset_id": asset.id,
                    "name": original_name,
                    "size": size_bytes,
                    "uploaded_at": record.uploaded_at.isoformat(),
                    "projection_summary": {
                        "start_timestamp": ts_parsed.min().isoformat(),
                        "end_timestamp": ts_parsed.max().isoformat(),
                    },
                    "total_rows": len(df),
                    "month": file_month,
                    "year": file_year,
                },
            )

        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001")

    def _validate_scada_excel(self, df, asset):
        errors = []

        # 1. Clean data
        for col in df.columns:
            if df[col].dtype == "object":
                df[col] = df[col].astype(str).str.strip()

        # 2. Mandatory Columns Check
        required_cols = [
            "Timestamp",
            "Batteries Total Cycles (-) [Northwold]",
            "Batteries Total Cycles (to date) (-) [Northwold]",
            "BESS Cumulative Round Trip Efficiency (POC) (%) [Northwold]",
            "BESS State Of Health (%) [Northwold]",
            "BESS Exported Energy Site (daily) (kWh) [Northwold]",
            "BESS Imported Energy Site (daily) (kWh) [Northwold]",
            "Batteries Power Output Inverters AC (kW) [Northwold]",
            "BESS export cycles (-) [Northwold]",
            "BESS import cycles (-) [Northwold]",
            "BESS Site batteries availability (%) [Northwold]",
            "BESS Site inverters availability (%) [Northwold]",
        ]

        for col in required_cols:
            if col not in df.columns:
                errors.append(
                    {
                        "column": col,
                        "row": None,
                        "message": f"Required SCADA column '{col}' is missing.",
                    }
                )
        if errors:
            return errors

        is_uk = asset.country_id == Country.UNITED_KINGDOM.value

        t1 = time.time()
        # ── 3. Timestamp Parsing ──────────────────────────────────────────────────
        df["Timestamp_Parsed"] = pd.to_datetime(
            df["Timestamp"], format="%d/%m/%Y %H:%M:%S", errors="coerce"
        )
        fallback_mask = df["Timestamp_Parsed"].isna() & df["Timestamp"].notna()
        if fallback_mask.any():
            df.loc[fallback_mask, "Timestamp_Parsed"] = pd.to_datetime(
                df.loc[fallback_mask, "Timestamp"], errors="coerce"
            )

        # Blank check
        blank_ts_mask = (
            df["Timestamp"].isna()
            | (df["Timestamp"].astype(str).str.strip() == "")
            | (df["Timestamp"].astype(str).str.lower() == "nan")
        )
        errors += [
            {
                "column": "Timestamp",
                "row": idx + 2,
                "message": f"Date column cannot contain blank values at row {idx + 2}.",
            }
            for idx in df[blank_ts_mask].index
        ]

        errors += [
            {
                "column": "Timestamp",
                "row": idx + 2,
                "message": f"Invalid date format. Expected DD/MM/YYYY HH:MM:SS at row {idx + 2}.",
            }
            for idx in df[df["Timestamp_Parsed"].isna() & ~blank_ts_mask].index
        ]

        if not df["Timestamp_Parsed"].notna().any():
            return errors

        # ── 4. DST Detection ──────────────────────────────────────────────────────
        sample_year = df["Timestamp_Parsed"].dropna().iloc[0].year

        dst_clock_back_date = None
        if is_uk and sample_year:
            dst_clock_back_date = self._last_sunday(sample_year, 10)

        dst_day_occurrences = {}
        if dst_clock_back_date:
            dst_mask = (
                df["Timestamp_Parsed"].notna()
                & (df["Timestamp_Parsed"].dt.date == dst_clock_back_date)
                & (df["Timestamp_Parsed"].dt.hour == 1)
            )
            for idx in df[dst_mask].index:
                time_key = df.loc[idx, "Timestamp_Parsed"].strftime("%H:%M")
                if time_key not in dst_day_occurrences:
                    dst_day_occurrences[time_key] = []
                dst_day_occurrences[time_key].append(idx + 2)

        # ── 5. Timestamp Sequence / Interval / Duplicate — vectorised ────────────
        valid_df = df[df["Timestamp_Parsed"].notna()].copy()
        ts_col = valid_df["Timestamp_Parsed"]

        # DST window mask — entire 01:xx hour on clock-back day
        if dst_clock_back_date:
            dst_window_mask = (ts_col.dt.date == dst_clock_back_date) & (
                ts_col.dt.hour == 1
            )
        else:
            dst_window_mask = pd.Series([False] * len(valid_df), index=valid_df.index)

        # Duplicate check
        ts_counts = ts_col.groupby(ts_col).transform("count")

        # Duplicates outside DST window
        non_dst_dup_mask = (ts_counts > 1) & ~dst_window_mask
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Duplicate timestamp detected at row {i + 2}.",
            }
            for i in valid_df[non_dst_dup_mask].index
        ]

        # DST window — more than 2 occurrences
        dst_dup_mask = dst_window_mask & (ts_counts > 2)
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"More duplicate timestamps found than expected for UK clock-back day at row {i + 2}.",
            }
            for i in valid_df[dst_dup_mask].index
        ]

        # For sequence and interval: exclude DST window rows and non-DST duplicates
        check_df = valid_df[~dst_window_mask & ~non_dst_dup_mask].copy()
        check_ts = check_df["Timestamp_Parsed"]

        # Ascending order check
        seq_mask = (check_ts <= check_ts.shift(1)) & check_ts.shift(1).notna()
        errors += [
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Date values must be in ascending order at row {i + 2}.",
            }
            for i in check_df[seq_mask].index
        ]

        # 10-minute interval check
        index_gap_mask = pd.Series(check_df.index, index=check_df.index).diff() > 1
        delta_sec = check_ts.diff().dt.total_seconds()
        interval_mask = (
            (abs(delta_sec - 600) > 1)
            & delta_sec.notna()
            & ~index_gap_mask  # skip rows immediately after a DST gap
        )
        errors.extend(
            {
                "column": "Timestamp",
                "row": i + 2,
                "message": f"Invalid time interval. Expected 10-minute intervals at row {i + 2}.",
            }
            for i in check_df[interval_mask].index
        )
        # ── 6. Row Count Validation ───────────────────────────────────────────────
        import calendar

        validated_timestamps = ts_col.dropna().tolist()
        if validated_timestamps:
            first_ts = validated_timestamps[0]
            is_october = any(t.month == 10 for t in validated_timestamps)

            if is_uk and is_october:
                if len(df) != 4470:
                    errors.append(
                        {
                            "column": "Timestamp",
                            "row": None,
                            "message": f"SCADA row count does not match expected count for UK October clock-back data. Expected 4470 rows, got {len(df)}.",
                        }
                    )
            else:
                days_in_month = calendar.monthrange(first_ts.year, first_ts.month)[1]
                expected_rows = days_in_month * 144
                if len(df) != expected_rows:
                    errors.append(
                        {
                            "column": "Timestamp",
                            "row": None,
                            "message": f"SCADA row count does not match expected count. Expected {expected_rows} rows, got {len(df)}.",
                        }
                    )

        # ── Helper ────────────────────────────────────────────────────────────────
        def is_blank(series):
            return (
                series.isna()
                | (series.astype(str).str.strip() == "")
                | (series.astype(str).str.lower() == "nan")
            )

        def validate_numeric_col(
            col,
            blank_allowed=False,
            min_val=None,
            max_val=None,
            check_negative=False,
            check_decreasing=False,
        ):
            series = pd.to_numeric(df[col], errors="coerce")
            blank_mask = is_blank(df[col])

            if not blank_allowed:
                # Blank check — commented out for time being
                # errors.extend([
                #     {"column": col, "row": idx + 2,
                #      "message": f"Blank value found in '{col}' at row {idx + 2}."}
                #     for idx in df[blank_mask].index
                # ])
                pass

            errors.extend(
                [
                    {
                        "column": col,
                        "row": idx + 2,
                        "message": f"Invalid numeric value in '{col}' at row {idx + 2}.",
                    }
                    for idx in df[series.isna() & ~blank_mask].index
                ]
            )

            if check_negative:
                errors.extend(
                    [
                        {
                            "column": col,
                            "row": idx + 2,
                            "message": f"'{col}' cannot be negative at row {idx + 2}.",
                        }
                        for idx in df[series.notna() & (series < 0)].index
                    ]
                )

            if min_val is not None and max_val is not None:
                errors.extend(
                    [
                        {
                            "column": col,
                            "row": idx + 2,
                            "message": f"'{col}' must be between {min_val} and {max_val} at row {idx + 2}.",
                        }
                        for idx in df[
                            series.notna() & ((series < min_val) | (series > max_val))
                        ].index
                    ]
                )

            if check_decreasing:
                # Decreasing over time check — commented out for time being
                # decreasing_mask = series.notna() & (series < series.shift(1))
                # errors.extend([
                #     {"column": col, "row": idx + 2,
                #      "message": f"'{col}' should not decrease over time at row {idx + 2}."}
                #     for idx in df[decreasing_mask].index
                # ])
                pass

        t2 = time.time()
        # ── 7. Battery Cycle Columns ──────────────────────────────────────────────
        for col in [
            "Batteries Total Cycles (-) [Northwold]",
            "Batteries Total Cycles (to date) (-) [Northwold]",
            "BESS export cycles (-) [Northwold]",
            "BESS import cycles (-) [Northwold]",
        ]:
            validate_numeric_col(
                col, blank_allowed=False, check_negative=True, check_decreasing=True
            )

        # ── 8. Battery Health and Efficiency Columns ──────────────────────────────
        for col in [
            "BESS Cumulative Round Trip Efficiency (POC) (%) [Northwold]",
            "BESS State Of Health (%) [Northwold]",
        ]:
            validate_numeric_col(col, blank_allowed=False, min_val=0, max_val=100)

        # ── 9. Daily Energy Counter Columns ──────────────────────────────────────
        for col in [
            "BESS Exported Energy Site (daily) (kWh) [Northwold]",
            "BESS Imported Energy Site (daily) (kWh) [Northwold]",
        ]:
            validate_numeric_col(col, blank_allowed=False, check_negative=True)

        # ── 10. AC Power Column ───────────────────────────────────────────────────
        # Blank check — commented out for time being
        # errors += [
        #     {"column": "Batteries Power Output Inverters AC (kW) [Northwold]", "row": idx + 2,
        #      "message": f"Blank value found in 'Batteries Power Output Inverters AC (kW) [Northwold]' at row {idx + 2}."}
        #     for idx in df[is_blank(df["Batteries Power Output Inverters AC (kW) [Northwold]"])].index
        # ]
        validate_numeric_col(
            "Batteries Power Output Inverters AC (kW) [Northwold]",
            blank_allowed=True,  # blank allowed since blank check is commented out
        )

        # ── 11. Availability Columns ──────────────────────────────────────────────
        for col in [
            "BESS Site batteries availability (%) [Northwold]",
            "BESS Site inverters availability (%) [Northwold]",
        ]:
            validate_numeric_col(col, blank_allowed=False, min_val=0, max_val=100)
        print(f"Column validations: {time.time() - t2:.2f}s")
        return errors

    async def merge_and_process_dataset(
        self,
        db: AsyncSession,
        asset_id: int,
        payload: GenerateMergeFile,
        current_user: dict,
        backgroundTask: BackgroundTasks,
        redis: Redis
    ):
        try:
            # 1. Fetch Records
            agg_f = await db.get(AssetFile, payload.aggregator_file_id)
            scada_f = await db.get(AssetFile, payload.scada_file_id)
            asset = await db.get(Asset, asset_id)

            if not agg_f or not scada_f:
                return Res.error("E-10097", http_status_code=404)

            if agg_f.month != scada_f.month or agg_f.year != scada_f.year:
                return Res.error(
                    message=f"Aggregator file is for {agg_f.month}/{agg_f.year} but SCADA file is for {scada_f.month}/{scada_f.year}. Both files must be for the same month and year.",
                    http_status_code=422
                )

            # 2. Load Data
            agg_obj, _ = FileStorageManager.get_file_object(
                agg_f.key, storage_type=agg_f.storage_server
            )
            scada_obj, _ = FileStorageManager.get_file_object(
                scada_f.key, storage_type=scada_f.storage_server
            )

            agg_df = pd.read_excel(BytesIO(agg_obj))
            scada_df = pd.read_excel(BytesIO(scada_obj))

            agg_df.columns = [str(c).strip() for c in agg_df.columns]
            scada_df.columns = [str(c).strip() for c in scada_df.columns]

            # Manual UTC Normalization
            def normalize_to_utc(df, col, is_scada=False):
                df[col] = pd.to_datetime(
                    df[col], format="mixed", dayfirst=True, errors="coerce"
                )

                if asset.country_id == Country.UNITED_KINGDOM.value:
                    df[col] = (
                        df[col]
                        .dt.tz_localize(
                            "Europe/London",
                            ambiguous="NaT",
                            nonexistent="shift_forward",
                        )
                        .dt.tz_convert("UTC")
                        .dt.tz_localize(None)
                    )

                df = df.dropna(subset=[col])

                # Use ceil for both — ensures aggregator and SCADA keys align
                df["merge_key"] = df[col].dt.ceil("30min")

                return df

            agg_df = normalize_to_utc(agg_df, "Timestamp", is_scada=False)

            scada_col = "Timestamp" if "Timestamp" in scada_df.columns else "date"
            scada_df = normalize_to_utc(scada_df, scada_col, is_scada=True)

            # Filter SCADA to only rows whose merge_key falls within
            # the aggregator's merge_key range — after UTC conversion
            agg_min = agg_df["merge_key"].min()
            agg_max = agg_df["merge_key"].max()
            scada_df = scada_df[
                (scada_df["merge_key"] >= agg_min) & (scada_df["merge_key"] <= agg_max)
            ].reset_index(drop=True)
            # Resample SCADA & Merge
            scada_grouped = (
                scada_df.groupby("merge_key")
                .agg(
                    {
                        "Batteries Power Output Inverters AC (kW) [Northwold]": "mean",
                        "BESS State Of Health (%) [Northwold]": "mean",
                    }
                )
                .reset_index()
            )

            merged = pd.merge(agg_df, scada_grouped, on="merge_key", how="left")

            merged["Batteries Power Output Inverters AC (kW) [Northwold]"] = merged[
                "Batteries Power Output Inverters AC (kW) [Northwold]"
            ].fillna(0)

            merged["BESS State Of Health (%) [Northwold]"] = merged[
                "BESS State Of Health (%) [Northwold]"
            ].ffill()

            # only drop those if the 'Timestamp' is missing
            merged = merged.dropna(subset=["Timestamp"])

            if merged.empty:
                return Res.error(
                    "E-10098",
                    message="Merge failed. No matching timestamps found between Aggregator and SCADA files.",
                    http_status_code=422
                )

            # Final Columns
            merged["Power_MW"] = (
                merged["Batteries Power Output Inverters AC (kW) [Northwold]"] / 1000
            )
            merged["BESS_State_Of_Health_pct"] = merged[
                "BESS State Of Health (%) [Northwold]"
            ]
            merged["SOC"], merged["Frequency"] = np.nan, np.nan

            merged = merged.drop(
                columns=[
                    "merge_key",
                    "Batteries Power Output Inverters AC (kW) [Northwold]",
                    "BESS State Of Health (%) [Northwold]",
                ],
                errors="ignore",
            )

            if asset.country_id == Country.UNITED_KINGDOM.value:
                ts = merged["Timestamp"]
                if ts.dt.tz is not None:
                    merged["Timestamp"] = ts.dt.tz_convert(
                        "Europe/London"
                    ).dt.tz_localize(None)
                else:
                    merged["Timestamp"] = (
                        ts.dt.tz_localize("UTC")
                        .dt.tz_convert("Europe/London")
                        .dt.tz_localize(None)
                    )

            # File Storage
            stored_name = f"merged_{uuid4().hex}.xlsx"
            merged_path = os.path.join(os.getcwd(), stored_name)
            merged.to_excel(merged_path, index=False)
            with open(merged_path, "rb") as f:
                FileStorageManager.upload_file(
                    f.read(), stored_name, UPLOAD_PATHS["MERGED_DATASETS"](asset.id)
                )

            # 7. DB Sync
            start_time = merged["Timestamp"].min()
            end_time = merged["Timestamp"].max()

            if pd.isna(start_time) or pd.isna(end_time):
                return Res.error("E-10098", message="Invalid merged timestamp range.", http_status_code=422)

            start_time_dt = start_time.to_pydatetime()
            end_time_dt = end_time.to_pydatetime()

            existing = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset.id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == agg_f.month,
                    AssetFile.year == agg_f.year,
                )
            )
            record = existing.scalars().first()

            if record:
                record.name, record.size, record.row, record.uploaded_at = (
                    stored_name,
                    len(merged),
                    len(merged),
                    datetime.now(),
                )
                record.month = agg_f.month
                record.year = agg_f.year
            else:
                record = AssetFile(
                    asset_id=asset.id,
                    type=AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    month=agg_f.month,
                    year=agg_f.year,
                    name=stored_name,
                    key=f"{UPLOAD_PATHS['MERGED_DATASETS'](asset.id)}{stored_name}",
                    size=len(merged),
                    row=len(merged),
                    projection_start_date=start_time_dt,
                    projection_end_date=end_time_dt,
                    is_active=True,
                    storage_server=FileStorageManager.STORAGE_TYPE,
                )
                db.add(record)
                await db.flush()
            os.unlink(merged_path)

            # as a simple side effect to set value for active period in asset table
            if asset.status == AssetStatus.DRAFT.value:
                asset.active_month = agg_f.month
                asset.active_year = agg_f.year

            # Audit log
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.DATASET_MERGED,
                before={
                    "Aggregator Report": agg_f.name,
                    "SCADA Report": scada_f.name,
                    "Merged Dataset": "Not Available",
                },
                after={
                    "Merged Dataset": stored_name,
                    "Period": f"{agg_f.projection_start_date.month}/{agg_f.projection_start_date.year}",
                },
                resource_id=asset.asset_id,
            )

            # 8. Return Response
            response_data = {
                "id": record.id,
                "name": stored_name,
                "asset_id": asset.id,
                "month": agg_f.month,
                "year": agg_f.year,
            }

            await db.commit()

            return Res.success(
                "S-10031",
                message="SCADA and Aggregator datasets merged successfully",
                data=response_data,
            )
        except Exception:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10098")

    async def remove_scada_report(
        self, db: AsyncSession, redis: Redis, asset_id: int, current_user: dict
    ):
        try:
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.SCADA_REPORT.value,
                    AssetFile.is_active == True,
                )
            )
            s_file = file_query.scalars().first()

            if not s_file:
                return Res.error("E-10096", message="SCADA file not uploaded.", http_status_code=404)

            merged_file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    extract("month", AssetFile.projection_start_date)
                    == extract("month", s_file.projection_start_date),
                )
            )
            merged_file = merged_file_query.scalars().first()

            # a_file.is_active = False
            await db.delete(s_file)
            if merged_file:
                await db.delete(merged_file)
                # merged_file.is_active = False

            asset = await db.get(Asset, asset_id)
            if asset:
                # One step less that actual since current_step is basically till which step is completed. So if we are removing SCADA, we are going back to just after aggregator upload step
                # TODO: Refactor the step logic
                # if asset has reached REVIEW step, it means optimization parameters were already saved once,
                # so we don't downgrade the step. For all other steps, we move it to OPTIMIZATION_CONFIGURATION
                if asset.current_step != AssetSteps.REVIEW.value:
                    asset.current_step = AssetSteps.OPTIMIZATION_CONFIGURATION.value

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.SCADA_REPORT_REMOVED,
                before={
                    "SCADA Report": s_file.name,
                    "Merged Dataset": (
                        merged_file.name if merged_file else "Not Available"
                    ),
                    "Optimized Dataset": "Not Available",
                },
                after={
                    "SCADA Report": "Not Uploaded",
                    "Merged Dataset": "Not Available",
                    "Optimized Dataset": "Not Available",
                },
                resource_id=asset.asset_id,
            )

            await db.commit()
            return Res.success("S-10033", message="SCADA file removed successfully.")

        except Exception:
            await db.rollback()
            traceback.print_exc()
            return Res.error("E-10001")

    async def download_merged_dataset(
        self, db: AsyncSession, redis: Redis, asset_id: int, current_user: dict
    ):
        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
            )
        )

        merged_file = file_query.scalars().first()
        if not merged_file:
            return Res.error(
                "E-10107",
                message="Merged dataset not found. Please ensure SCADA and Aggregator files are uploaded and merged.",
                http_status_code=404
            )

        file_bytes, content_type = FileStorageManager.get_file_object(
            merged_file.key, storage_type=merged_file.storage_server
        )
        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.ASSET_ONBOARDING,
            action=AuditLogScenario.DOWNLOADED_MERGED_DATASET,
            before={
                "Merged Dataset": merged_file.name,
                "Download Status": "Not Requested",
            },
            after={
                "Merged Dataset": merged_file.name,
                "Download Status": "Requested",
            },
            resource_id=f"AST-{asset_id:03d}",
        )
        await db.commit()
        return Response(
            content=file_bytes,
            media_type=content_type,
            headers={"Content-Disposition": f"attachment; filename={merged_file.name}"},
        )

    async def activate_asset(
        self,
        db: AsyncSession,
        redis: Redis,
        user_db: AsyncSession,
        asset_id: int,
        status: bool,
        current_user: dict,
        background_task: BackgroundTasks,
    ):
        if current_user.get("role") != UserRole.ADMIN.value:
            return Res.error("E-10013", message="Access denied. Admin role required.")
        if Platform.AMD not in current_user["platform"]:
            return Res.error(
                "E-10013", message="You are not authorized to perform this action",
                http_status_code=403
            )
        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error(
                "E-10034", message="Asset not found.", http_status_code=404
            )
        if asset.type == AssetType.SOLAR.value:
            return Res.error(
                "E-10120",
                message="Solar assets do not require activation through this flow",
                http_status_code=422
            )

        # Optimization Parameters
        opt_query = await db.execute(
            select(AssetOptimizationParameter).where(
                AssetOptimizationParameter.asset_id == asset_id
            )
        )
        optimization_params = opt_query.scalars().first()
        if not optimization_params:
            return Res.error(
                "E-10116",
                message="Optimization parameters are missing",
                http_status_code=422
            )

        # Aggregator Report
        agg_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.AGGREGATOR_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )
        aggregator_file = agg_query.scalars().first()
        if not aggregator_file:
            return Res.error(
                "E-10117",
                message="Active aggregator report is missing",
                http_status_code=422,
            )

        # SCADA Report
        scada_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.SCADA_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )
        scada_file = scada_query.scalars().first()
        if not scada_file:
            return Res.error(
                "E-10118",
                message="Active SCADA report is missing",
                http_status_code=422,
            )

        # IAR Report
        iar_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )
        iar_file = iar_query.scalars().first()
        if not iar_file:
            return Res.error(
                "E-10119",
                message="Active IAR report is missing",
                http_status_code=422,
            )

        # Update Asset Status
        new_status = AssetStatus.ACTIVE.value if status else AssetStatus.INACTIVE.value
        old_status = asset.status
        approval_flow = old_status == AssetStatus.PENDING_APPROVAL.value

        asset.status = new_status
        if approval_flow:
            asset.activated_by = current_user.get("id")
            asset.activated_at = datetime.now(timezone.utc)
            analyst = await user_db.get(User, asset.submitted_by)

            template_ref = 10
            template = await template_utils.get_by_ref(user_db, template_ref)

            if analyst:
                background_task.add_task(
                    self._send_asset_approved_email,
                    analyst.email,
                    analyst.name,
                    current_user.get("name"),
                    asset,
                    template,
                )

        # Audit Log
        if approval_flow:
            audit_action = AuditLogScenario.ASSET_APPROVED
            audit_before = {
                "Asset Status": "Pending Approval",
                "Approved By": "Not Available",
                "Approved On": "Not Available",
            }
            audit_after = {
                "Asset Status": "Active",
                "Approved By": current_user.get("name"),
                "Approved On": datetime.now(timezone.utc).strftime(
                    "%d-%b-%Y, %I:%M %p"
                ),
            }
        elif status:  # enabling a disabled asset
            audit_action = AuditLogScenario.ASSET_ENABLED
            audit_before = {"Asset Status": "Disabled", "Status Toggle": "Off"}
            audit_after = {"Asset Status": "Active", "Status Toggle": "On"}
        else:  # disabling an active asset
            audit_action = AuditLogScenario.ASSET_DISABLED
            audit_before = {"Asset Status": "Active", "Status Toggle": "On"}
            audit_after = {"Asset Status": "Disabled", "Status Toggle": "Off"}

        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=(
                AuditLogModules.ASSET_ONBOARDING
                if approval_flow
                else AuditLogModules.ASSET_MANAGEMENT_AMD
            ),
            action=audit_action,
            before=audit_before,
            after=audit_after,
            resource_id=asset.asset_id,
        )

        await db.commit()
        await db.refresh(asset)

        return Res.success(
            "S-10041",
            data={
                "id": asset.id,
                "status": status,
            },
        )

    async def upload_iar_report(
        self, db: AsyncSession, redis: Redis, asset_id: int, file: UploadFile, current_user: dict, backgroundTask: BackgroundTasks
    ):
        try:
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)

            file_bytes = await file.read()
            if len(file_bytes) < 1024:
                return Res.error("E-10114", http_status_code=422)

            if len(file_bytes) > 100 * 1024 * 1024:
                return Res.error("E-10114", http_status_code=413)

            if not file.filename.lower().endswith(".xlsx"):
                return Res.error(
                    "E-10115",
                    message="Invalid file format. Please upload correct template",
                    http_status_code=415
                )

            try:
                xl = pd.ExcelFile(BytesIO(file_bytes))
                df_raw = pd.read_excel(xl, sheet_name=xl.sheet_names[0], header=None)

                validation_errors = self._validate_iar_excel(df_raw)
                if validation_errors:
                    return Res.error(
                        "E-10115",
                        data={
                            "file": {"name": file.filename},
                            "validation_errors": validation_errors,
                        },
                        http_status_code=422
                    )
            except Exception:
                traceback.print_exc()
                return Res.error("E-10115")

            df_clean, date_objs = self._extract_iar_dataset(df_raw)
            start_dt = date_objs[0].replace(tzinfo=timezone.utc)
            end_dt = date_objs[-1].replace(tzinfo=timezone.utc)

            stored_name = f"{uuid4().hex}-{file.filename}"
            storage_path = f"assets/asset-{asset_id}/iar-reports/"
            FileStorageManager.upload_file(
                file_bytes, stored_name, storage_path, is_encrypted=False
            )

            existing_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                    AssetFile.projection_start_date == start_dt,
                    AssetFile.projection_end_date == end_dt,
                )
            )
            record = existing_query.scalars().first()
            was_existing = record is not None

            if record:
                record.name, record.size, record.row = (
                    file.filename,
                    len(file_bytes),
                    len(df_clean),
                )
                record.projection_start_date, record.projection_end_date = (
                    start_dt,
                    end_dt,
                )
                record.storage_server = FileStorageManager.STORAGE_TYPE
                record.uploaded_at = datetime.now()
                record.is_active = True
            else:
                record = AssetFile(
                    asset_id=asset_id,
                    type=AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                    name=file.filename,
                    key=f"{storage_path}{stored_name}",
                    size=len(file_bytes),
                    row=len(df_clean),
                    projection_start_date=start_dt,
                    projection_end_date=end_dt,
                    is_active=True,
                    storage_server=FileStorageManager.STORAGE_TYPE,
                    uploaded_at=datetime.now(),
                )
                db.add(record)

            # Uploading an IAR file must not advance onboarding progress.
            # Step completion is only persisted when the user explicitly saves
            # from the IAR step via the edit/save flow.

            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=(
                    AuditLogScenario.IAR_FILE_REPLACED
                    if was_existing
                    else AuditLogScenario.IAR_FILE_UPLOADED
                ),
                before={
                    "IAR File": record.name if was_existing else "Not Uploaded",
                    "Benchmark Analysis": (
                        "Available" if was_existing else "Not Available"
                    ),
                },
                after={
                    "IAR File": file.filename,
                    "Benchmark Analysis": "Available",
                },
                resource_id=asset.asset_id,
            )
            await db.commit()

            backgroundTask.add_task(
                asset_computation_task.kiq,
                asset_id=asset_id,
                month='all',
                year='all',
                dependencies=[
                    IARDataFrame.__name__,
                ],
            )

            return Res.success(
                "S-10039",
                message="IAR file uploaded and validated successfully",
                data={
                    "id": record.id,
                    "asset_id": str(asset_id),
                    "name": file.filename,
                    "size": len(file_bytes),
                    "uploaded_at": record.uploaded_at.isoformat(),
                    "projection_summary": {
                        "start_timestamp": start_dt.isoformat(),
                        "end_timestamp": end_dt.isoformat(),
                    },
                    "total_rows": len(df_clean),
                },
            )
        except Exception as e:
            traceback.print_exc()
            await db.rollback()
            return Res.error("E-10001", message=str(e))

    def _extract_iar_dataset(self, df_raw):
        mandatory_lower = [
            "wholesale day ahead battery revenue",
            "wholesale intraday revenue",
            "balancing mechanism revenue",
            "frequency response revenues",
            "capacity market revenues",
            "duos battery revenues",
            "duos fixed charges",
            "tnuos revenues",
            "total bess revenues incl. duos fixed charges (£/mw/month)",
            "mw assumed in model at iar",
            "total bess revenues (real)",
            "indexation",
            "total bess revenues (nominal)",
        ]

        row_idx, col_idx = -1, -1
        for r in range(len(df_raw)):
            for c in range(len(df_raw.columns)):
                cell_val = str(df_raw.iloc[r, c]).strip().lower()
                if cell_val in mandatory_lower:
                    row_idx, col_idx = r, c
                    break
            if row_idx != -1:
                break

        if row_idx == -1:
            return None, None

        start_data_col = -1
        for c in range(col_idx + 1, len(df_raw.columns)):
            val = df_raw.iloc[row_idx - 1, c]
            if not pd.isna(pd.to_datetime(val, errors="coerce")):
                start_data_col = c
                break

        if start_data_col == -1:
            return None, None

        labels = df_raw.iloc[row_idx:, col_idx].astype(str).str.strip().tolist()
        headers = [
            pd.to_datetime(h, errors="coerce")
            for h in df_raw.iloc[row_idx - 1, start_data_col:]
        ]
        data_values = df_raw.iloc[row_idx:, start_data_col:].values

        df_clean = pd.DataFrame(data_values, columns=headers)
        df_clean.insert(0, "Row_Label", labels)
        date_objs = [h for h in headers if h is not None]
        return df_clean, date_objs

    def _validate_iar_excel(self, df_raw) -> List[str]:
        errors = []
        res = self._extract_iar_dataset(df_raw)
        if not res or res[0] is None:
            return ["Valid row labels or date headers not found"]
        df, date_objs = res

        mandatory = [
            "Wholesale Day Ahead Battery Revenue",
            "Wholesale Intraday Revenue",
            "Balancing Mechanism Revenue",
            "Frequency Response Revenues",
            "Capacity Market Revenues",
            "DUoS Battery Revenues",
            "DUoS Fixed Charges",
            "TNUoS Revenues",
            "Total BESS Revenues incl. DUoS Fixed Charges (£/MW/month)",
            "MW assumed in Model at IAR",
            "Total BESS Revenues (Real)",
            "Indexation",
            "Total BESS Revenues (Nominal)",
        ]

        # Existence Check
        actual_rows_map = {
            str(r).strip().lower(): str(r).strip() for r in df["Row_Label"]
        }
        for req_row in mandatory:
            if req_row.lower() not in actual_rows_map:
                errors.append(
                    f"Required row ‘{req_row}’ is missing from the uploaded file."
                )

        if errors:
            return errors

        # Sequence Check
        actual_sequence = [
            str(r).strip()
            for r in df["Row_Label"]
            if str(r).strip().lower() in actual_rows_map
        ]

        for idx, req_row in enumerate(mandatory):
            if (
                idx < len(actual_sequence)
                and actual_sequence[idx].lower() != req_row.lower()
            ):
                errors.append(
                    f"Invalid row sequence: Expected ‘{req_row}’ at position {idx + 1} (Found ‘{actual_sequence[idx]}’)"
                )
                return errors
        # Header Validations
        parsed_dates = sorted(date_objs)
        if not parsed_dates:
            return ["No valid date columns found in the report"]

        for d in parsed_dates:
            if d.day != 1:
                errors.append(
                    f"Column {d.strftime('%d-%m-%Y')}: Day must be 01 for all columns"
                )

        if len(parsed_dates) > 1:
            for i in range(1, len(parsed_dates)):
                prev = parsed_dates[i - 1]
                curr = parsed_dates[i]
                expected = prev + pd.DateOffset(months=1)
                if curr.year != expected.year or curr.month != expected.month:
                    errors.append(
                        f"Missing month in sequence: Expected {expected.strftime('%b-%y')} after {prev.strftime('%b-%y')}"
                    )

        seen_months = set()
        for d in parsed_dates:
            m_key = (d.year, d.month)
            if m_key in seen_months:
                errors.append(f"Duplicate month detected: {d.strftime('%B %Y')}")
            seen_months.add(m_key)

        df["Row_Label"] = df["Row_Label"].apply(
            lambda x: next(
                (m for m in mandatory if m.lower() == str(x).strip().lower()), x
            )
        )

        date_cols = [c for c in df.columns if c != "Row_Label"]
        mw_consistency_list = []

        for col in date_cols:
            if not isinstance(col, pd.Timestamp):
                continue
            col_id = col.strftime("%d-%b-%y")

            def get_v(r_name):
                try:
                    mask = df["Row_Label"].str.lower() == r_name.lower()
                    cell_data = df.loc[mask, col]
                    val = (
                        cell_data.iloc[0]
                        if isinstance(cell_data, pd.Series)
                        else cell_data.values[0]
                    )
                    if pd.isna(val) or str(val).strip() == "":
                        return None
                    return float(str(val).replace(",", "").strip())
                except:
                    return "NAN"

            for rn in mandatory:
                v = get_v(rn)
                if v is None:
                    errors.append(f"{rn}, Column {col_id}: Value cannot be empty")
                elif v == "NAN":
                    errors.append(
                        f"{rn}, Column {col_id}: Only numeric values are allowed"
                    )

            if any(col_id in e for e in errors):
                continue
            int_indices = [0, 1, 2, 3, 4, 5, 7, 8, 10, 12]
            for i in int_indices:
                rn = mandatory[i]
                raw_val = get_v(rn)
                clean_val = math.floor(raw_val) if raw_val >= 0 else math.ceil(raw_val)
                if clean_val < 0 and i != 6:
                    errors.append(
                        f"{rn}, Column {col_id}: Negative values are not allowed"
                    )

            # (DUoS Fixed Charges)
            dfix_raw = get_v("DUoS Fixed Charges")
            dfix_clean = math.ceil(dfix_raw) if dfix_raw < 0 else math.floor(dfix_raw)
            if dfix_clean > 0:
                errors.append(
                    f"DUoS Fixed Charges, Column {col_id}: Positive values are not allowed"
                )

            # Max 2 decimals
            for i in [9, 11]:
                rn = mandatory[i]
                val = get_v(rn)

                # force round to 2 decimal places to kill garbage like this  1.072928
                val_2_dec = round(val, 2)
                if i == 11 and val_2_dec < 1.0:
                    errors.append(
                        f"{rn}, Column {col_id}: Value must be greater than or equal to 1"
                    )
                if i == 9 and val_2_dec <= 0:
                    errors.append(
                        f"{rn}, Column {col_id}: Value must be greater than 0"
                    )

            actual_total = get_v(mandatory[8])
            calculated_total = round(sum([get_v(mandatory[j]) for j in range(8)]))
            rounded_actual = round(actual_total)
            if (
                abs(rounded_actual - calculated_total) > 2
            ):  # Tolerance for rounding artifacts
                errors.append(
                    f"{mandatory[8]}, Column {col_id}: Value {rounded_actual} does not match calculated total {calculated_total}"
                )

            # Real Revenue Cross-check (Total * MW)
            mw_val = get_v(mandatory[9])
            actual_real = round(get_v(mandatory[10]))
            calculated_real = round(actual_total * mw_val)
            if abs(actual_real - calculated_real) > 5:
                errors.append(
                    f"{mandatory[10]}, Column {col_id}: Value does not match calculated real revenue"
                )

            # Nominal Revenue Cross-check (Real * Indexation)
            idx_val = get_v(mandatory[11])
            actual_nominal = round(get_v(mandatory[12]))
            calculated_nominal = round(actual_real * idx_val)
            if abs(actual_nominal - calculated_nominal) > 10:
                errors.append(
                    f"{mandatory[12]}, Column {col_id}: Value does not match calculated nominal revenue"
                )

            mw_val = get_v(mandatory[9])
            if mw_val not in [None, "NAN"]:
                mw_consistency_list.append(round(mw_val, 2))
            if len(set(mw_consistency_list)) > 1:
                errors.append(
                    "MW assumed in Model at IAR: Value must be consistent across all months"
                )

        return list(dict.fromkeys(errors))

    async def remove_iar_report(
        self, db: AsyncSession, redis: Redis, asset_id: int, current_user: dict
    ):

        try:
            # Role Validation: Only Admins are allowed
            if current_user.get("role") != UserRole.ADMIN.value:
                return Res.error("E-10013", http_status_code=403, message="Access denied. Admin role required.")

            # Platform Validation: Admin must belong to AMD platform
            if Platform.AMD not in current_user.get("platform", []):
                return Res.error("E-10013", http_status_code=403, message="Access denied. Admin role required.")

            # Asset Validation
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error("E-10034", http_status_code=404)

            # Fetch Active IAR File
            file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                    AssetFile.is_active == True,
                )
            )
            iar_file = file_query.scalars().first()

            # If no active file exists, return success
            if not iar_file:
                return Res.success(
                    "S-10040", message="No active IAR file found for this asset."
                )

            # Soft Delete the File
            iar_file.is_active = False

            # Mark IAR Upload Step as Incomplete
            # Assuming the previous step before IAR upload is dataset merge
            # if asset has reached REVIEW step, it means optimization parameters were already saved once,
            # so we don't downgrade the step. For all other steps, we move it to UPLOAD_AGGREGATOR_SCADA
            if asset.current_step != AssetSteps.REVIEW.value:
                asset.current_step = AssetSteps.UPLOAD_AGGREGATOR_SCADA.value

            # Audit Logging
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.INTERNAL_APPRAISAL_REPORT_REMOVED,
                before={
                    "IAR File": iar_file.name,
                    "Benchmark Analysis": "Available",
                },
                after={
                    "IAR File": "Not Uploaded",
                    "Benchmark Analysis": "Not Available",
                },
                resource_id=asset.asset_id,
            )

            await db.commit()

            # Success Response
            return Res.success("S-10040", message="IAR file removed successfully.")

        except Exception:
            await db.rollback()
            traceback.print_exc()
            return Res.error("E-10001")

    async def get_file_history(
        self,
        db: AsyncSession,
        asset_id: int,
        month: list[int] = None,
        year: list[int] = None,
        current_user: dict = None,
    ):
        try:
            if Platform.AMD.value not in current_user.get("platform", []):
                return Res.error("E-10013", message="Unauthorized", http_status_code=403)

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )
            if asset.type == AssetType.SOLAR.value:
                return Res.error("E-10120", message="Not applicable for solar asset", http_status_code=422)

            query = select(AssetFile).where(AssetFile.asset_id == asset_id)

            if month is not None and len(month) > 0:
                query = query.where(AssetFile.month.in_(month))

            if year is not None and len(year) > 0:
                query = query.where(AssetFile.year.in_(year))

            query = query.order_by(
                case(
                    (
                        AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                        1,
                    ),
                    else_=0,
                ),
                AssetFile.uploaded_at.desc(),
            )

            result = await db.execute(query)
            files = result.scalars().all()

            data = []
            for f in files:
                data.append(
                    {
                        "id": f.id,
                        "asset_id": f.asset_id,
                        "type": f.type,
                        "name": f.name,
                        "size": f.size,
                        "uploaded_at": (
                            f.uploaded_at.isoformat() if f.uploaded_at else None
                        ),
                        "projection_summary": {
                            "start_timestamp": (
                                f.projection_start_date.isoformat()
                                if f.projection_start_date
                                else None
                            ),
                            "end_timestamp": (
                                f.projection_end_date.isoformat()
                                if f.projection_end_date
                                else None
                            ),
                        },
                        "month": f.month,
                        "year": f.year,
                        "total_rows": f.row,
                    }
                )

            return Res.success("S-10047", data=data)

        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def download_file(
        self, db: AsyncSession, redis: Redis, asset_id: int, file_id: int, current_user: dict
    ):
        try:
            asset_file = await db.get(AssetFile, file_id)
            if not asset_file:
                return Res.error("E-10124", message="File not found", http_status_code=404)

            if asset_file.asset_id != asset_id:
                return Res.error("E-10124", message="File not found", http_status_code=404)
            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found", http_status_code=404
                )

            file_bytes, content_type = FileStorageManager.get_file_object(
                asset_file.key, storage_type=asset_file.storage_server
            )

            action_map = {
                AssetFileType.AGGREGATOR_REPORT.value: AuditLogScenario.DOWNLOADED_AGGREGATOR_FILE,
                AssetFileType.SCADA_REPORT.value: AuditLogScenario.DOWNLOADED_SCADA_FILE,
                AssetFileType.INTERNAL_APPRAISAL_REPORT.value: AuditLogScenario.DOWNLOADED_IAR_FILE,
                AssetFileType.MERGED_SCADA_AGGREGATOR.value: AuditLogScenario.MERGED_DATASET_DOWNLOADED,
                AssetFileType.OPTIMIZED_DATASET.value: AuditLogScenario.OPTIMIZED_DATASET_DOWNLOADED,
            }
            download_action = action_map.get(asset_file.type)
            if download_action:
                period = (
                    asset_file.projection_start_date.strftime("%B-%Y")
                    if asset_file.projection_start_date
                    else "N/A"
                )
                await audit_logs(
                    db=db,
                    redis=redis,
                    user_id=current_user.get("user_id"),
                    user_role=current_user.get("role"),
                    module=self._get_audit_module(asset),
                    action=download_action,
                    before={
                        "File History Record": period,
                        "File": asset_file.name,
                        "Download Status": "Not Requested",
                    },
                    after={
                        "File History Record": period,
                        "File": asset_file.name,
                        "Download Status": "Requested",
                    },
                    resource_id=asset.asset_id,
                )
                await db.commit()

            return StreamingResponse(
                BytesIO(file_bytes),
                media_type=content_type,
                headers={
                    "Content-Disposition": f'attachment; filename="{asset_file.name}"'
                },
            )
        except Exception:
            traceback.print_exc()
            return Res.error("E-10001")

    async def generate_optimized_dataset(
        self,
        db: AsyncSession,
        redis: Redis,
        payload: GenerateOptmizedFile,
        asset_id: int,
        current_user,
        backgroundTask: BackgroundTasks,
    ):
        try:
            # 1. Fetch Merged Dataset
            merged_file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.id == payload.merged_file_id,
                )
            )
            merged_file = merged_file_query.scalar_one_or_none()
            if not merged_file:
                return Res.error(
                    "E-10100",
                    message="Merged dataset is not available.",
                    http_status_code=404,
                )

            asset = await db.get(Asset, asset_id)
            if not asset:
                return Res.error(
                    "E-10034", message="Asset not found.", http_status_code=404
                )

            if asset.type == AssetType.SOLAR.value:
                return Res.error(
                    "E-10120",
                    message="Optimization is not applicable for Solar assets.",
                    http_status_code=422,
                )

            opt_query = await db.execute(
                select(AssetOptimizationParameter).where(
                    AssetOptimizationParameter.asset_id == asset_id
                )
            )
            opt = opt_query.scalar_one_or_none()
            if not opt:
                return Res.error(
                    "E-10126",
                    message="Required input data (asset config) is missing.",
                    http_status_code=422,
                )

            usable_capacity_mwh = float(opt.usable_capacity_mwh)
            eff = math.sqrt(float(opt.round_trip_efficiency_pct) / 100.0)
            if eff <= 0 or eff > 1:
                return Res.error(
                    "E-10126",
                    message="Invalid round-trip efficiency configured.",
                    http_status_code=422
                )

            lp_params = {
                "eff": 0.933,
                "m_charge": 4.2,
                "m_discharge": 7.5,
                "min_soc": 0.42,
                "max_soc": 7.98,
                "m_throughput": 12.6,
            }

            # 3. Load and Normalize Data
            file_obj, _ = FileStorageManager.get_file_object(
                merged_file.key, storage_type=merged_file.storage_server
            )
            df = pd.read_excel(BytesIO(file_obj))

            df.columns = [
                c.lower().strip().replace(" ", "_").replace("-", "_")
                for c in df.columns
            ]

            # Mapping based on your DEBUG output
            timestamp_col = "timestamp"
            epex_col = "day_ahead_price_(epex)"
            sffr_col = "sffr_clearing_price"

            df[timestamp_col] = pd.to_datetime(df[timestamp_col])
            optimized_rows = []

            # Process Daily Optimization
            for day, day_df in df.groupby(df[timestamp_col].dt.date):
                if len(day_df) == 48:
                    day_df = (
                        day_df.sort_values(timestamp_col).copy().reset_index(drop=True)
                    )

                    # Timestamp continuity check (30-minute intervals)
                    ts = pd.to_datetime(day_df[timestamp_col])
                    if (ts.diff().dropna() != pd.Timedelta(minutes=30)).any():
                        continue

                    # Market Logic
                    day_df = self._apply_market_logic(day_df)

                    # RUN DAILY STRATEGY FIRST (Sets up baseline + EFA placeholders)
                    day_df = self._calculate_daily_strategy(
                        day_df, lp_params, epex_col, sffr_col
                    )

                    # N EFA BLOCK STRATEGY SECOND (Cleanly overrides the EFA placeholders)
                    day_df = self._calculate_efa_block_strategy(
                        day_df, lp_params, epex_col, sffr_col
                    )

                    # RUN MULTI-MARKET OPTIMIZATION LAST
                    day_df = self._run_multi_market_lp(day_df, lp_params, sffr_col)

                    optimized_rows.append(day_df)

            if not optimized_rows:
                return Res.error(
                    "E-10127",
                    message="No complete continuous days found for optimization.",
                    http_status_code=422,
                )

            # one way flow, only allow progression of asset status, never regression. This is to prevent accidental data loss from re-optimization
            if asset.status == AssetStatus.DRAFT.value:
                asset.status = AssetStatus.ANALYSIS_READY.value

            final_df = pd.concat(optimized_rows)

            column_order = [
                "Timestamp",
                "Optimised_Net_MWh_Daily",
                "Optimised_SoC_Daily",
                "Strategy_Selected_Daily",
                "Optimised_Revenue_Daily",
                "Optimised_Net_MWh_EFA",
                "Optimised_SoC_EFA",
                "Strategy_Selected_EFA",
                "Optimised_Revenue_EFA",
                "Optimised_Net_MWh_Multi",
                "Optimised_SoC_Multi",
                "Strategy_Selected_Multi",
                "Market_Used_Multi",
                "Optimised_Revenue_Multi",
                "Market_Spread",
                "Best_Buy_Price",
                "Best_Sell_Price",
                "Best_Buy_Market",
                "Best_Sell_Market",
            ]

            rename_map = {
                "timestamp": "Timestamp",
                "optimised_net_mwh_daily": "Optimised_Net_MWh_Daily",
                "optimised_soc_daily": "Optimised_SoC_Daily",
                "strategy_selected_daily": "Strategy_Selected_Daily",
                "optimised_revenue_daily": "Optimised_Revenue_Daily",
                "optimised_net_mwh_efa": "Optimised_Net_MWh_EFA",
                "optimised_soc_efa": "Optimised_SoC_EFA",
                "strategy_selected_efa": "Strategy_Selected_EFA",
                "optimised_revenue_efa": "Optimised_Revenue_EFA",
                "optimised_net_mwh_multi": "Optimised_Net_MWh_Multi",
                "optimised_soc_multi": "Optimised_SoC_Multi",
                "strategy_selected_multi": "Strategy_Selected_Multi",
                "market_used_multi": "Market_Used_Multi",
                "optimised_revenue_multi": "Optimised_Revenue_Multi",
                "market_spread": "Market_Spread",
                "best_buy_price": "Best_Buy_Price",
                "best_sell_price": "Best_Sell_Price",
                "best_buy_market": "Best_Buy_Market",
                "best_sell_market": "Best_Sell_Market",
            }
            final_df = final_df.rename(columns=rename_map)[column_order]

            start_dt = (
                self._get_datetime(final_df["Timestamp"].iloc[0])
                if final_df["Timestamp"].iloc[0]
                else None
            )
            end_dt = (
                self._get_datetime(final_df["Timestamp"].iloc[-1])
                if final_df["Timestamp"].iloc[-1]
                else None
            )

            # 6. Save Optimized File
            file_name = f"Optimized_Dataset_{asset_id}.csv"
            csv_buffer = BytesIO()
            final_df.to_csv(csv_buffer, index=False)
            csv_bytes = csv_buffer.getvalue()

            storage_path = f"assets/asset-{asset_id}/optimized-datasets/"
            stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}-{file_name}"
            FileStorageManager.upload_file(
                csv_bytes, stored_name, storage_path, is_encrypted=False
            )

            optmized_file = None
            existing_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                    AssetFile.month == merged_file.month,
                    AssetFile.year == merged_file.year,
                )
            )

            # 7. Update DB record
            optmized_file = existing_query.scalars().first()
            if optmized_file:
                optmized_file.name = stored_name
                optmized_file.key = f"{storage_path}{stored_name}"
                optmized_file.size = len(csv_bytes)
                optmized_file.row = len(final_df)
                optmized_file.month = merged_file.month
                optmized_file.year = merged_file.year
                optmized_file.storage_server = FileStorageManager.STORAGE_TYPE
                optmized_file.uploaded_at = datetime.now(timezone.utc)
                optmized_file.projection_start_date = start_dt
                optmized_file.projection_end_date = end_dt

            else:
                optmized_file = AssetFile(
                    asset_id=asset_id,
                    type=AssetFileType.OPTIMIZED_DATASET.value,
                    month=merged_file.month,
                    year=merged_file.year,
                    name=file_name,
                    key=f"{storage_path}{stored_name}",
                    size=len(csv_bytes),
                    row=len(final_df),
                    is_active=True,
                    storage_server=FileStorageManager.STORAGE_TYPE,
                    uploaded_at=datetime.now(timezone.utc),
                    projection_start_date=start_dt,
                    projection_end_date=end_dt,
                )
                db.add(optmized_file)
                await db.flush()
            await audit_logs(
                db=db,
                redis=redis,
                user_id=current_user.get("user_id"),
                user_role=current_user.get("role"),
                module=self._get_audit_module(asset),
                action=AuditLogScenario.OPTIMIZED_DATASET_GENERATED,
                before={
                    "Merged Dataset": merged_file.name,
                    "Optimized Dataset": "Not Available",
                },
                after={
                    "Optimized Dataset": file_name,
                    "Total Rows": len(final_df),
                },
                resource_id=f"AST-{asset.id:03d}",
            )
            await db.commit()

            backgroundTask.add_task(
                asset_computation_task.kiq,
                asset_id=asset_id,
                month=optmized_file.month,
                year=optmized_file.year,
                dependencies=[
                    OptimizedDataFrame.__name__,
                    YearlyOptimizedDataFrame.__name__,
                    MergedDataFrame.__name__,
                    YearlyMergedDataFrame.__name__,
                ],
            )

            return Res.success(
                "S-10052",
                data={
                    "id": optmized_file.id,
                    "name": file_name,
                    "asset_id": asset_id,
                    "month": optmized_file.month,
                    "year": optmized_file.year,
                },
            )

        except Exception as e:
            traceback.print_exc()
            return Res.error("E-10030", errors=[str(e)])

    def _apply_market_logic(self, df):
        # Normalized market names
        markets = [
            "day_ahead_price_(epex)",
            "gb_isem_intraday_1_price",
            "da_hh_price",
            "ssp",
            "sbp",
        ]

        # Priority mapping
        priority_map = {
            "day_ahead_price_(epex)": ("EPEX", 1),
            "gb_isem_intraday_1_price": ("ISEM", 2),
            "da_hh_price": ("DA_HH", 3),
            "ssp": ("SSP", 4),
            "sbp": ("SBP", 5),
        }

        def get_best(row, mode="max"):
            best_val, best_market, current_priority = None, None, 99
            for col in markets:
                if col not in row:
                    continue
                val = row[col]
                m_name, m_priority = priority_map[col]
                if (
                    best_val is None
                    or (mode == "max" and val > best_val)
                    or (mode == "min" and val < best_val)
                ):
                    best_val, best_market, current_priority = val, m_name, m_priority
                elif val == best_val and m_priority < current_priority:
                    best_market, current_priority = m_name, m_priority
            return best_val, best_market

        df["best_buy_price"], df["best_buy_market"] = zip(
            *df.apply(lambda r: get_best(r, "min"), axis=1)
        )
        df["best_sell_price"], df["best_sell_market"] = zip(
            *df.apply(lambda r: get_best(r, "max"), axis=1)
        )
        df["market_spread"] = df["best_sell_price"] - df["best_buy_price"]
        return df

    def _calculate_daily_strategy(self, df, p, epex_col, sffr_col):
        if sffr_col not in df.columns:
            print(f"WARNING: '{sffr_col}' not found. Defaulting SFFR revenue to 0.")
            sffr_daily_val = 0.0
        else:
            sffr_daily_val = (7.0 * df[sffr_col] * 0.5).sum()

        # EPEX LP
        epex_res = self._core_lp_engine(
            df, p, buy_price_col=epex_col, sell_price_col=epex_col
        )
        epex_daily_val = epex_res["total_revenue"]

        if epex_daily_val > sffr_daily_val:
            df["strategy_selected_daily"] = "EPEX"
            df["optimised_net_mwh_daily"] = epex_res["net_mwh"]
            df["optimised_soc_daily"] = epex_res["soc"]
            df["optimised_revenue_daily"] = df["optimised_net_mwh_daily"] * df[epex_col]
        else:
            df["strategy_selected_daily"] = "SFFR"
            df["optimised_net_mwh_daily"] = 0.0
            df["optimised_soc_daily"] = 4.2
            df["optimised_revenue_daily"] = sffr_daily_val / 48

        # EFA Placeholders
        df["optimised_net_mwh_efa"] = df["optimised_net_mwh_daily"]
        df["optimised_soc_efa"] = df["optimised_soc_daily"]
        df["optimised_revenue_efa"] = df["optimised_revenue_daily"]
        df["strategy_selected_efa"] = df["strategy_selected_daily"]
        return df

    def _solve_efa_block_lp(
        self,
        epex_prices,
        initial_soc,
        p,
        remaining_throughput_mwh,
        debug_context: str = "",
    ):
        prob = LpProblem("EFA_Block_LP", LpMaximize)
        n = 4

        if p.get("eff") is None or float(p["eff"]) <= 0 or float(p["eff"]) > 1:
            raise Exception(
                "E-10129|Optimization constraint validation failed (invalid efficiency)."
            )

        if float(p.get("m_charge", 0)) <= 0 or float(p.get("m_discharge", 0)) <= 0:
            raise Exception(
                "E-10129|Optimization constraint validation failed (invalid charge/discharge limits)."
            )

        if initial_soc < p["min_soc"] - 1e-9 or initial_soc > p["max_soc"] + 1e-9:
            raise Exception(
                "E-10129|Optimization constraint validation failed (initial SoC out of bounds)."
            )

        if p["min_soc"] >= p["max_soc"]:
            raise Exception(
                "E-10129|Optimization constraint validation failed (SoC min/max invalid)."
            )

        if remaining_throughput_mwh is None or float(remaining_throughput_mwh) < -1e-9:
            raise Exception(
                "E-10129|Optimization constraint validation failed (invalid remaining throughput)."
            )

        charge = [LpVariable(f"charge_{i}", 0, p["m_charge"]) for i in range(n)]
        discharge = [
            LpVariable(f"discharge_{i}", 0, p["m_discharge"]) for i in range(n)
        ]
        soc = [LpVariable(f"soc_{i}", p["min_soc"], p["max_soc"]) for i in range(n)]

        if len(epex_prices) != 4:
            raise Exception("E-10127|Invalid EFA block formation.")

        try:
            epex_prices = [float(x) for x in epex_prices]
        except Exception as _:
            raise Exception("E-10128|Price extraction failed for EPEX prices.")

        if any((pd.isna(x) or (not math.isfinite(x))) for x in epex_prices):
            raise Exception("E-10128|Price extraction failed for EPEX prices.")

        prob += lpSum(
            [(discharge[i] - charge[i]) * float(epex_prices[i]) * 0.5 for i in range(n)]
        )
        prob += lpSum([discharge[i] * 0.5 for i in range(n)]) <= max(
            0.0, float(remaining_throughput_mwh)
        )

        for i in range(n):
            prev_soc = initial_soc if i == 0 else soc[i - 1]
            prob += soc[i] == prev_soc + (charge[i] * p["eff"] * 0.5) - (
                discharge[i] / p["eff"] * 0.5
            )

        prob.solve(PULP_CBC_CMD(msg=0))
        if prob.status != 1:
            raise Exception(f"E-10131|LP solver failed to converge for EFA block.")

        charge_vals = [value(charge[i]) for i in range(n)]
        discharge_vals = [value(discharge[i]) for i in range(n)]
        soc_vals = [value(soc[i]) for i in range(n)]

        if any(v is None for v in (charge_vals + discharge_vals + soc_vals)):
            raise Exception(
                f"E-10131|LP solver returned incomplete variable values for EFA block."
            )

        # Constraint validation (US-2816) on the returned solution
        eps = 1e-6
        m_charge = float(p["m_charge"])
        m_discharge = float(p["m_discharge"])
        min_soc = float(p["min_soc"])
        max_soc = float(p["max_soc"])
        eff = float(p["eff"])

        for i in range(n):
            c = float(charge_vals[i])
            d = float(discharge_vals[i])
            s = float(soc_vals[i])

            if c < -eps or c > m_charge + eps:
                raise Exception(
                    "E-10129|Optimization constraint validation failed (charge out of bounds)."
                )
            if d < -eps or d > m_discharge + eps:
                raise Exception(
                    "E-10129|Optimization constraint validation failed (discharge out of bounds)."
                )
            if s < min_soc - eps or s > max_soc + eps:
                raise Exception(
                    "E-10129|Optimization constraint validation failed (SoC out of bounds)."
                )

            prev_soc = float(initial_soc) if i == 0 else float(soc_vals[i - 1])
            expected_soc = prev_soc + (c * eff * 0.5) - (d / eff * 0.5)
            if abs(s - expected_soc) > 1e-4:
                raise Exception(
                    "E-10129|Optimization constraint validation failed (SoC transition mismatch)."
                )

        discharged_mwh = sum([float(discharge_vals[i]) * 0.5 for i in range(n)])
        if discharged_mwh > float(remaining_throughput_mwh) + eps:
            raise Exception(
                "E-10129|Optimization constraint validation failed (throughput exceeded)."
            )

        net_mwh = [
            (float(discharge_vals[i]) - float(charge_vals[i])) * 0.5 for i in range(n)
        ]

        obj_val = value(prob.objective)

        if obj_val is None:
            obj_val = 0.0

        if obj_val is None or pd.isna(obj_val) or (not math.isfinite(float(obj_val))):
            raise Exception(
                "E-10131|LP solver returned invalid objective for EFA block."
            )
        return {
            "charge_mw": charge_vals,
            "discharge_mw": discharge_vals,
            "net_mwh": net_mwh,
            "soc": soc_vals,
            "discharged_mwh": discharged_mwh,
            "total_revenue": float(obj_val),
        }

    def _calculate_efa_block_strategy(self, df, p, epex_col, sffr_col):
        if epex_col not in df.columns:
            raise Exception(
                "E-10126|Required input data is missing for EFA optimization."
            )

        if sffr_col not in df.columns:
            logger.warning(f"'{sffr_col}' not found. Defaulting SFFR revenue to 0.")
            sffr_prices = [0.0] * len(df)
        else:
            sffr_prices = df[sffr_col].tolist()

        epex_prices = df[epex_col].tolist()

        if len(df) != 48:
            raise Exception(
                "E-10127|Timestamp completeness validation failed for EFA optimization."
            )

        if any(pd.isna(x) for x in sffr_prices):
            raise Exception("E-10128|Price extraction failed for SFFR prices.")

        soc_prev = float(p.get("initial_soc", 4.2))
        remaining_throughput = float(p["m_throughput"])

        net_all = []
        soc_all = []
        revenue_all = []
        strategy_all = []

        for block_id in range(12):
            start = block_id * 4
            end = start + 4
            epex_block = epex_prices[start:end]
            sffr_block = sffr_prices[start:end]

            if len(epex_block) != 4:
                raise Exception(
                    "E-10127|Block formation is incorrect for EFA optimization."
                )

            try:
                sffr_block_val = sum([7.0 * float(v) * 0.5 for v in sffr_block])
            except Exception as _:
                raise Exception("E-10130|SFFR block revenue calculation failed.")

            epex_res = self._solve_efa_block_lp(
                epex_prices=epex_block,
                initial_soc=soc_prev,
                p=p,
                remaining_throughput_mwh=remaining_throughput,
                debug_context=f"(block_id={block_id})",
            )
            epex_block_val = float(epex_res["total_revenue"])

            if epex_block_val >= sffr_block_val:
                strategy = "EPEX"
                net_block = epex_res["net_mwh"]
                soc_block = epex_res["soc"]
                try:
                    revenue_block = [
                        float(net_block[i]) * float(epex_block[i]) for i in range(4)
                    ]
                except Exception as _:
                    raise Exception("E-10130|EPEX block revenue calculation failed.")

                soc_prev = float(soc_block[-1])
                remaining_throughput = max(
                    0.0, remaining_throughput - float(epex_res["discharged_mwh"])
                )
            else:
                strategy = "SFFR"
                net_block = [0.0] * 4
                soc_block = [float(soc_prev)] * 4
                revenue_block = [float(sffr_block_val) / 4.0] * 4

            net_all.extend(net_block)
            soc_all.extend(soc_block)
            revenue_all.extend(revenue_block)
            strategy_all.extend([strategy] * 4)

        df["strategy_selected_efa"] = strategy_all
        df["optimised_net_mwh_efa"] = net_all
        df["optimised_soc_efa"] = soc_all
        df["optimised_revenue_efa"] = revenue_all
        return df

    def _run_multi_market_lp(self, df, p, sffr_col):
        # Run Multi-Market LP Solver
        multi_res = self._core_lp_engine(
            df, p, buy_price_col="best_buy_price", sell_price_col="best_sell_price"
        )
        multi_market_daily_revenue = multi_res["total_revenue"]

        # Calculate SFFR Revenue (7 MW * 0.5h * SFFR Price)
        if sffr_col in df.columns:
            sffr_per_period = 7.0 * df[sffr_col] * 0.5
            total_sffr_daily_revenue = sffr_per_period.sum()
        else:
            total_sffr_daily_revenue = 0.0

        # Strategy Selection (Daily Level)
        if total_sffr_daily_revenue > multi_market_daily_revenue:
            # SFFR WINS
            df["strategy_selected_multi"] = "SFFR"
            df["optimised_net_mwh_multi"] = 0.0
            df["optimised_soc_multi"] = 4.2  # Initial SoC
            df["optimised_revenue_multi"] = total_sffr_daily_revenue / 48
            df["market_used_multi"] = "SFFR"
        else:
            # MULTI-MARKET WINS
            df["strategy_selected_multi"] = "Multi-Market"
            df["optimised_net_mwh_multi"] = multi_res["net_mwh"]
            df["optimised_soc_multi"] = multi_res["soc"]

            # Helper to determine Market Used
            def get_market(row_idx):
                net_val = multi_res["net_mwh"][row_idx]
                if net_val > 0.0001:
                    return f"Sell-{df.iloc[row_idx]['best_sell_market']}"
                if net_val < -0.0001:
                    return f"Buy-{df.iloc[row_idx]['best_buy_market']}"
                return "Idle"

            df["market_used_multi"] = [get_market(i) for i in range(48)]

            # FIXED: Use the exact per-period revenues calculated by the solver
            df["optimised_revenue_multi"] = multi_res["per_period_revenues"]

        return df

    def _core_lp_engine(self, df, p, buy_price_col, sell_price_col):
        prob = LpProblem("Battery_Optimization", LpMaximize)
        intervals = range(48)
        charge = LpVariable.dicts("Charge", intervals, 0, p["m_charge"])
        discharge = LpVariable.dicts("Discharge", intervals, 0, p["m_discharge"])
        soc = LpVariable.dicts("SoC", intervals, p["min_soc"], p["max_soc"])

        buy_p = df[buy_price_col].values
        sell_p = df[sell_price_col].values

        # Capture individual interval calculations
        interval_revenues = []
        for i in intervals:
            interval_revenues.append(
                (discharge[i] * sell_p[i] * 0.5) - (charge[i] * buy_p[i] * 0.5)
            )

        prob += lpSum(interval_revenues)
        prob += lpSum([discharge[i] * 0.5 for i in intervals]) <= p["m_throughput"]

        for i in intervals:
            prev_soc = 4.2 if i == 0 else soc[i - 1]
            prob += soc[i] == prev_soc + (charge[i] * p["eff"] * 0.5) - (
                discharge[i] / p["eff"] * 0.5
            )

        prob.solve(PULP_CBC_CMD(msg=0))

        return {
            "net_mwh": [
                (value(discharge[i]) - value(charge[i])) * 0.5 for i in intervals
            ],
            "soc": [value(soc[i]) for i in intervals],
            "total_revenue": (
                value(prob.objective) if value(prob.objective) is not None else 0.0
            ),
            # Return the exact revenue computed for each period
            "per_period_revenues": [
                value(rev) if value(rev) is not None else 0.0
                for rev in interval_revenues
            ],
        }

    async def delete_asset_file(
        self, db: AsyncSession, redis: Redis, asset_id: int, file_id: int, current_user: dict, backgroundTask: BackgroundTasks
    ):
        file_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.id == file_id,
            )
        )

        child_files = []
        asset_file = file_query.scalars().first()

        if not asset_file:
            return Res.error("E-10124", http_status_code=404)

        asset_file_type = asset_file.type
        is_agg_scada_file = asset_file_type in [
            AssetFileType.SCADA_REPORT.value,
            AssetFileType.AGGREGATOR_REPORT.value,
        ]

        await db.delete(asset_file)

        # only delete if we are removing Add or Scada report.
        is_merged_file_delete = False
        is_optimized_file_delete = False
        
        if is_agg_scada_file:
            merged_file_query = await db.execute(
                select(AssetFile).where(
                    AssetFile.asset_id == asset_id,
                    AssetFile.type == AssetFileType.MERGED_SCADA_AGGREGATOR.value,
                    AssetFile.month == asset_file.month,
                    AssetFile.year == asset_file.year,
                )
            )
            merged_file = merged_file_query.scalars().first()
            if merged_file:
                child_files.append(
                    {"file_id": merged_file.id, "file_type": merged_file.type}
                )
                await db.delete(merged_file)
                is_merged_file_delete = True

                optmized_file_query = await db.execute(
                    select(AssetFile).where(
                        AssetFile.asset_id == asset_id,
                        AssetFile.type == AssetFileType.OPTIMIZED_DATASET.value,
                        AssetFile.month == merged_file.month,
                        AssetFile.year == merged_file.year,
                    )
                )

                optmized_file = optmized_file_query.scalars().first()
                if optmized_file:
                    child_files.append(
                        {"file_id": optmized_file.id, "file_type": optmized_file.type}
                    )
                    await db.delete(optmized_file)
                    is_optimized_file_delete = True

        asset = await db.get(Asset, asset_id)
        if asset:
            # One step less that actual since current_step is basically till which step is completed. So if we are removing SCADA, we are going back to just after aggregator upload step
            # if asset has reached REVIEW step, it means optimization parameters were already saved once,
            # so we don't downgrade the step. For all other steps, we move it to OPTIMIZATION_CONFIGURATION
            if asset.current_step != AssetSteps.REVIEW.value:
                asset.current_step = (
                    AssetSteps.OPTIMIZATION_CONFIGURATION.value
                    if is_agg_scada_file
                    else AssetSteps.UPLOAD_AGGREGATOR_SCADA.value
                )
                if is_agg_scada_file:
                    asset.status = AssetStatus.DRAFT.value

        action_map = {
            AssetFileType.AGGREGATOR_REPORT.value: AuditLogScenario.AGGREGATOR_REPORT_REMOVED,
            AssetFileType.SCADA_REPORT.value: AuditLogScenario.SCADA_REPORT_REMOVED,
            AssetFileType.INTERNAL_APPRAISAL_REPORT.value: AuditLogScenario.INTERNAL_APPRAISAL_REPORT_REMOVED,
        }
        delete_action = action_map.get(
            asset_file_type, AuditLogScenario.SCADA_REPORT_REMOVED
        )
        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=self._get_audit_module(asset),
            action=delete_action,
            before={"File": asset_file.name},
            after={"File": "Removed"},
            resource_id=asset.asset_id,
        )

        await db.commit(),

        depedency_map = []
        if (is_merged_file_delete):
            depedency_map.append(MergedDataFrame.__name__)
            depedency_map.append(YearlyMergedDataFrame.__name__)
        if (is_optimized_file_delete):
            depedency_map.append(OptimizedDataFrame.__name__)
            depedency_map.append(YearlyOptimizedDataFrame.__name__)

        backgroundTask.add_task(
            asset_analytics_deletion_task.kiq,
            asset_id=asset_id,
            month=asset_file.month,
            year=asset_file.year,
            dependencies=depedency_map,
        )

        return Res.success(
            "S-10053",
            message="Asset file removed successfully.",
            data={
                "file_id": file_id,
                "asset_id": asset_id,
                "file_type": asset_file_type,
                "child_files": child_files,
            },
        )

    async def submit_asset_for_approval(
        self,
        db: AsyncSession,
        redis: Redis,
        user_db: AsyncSession,
        asset_id: int,
        current_user: dict,
        background_task: BackgroundTasks,
    ):

        # ROLE CHECK
        if current_user.get("role") != UserRole.ANALYST.value:
            return Res.error(
                "E-10013", message="Only analysts can submit assets for approval", http_status_code=403
            )

        # PLATFORM CHECK
        if Platform.AMD.value not in current_user["platform"]:
            return Res.error(
                "E-10013", message="You are not authorized to perform this action", http_status_code=403
            )

        # FETCH ASSET
        asset = await db.get(Asset, asset_id)
        if not asset:
            return Res.error("E-10034", message="Asset not found", http_status_code=404)

        # INVALID STATE CHECK
        if asset.status in [AssetStatus.ACTIVE.value, AssetStatus.INACTIVE.value]:
            return Res.error(
                "E-10138", message="Cannot submit active/inactive asset for approval", http_status_code=409
            )

        # IDEMPOTENCY
        if asset.status == AssetStatus.PENDING_APPROVAL.value:
            return Res.success("S-10063", data={"id": asset.id, "status": asset.status})

        # Optimization Parameters
        opt_query = await db.execute(
            select(AssetOptimizationParameter).where(
                AssetOptimizationParameter.asset_id == asset_id
            )
        )
        optimization_params = opt_query.scalars().first()
        if not optimization_params:
            return Res.error("E-10116", message="Optimization parameters are missing", http_status_code=422)

        # Aggregator Report
        agg_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.AGGREGATOR_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )
        aggregator_file = agg_query.scalars().first()

        if not aggregator_file:
            return Res.error("E-10117", message="Active aggregator report is missing", http_status_code=422)

        # SCADA Report
        scada_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.SCADA_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )

        scada_file = scada_query.scalars().first()
        if not scada_file:
            return Res.error("E-10118", message="Active SCADA report is missing", http_status_code=422)

        # IAR Report
        iar_query = await db.execute(
            select(AssetFile).where(
                AssetFile.asset_id == asset_id,
                AssetFile.type == AssetFileType.INTERNAL_APPRAISAL_REPORT.value,
                AssetFile.is_active.is_(True),
            )
        )
        iar_file = iar_query.scalars().first()

        if not iar_file:
            return Res.error("E-10119", message="Active IAR report is missing", http_status_code=422)

        # UPDATE ASSET
        old_status = asset.status
        asset.status = AssetStatus.PENDING_APPROVAL.value
        asset.submitted_by = current_user.get("id")
        asset.submitted_at = datetime.now(timezone.utc)

        # AUDIT LOG
        await audit_logs(
            db=db,
            redis=redis,
            user_id=current_user.get("user_id"),
            user_role=current_user.get("role"),
            module=AuditLogModules.ASSET_ONBOARDING,
            action=AuditLogScenario.ASSET_SUBMITTED_FOR_APPROVAL,
            before={
                "Asset Status": "Analysis ready",
                "Submitted By": "Not Available",
                "Submitted On": "Not Available",
                "Asset Sections": "Editable",
            },
            after={
                "Asset Status": "Pending Approval",
                "Submitted By": current_user.get("name"),
                "Submitted On": asset.submitted_at.strftime("%d-%b-%Y, %I:%M %p"),
                "Asset Sections": "Read-only",
            },
            resource_id=asset.asset_id,
        )
        await db.commit()
        await db.refresh(asset)

        admins_query = await user_db.execute(
            select(User).where(
                User.role == UserRole.ADMIN.value, User.is_deleted == False
            )
        )

        # trigger emails to all emails
        admins = admins_query.scalars().all()
        template_ref = 9
        template = await template_utils.get_by_ref(user_db, template_ref)
        for admin in admins:
            background_task.add_task(
                self._send_asset_approval_request_email,
                admin.email,
                admin.name,
                current_user.get("name"),
                asset,
                template,
            )
        return Res.success(
            "S-10063",
            data={
                "id": asset.id,
                "status": asset.status,
                "submitted_at": (
                    asset.submitted_at.isoformat()
                    if asset.submitted_at and getattr(asset.submitted_at, "isoformat")
                    else None
                ),
            },
        )

    async def _send_asset_approval_request_email(
        self,
        admin_email: str,
        admin_name: str,
        analyst_name: str,
        asset: Asset,
        template,
    ):
        if template:
            subject = template_utils.get_subject(template, asset_name=asset.name)
            body = template_utils.get_message(
                template,
                admin_name=admin_name,
                analyst_name=analyst_name,
                asset_name=asset.name,
                asset_type=asset.type,
                asset_owner_organization=asset.organization_id,
                submission_date=(
                    asset.submitted_at.strftime("%d %b %Y, %I:%M %p")
                    if asset.submitted_at and getattr(asset.submitted_at, "strftime")
                    else ""
                ),
                review_asset_url=f"{WEB_APP_URL}/asset-management/{asset.id}",
            )
            await MailUtils.send_365_async(
                recipient_list=[admin_email],
                subject=subject,
                html_message=body,
            )

    async def _send_asset_approved_email(
        self, analyst_email: str, analyst_name: str, admin_name: str, asset, template
    ):

        if template:
            subject = template_utils.get_subject(template, asset_name=asset.name)
            body = template_utils.get_message(
                template,
                analyst_name=analyst_name,
                admin_name=admin_name,
                asset_name=asset.name,
                approval_date=(
                    asset.activated_at.strftime("%d %b %Y, %I:%M %p")
                    if asset.activated_at and getattr(asset.activated_at, "strftime")
                    else ""
                ),
                asset_status=asset.status,
                view_asset_url=f"{WEB_APP_URL}/asset-management/onboarding/{asset.id}",
            )
            await MailUtils.send_365_async(
                recipient_list=[analyst_email],
                subject=subject,
                html_message=body,
            )
