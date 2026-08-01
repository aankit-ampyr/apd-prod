from typing import List, Literal
from python_common.exceptions.data_exception import DependencyNotAvailableError
from sqlalchemy.ext.asyncio import AsyncSession
from constants.enums import (
    AnalysisModules,
)
from sqlalchemy import delete, select
from models.analytics_result_model import AssetAnalyticsValues
from services.asset_analysis_helper import AnalysisServiceHelper
from .dependency_resolver import *
import logging

logger = logging.getLogger(__name__)

async def asset_computation(
    *,
    asset_id: int | Literal["all"],
    month: int | Literal["all"],
    year: int | Literal["all"],
    db: AsyncSession,
    dependencies: list[str] | None = None,
    modules: list[AnalysisModules] | None = None,
):
    logger.warning(f"Starting asset computation for asset_id={asset_id}, month={month}, year={year}")
    helper = AnalysisServiceHelper()

    logger.warning(f"Initializing dependency resolver for asset_id={asset_id}, month={month}, year={year}")
    resolver = DependencyResolver(
        helper=helper,
        db=db,
    )

    # ------------------------------------------------
    # Determine functions
    # ------------------------------------------------

    if dependencies:

        functions = get_compute_functions_for_dependencies(
            dependencies
        )

    elif modules:

        functions = get_compute_functions_for_modules(
            modules
        )

    else:

        functions = get_all_compute_functions()

    # ------------------------------------------------
    # Determine computation contexts
    # ------------------------------------------------

    logger.warning(f"Determining computation contexts for asset_id={asset_id}, month={month}, year={year}")
    if (
        asset_id != "all"
        and year != "all"
        and month != "all"
    ):
        contexts = [
            AnalyticsContext(
                asset_id=asset_id,
                year=year,
                month=month,
            )
        ]

    else:

        contexts = await resolve_computation_contexts(
            db=db,
            asset_id=asset_id,
            month=month,
            year=year,
        )

    logger.warning(f"Resolved {len(contexts)} contexts for computation")
    logger.warning(f"{contexts}")

    # ------------------------------------------------
    # Compute
    # ------------------------------------------------

    for context in contexts:

        for func in functions:

            meta = func.analytics_meta

            module = meta["module"]
            section = meta["section"]
            widget = meta["widget"]

            try:
                module = func.analytics_meta["module"]

                monthly = is_monthly_module(module)

                # Monthly widget cannot run against yearly context
                if monthly and context.month is None:
                    logger.warning(
                        "Skipping monthly function %s for yearly context %s",
                        func.__name__,
                        context,
                    )
                    continue
                
                results = await execute_compute_function(
                    helper=helper,
                    resolver=resolver,
                    context=context,
                    func=func,
                )

                for parameters, result in results:

                    await store_result(
                        db=db,
                        context=context,
                        module=module,
                        section=section,
                        widget=widget,
                        parameters=parameters,
                        result=result,
                    )

            except Exception:
                logger.exception(
                    "Failed computing %s for %s",
                    func.__name__,
                    context,
                )

    await db.commit()


