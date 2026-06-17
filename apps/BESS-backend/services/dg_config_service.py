from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.encoders import jsonable_encoder
from constants.enums import SimulationLogStep, SimulationSetupProgress
from dtos.simulation_dto import FuelCoefficients
from models import DieselGeneratorConfiguration
from dtos import DGConfigPayload, DGConfigResponse, DGFuelCurvePoint
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from utils.log_utils import compare_and_log
from utils.response_utils import Res
from .service_support import (
    depreciate_simulation_job,
    ensure_simulation_write_access,
    progress_simulation_setup,
)


class DGConfigService:
    P_RATED = 25000  # Rated Power of DG in KW

    async def upsert_config(
        self,
        simulation_id: int,
        payload: DGConfigPayload,
        bess_db: AsyncSession,
        current_user: dict,
        resource_id: str,
    ):
        simulation, auth_error = await ensure_simulation_write_access(
            db=bess_db, simulation_id=simulation_id, current_user=current_user
        )
        if auth_error:
            return auth_error

        if payload.is_included:
            if not payload.is_binary and payload.min_stable_load is None:
                return Res.error(
                    status_code="E-20038",
                    message="Minimum stable load is required for variable generator configuration.",
                    http_status_code=400,
                )

            if payload.advanced_fuel_curve:
                if payload.no_load_coeff is None or payload.load_coeff is None:
                    return Res.error(
                        status_code="E-20039",
                        message="Both no-load and load coefficients are required for advanced fuel curve model.",
                        http_status_code=400,
                    )
            else:
                if payload.flat_fuel_rate is None:
                    return Res.error(
                        status_code="E-20008",
                        message="Missing required request parameter.",
                        http_status_code=400,
                    )

        query = select(DieselGeneratorConfiguration).where(
            DieselGeneratorConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        dg_config = result.scalar_one_or_none()
        before_config = {}

        if not payload.is_included:
            # Prepare a reset dictionary for when the DG is excluded
            update_data = {
                "is_included": False,
                "is_binary": False,
                "advanced_fuel_curve": False,
                "fuel_price": None,
                "flat_fuel_rate": None,
                "min_stable_load": None,
                "no_load_coeff": None,
                "load_coeff": None,
            }
        else:
            update_data = {
                "is_included": True,
                "is_binary": payload.is_binary,
                "fuel_price": payload.fuel_price,
                "advanced_fuel_curve": payload.advanced_fuel_curve,
                "min_stable_load": payload.min_stable_load
                if not payload.is_binary
                else None,
            }

            if not payload.is_binary and payload.advanced_fuel_curve:
                update_data.update(
                    {
                        "no_load_coeff": payload.no_load_coeff,
                        "load_coeff": payload.load_coeff,
                        "flat_fuel_rate": None,
                    }
                )
            else:
                update_data.update(
                    {
                        "no_load_coeff": None,
                        "load_coeff": None,
                        "flat_fuel_rate": payload.flat_fuel_rate,
                    }
                )

        if dg_config:
            before_config = jsonable_encoder(dg_config)
            for key, value in update_data.items():
                setattr(dg_config, key, value)
            after_config = jsonable_encoder(dg_config)
        else:
            dg_config = DieselGeneratorConfiguration(
                simulation_id=simulation_id, **update_data
            )
            bess_db.add(dg_config)
            after_config = jsonable_encoder(dg_config)

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.DG_CONFIGURATION,
            db=bess_db,
        )

        await depreciate_simulation_job(simulation_id=simulation_id, db=bess_db)
        await compare_and_log(
            db=bess_db,
            user_id=f"USER-{current_user.get('id')}",
            user_role=current_user.get("role"),
            module=AuditLogModules.SIMULATION.value,
            action=AuditLogScenario.SIMULATION_EDITED.value,
            resource_id=resource_id,
            before=before_config,
            after=after_config,
            remove_id=True,
            sim_module_type=SimulationLogStep.SYSTEM_SETUP,
        )

        await bess_db.commit()
        await bess_db.refresh(dg_config)

        return Res.success(
            status_code="S-20019",
            data=DGConfigResponse.model_validate(dg_config).model_dump(mode="json"),
        )

    async def get_config(self, simulation_id: int, bess_db: AsyncSession):
        query = select(DieselGeneratorConfiguration).where(
            DieselGeneratorConfiguration.simulation_id == simulation_id
        )
        result = await bess_db.execute(query)
        config = result.scalar_one_or_none()

        if not config:
            return Res.error(status_code="E-20040", message="DG Config not found")

        return Res.success(
            status_code="S-20020",
            data=DGConfigResponse.model_validate(config).model_dump(mode="json"),
        )

    def fuel_curve_calculation(self, simulation_id: int, payload: FuelCoefficients):
        fuel_curve_points = []

        for i in range(1, 5):
            actual_power = i * 0.25 * self.P_RATED
            fuel_rate = (
                payload.no_load_coeff * self.P_RATED + payload.load_coeff * actual_power
            )
            specific_fuel_rate = fuel_rate / actual_power
            data_point = DGFuelCurvePoint(
                load_percentage=(i * 25),
                output_mw=round(actual_power / 1000, 1),
                fuel_rate_l_hr=int(fuel_rate),
                specific_fuel_rate_l_kwh=round(specific_fuel_rate, 3),
            )

            fuel_curve_points.append(data_point.model_dump(mode="json"))

        return Res.success(
            status_code="S-20021", data={"fuel_curve_points": fuel_curve_points}
        )
