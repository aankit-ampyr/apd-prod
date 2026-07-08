"""
Project Management service for BESS platform.
Uses BESS DB for projects; fetches user details from User DB when needed.
"""

from datetime import datetime, time
from math import ceil
from os import stat
from typing import Optional, Set
from sqlalchemy import func, or_, select, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from fastapi import status as http_status
from constants.enums import (
    Platform,
    ProjectStatus,
    UserRole,
    SimulationStatus,
    SimulationSetupProgress,
)
from models import (
    Project,
    ProjectUserAssignment,
    User,
    Simulation,
    ProjectSimulationSequence,
)
from dtos.project_dto import (
    ProjectCreate,
    ProjectSearch,
    ProjectResponse,
    ProjectUpdate,
    ProjectUserResponse,
)
from utils.response_utils import Res
import traceback
from python_common.utils.common_utils import paginate
from utils.log_utils import audit_logs
from python_common.constants.enums import AuditLogModules, AuditLogScenario


class ProjectService:
    def _get_project_status(self, is_archived: bool, is_active: bool) -> ProjectStatus:
        if is_archived:
            status = ProjectStatus.ARCHIVED
        elif is_active:
            status = ProjectStatus.ACTIVE
        else:
            status = ProjectStatus.INACTIVE

        return status

    async def _get_user_details(self, user_db: AsyncSession, user_ids: Set):
        user_map = {}
        if user_ids:
            # Assuming User is the model for your second DB
            user_query = select(User.id, User.name, User.role, User.status).where(
                User.id.in_(list(user_ids))
            )
            user_results = await user_db.execute(user_query)
            user_map = {
                u.id: {"id": u.id, "name": u.name, "role": u.role, "status": u.status}
                for u in user_results.all()
            }
        return user_map

    def _map_project_to_response(
        self, project: Project, user_map: dict
    ) -> ProjectResponse:
        """
        Map Project model and user mapping to ProjectResponse DTO.
        """

        def get_user_data(user_id: int) -> ProjectUserResponse:
            u_info = user_map.get(user_id, {})
            return ProjectUserResponse(
                id=user_id,
                name=u_info.get("name", "Unknown"),
                role=u_info.get("role", UserRole.VIEWER),
            )

        # Determine status based on boolean flags
        if project.is_archived:
            status = ProjectStatus.ARCHIVED
        elif project.is_active:
            status = ProjectStatus.ACTIVE
        else:
            status = ProjectStatus.INACTIVE

        return ProjectResponse(
            id=project.id,
            proj_id=project.proj_id,
            name=project.name,
            description=project.description,
            owned_by=get_user_data(project.owned_by_user_id),
            created_by=get_user_data(project.created_by_user_id),
            assigned_users=[
                get_user_data(asn.user_id)
                for asn in project.assignments
                if asn.user_id != project.owned_by_user_id
            ],
            status=status,
            created_date=project.created_at,
            updated_date=project.updated_at,
        )

    async def create_project(
        self,
        payload: ProjectCreate,
        bess_db: AsyncSession,
        user_db: AsyncSession,
        current_user: dict,
    ):
        try:
            existing_project = await bess_db.execute(
                select(Project).where(
                    func.lower(Project.name) == func.lower(payload.name)
                )
            )

            if existing_project.scalar_one_or_none():
                return Res.error(
                    status_code="E-20028",
                    message="Project name already exists.",
                    http_status_code=http_status.HTTP_409_CONFLICT,
                )

            responsible_user = await user_db.execute(
                select(User).where(User.id == payload.responsible_user_id)
            )

            responsible_user_data = responsible_user.scalar_one_or_none()
            if responsible_user_data and (
                responsible_user_data.role != UserRole.ADMIN
                and responsible_user_data.role != UserRole.ANALYST
            ):
                return Res.error(
                    status_code="E-20029",
                    message="Selected responsible user must be a BESS Admin or Analyst.",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            if payload.responsible_user_id in payload.assigned_users:
                return Res.error(
                    status_code="E-20033",
                    message="The Responsible User cannot also be included in the Assigned Users list.",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            created_by_user_id = int(current_user.get("id"))
            responsible_user_id = (
                payload.responsible_user_id
                if payload.responsible_user_id
                else created_by_user_id
            )

            # Only admin and analyst can assign users
            if (
                current_user.get("role") not in [UserRole.ADMIN, UserRole.ANALYST]
                and payload.assigned_users
            ):
                return Res.error(
                    status_code="E-20004",
                    message="Only admin or analysts can assign users.",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            # validate assigned users
            if payload.assigned_users:
                assigned_users_query = await user_db.execute(
                    select(User).where(User.id.in_(payload.assigned_users))
                )
                assigned_users = assigned_users_query.scalars().all()
                if len(assigned_users) != len(set(payload.assigned_users)):
                    return Res.error(
                        status_code="E-20016",
                        message="One or more assigned users do not exist.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )
                for user in assigned_users:
                    if not user.status:
                        return Res.error(
                            status_code="E-20027",
                            message="Assigned users must be active.",
                            http_status_code=http_status.HTTP_400_BAD_REQUEST,
                        )
                    if user.role == UserRole.ADMIN:
                        return Res.error(
                            status_code="E-20033",
                            message="Admins users should not be assigned to projects.",
                            http_status_code=http_status.HTTP_400_BAD_REQUEST,
                        )

                # Prevent Creator and Responsible User from being assigned
                if (
                    created_by_user_id in payload.assigned_users
                    or responsible_user_id in payload.assigned_users
                ):
                    return Res.error(
                        status_code="E-20033",
                        message="Creator or Responsible User cannot be in the Assigned Users list.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

            new_project = Project(
                name=payload.name,
                description=payload.description,
                is_active=payload.status,
                owned_by_user_id=responsible_user_id,
                created_by_user_id=created_by_user_id,
            )

            bess_db.add(new_project)
            await bess_db.flush()  # To get the project ID for assignments
            await bess_db.refresh(new_project)  # ensure computed proj_id is available

            assigned_users = payload.assigned_users or []
            user_ids = {created_by_user_id, responsible_user_id}
            user_ids.update(assigned_users)
            user_map = await self._get_user_details(user_db, user_ids)

            # Add assignments (excluding the responsible user)
            assignments = []

            for user_id in assigned_users:
                if user_id != responsible_user_id:
                    assignments.append(
                        ProjectUserAssignment(
                            project_id=new_project.id,
                            user_id=user_id,
                            role=user_map[user_id]["role"],
                        )
                    )
            bess_db.add_all(assignments)

            await audit_logs(
                db=bess_db,
                user_id=f"USER-{current_user.get('id')}",
                user_role=current_user.get("role"),
                module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                action=AuditLogScenario.PROJECT_CREATED.value,  # Placeholder for Project Created
                resource_id=new_project.proj_id,
                before=None,
                after=f"Project Created: {new_project.name}",
            )

            await bess_db.commit()

            # Re-fetch with assignments pre-loaded for response mapping
            result = await bess_db.execute(
                select(Project)
                .where(Project.id == new_project.id)
                .options(selectinload(Project.assignments))
            )
            new_project = result.scalar_one()

            data = self._map_project_to_response(new_project, user_map)

            return Res.success(
                "S-20013",
                data=data.model_dump(mode="json"),
                http_status_code=http_status.HTTP_201_CREATED,
            )

        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error(
                "E-20001",
                message="Unable to create project. Please try again.",
                http_status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def edit_project(
        self,
        project_id: int,
        payload: ProjectUpdate,
        bess_db: AsyncSession,
        user_db: AsyncSession,
        current_user: dict,
    ):
        try:
            # Re-fetch with assignments pre-loaded for update and response mapping
            result = await bess_db.execute(
                select(Project)
                .where(Project.id == project_id)
                .options(selectinload(Project.assignments))
            )
            project = result.scalar_one_or_none()
            if not project:
                return Res.error(
                    status_code="E-20015",
                    message="Project not Found.",
                    http_status_code=http_status.HTTP_405_NOT_FOUND,
                )
            project_proj_id = project.proj_id

            user_id = int(current_user.get("id"))
            user_role = current_user.get("role")
            is_creator = project.created_by_user_id == user_id
            is_responsible_user = project.owned_by_user_id == user_id

            if not (user_role == UserRole.ADMIN or is_creator or is_responsible_user):
                return Res.error(
                    status_code="E-20004",
                    message="You do not have permission to edit this project.",
                    http_status_code=http_status.HTTP_401_UNAUTHORIZED,
                )

            # Only Admin and analyst  can modify assigned users
            if (
                current_user.get("role") not in [UserRole.ADMIN, UserRole.ANALYST]
                and payload.assigned_users
            ):
                return Res.error(
                    status_code="E-20004",
                    message="Only admin or analysts can assign users.",
                    http_status_code=http_status.HTTP_401_UNAUTHORIZED,
                )

            assigned_user_ids = payload.assigned_users or []
            assigned_users_query = await user_db.execute(
                select(User).where(User.id.in_(assigned_user_ids))
            )
            assigned_users = assigned_users_query.scalars().all()

            # Ensure all users exist
            if len(assigned_users) != len(set(assigned_user_ids)):
                return Res.error(
                    status_code="E-20016",
                    message="One or more assigned users do not exist.",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            for user in assigned_users:
                if not user.status:
                    return Res.error(
                        status_code="E-20027",
                        message="Assigned user must be active.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

                if user.role == UserRole.ADMIN:
                    return Res.error(
                        status_code="E-20033",
                        message="Admin users should not be assigned to projects.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

                # Prevent Creator and Responsible User from being assigned
                if (
                    project.created_by_user_id in assigned_user_ids
                    or project.owned_by_user_id in assigned_user_ids
                ):
                    return Res.error(
                        status_code="E-20033",
                        message="Creator or Responsible User cannot be in the assigned users list.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

            old_name = project.name
            old_description = project.description
            old_status = project.is_active
            old_owner = project.owned_by_user_id
            old_assignments = list(project.assignments)

            if payload.name is not None:
                if payload.name.lower() != project.name.lower():
                    existing_project = await bess_db.execute(
                        select(Project).where(
                            func.lower(Project.name) == func.lower(payload.name)
                        )
                    )
                    if existing_project.scalar_one_or_none():
                        return Res.error(
                            status_code="E-20028",
                            message="Project name already exists.",
                            http_status_code=http_status.HTTP_409_CONFLICT,
                        )
                project.name = payload.name

            if payload.description is not None:
                project.description = payload.description

            if payload.status is not None:
                project.is_active = payload.status

            if (
                payload.responsible_user_id is not None
                and payload.responsible_user_id != project.owned_by_user_id
            ):
                responsible_user = await user_db.execute(
                    select(User).where(User.id == payload.responsible_user_id)
                )
                responsible_user_data = responsible_user.scalar_one_or_none()
                if not responsible_user_data:
                    return Res.error(
                        status_code="E-20029",
                        message="Selected responsible user not found.",
                        http_status_code=http_status.HTTP_404_NOT_FOUND,
                    )
                if responsible_user_data and (
                    responsible_user_data.role != UserRole.ADMIN
                    and responsible_user_data.role != UserRole.ANALYST
                ):
                    return Res.error(
                        status_code="E-20029",
                        message="Selected responsible user must be a BESS Admin or Analyst.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

                previous_owner_id = project.owned_by_user_id
                project.owned_by_user_id = payload.responsible_user_id

                # Ensure the previous owner remains assigned
                prev_owner_assignment = await bess_db.execute(
                    select(ProjectUserAssignment).where(
                        ProjectUserAssignment.project_id == project.id,
                        ProjectUserAssignment.user_id == previous_owner_id,
                    )
                )
                if not prev_owner_assignment.scalar_one_or_none():
                    project.assignments.append(
                        ProjectUserAssignment(
                            project_id=project.id,
                            user_id=previous_owner_id,
                        )
                    )

            if payload.assigned_users is not None:
                if project.owned_by_user_id in payload.assigned_users:
                    return Res.error(
                        status_code="E-20033",
                        message="The Responsible User cannot also be included in the Assigned Users list.",
                        http_status_code=http_status.HTTP_400_BAD_REQUEST,
                    )

            # Get user IDs for fetching details (for assignments and response mapping)
            user_ids = {project.created_by_user_id, project.owned_by_user_id, old_owner}
            if payload.assigned_users is not None:
                user_ids.update(payload.assigned_users)

            for asn in project.assignments:
                user_ids.add(asn.user_id)

            user_map = await self._get_user_details(user_db, user_ids)

            def _format_assigned_users(assignments, u_map):
                roles = {"Admin": [], "Analyst": [], "Viewer": [], "Management": []}
                for asn in assignments:
                    try:
                        role_name = UserRole(asn.role).name.capitalize()
                        if role_name in roles:
                            roles[role_name].append(
                                u_map.get(asn.user_id, {}).get("name", "NA")
                            )
                    except ValueError:
                        pass
                formatted = []
                for r, users in roles.items():
                    formatted.append(f"{r}: {', '.join(users) if users else 'NA'}")
                return "Assigned users - " + ", ".join(formatted)

            old_assigned_str = _format_assigned_users(old_assignments, user_map)

            # Update assignments if provided
            if payload.assigned_users is not None:
                # Clear existing and add new to simplify sync logic
                project.assignments.clear()
                # We need to flush or handle session state if we want to avoid issues with delete-orphan
                # but adding to project.assignments should work fine with cascade.

                for user_id in payload.assigned_users:
                    project.assignments.append(
                        ProjectUserAssignment(
                            project_id=project.id,
                            user_id=user_id,
                            role=user_map[user_id]["role"],
                        )
                    )

            new_assigned_str = _format_assigned_users(project.assignments, user_map)

            before_changes = []
            after_changes = []

            responsible_changed = (
                payload.responsible_user_id is not None
                and payload.responsible_user_id != old_owner
            )

            if old_name != project.name:
                before_changes.append(f"Project Name: {old_name}")
                after_changes.append(f"Project Name: {project.name}")

            if old_description != project.description:
                before_changes.append(f"Description: {old_description}")
                after_changes.append(f"Description: {project.description}")

            if old_status != project.is_active:
                before_changes.append(
                    f"Status: {'Active' if old_status else 'Inactive'}"
                )
                after_changes.append(
                    f"Status: {'Active' if project.is_active else 'Inactive'}"
                )

            reassignment_before = None
            reassignment_after = None
            if responsible_changed:
                old_owner_name = user_map.get(old_owner, {}).get(
                    "name", str(old_owner) if old_owner else "NA"
                )
                new_owner_name = user_map.get(project.owned_by_user_id, {}).get(
                    "name",
                    str(project.owned_by_user_id) if project.owned_by_user_id else "NA",
                )
                reassignment_before = f"Responsible User: {old_owner_name}"
                reassignment_after = f"Responsible User: {new_owner_name}"

            if (
                payload.assigned_users is not None
                and old_assigned_str != new_assigned_str
            ):
                before_changes.append(old_assigned_str)
                after_changes.append(new_assigned_str)

            before_str = ", ".join(before_changes) if before_changes else None
            after_str = ", ".join(after_changes) if after_changes else None

            if responsible_changed:
                await audit_logs(
                    db=bess_db,
                    user_id=f"USER-{current_user.get('id')}",
                    user_role=current_user.get("role"),
                    module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                    action=AuditLogScenario.PROJECT_REASSIGNED.value,
                    resource_id=project_proj_id,
                    before=reassignment_before,
                    after=reassignment_after,
                )

            if before_changes:
                await audit_logs(
                    db=bess_db,
                    user_id=f"USER-{current_user.get('id')}",
                    user_role=current_user.get("role"),
                    module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                    action=AuditLogScenario.PROJECT_EDITED.value,
                    resource_id=project_proj_id,
                    before=before_str,
                    after=after_str,
                )

            await bess_db.commit()

            # Re-fetch to ensure fresh state for response
            result = await bess_db.execute(
                select(Project)
                .where(Project.id == project.id)
                .options(selectinload(Project.assignments))
            )
            project = result.scalar_one()
            data = self._map_project_to_response(project, user_map)

            return Res.success(
                "S-20014",
                data=data.model_dump(mode="json"),
                http_status_code=http_status.HTTP_200_OK,
            )

        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error(
                "E-20001",
                message="Unable to edit project. Please try again.",
                http_status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def reassign_project(
        self,
        bess_db: AsyncSession,
        user_db: AsyncSession,
        project_id: int,
        new_user_id: int,
        current_user: dict,
    ):
        """
        Reassign project responsibility to another user.
        Projects live in the BESS DB; user validation/details come from the User DB.
        """
        try:
            if current_user.get("role") != UserRole.ADMIN:
                return Res.error(
                    "E-20004",
                    message="Only Admin can reassign project responsibility.",
                    http_status_code=http_status.HTTP_403_FORBIDDEN,
                )

            # E-20015: Project does not exist (BESS DB)
            result = await bess_db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one_or_none()
            if not project:
                return Res.error(
                    "E-20015",
                    message="Project not found",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            project_proj_id = project.proj_id
            # E-20016: New responsible user not in project
            assignment_result = await bess_db.execute(
                select(ProjectUserAssignment).where(
                    ProjectUserAssignment.project_id == project_id,
                    ProjectUserAssignment.user_id == new_user_id,
                )
            )
            assignment = assignment_result.scalar_one_or_none()
            if not assignment:
                return Res.error(
                    "E-20016",
                    message="New responsible user is not assigned to this project",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            # Validate user is active (User DB)
            user_result = await user_db.execute(
                select(User).where(User.id == new_user_id)
            )
            new_user = user_result.scalar_one_or_none()
            if not new_user:
                return Res.error(
                    "E-20016",
                    message="User not found",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )
            if new_user.status is False:
                return Res.error(
                    "E-20016",
                    message="Cannot reassign to inactive user",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            # Cannot reassign to current owner
            if project.owned_by_user_id == new_user_id:
                return Res.error(
                    "E-20016",
                    message="New responsible user is already the current owner",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            previous_owner_id = project.owned_by_user_id
            project.owned_by_user_id = new_user_id

            previous_owner = (
                await user_db.get(User, previous_owner_id)
                if previous_owner_id
                else None
            )

            # Ensure the previous owner remains assigned to the project (swap semantics).
            # Some projects may have an owner who isn't present in the assignments table.
            prev_owner_assignment_result = await bess_db.execute(
                select(ProjectUserAssignment).where(
                    ProjectUserAssignment.project_id == project_id,
                    ProjectUserAssignment.user_id == previous_owner_id,
                )
            )
            prev_owner_assignment = prev_owner_assignment_result.scalar_one_or_none()
            if not prev_owner_assignment:
                bess_db.add(
                    ProjectUserAssignment(
                        project_id=project_id,
                        user_id=previous_owner_id,
                    )
                )

            await audit_logs(
                db=bess_db,
                user_id=f"USER-{current_user.get('id')}",
                user_role=current_user.get("role"),
                module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
                action=AuditLogScenario.PROJECT_REASSIGNED.value,
                resource_id=project_proj_id,
                before=(
                    f"Responsible User: {previous_owner.name}"
                    if previous_owner is not None
                    else f"Responsible User: {previous_owner_id}"
                ),
                after=f"Responsible User: {new_user.name}",
            )

            await bess_db.commit()
            await bess_db.refresh(project)

            data = {
                "proj_id": project.proj_id,
                "owned_by": _user_to_dict(new_user),
            }
            return Res.success(
                "S-20003", data=data, http_status_code=http_status.HTTP_200_OK
            )

        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error(
                "E-20001",
                message="Unable to reassign the project. Please try again.",
                http_status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    async def list_project(
        self,
        bess_db: AsyncSession,
        user_db: AsyncSession,
        params: ProjectSearch,
        current_admin: dict,
    ):
        platforms = current_admin.get("platform")
        # Ensure the current admin is authorized for the BESS platform; support multi-platform users.
        if not platforms or Platform.BESS not in platforms:
            return Res.error(
                status_code="E-20004",
                message="You are not authorized to perform this action",
                http_status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        conditions = []

        user_id = int(current_admin.get("id"))  # type: ignore
        user_role = current_admin.get("role")
        if user_role == UserRole.ANALYST:
            conditions.append(
                or_(
                    Project.created_by_user_id == user_id,
                    Project.owned_by_user_id == user_id,
                    Project.assignments.any(ProjectUserAssignment.user_id == user_id),
                )
            )
        elif user_role in [UserRole.VIEWER, UserRole.MANAGEMENT]:
            conditions.append(
                Project.assignments.any(ProjectUserAssignment.user_id == user_id)
            )

        # Admin can view all projects

        if params.status is None:
            conditions.append(Project.is_deleted.is_(False))
        if params.search:
            search_term = f"%{params.search}%"

            # Search in project fields and "created by" user name/email (via User DB), ignoring case
            search_conditions = [
                Project.name.ilike(search_term),
                Project.proj_id.ilike(search_term),
            ]

            # Find matching creator users by name/email in User DB
            try:
                user_search_query = select(User.id).where(
                    or_(
                        User.name.ilike(search_term),
                        User.email.ilike(search_term),
                    )
                )
                creator_results = await user_db.execute(user_search_query)
                creator_ids = [row.id for row in creator_results.all()]
            except Exception:
                creator_ids = []

            if creator_ids:
                search_conditions.append(Project.created_by_user_id.in_(creator_ids))

            conditions.append(or_(*search_conditions))

        if params.status is not None:
            if params.status == ProjectStatus.ACTIVE:
                conditions.extend(
                    [
                        Project.is_active.is_(True),
                        Project.is_archived.is_(False),
                        Project.is_deleted.is_(False),
                    ]
                )
            elif params.status == ProjectStatus.INACTIVE:
                conditions.extend(
                    [
                        Project.is_active.is_(False),
                        Project.is_archived.is_(False),
                        Project.is_deleted.is_(False),
                    ]
                )
            elif params.status == ProjectStatus.ARCHIVED:
                conditions.append(Project.is_archived.is_(True))
            elif params.status == ProjectStatus.DELETED:
                conditions.append(Project.is_deleted.is_(True))

        count_query = select(func.count()).select_from(Project)
        data_query = select(Project).options(selectinload(Project.assignments))

        if conditions:
            count_query = count_query.where(*conditions)
            data_query = data_query.where(*conditions)

        total_results = (await bess_db.execute(count_query)).scalar() or 0

        if total_results == 0:
            if conditions:
                return Res.error(
                    status_code="E-20005",
                    message="No records match the search or filter criteria.",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            return Res.error(
                status_code="E-20006",
                message="No data found.",
                http_status_code=http_status.HTTP_404_NOT_FOUND,
            )

        #  Apply pagination and sorting to the data query
        data_query = data_query.order_by(Project.id.desc())
        if params.limit != -1:
            offset = (params.page - 1) * params.limit
            data_query = data_query.offset(offset).limit(params.limit)

        result = await bess_db.execute(data_query)
        projects = result.scalars().all()

        user_ids = set()
        for p in projects:
            user_ids.add(p.owned_by_user_id)
            user_ids.add(p.created_by_user_id)

            # Access the pre-loaded assignments
            for asn in p.assignments:
                user_ids.add(asn.user_id)

        user_map = await self._get_user_details(user_db, user_ids)

        #  Calculate  metadata structure
        total_pages = ceil(total_results / params.limit) if params.limit > 0 else 0
        next_page = params.page + 1 if params.page < total_pages else None

        if total_results == 0 and params.page > total_pages:
            if conditions:
                return Res.error(
                    status_code="E-20005",
                    message="Invalid filter criteria provided",
                    http_status_code=http_status.HTTP_400_BAD_REQUEST,
                )

            return Res.error(
                status_code="E-20006",
                message="Invalid date range provided",
                http_status_code=http_status.HTTP_400_BAD_REQUEST,
            )

        data = {
            "projects": [
                self._map_project_to_response(p, user_map).model_dump(mode="json")
                for p in projects
            ],
            "total_pages": total_pages,
            "current_page": params.page,
            "next_page": next_page,
            "total_results": total_results,
        }

        return Res.success("S-20002", data=data)

    async def delete_project(
        self,
        project_id: int,
        bess_db: AsyncSession,
        current_user: dict,
    ):
        project_request = await bess_db.execute(
            select(Project).where(Project.id == project_id)
        )
        project_data = project_request.scalar_one_or_none()

        if not project_data:
            return Res.error(
                status_code="E-20015",
                message="Project not found.",
                http_status_code=http_status.HTTP_404_NOT_FOUND,
            )

        user_id = int(current_user.get("id"))
        user_role = current_user.get("role")
        is_admin = user_role == UserRole.ADMIN
        is_creator = project_data.created_by_user_id == user_id

        if not (is_admin or is_creator):
            return Res.error(
                status_code="E-20004",
                message="You do not have permission to delete this project.",
                http_status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        if project_data.is_archived:
            return Res.error(
                status_code="E-20032",
                message="Delete action is only available for Active and Inactive projects.",
                http_status_code=http_status.HTTP_409_CONFLICT,
            )

        # Perform hard delete (triggers all cascades)
        await bess_db.delete(project_data)

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),
            module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
            action=AuditLogScenario.PROJECT_DELETED.value,
            resource_id=project_data.proj_id,
            before=f"Project Name: {project_data.name}",
            after="Project: Deleted",
        )

        await bess_db.commit()
        return Res.success(status_code="S-20015", data={"id": project_id})

    async def restore_project(
        self,
        project_id: int,
        bess_db: AsyncSession,
        current_user: dict,
    ):
        project_request = await bess_db.execute(
            select(Project).where(Project.id == project_id)
        )
        project_data = project_request.scalar_one_or_none()

        if not project_data:
            return Res.error(
                status_code="E-20015",
                message="Project not found.",
                http_status_code=http_status.HTTP_404_NOT_FOUND,
            )

        # Permission check
        user_id = int(current_user.get("id"))  # type: ignore
        user_role = current_user.get("role")

        is_admin = user_role == UserRole.ADMIN
        is_creator = project_data.created_by_user_id == user_id
        is_responsible = project_data.owned_by_user_id == user_id

        if not (is_admin or is_creator or is_responsible):
            return Res.error(
                status_code="E-20030",
                message="You do not have permission to perform this action.",
                http_status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        past_project_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        )
        new_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        ).name

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),
            module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
            action=AuditLogScenario.PROJECT_RESTORED.value,  # Placeholder for Project Created
            resource_id=project_data.proj_id,
            before=f"Project is {past_project_status.name.capitalize()}",
            after=f"Project is {new_status.capitalize()}",
        )

        await bess_db.commit()
        return Res.success(status_code="S-20016", data={"id": project_id})

    async def archive_project(
        self,
        project_id: int,
        bess_db: AsyncSession,
        current_user: dict,
    ):
        project_request = await bess_db.execute(
            select(Project).where(Project.id == project_id)
        )
        project_data = project_request.scalar_one_or_none()

        if not project_data:
            return Res.error(
                status_code="E-20015",
                message="Project not found.",
                http_status_code=http_status.HTTP_404_NOT_FOUND,
            )

        user_id = int(current_user.get("id"))
        user_role = current_user.get("role")
        is_admin = user_role == UserRole.ADMIN
        is_creator = project_data.created_by_user_id == user_id
        is_responsible = project_data.owned_by_user_id == user_id

        if not (is_admin or is_creator or is_responsible):
            return Res.error(
                status_code="E-20030",
                message="You do not have permission to perform this action.",
                http_status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        if project_data.is_archived:
            return Res.error(
                status_code="E-20031",
                message="Archive option will only be available for active/inactive projects.",
                http_status_code=http_status.HTTP_409_CONFLICT,
            )
        past_project_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        )

        project_data.is_archived = True

        new_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        ).name

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),
            module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
            action=AuditLogScenario.PROJECT_ARCHIVED.value,  # Placeholder for Project Created
            resource_id=project_data.proj_id,
            before=f"Project is {past_project_status.name.capitalize()}",
            after=f"Project is {new_status.capitalize()}",
        )

        await bess_db.commit()
        return Res.success(status_code="S-20017", data={"id": project_id})

    async def unarchive_project(
        self,
        project_id: int,
        bess_db: AsyncSession,
        current_user: dict,
    ):
        project_request = await bess_db.execute(
            select(Project).where(Project.id == project_id)
        )
        project_data = project_request.scalar_one_or_none()

        if not project_data:
            return Res.error(
                status_code="E-20015",
                message="Project not found.",
                http_status_code=http_status.HTTP_404_NOT_FOUND,
            )

        # Permission check
        user_id = int(current_user.get("id"))  # type: ignore
        user_role = current_user.get("role")  # type: int

        is_admin = user_role == UserRole.ADMIN
        is_creator = project_data.created_by_user_id == user_id
        is_responsible = project_data.owned_by_user_id == user_id

        if not (is_admin or is_creator or is_responsible):
            return Res.error(
                status_code="E-20030",
                message="You do not have permission to perform this action.",
                http_status_code=http_status.HTTP_401_UNAUTHORIZED,
            )

        if not project_data.is_archived:
            return Res.success(status_code="S-20018", data={"id": project_id})

        past_project_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        )

        project_data.is_archived = False

        new_status = self._get_project_status(
            is_archived=project_data.is_archived,
            is_active=project_data.is_active,
        ).name

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=user_role,
            module=AuditLogModules.PROJECT_MANAGEMENT_BESS.value,
            action=AuditLogScenario.PROJECT_UNARCHIVED.value,  # Placeholder for Project Created
            resource_id=project_data.proj_id,
            before=f"Project is {past_project_status.name.capitalize()}",
            after=f"Project is {new_status.capitalize()}",
        )

        await bess_db.commit()
        return Res.success(status_code="S-20018", data={"id": project_id})

    async def get_simulation_list(
        self,
        bess_db: AsyncSession,
        project_id: int,
        page: int,
        limit: int,
        sort: str,
        search: Optional[str],
        status: Optional[int],
        start_date: Optional[str],
        end_date: Optional[str],
        current_user: dict,
    ):
        try:
            user_id = int(current_user.get("id"))  # type: ignore
            user_role = current_user.get("role")

            query = (
                select(Project)
                .where(Project.id == project_id)
                .options(selectinload(Project.assignments))
            )

            if user_role != UserRole.ADMIN:
                print("not admin")
                query = query.where(
                    or_(
                        Project.created_by_user_id == user_id,
                        Project.owned_by_user_id == user_id,
                        Project.assignments.any(
                            ProjectUserAssignment.user_id == user_id
                        ),
                    )
                )

            project_query = await bess_db.execute(query)
            project = project_query.scalar_one_or_none()

            if not project or project.is_deleted:
                return Res.error(
                    "E-20015",
                    message="Project not found.",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            user_id = int(current_user.get("id"))  # type: ignore

            is_authorized = (
                user_role == UserRole.ADMIN
                or project.created_by_user_id == user_id
                or project.owned_by_user_id == user_id
                or any(asn.user_id == user_id for asn in project.assignments)
            )

            if not is_authorized:
                return Res.error(
                    "E-20004",
                    message="Not authorized to perform the action.",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            query = select(Simulation).where(Simulation.project_id == project_id)

            if current_user.get("role") in [
                UserRole.ANALYST,
                UserRole.MANAGEMENT,
                UserRole.VIEWER,
            ]:
                query = query.where(Simulation.status != SimulationStatus.FAILED)

            if search:
                query = query.where(Simulation.name.ilike(f"%{search}%"))

            if status:
                query = query.where(Simulation.status == status)

            if start_date and end_date:
                # Full Range
                s_dt = datetime.combine(
                    datetime.strptime(start_date, "%d-%m-%Y").date(), time.min
                )
                e_dt = datetime.combine(
                    datetime.strptime(end_date, "%d-%m-%Y").date(), time.max
                )
                query = query.where(Simulation.updated_at.between(s_dt, e_dt))

            elif start_date:
                # Strictly THIS day only (since the frontend only sends one param)
                target_date = datetime.strptime(start_date, "%d-%m-%Y").date()
                query = query.where(
                    func.cast(Simulation.updated_at, Date) == target_date
                )

            elif end_date:
                # Everything up to this day
                e_dt = datetime.combine(
                    datetime.strptime(end_date, "%d-%m-%Y").date(), time.max
                )
                query = query.where(Simulation.updated_at <= e_dt)

            order_by = (
                [Simulation.updated_at.desc()]
                if sort == "desc"
                else [Simulation.updated_at.asc()]
            )

            pagination = await paginate(
                db=bess_db, base_query=query, page=page, limit=limit, order_by=order_by
            )

            # Check if simulations exist
            if not pagination.records and page == 1:
                return Res.error(
                    "E-20043",
                    message="No simulations found.",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            return Res.success(
                "S-20027",
                data={
                    "simulations": [
                        {
                            "id": s.id,
                            "sim_id": s.sim_id,
                            "name": s.name,
                            "progress": s.step,
                            "edited_step": s.edit_step,
                            "status": s.status,
                            "last_updated": s.updated_at.isoformat(),
                            "project_id": s.project_id,
                        }
                        for s in pagination.records
                    ],
                    "total_count": pagination.total_results,
                    "total_pages": pagination.total_pages,
                    "next_page": pagination.next_page,
                    "current_page": pagination.current_page,
                },
            )

        except Exception:
            traceback.print_exc()
            return Res.error("E-20001")

    async def initiate_simulation(
        self, bess_db: AsyncSession, project_id: int, current_user: dict
    ):
        try:
            project_query = await bess_db.execute(
                select(Project, ProjectSimulationSequence)
                .where(Project.id == project_id)
                .options(selectinload(Project.assignments))
                .outerjoin(
                    ProjectSimulationSequence,
                    ProjectSimulationSequence.project_id == Project.id,
                )
            )
            project, sequence = project_query.first()

            if not project or project.is_deleted:
                return Res.error(
                    "E-20015",
                    message="Project not found.",
                    http_status_code=http_status.HTTP_404_NOT_FOUND,
                )

            user_id = int(current_user.get("id"))  # type: ignore
            user_role = current_user.get("role")

            is_authorized = (
                user_role == UserRole.ADMIN
                or project.created_by_user_id == user_id
                or project.owned_by_user_id == user_id
                or any(asn.user_id == user_id for asn in project.assignments)
            )

            if not is_authorized:
                return Res.error(
                    "E-20004", message="Not authorized to perform the action."
                )

            count = getattr(sequence, "simulation_count") if sequence else 0

            new_count = count + 1
            new_sim = Simulation(
                project_id=project_id,
                name=f"Simulation {count + 1}",
                status=SimulationStatus.IN_PROGRESS,
                step=SimulationSetupProgress.INITIALIZED,
                created_by=user_id,
            )

            # if nor then create one
            if not sequence:
                sequence = ProjectSimulationSequence(
                    project_id=project.id, simulation_count=new_count
                )
                bess_db.add(sequence)

            # else update the current one
            else:
                sequence.simulation_count = new_count  # update the sequence

            bess_db.add(new_sim)
            await bess_db.flush()

            print("logging creation of simulation")
            await audit_logs(
                db=bess_db,
                user_id=f"USER-{user_id}",
                user_role=current_user.get("role"),  # type: ignore
                module=AuditLogModules.SIMULATION.value,
                action=AuditLogScenario.SIMULATION_CREATED.value,
                resource_id=project.proj_id,
                before=None,
                after=str(
                    {
                        "Simulation ID": new_sim.sim_id,
                        "Simulation Name": new_sim.name,
                    }
                ),
            )

            await bess_db.commit()
            await bess_db.refresh(new_sim)

            return Res.success(
                "S-20030",
                data={
                    "id": new_sim.id,
                    "name": new_sim.name,
                    "status": new_sim.status,
                    "progress": new_sim.step,
                    "edited_step": new_sim.edit_step,
                    "last_updated": new_sim.updated_at.isoformat(),
                    "project_id": new_sim.project_id,
                },
            )

        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001")


def _user_to_dict(user: User) -> dict:
    """Build user dict for API response per LLD."""
    return {
        "id": user.id,
        "name": user.name,
        "role": user.role if user.role is not None else 3,
    }