async def asset_analytics_deletion(
    *,
    asset_id: int,
    month: int,
    year: int,
    dependencies: List[str] | None,
    modules: List[AnalysisModules] | None,
    db: AsyncSession,
):
    """
    Delete computed analytics affected by removal of source data.

    This only handles deletion/invalidation.

    Yearly recomputation can be triggered after this using the
    existing asset_computation flow.
    """

    # =========================================================
    # 1. Resolve affected compute functions
    # =========================================================

    if dependencies:
        affected_functions = get_compute_functions_for_dependencies(
            dependencies
        )
    else:
        affected_functions = get_all_compute_functions()

    # =========================================================
    # 2. Apply module filter
    # =========================================================

    if modules:
        module_functions = set(
            get_compute_functions_for_modules(modules)
        )

        affected_functions = [
            func
            for func in affected_functions
            if func in module_functions
        ]

    if not affected_functions:
        logger.info(
            "No analytics functions affected for "
            "asset=%s month=%s year=%s dependencies=%s",
            asset_id,
            month,
            year,
            dependencies,
        )

        return {
            "status": "success",
            "deleted": 0,
        }

    # =========================================================
    # 3. Only delete MONTHLY affected functions
    # =========================================================

    monthly_functions = []
    yearly_functions = []

    for func in affected_functions:
        if is_monthly_module(func.analytics_meta["module"]):
            monthly_functions.append(func)
        else:
            yearly_functions.append(func)

    logger.info(
        "Found %s affected functions, %s monthly functions",
        len(affected_functions),
        len(monthly_functions),
    )

    deleted_count = 0
    yearly_deleted = 0
    # =========================================================
    # 4. Delete their computed results (monthly only)
    # =========================================================
    try:

        for func in monthly_functions:

            meta = func.analytics_meta

            module = meta["module"]
            section = meta["section"]
            widget = meta["widget"]

            logger.info(
                "Deleting analytics "
                "asset=%s year=%s month=%s "
                "module=%s section=%s widget=%s",
                asset_id,
                year,
                month,
                module,
                section,
                widget,
            )

            stmt = delete(
                AssetAnalyticsValues
            ).where(
                AssetAnalyticsValues.asset_id == asset_id,
                AssetAnalyticsValues.year == year,
                AssetAnalyticsValues.month == month,
                AssetAnalyticsValues.module == module,
                AssetAnalyticsValues.section == section,
                AssetAnalyticsValues.widget == widget,
            )

            result = await db.execute(stmt)

            deleted_count += result.rowcount or 0

        await db.commit()

    except Exception:

        await db.rollback()

        logger.exception(
            "Analytics deletion failed for "
            "asset=%s year=%s month=%s",
            asset_id,
            year,
            month,
        )

        raise


    # =========================================================
    # 5. Delete their computed results (yearly only)
    # =========================================================
    try:
        helper = AnalysisServiceHelper()

        resolver = DependencyResolver(
            helper=helper,
            db=db,
        )

        yearly_context = AnalyticsContext(
            asset_id=asset_id,
            year=year,
            month=None,
        )

        yearly_recomputed = 0

        for func in yearly_functions:

            meta = func.analytics_meta

            module = meta["module"]
            section = meta["section"]
            widget = meta["widget"]

            logger.info(
                "Recomputing yearly analytics "
                "function=%s asset=%s year=%s "
                "module=%s section=%s widget=%s",
                func.__name__,
                asset_id,
                year,
                module,
                section,
                widget,
            )

            try:

                # =========================================
                # Resolve dependencies + compute
                # =========================================

                results = await execute_compute_function(
                    helper=helper,
                    resolver=resolver,
                    context=yearly_context,
                    func=func,
                )

                # =========================================
                # Store updated yearly results
                # =========================================

                for parameters, result in results:

                    await store_result(
                        db=db,
                        context=yearly_context,
                        module=module,
                        section=section,
                        widget=widget,
                        parameters=parameters,
                        result=result,
                    )

                yearly_recomputed += 1

                logger.info(
                    "Successfully recomputed yearly analytics "
                    "function=%s asset=%s year=%s",
                    func.__name__,
                    asset_id,
                    year,
                )

            except DependencyNotAvailableError:

                # We'll handle deletion of stale yearly row here.
                # For now, this tells us that after deleting the
                # monthly source, this yearly widget can no longer
                # be computed.

                logger.info(
                    "Yearly dependency unavailable "
                    "function=%s asset=%s year=%s",
                    func.__name__,
                    asset_id,
                    year,
                )

                # DELETE LOGIC WILL GO HERE
                stmt = delete(
                    AssetAnalyticsValues
                ).where(
                    AssetAnalyticsValues.asset_id == asset_id,
                    AssetAnalyticsValues.year == year,

                    # Yearly analytics are stored with month=NULL
                    AssetAnalyticsValues.month.is_(None),

                    AssetAnalyticsValues.module == module,
                    AssetAnalyticsValues.section == section,
                    AssetAnalyticsValues.widget == widget,
                )

                delete_result = await db.execute(stmt)

                deleted_rows = delete_result.rowcount or 0
                yearly_deleted += deleted_rows

                logger.info(
                    "Deleted yearly analytics "
                    "function=%s asset=%s year=%s rows=%s",
                    func.__name__,
                    asset_id,
                    year,
                    deleted_rows,
                )

        await db.commit()


    except Exception:
    
            await db.rollback()
    
            logger.exception(
                "Analytics deletion failed for "
                "asset=%s year=%s month=%s",
                asset_id,
                year,
                month,
            )
    
            raise
    
    logger.info(
        "Analytics deletion completed. "
        "asset=%s year=%s month=%s deleted=%s",
        asset_id,
        year,
        month,
        deleted_count,
    )

    return {
        "status": "success",
        "deleted": deleted_count,
    }