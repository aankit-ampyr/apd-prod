import math
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import traceback
from constants.defaults import SIZING_STRATEGY
from constants.enums import SimulationSetupProgress
from dtos.simulation_dto import (
    CapacityBreakdown,
    CapacityMetric,
    MultiYearCalculation,
    MultiYearOutput,
    MultiYearSizingCalculation,
)
from models.simulation_model import (
    CustomSimulationConfig,
    MultiYearProjection,
    Simulation,
    LoadProfile,
    SolarProfileConfig,
    DieselGeneratorConfiguration,
    SolarProfileSource,
)
from python_common.constants.enums import AuditLogModules, AuditLogScenario
from services.service_support import (
    depreciate_simulation_job,
    progress_simulation_setup,
)
from utils.log_utils import audit_logs
from utils.response_utils import Res


class MultiYearSimService:
    def __get_n_year_capacity(
        self,
        n: int,
        nc: int,
        fdr: float,
        adr: float,
        dur: int,
        bol: Optional[float] = None,
    ) -> CapacityMetric:
        capacity_n_year = nc * fdr * adr ** (n - 1)
        if bol is None:
            bol = capacity_n_year

        bol_pct = (capacity_n_year / bol) * 100

        return CapacityMetric(
            mwh=capacity_n_year, mw=capacity_n_year / dur, bol_pct=bol_pct
        )

    def __calc_yearly_degradation(
        self, config: MultiYearCalculation, bess_size: int, bess_duration: int
    ) -> MultiYearOutput:
        retention_rate = 1 - (config.annual_degradation / 100)
        factory_degradation_rate = 1 - (config.factory_degradation / 100)

        year_1_needed = bess_size / (
            retention_rate ** (SIZING_STRATEGY[config.sizing_strategy.value - 1] - 1)
        )
        raw_tameplate = year_1_needed / factory_degradation_rate
        nameplate: int = math.ceil(raw_tameplate / 5) * 5

        sizing_mrg_pct = ((nameplate - bess_size) / bess_size) * 100
        year_1_bol = self.__get_n_year_capacity(
            n=1,
            nc=nameplate,
            fdr=factory_degradation_rate,
            adr=retention_rate,
            dur=bess_duration,
        )
        capacity_breakdown = CapacityBreakdown(
            year_1_bol=year_1_bol,
            year_5=self.__get_n_year_capacity(
                n=5,
                nc=nameplate,
                fdr=factory_degradation_rate,
                adr=retention_rate,
                dur=bess_duration,
                bol=year_1_bol.mwh,
            ),
            year_10=self.__get_n_year_capacity(
                n=10,
                nc=nameplate,
                fdr=factory_degradation_rate,
                adr=retention_rate,
                dur=bess_duration,
                bol=year_1_bol.mwh,
            ),
            year_20=self.__get_n_year_capacity(
                n=20,
                nc=nameplate,
                fdr=factory_degradation_rate,
                adr=retention_rate,
                dur=bess_duration,
                bol=year_1_bol.mwh,
            ),
        )

        return MultiYearOutput(
            nameplate_size_mwh=nameplate,
            power_mw=nameplate / bess_duration,
            containers=int(nameplate / 5),
            sizing_margin_pct=sizing_mrg_pct,
            capacity_breakdown=capacity_breakdown,
        )

    async def calc_create_multi_y_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        config: MultiYearCalculation,
        current_user: dict,
    ):

        response = await bess_db.execute(
            select(CustomSimulationConfig).where(
                CustomSimulationConfig.simulation_id == simulation_id
            )
        )

        custom_config = response.scalar_one_or_none()

        if not custom_config:
            return Res.error(
                status_code="E-20053", message="Custom configuratrion not found"
            )

        output = self.__calc_yearly_degradation(
            config=config,
            bess_size=custom_config.bess_capacity,
            bess_duration=custom_config.duration_class * 2,
        )

        response_data = config.model_dump(mode="json")
        response_data["output"] = output.model_dump(mode="json")

        return Res.success(status_code="S-20041", data=response_data)

    async def save_multi_y_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        config: MultiYearCalculation,
        current_user: dict,
    ):
        try:
            multi_y_projection_res = await bess_db.execute(
                select(MultiYearProjection).where(
                    MultiYearProjection.simulation_id == simulation_id
                )
            )
            multi_y_projection = multi_y_projection_res.scalar_one_or_none()

            if not multi_y_projection:
                multi_y_projection = MultiYearProjection(simulation_id=simulation_id)
                bess_db.add(multi_y_projection)

            multi_y_projection.factory_degradation = config.factory_degradation
            multi_y_projection.annual_degradation = config.annual_degradation
            multi_y_projection.sizing_strategy = config.sizing_strategy.value

            await bess_db.flush()
            await bess_db.commit()

            await progress_simulation_setup(
                simulation_id=simulation_id,
                to=SimulationSetupProgress.MULTI_YEAR_PROJECTION_CONFIG,
                db=bess_db,
            )

            await depreciate_simulation_job(
                simulation_id=simulation_id,
                db=bess_db,
                include_sizing_job=False,
                include_custom_job=False,
            )

            return await self.calc_create_multi_y_config(
                bess_db=bess_db,
                simulation_id=simulation_id,
                config=config,
                current_user=current_user,
            )

        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001")

    async def get_or_create_multi_y_config(
        self,
        bess_db: AsyncSession,
        simulation_id: int,
        current_user: dict,
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
                    DieselGeneratorConfiguration,
                    CustomSimulationConfig,
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
                    DieselGeneratorConfiguration,
                    DieselGeneratorConfiguration.simulation_id == Simulation.id,
                )
                .outerjoin(
                    CustomSimulationConfig,
                    CustomSimulationConfig.simulation_id == Simulation.id,
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
                dg_config,
                custom_simulation_config,
            ) = result

            if not simulation:
                return Res.error("E-20043", message="Simulation not found")

            simulation.load_profile = load_profile
            if solar_profile:
                solar_profile.source = solar_source
            simulation.solar_profile_config = solar_profile
            if custom_simulation_config:
                custom_simulation_config.is_included = (
                    dg_config.is_included if dg_config else None
                )
            simulation.custom_simulation_config = custom_simulation_config

            multi_y_projection_res = await bess_db.execute(
                select(MultiYearProjection).where(
                    MultiYearProjection.simulation_id == simulation_id
                )
            )
            multi_y_projection = multi_y_projection_res.scalar_one_or_none()

            if not multi_y_projection:
                multi_y_projection = MultiYearProjection(simulation_id=simulation_id)
                bess_db.add(multi_y_projection)
                await bess_db.flush()

            config = MultiYearCalculation.model_validate(multi_y_projection)

            output = self.__calc_yearly_degradation(
                config=config,
                bess_size=custom_simulation_config.bess_capacity,
                bess_duration=custom_simulation_config.duration_class * 2,
            )
            data = MultiYearSizingCalculation.model_validate(
                {
                    **config.model_dump(exclude={"output"}),
                    "output": output,
                    "simulation": simulation,
                }
            )

            return Res.success("S-20042", data=data.model_dump(mode="json"))
        except Exception:
            await bess_db.rollback()
            traceback.print_exc()
            return Res.error("E-20001")
