from datetime import datetime, timezone, time
from sqlalchemy import select, func
from math import ceil
from sqlalchemy.ext.asyncio import AsyncSession
from constants.enums import SimulationSetupProgress, UserRole, SimulationStatus
import traceback
from dtos.simulation_dto import SimulationDetails
from models.simulation_model import (
    GreenEnergyAnalysisConfiguration,
    Simulation,
    LoadProfile,
    SolarProfileConfig,
    BESSContainerConfiguration,
    DieselGeneratorConfiguration,
    DispatchRuleConfiguration,
    BessDgSizingConfiguration,
    SolarProfileSource,
)
from models.project_model import Project, ProjectUserAssignment
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import audit_logs
from utils.response_utils import Res


class SimulationService:
    async def initiate_or_fetch_simulation(
        self,
        bess_db: AsyncSession,
        project_id: int,
        user_id: int,
        current_user: dict,
    ):
        # Check if project exists
        project_query = select(Project).where(Project.id == project_id)
        project_result = await bess_db.execute(project_query)
        project = project_result.scalar_one_or_none()
        if not project or project.is_deleted:
            return {
                "status": "error",
                "status_code": "E-20015",
                "message": "Project not found or deleted.",
            }

        # Check if simulation already exists
        query = select(Simulation).where(Simulation.project_id == project_id)
        result = await bess_db.execute(query)
        simulation = result.scalar_one_or_none()

        if simulation:
            return {
                "status": "success",
                "status_code": "S-20005",
                "data": {
                    "project_id": simulation.project_id,
                    "simulation_id": simulation.id,
                    "step": simulation.step,
                    "edited_step": simulation.edit_step,
                    "created_at": simulation.created_at.isoformat(),
                    "updated_at": simulation.updated_at.isoformat(),
                },
            }

        new_simulation = Simulation(
            project_id=project_id,
            name=f"Simulation {project_id}",
            status=SimulationStatus.IN_PROGRESS,
            step=SimulationSetupProgress.INITIALIZED,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            created_by=user_id,
        )

        bess_db.add(new_simulation)
        await bess_db.refresh(new_simulation)
        print("Logging audit log")

        await audit_logs(
            db=bess_db,
            user_id=f"USER-{user_id}",
            user_role=current_user.get("role"),
            module=AuditLogModules.SIMULATION.value,
            action=AuditLogScenario.SIMULATION_CREATED.value,
            resource_id=project.proj_id,
            before=None,
            after=str(
                {
                    "Simulation ID": new_simulation.sim_id,
                    "Simulation Name": new_simulation.name,
                }
            ),
        )

        await bess_db.commit()

        return {
            "status": "success",
            "status_code": "S-20005",
            "data": {
                "project_id": new_simulation.project_id,
                "simulation_id": new_simulation.id,
                "step": new_simulation.step,
                "created_at": new_simulation.created_at.isoformat(),
                "updated_at": new_simulation.updated_at.isoformat(),
            },
        }

    async def list_simulations(
        self, db: AsyncSession, project_id: int, params, current_user: dict
    ):
        try:
            user_id = int(current_user.get("id"))
            user_role = current_user.get("role")

            project = await db.get(Project, project_id)
            if not project or project.is_deleted:
                return Res.error("E-20015", message="Project not found")

            assignment = await db.execute(
                select(ProjectUserAssignment).where(
                    ProjectUserAssignment.project_id == project_id,
                    ProjectUserAssignment.user_id == user_id,
                )
            )
            if not assignment.scalar_one_or_none():
                return Res.error("E-20004", message="Not authorized")

            query = select(Simulation).where(Simulation.project_id == project_id)

            if params.search:
                query = query.where(Simulation.name.ilike(f"%{params.search}%"))

            if params.status is not None:
                query = query.where(Simulation.status == params.status)

            if params.start_date:
                start_dt = datetime.strptime(params.start_date, "%d-%m-%Y")
                start_dt = datetime.combine(start_dt.date(), time.min)
                query = query.where(Simulation.updated_at >= start_dt)

            if params.end_date:
                end_dt = datetime.strptime(params.end_date, "%d-%m-%Y")
                end_dt = datetime.combine(end_dt.date(), time.max)
                query = query.where(Simulation.updated_at <= end_dt)

            # Assigned user restriction
            if user_role != UserRole.ADMIN:
                query = query.where(Simulation.status != SimulationStatus.FAILED)

            count_query = select(func.count()).select_from(query.subquery())
            total_count = (await db.execute(count_query)).scalar() or 0

            if total_count == 0:
                if any(
                    [params.search, params.status, params.start_date, params.end_date]
                ):
                    return Res.error(
                        "E-20005", message="No simulations found for this project."
                    )
                return Res.error("E-20043", message="Simulation not found")

            if params.sort == "desc":
                query = query.order_by(Simulation.updated_at.desc())
            else:
                query = query.order_by(Simulation.updated_at.asc())

            page = params.page or 1
            limit = params.limit or 10
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)

            result = await db.execute(query)
            simulations = result.scalars().all()

            total_pages = ceil(total_count / limit)
            next_page = page + 1 if page < total_pages else None

            data = {
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
                    for s in simulations
                ],
                "total_count": total_count,
                "total_pages": total_pages,
                "next_page": next_page,
                "current_page": page,
            }
            return Res.success("S-20027", data=data)
        except Exception:
            traceback.print_exc()
            return Res.error("E-20001", message="Something went wrong")

    async def update_simulation(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        name: str,
        current_user: dict,
        resource_id: str,
    ):
        try:
            user_id = int(current_user.get("id"))
            user_role = current_user.get("role")

            result = await bess_db.execute(
                select(Simulation).where(Simulation.id == simulation_id)
            )
            simulation = result.scalar_one_or_none()

            if not simulation:
                return Res.error("E-20043", message="Simulation not found")

            if not name or not name.strip():
                return Res.error("E-10201", message="Name cannot be empty")

            existing_simulation = await bess_db.execute(
                select(Simulation).where(
                    Simulation.name == name,
                    Simulation.project_id == simulation.project_id,
                )
            )

            existing_simulation = (
                existing_simulation.scalars().first()
            )  # might be having more than one entry, scalar_one_or_none() will fail
            if existing_simulation:
                return Res.error("E-20045")

            project_id = simulation.project_id
            assignment = await bess_db.execute(
                select(ProjectUserAssignment).where(
                    ProjectUserAssignment.project_id == project_id,
                    ProjectUserAssignment.user_id == user_id,
                )
            )

            is_assigned_user = assignment.scalar_one_or_none() is not None

            if not is_assigned_user and user_role != UserRole.ADMIN:
                return Res.error("E-20004")

            before_name = simulation.name
            simulation.name = name
            simulation.updated_at = datetime.now(timezone.utc)

            await audit_logs(
                db=bess_db,
                user_id=f"USER-{user_id}",
                user_role=user_role,
                module=AuditLogModules.SIMULATION.value,
                action=AuditLogScenario.SIMULATION_EDITED.value,
                resource_id=resource_id,
                before=str({"Simulation Name": before_name}),
                after=str({"Simulation Name": simulation.name}),
            )

            await bess_db.commit()
            await bess_db.refresh(simulation)

            return Res.success(
                "S-20028",
                data={
                    "id": simulation.id,
                    "sim_id": simulation.sim_id,
                    "name": simulation.name,
                    "progress": simulation.step,
                    "edited_step": simulation.edit_step,
                    "status": simulation.status,
                    "last_updated": simulation.updated_at.isoformat(),
                    "project_id": simulation.project_id,
                },
            )
        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001")

    async def delete_simulation(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        current_user: dict,
        resource_id: str,
    ):
        try:
            sim = await bess_db.get(Simulation, simulation_id)
            if not sim:
                return Res.success("S-20029", data={"id": simulation_id})

            if current_user.get("role") not in [UserRole.ADMIN, UserRole.ANALYST]:
                return Res.error(
                    "E-20004", message="Not authorized to delete simulation."
                )

            await audit_logs(
                db=bess_db,
                user_id=f"USER-{current_user.get('id')}",
                user_role=current_user.get("role"),
                module=AuditLogModules.SIMULATION.value,
                action=AuditLogScenario.SIMULATION_DELETED.value,
                resource_id=resource_id,
                before=str(
                    {
                        "Simulation ID": sim.sim_id,
                        "Simulation Name": sim.name,
                    }
                ),
                after=None,
            )

            await bess_db.delete(sim)
            await bess_db.commit()
            return Res.success("S-20029", data={"id": simulation_id})
        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001", message="Unable to delete simulation.")

    async def get_simulation_details(
        self, bess_db: AsyncSession, simulation_id: int, current_user: dict
    ):
        try:
            user_id = int(current_user.get("id"))
            user_role = current_user.get("role")

            query = (
                select(
                    Simulation,
                    LoadProfile,
                    SolarProfileConfig,
                    SolarProfileSource,
                    BESSContainerConfiguration,
                    DieselGeneratorConfiguration,
                    DispatchRuleConfiguration,
                    BessDgSizingConfiguration,
                    GreenEnergyAnalysisConfiguration,
                )
                .where(Simulation.id == simulation_id)
                .outerjoin(LoadProfile, LoadProfile.simulation_id == Simulation.id)
                .outerjoin(
                    SolarProfileConfig,
                    SolarProfileConfig.simulation_id == Simulation.id,
                )
                .outerjoin(
                    SolarProfileSource,
                    SolarProfileSource.id == SolarProfileConfig.source_id,
                )
                .outerjoin(
                    BESSContainerConfiguration,
                    BESSContainerConfiguration.simulation_id == Simulation.id,
                )
                .outerjoin(
                    DieselGeneratorConfiguration,
                    DieselGeneratorConfiguration.simulation_id == Simulation.id,
                )
                .outerjoin(
                    DispatchRuleConfiguration,
                    DispatchRuleConfiguration.simulation_id == Simulation.id,
                )
                .outerjoin(
                    BessDgSizingConfiguration,
                    BessDgSizingConfiguration.simulation_id == Simulation.id,
                )
                .outerjoin(
                    GreenEnergyAnalysisConfiguration,
                    GreenEnergyAnalysisConfiguration.simulation_id == Simulation.id,
                )
            )
            result = await bess_db.execute(query)
            result = result.first()
            if not result:
                return Res.error("E-20043", message="Simulation not found")

            (
                simulation,
                load_profile,
                solar_profile,
                solar_source,
                bess_config,
                dg_config,
                dispatch_config,
                sizing_config,
                green_energy_config,
            ) = result

            if not simulation:
                return Res.error("E-20043", message="Simulation not found")

            # Attach joined properties to avoid lazy-load issues during Pydantic validation
            simulation.load_profile = load_profile
            if solar_profile:
                solar_profile.source = solar_source
            simulation.solar_profile_config = solar_profile
            simulation.bess_config = bess_config
            simulation.dg_config = dg_config
            simulation.dispatch_config = dispatch_config
            simulation.bess_dg_sizing = sizing_config
            simulation.green_energy_config = green_energy_config

            project_id = simulation.project_id
            project_res = await bess_db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = project_res.scalar_one_or_none()

            is_owner = False
            if project:
                is_owner = (
                    project.created_by_user_id == user_id
                    or project.owned_by_user_id == user_id
                )

            assignment = await bess_db.execute(
                select(ProjectUserAssignment).where(
                    ProjectUserAssignment.project_id == project_id,
                    ProjectUserAssignment.user_id == user_id,
                )
            )

            is_assigned_user = assignment.scalar_one_or_none() is not None

            if not is_assigned_user and user_role != UserRole.ADMIN and not is_owner:
                return Res.error("E-20004")

            data = SimulationDetails.model_validate(simulation)

            return Res.success("S-20031", data=data.model_dump(mode="json"))
        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001")
