import io
import math
from typing import Optional
import numpy as np
from numpy.typing import NDArray
import pandas as pd
from redis.asyncio import Redis
from sqlalchemy import select, update
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from constants.defaults import SIMULATION_UPDATES_CHANEL, SIZING_STRATEGY
from dtos.socket_dto import (
    ConfigDetails,
    GreenConfigDetails,
    MultiYearProgressData,
    SocketEvent,
    StartedData,
    ProgressData,
    CompletedData,
    FailedData,
    UpdateData,
)
from constants.enums import (
    DGTriggerType,
    ActionType,
    SimulationJobStatus,
    LoadPattern,
    SimulationSetupProgress,
    SimulationStatus,
    LoadServingPriority,
    DGRunScheduleMode,
    ResourceType,
)
from models.simulation_model import (
    BESSContainerConfiguration,
    BessDgSizingConfiguration,
    CustomSimulationConfig,
    CustomSimulationJob,
    DetailGreenSimulationConfiguration,
    DetailGreenSimulationJob,
    DetailedGreenSimulationResult,
    DieselGeneratorConfiguration,
    GreenEnergyAnalysisConfiguration,
    GreenSizingSimulationJob,
    LoadProfile,
    MultiYearProjection,
    MultiYearSimulationJob,
    Simulation,
    SimulationJob,
    SingularConfSimulationResult,
    SolarProfileConfig,
    SolarProfileSource,
    DispatchRuleConfiguration,
)
from simulation_engine.repository import (
    batch_insert_green_sizing_data,
    batch_insert_hourly_data,
    batch_insert_green_hourly_data,
    batch_insert_multi_year_projection,
    batch_insert_simulation_results,
    handle_simulation_termination,
    progress_simulation_setup,
)
from simulation_engine.core import SimulationEngine
from simulation_engine.schemas import (
    GreenResult,
    MultiYearProjectionResult,
    ScenarioResult,
    SimulationParams,
)
from simulation_engine.utils import (
    create_seasonal_load_profile,
    create_constant_load,
    create_windowed_load_profile,
    should_simulation_stopped,
    create_availability_hours_array,
)

from python_common.utils.file_utils import FileStorageManager  # type: ignore


async def get_solar_array(
    simulation_id: int, db: AsyncSession
) -> tuple[NDArray[np.float64], int, float, float]:
    # Solar Profile Data
    solar_config_result = await db.execute(
        select(SolarProfileConfig).where(
            SolarProfileConfig.simulation_id == simulation_id
        )
    )
    solar_config = solar_config_result.scalar_one_or_none()

    if not solar_config:
        raise ValueError(
            f"Solar profile source not found for simulation {simulation_id}"
        )

    solar_result = await db.execute(
        select(SolarProfileSource).where(
            SolarProfileSource.id == solar_config.source_id
        )
    )
    solar_source = solar_result.scalar_one_or_none()
    if not solar_source:
        raise ValueError(
            f"Solar profile source not found for simulation {simulation_id}"
        )

    scada_obj, _ = FileStorageManager.get_file_object(file_key=solar_source.key)

    df = pd.read_csv(io.BytesIO(scada_obj))
    timestamp_col = str(df.columns[0])

    df[timestamp_col] = pd.to_datetime(df[timestamp_col], dayfirst=True, format="mixed")
    df = df.sort_values(by=timestamp_col)

    solar_array = df["Solar_Generation_MW"].to_numpy(dtype=float)

    if solar_array.size != 8760:
        raise ValueError(f"Solar array size is {solar_array.size}, expected 8760")

    return (
        solar_array,
        solar_source.year,
        solar_config.total_generation,
        solar_config.peak_generation,
    )


def get_load_array(load_profile: LoadProfile):
    if load_profile.pattern == LoadPattern.CONSTANT_LOAD:
        return create_constant_load(load_profile.config["load_mw"])

    if load_profile.pattern == LoadPattern.SEASONAL_LOAD:
        return create_seasonal_load_profile(load_profile.config)

    if load_profile.pattern == LoadPattern.CUSTOM_WINDOW_LOAD:
        return create_windowed_load_profile(load_profile.config["windows"])

    return create_windowed_load_profile([load_profile.config])


def get_dg_availability_array(
    dg_run_schedule_mode: DGRunScheduleMode,
    start_hour: Optional[int],
    end_hour: Optional[int],
):
    if dg_run_schedule_mode == DGRunScheduleMode.CUSTOM_BLACKOUT:
        return create_availability_hours_array(start_hour=end_hour, end_hour=start_hour)
    elif dg_run_schedule_mode == DGRunScheduleMode.ANYTIME:
        return create_availability_hours_array(start_hour=0, end_hour=24)

    return create_availability_hours_array(start_hour=start_hour, end_hour=end_hour)


async def get_constant_simulation_params(
    simulation_id: int, db: AsyncSession
) -> tuple[SimulationParams, list[int], bool, int, float]:
    # Load Profile Data
    load_result = await db.execute(
        select(LoadProfile).where(LoadProfile.simulation_id == simulation_id)
    )
    load_profile = load_result.scalar_one_or_none()
    if not load_profile:
        raise ValueError(f"Load profile not found for simulation {simulation_id}")

    load_array = get_load_array(load_profile)

    # Solar Profile
    solar_array, year, total_solar, peak_generation = await get_solar_array(
        simulation_id=simulation_id, db=db
    )

    # Bess Config Data
    bess_result = await db.execute(
        select(BESSContainerConfiguration).where(
            BESSContainerConfiguration.simulation_id == simulation_id
        )
    )
    bess_config = bess_result.scalar_one_or_none()
    if not bess_config:
        raise ValueError(f"BESS configuration not found for simulation {simulation_id}")

    # DG Config Data
    dg_result = await db.execute(
        select(DieselGeneratorConfiguration).where(
            DieselGeneratorConfiguration.simulation_id == simulation_id
        )
    )
    dg_config = dg_result.scalar_one_or_none()
    if not dg_config:
        raise ValueError(f"DG configuration not found for simulation {simulation_id}")

    # Dispatch Rule Data
    dispatch_result = await db.execute(
        select(DispatchRuleConfiguration).where(
            DispatchRuleConfiguration.simulation_id == simulation_id
        )
    )
    dispatch_rules = dispatch_result.scalar_one_or_none()
    if not dispatch_rules:
        raise ValueError(f"DG configuration not found for simulation {simulation_id}")

    simulation_params = SimulationParams(
        load_profile=load_array,
        total_load_hours=load_profile.total_hours,
        solar_profile=solar_array,
        bess_min_soc=bess_config.bess_min_soc,
        bess_max_soc=bess_config.bess_max_soc,
        bess_initial_soc=bess_config.bess_initial_soc,
        bess_daily_cycle_limit=bess_config.bess_daily_cycle_limit,
        bess_efficiency=bess_config.bess_efficiency,
        dg_enabled=dg_config.is_included,
        dg_operation_binary=dg_config.is_binary,
        dg_hours=get_dg_availability_array(
            dg_run_schedule_mode=DGRunScheduleMode(dispatch_rules.dg_run_schedule_mode),
            start_hour=dispatch_rules.dg_start_time,
            end_hour=dispatch_rules.dg_end_time,
        ),
        total_solar_generated=total_solar,
    )

    if dg_config.is_included:
        simulation_params.dg_operation_binary = dg_config.is_binary
        simulation_params.load_priority = LoadServingPriority(
            dispatch_rules.load_serving_priority
        )
        simulation_params.dg_charges_bess = dispatch_rules.is_dg_charging_bess  # type: ignore
        simulation_params.dg_trigger_type = DGTriggerType(
            dispatch_rules.dg_trigger_type
        )
        simulation_params.dg_takeover_mode = dispatch_rules.is_dg_takeover_full_load  # type: ignore

        if dg_config.advanced_fuel_curve and not dg_config.is_binary:
            simulation_params.dg_fuel_curve_enabled = dg_config.advanced_fuel_curve
            simulation_params.min_stable_load_pct = dg_config.min_stable_load  # type: ignore
            simulation_params.dg_fuel_f0 = dg_config.no_load_coeff  # type: ignore
            simulation_params.dg_fuel_f1 = dg_config.load_coeff  # type: ignore
        else:
            simulation_params.dg_fuel_flat_rate = dg_config.flat_fuel_rate  # type: ignore

        if dispatch_rules.dg_trigger_type == DGTriggerType.SOC_THRESHOLD:
            simulation_params.dg_soc_off_threshold = dispatch_rules.dg_soc_off_threshold  # type: ignore
            simulation_params.dg_soc_on_threshold = dispatch_rules.dg_soc_on_threshold  # type: ignore

        if dispatch_rules.is_cycle_charging_enabled:
            simulation_params.cycle_charging_enabled = (
                dispatch_rules.is_cycle_charging_enabled
            )
            simulation_params.cycle_charging_off_soc_pct = dispatch_rules.stop_soc  # type: ignore
            simulation_params.cycle_charging_min_load_pct = dispatch_rules.min_load  # type: ignore

    return (
        simulation_params,
        bess_config.container_types,
        dg_config.is_included,
        year,
        peak_generation,
    )


async def get_possible_simulation_comb(
    simulation_id: int,
    container_types: list[int],
    dg_enable: bool,
    db: AsyncSession,
    solar_scale: Optional[float] = None,
):

    if solar_scale is not None:
        green_result = await db.execute(
            select(GreenEnergyAnalysisConfiguration).where(
                GreenEnergyAnalysisConfiguration.simulation_id == simulation_id
            )
        )
        config = green_result.scalar_one_or_none()
        if not config:
            raise ValueError(f"Green Config not found for simulation {simulation_id}")

    else:
        bess_dg_result = await db.execute(
            select(BessDgSizingConfiguration).where(
                BessDgSizingConfiguration.simulation_id == simulation_id
            )
        )
        config = bess_dg_result.scalar_one_or_none()
        if not config:
            raise ValueError(
                f"BessDgSizingConfiguration not found for simulation {simulation_id}"
            )

    grid = np.meshgrid(
        np.arange(config.bess_min, config.bess_max + 5, 5),
        np.array(container_types) * 2,
        np.arange(
            config.dg_min or 0,
            (config.dg_max or 0) + (config.dg_step_size or 1),
            (config.dg_step_size or 1),
        )
        if dg_enable
        else [0],
        np.arange(
            config.solar_min or 0,
            (config.solar_max or 0) + (config.solar_step or 1),
            (config.solar_step or 1),
        )
        if solar_scale
        else [0],
        indexing="ij",
    )
    return np.stack(grid, axis=-1).reshape(-1, 4)


async def get_custom_configuration(
    simulation_id: int, db: AsyncSession
) -> tuple[int, float, float]:
    query = select(CustomSimulationConfig).where(
        CustomSimulationConfig.simulation_id == simulation_id
    )
    result = await db.execute(query)
    custom_config = result.scalar_one_or_none()

    if not custom_config:
        raise ValueError(
            f"Custom simulation config not found for simulation {simulation_id}"
        )

    return (
        custom_config.duration_class * 2,
        custom_config.bess_capacity,
        custom_config.dg_capacity,
    )


def get_n_year_capacity(
    n: int,
    nc: int,
    frr: float,
    arr: float,
    bol: Optional[float] = None,
):
    capacity_n_year = nc * frr * arr**n
    if bol is None:
        bol = capacity_n_year

    bol_pct = (capacity_n_year / bol) * 100

    return capacity_n_year, round(bol_pct, 1)


async def get_bess_sizing_requirements(
    simulation_id: int, bess_capacity_mwh: float, db: AsyncSession
):
    multi_y_projection_res = await db.execute(
        select(MultiYearProjection).where(
            MultiYearProjection.simulation_id == simulation_id
        )
    )
    config = multi_y_projection_res.scalar_one_or_none()
    if not config:
        raise ValueError(
            f"Multi-Year Projection data not found for simulation {simulation_id}"
        )
    annual_retention_rate = 1 - (config.annual_degradation / 100)
    factory_capacity_retention = 1 - (config.factory_degradation / 100)

    year_1_needed = bess_capacity_mwh / (
        annual_retention_rate ** (SIZING_STRATEGY[config.sizing_strategy - 1] - 1)
    )
    raw_tameplate = year_1_needed / factory_capacity_retention
    nameplate: int = math.ceil(raw_tameplate / 5) * 5

    return nameplate, factory_capacity_retention, annual_retention_rate


async def get_detailed_green_configuration(
    simulation_id: int, db: AsyncSession
) -> tuple[int, int, int, int]:
    query = select(DetailGreenSimulationConfiguration).where(
        DetailGreenSimulationConfiguration.simulation_id == simulation_id
    )
    result = await db.execute(query)
    green_config = result.scalar_one_or_none()

    if not green_config:
        raise ValueError(
            f"Detail green simulation config not found for simulation {simulation_id}"
        )

    return (
        green_config.duration_class * 2,
        green_config.solar_peak,
        green_config.bess_capacity,
        green_config.dg_capacity,
    )


async def run_sizing_simulation(
    simulation_id: int,
    job_id: int,
    redis: Redis,
    db: AsyncSession,
    intervals: int = 25,
    channel: str = SIMULATION_UPDATES_CHANEL,
):
    print(f"Running simulation for ID: {simulation_id} (Job: {job_id})")
    simulation_job = None

    try:
        # INFO: Send Started Event
        start_data = StartedData(simulation_id=simulation_id)

        start_event = SocketEvent(
            resource_type=ResourceType.SIZING_SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.STARTED,
            data=start_data,
        )
        await redis.publish(channel, start_event.model_dump_json())

        (
            simulation_params,
            container_types,
            dg_enable,
            year,
            _,
        ) = await get_constant_simulation_params(simulation_id=simulation_id, db=db)

        combinations = await get_possible_simulation_comb(
            simulation_id=simulation_id,
            container_types=container_types,
            dg_enable=dg_enable,
            db=db,
        )

        combination_count = combinations.shape[0]
        simulation_results: list[dict] = []

        result = await db.execute(
            select(SimulationJob)
            .options(joinedload(SimulationJob.simulation))
            .where(
                SimulationJob.simulation_id == simulation_id,
                SimulationJob.job_id == job_id,
            )
        )

        simulation_job = result.scalar_one_or_none()
        if not simulation_job:
            raise ValueError(
                f"Simulation Job not found for simulation {simulation_id} and job {job_id}"
            )

        simulation_job.max_iterations = combination_count
        simulation_job.status = SimulationJobStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(simulation_job)

        template_id = SimulationEngine.get_template_id(params=simulation_params)

        for i, item in enumerate(combinations, start=1):
            simulation_params.bess_capacity_mwh = item[0].item()
            simulation_params.duration_hr = item[1].item()
            simulation_params.dg_capacity_mw = item[2].item()

            engine = SimulationEngine(params=simulation_params, year=year)
            simulation_result, _ = engine.run_simulation(
                template_id=template_id, job_id=job_id, simulation_id=simulation_id
            )

            filtered_result = ScenarioResult.model_validate(simulation_result)
            filtered_result.finalize()

            simulation_results.append(
                filtered_result.model_dump(mode="json")
                | {"job_id": simulation_job.id, "simulation_id": simulation_id}
            )

            if i % 500 == 0:
                await batch_insert_simulation_results(results=simulation_results, db=db)
                simulation_results = []

            # INFO: Send progress every 25 iterations
            if i % intervals == 0:
                progress_percentage = round((i / combination_count) * 100, 2)
                progress_data = ProgressData(
                    simulation_id=simulation_id,
                    current_config=i,
                    total_config=combination_count,
                    progress_percentage=progress_percentage,
                    current_config_details=ConfigDetails(
                        bess_size_mwh=item[0],
                        duration_hr=item[1],
                        dg_size_mw=item[2],
                    ),
                )

                progress_event = SocketEvent(
                    resource_type=ResourceType.SIZING_SIMULATION_JOB,
                    resource_id=job_id,
                    action_id=ActionType.UPDATED,
                    data=progress_data,
                )

                await redis.publish(channel, progress_event.model_dump_json())

                simulation_job.completed_iterations = i

                if await should_simulation_stopped(
                    job_id=simulation_job.job_id, redis_client=redis
                ):
                    await db.delete(simulation_job)
                    await handle_simulation_termination(
                        current_sim_id=simulation_id, db=db
                    )
                    await db.commit()

                    fail_event = SocketEvent(
                        resource_type=ResourceType.SIZING_SIMULATION_JOB,
                        resource_id=job_id,
                        action_id=ActionType.CANCELLED,
                        status="error",
                        status_code="500",
                    )

                    await redis.publish(channel, fail_event.model_dump_json())

                    return {"status": "terminated", "message": "Simulation terminated."}

                simulation_job.completed_iterations = i
                await db.commit()
                await db.refresh(simulation_job)

        if len(simulation_results) > 0:
            await batch_insert_simulation_results(results=simulation_results, db=db)

        simulation_job.completed_iterations = combination_count
        simulation_job.status = SimulationJobStatus.COMPLETED
        simulation_job.simulation.status = SimulationStatus.COMPLETED
        await db.commit()

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.RUN_SIZING_SIMULATION,
            db=db,
        )

        # INFO: Send Completed Event
        complete_data = CompletedData(
            simulation_id=simulation_id,
            total_config=combination_count,
        )
        complete_event = SocketEvent(
            resource_type=ResourceType.SIZING_SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.COMPLETED,
            data=complete_data,
        )
        await redis.publish(channel, complete_event.model_dump_json())
        print(f"Simulation {simulation_id} completed event sent.")

    except Exception as e:
        print(f"Error in simulation {simulation_id}: {e}")

        await db.rollback()

        if simulation_job:
            try:
                await db.execute(
                    update(SimulationJob)
                    .where(SimulationJob.simulation_id == simulation_id)
                    .values(status=SimulationJobStatus.FAILED)
                )
                await db.execute(
                    update(Simulation)
                    .where(Simulation.id == simulation_id)
                    .values(status=SimulationStatus.FAILED)
                )

                await db.commit()
            except Exception as db_err:
                print(f"Failed to commit FAILED status to DB: {db_err}")

        # INFO: Send Failed Event
        fail_data = FailedData(
            simulation_id=simulation_id,
            error_code="SIM_EXEC_ERROR",
            error_message=str(e),
        )
        fail_event = SocketEvent(
            resource_type=ResourceType.SIZING_SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.FAILED,
            data=fail_data,
            status="error",
            status_code="500",
        )

        if redis:
            await redis.publish(channel, fail_event.model_dump_json())
        raise e

    return {"status": "success", "message": "Simulation completed"}


async def run_simulation_single_config(
    simulation_id: int,
    job_id: int,
    redis: Redis,
    db: AsyncSession,
    channel: str = SIMULATION_UPDATES_CHANEL,
):
    print(f"Running simulation for ID: {simulation_id} (Job: {job_id})")

    simulation_job = None

    try:
        # INFO: Send Started Event
        start_data = StartedData(simulation_id=simulation_id)

        start_event = SocketEvent(
            resource_type=ResourceType.SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.STARTED,
            data=start_data,
        )
        await redis.publish(channel, start_event.model_dump_json())

        (simulation_params, _, _, year, _) = await get_constant_simulation_params(
            simulation_id=simulation_id, db=db
        )

        (
            simulation_params.duration_hr,
            simulation_params.bess_capacity_mwh,
            simulation_params.dg_capacity_mw,
        ) = await get_custom_configuration(simulation_id=simulation_id, db=db)

        result = await db.execute(
            select(CustomSimulationJob)
            .options(joinedload(CustomSimulationJob.simulation))
            .where(
                CustomSimulationJob.simulation_id == simulation_id,
                CustomSimulationJob.job_id == job_id,
            )
        )

        simulation_job = result.scalar_one_or_none()
        if not simulation_job:
            raise ValueError(
                f"Simulation Job not found for simulation {simulation_id} and job {job_id}"
            )

        simulation_job.status = SimulationJobStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(simulation_job)

        template_id = SimulationEngine.get_template_id(params=simulation_params)

        engine = SimulationEngine(params=simulation_params, year=year)
        simulation_result, hourly_data = engine.run_simulation(
            template_id=template_id,
            job_id=job_id,
            store_hourly=True,
            simulation_id=simulation_id,
        )

        await batch_insert_hourly_data(db=db, results=hourly_data)

        filtered_result = ScenarioResult.model_validate(simulation_result)
        filtered_result.finalize()

        sim_result = SingularConfSimulationResult(
            **filtered_result.model_dump(exclude={"dg_generation", "solar_generation"}),
            job_id=simulation_job.id,
            simulation_id=simulation_id,
        )
        db.add(sim_result)

        simulation_job.status = SimulationJobStatus.COMPLETED
        simulation_job.simulation.status = SimulationStatus.COMPLETED

        await db.commit()

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.RUN_CUSTOM_CONFIG_SIMULATION,
            db=db,
        )

        # INFO: Send Completed Event
        # complete_data = CompletedData(
        #     simulation_id=simulation_id,
        #     total_config=combination_count,
        # )
        complete_event = SocketEvent(
            resource_type=ResourceType.SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.COMPLETED,
            # data=complete_data,
            data=None,
        )
        await redis.publish(channel, complete_event.model_dump_json())

    except Exception as e:
        print(f"Error in simulation {simulation_id}: {e}")

        await db.rollback()

        if simulation_job:
            try:
                await db.execute(
                    update(CustomSimulationJob)
                    .where(CustomSimulationJob.simulation_id == simulation_id)
                    .values(status=SimulationJobStatus.FAILED)
                )
                await db.execute(
                    update(Simulation)
                    .where(Simulation.id == simulation_id)
                    .values(status=SimulationStatus.FAILED)
                )

                await db.commit()

            except Exception as db_err:
                print(f"Failed to commit FAILED status to DB: {db_err}")

        # INFO: Send Failed Event
        fail_data = FailedData(
            simulation_id=simulation_id,
            error_code="SIM_EXEC_ERROR",
            error_message=str(e),
        )
        fail_event = SocketEvent(
            resource_type=ResourceType.SIMULATION_JOB,
            resource_id=job_id,
            action_id=ActionType.FAILED,
            data=fail_data,
            status="error",
            status_code="500",
        )

        if redis:
            await redis.publish(channel, fail_event.model_dump_json())
        raise e

    return {"status": "success", "message": "Simulation completed"}


async def run_multi_year_projection(
    simulation_id: int,
    job_id: int,
    redis: Redis,
    db: AsyncSession,
    channel: str = SIMULATION_UPDATES_CHANEL,
    duration=20,
):
    print(f"Running simulation for ID: {simulation_id} (Job: {job_id})")

    simulation_job = None

    try:
        # INFO: Send Started Event
        start_data = StartedData(simulation_id=simulation_id)

        start_event = SocketEvent(
            resource_type=ResourceType.MULTI_YEAR_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.STARTED,
            data=start_data,
        )
        await redis.publish(channel, start_event.model_dump_json())

        (simulation_params, _, _, year, _) = await get_constant_simulation_params(
            simulation_id=simulation_id, db=db
        )

        (
            simulation_params.duration_hr,
            bess_capacity_mwh,
            simulation_params.dg_capacity_mw,
        ) = await get_custom_configuration(simulation_id=simulation_id, db=db)

        (
            nameplate,
            factory_capacity_retention,
            annual_retention_rate,
        ) = await get_bess_sizing_requirements(
            simulation_id=simulation_id, bess_capacity_mwh=bess_capacity_mwh, db=db
        )

        first_year_bol, bol_pct = get_n_year_capacity(
            n=0,
            nc=nameplate,
            frr=factory_capacity_retention,
            arr=annual_retention_rate,
        )
        simulation_params.bess_capacity_mwh = first_year_bol

        result = await db.execute(
            select(MultiYearSimulationJob)
            .options(joinedload(MultiYearSimulationJob.simulation))
            .where(
                MultiYearSimulationJob.simulation_id == simulation_id,
                MultiYearSimulationJob.job_id == job_id,
            )
        )

        simulation_job = result.scalar_one_or_none()
        if not simulation_job:
            raise ValueError(
                f"Simulation Job not found for simulation {simulation_id} and job {job_id}"
            )

        simulation_job.status = SimulationJobStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(simulation_job)

        template_id = SimulationEngine.get_template_id(params=simulation_params)

        simulation_results = []

        for i in range(1, duration + 1):
            engine = SimulationEngine(params=simulation_params, year=year)
            simulation_result, _ = engine.run_simulation(
                template_id=template_id,
                job_id=job_id,
                simulation_id=simulation_id,
            )

            if i % 2 == 0:
                progress_percentage = round((i / duration) * 100, 2)

                if await should_simulation_stopped(
                    job_id=simulation_job.job_id, redis_client=redis
                ):
                    await db.delete(simulation_job)
                    await db.commit()

                    fail_event = SocketEvent(
                        resource_type=ResourceType.MULTI_YEAR_SIMULATION,
                        resource_id=job_id,
                        action_id=ActionType.CANCELLED,
                        status="error",
                        status_code="500",
                    )

                    await redis.publish(channel, fail_event.model_dump_json())

                    return {"status": "terminated", "message": "Simulation terminated."}
                progress_data = MultiYearProgressData(
                    simulation_id=simulation_id,
                    current_config=i,
                    total_config=duration,
                    progress_percentage=progress_percentage,
                    year=i,
                )

                complete_event = SocketEvent(
                    resource_type=ResourceType.MULTI_YEAR_SIMULATION,
                    resource_id=job_id,
                    action_id=ActionType.UPDATED,
                    data=progress_data,
                )
                await redis.publish(channel, complete_event.model_dump_json())
                print(f"Simulation {simulation_id} progress {progress_percentage}.")

            sim_result = MultiYearProjectionResult.model_validate(
                {k: v for k, v in simulation_result.__dict__.items()}
                | {
                    "job_id": simulation_job.id,
                    "simulation_id": simulation_id,
                    "year": i,
                    "capacity_percent": bol_pct,
                }
            )

            sim_result.finalize()

            simulation_params.bess_capacity_mwh, bol_pct = get_n_year_capacity(
                n=i,
                nc=nameplate,
                frr=factory_capacity_retention,
                arr=annual_retention_rate,
                bol=first_year_bol,
            )

            # WARNING: It can be calcuated only once in schema functions
            final_energy = simulation_result.bess_mwh * (
                simulation_result.final_soc_pct / 100
            )
            simulation_params.bess_initial_soc_pct = (
                final_energy / simulation_params.bess_capacity_mwh
            ) * 100

            sim_result.finalize()

            simulation_results.append(sim_result.model_dump(mode="json"))

        await batch_insert_multi_year_projection(results=simulation_results, db=db)

        simulation_job.status = SimulationJobStatus.COMPLETED
        simulation_job.simulation.status = SimulationStatus.COMPLETED

        await db.commit()

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.RUN_MULTI_YEAR_PROJECTION,
            db=db,
        )

        complete_data = CompletedData(
            simulation_id=simulation_id,
            total_config=duration,
        )

        complete_event = SocketEvent(
            resource_type=ResourceType.MULTI_YEAR_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.COMPLETED,
            data=complete_data,
        )
        await redis.publish(channel, complete_event.model_dump_json())
        print(f"Simulation {simulation_id} completed event sent.")

    except Exception as e:
        print(f"Error in simulation {simulation_id}: {e}")

        await db.rollback()

        if simulation_job:
            try:
                await db.execute(
                    update(MultiYearSimulationJob)
                    .where(MultiYearSimulationJob.simulation_id == simulation_id)
                    .values(status=SimulationJobStatus.FAILED)
                )
                await db.execute(
                    update(Simulation)
                    .where(Simulation.id == simulation_id)
                    .values(status=SimulationStatus.FAILED)
                )

                await db.commit()

            except Exception as db_err:
                print(f"Failed to commit FAILED status to DB: {db_err}")

        # INFO: Send Failed Event
        fail_data = FailedData(
            simulation_id=simulation_id,
            error_code="SIM_EXEC_ERROR",
            error_message=str(e),
        )
        fail_event = SocketEvent(
            resource_type=ResourceType.MULTI_YEAR_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.FAILED,
            data=fail_data,
            status="error",
            status_code="500",
        )

        if redis:
            await redis.publish(channel, fail_event.model_dump_json())
        raise e

    return {"status": "success", "message": "Simulation completed"}


async def run_green_sizing_simulation(
    simulation_id: int,
    job_id: int,
    redis: Redis,
    db: AsyncSession,
    channel: str = SIMULATION_UPDATES_CHANEL,
    intervals: int = 25,
):
    print(f"Running simulation for ID: {simulation_id} (Job: {job_id})")

    simulation_job = None

    try:
        # INFO: Send Started Event
        start_data = StartedData(simulation_id=simulation_id)

        start_event = SocketEvent(
            resource_type=ResourceType.GREEN_ENERGY_CONFIG,
            resource_id=job_id,
            action_id=ActionType.STARTED,
            data=start_data,
        )
        await redis.publish(channel, start_event.model_dump_json())

        (
            simulation_params,
            container_types,
            dg_enable,
            year,
            peak_generation,
        ) = await get_constant_simulation_params(simulation_id=simulation_id, db=db)

        combinations = await get_possible_simulation_comb(
            simulation_id=simulation_id,
            container_types=container_types,
            dg_enable=dg_enable,
            solar_scale=True,
            db=db,
        )

        result = await db.execute(
            select(GreenSizingSimulationJob)
            .options(joinedload(GreenSizingSimulationJob.simulation))
            .where(
                GreenSizingSimulationJob.simulation_id == simulation_id,
                GreenSizingSimulationJob.job_id == job_id,
            )
        )

        simulation_job = result.scalar_one_or_none()
        if not simulation_job:
            raise ValueError(
                f"Simulation Job not found for simulation {simulation_id} and job {job_id}"
            )

        combination_count = combinations.shape[0]

        simulation_job.status = SimulationJobStatus.IN_PROGRESS
        simulation_job.completed_iterations = 0
        simulation_job.max_iterations = combination_count
        await db.commit()
        await db.refresh(simulation_job)

        template_id = SimulationEngine.get_template_id(params=simulation_params)

        simulation_results = []
        solar_scale = 1

        for i, item in enumerate(combinations, start=1):
            simulation_params.bess_capacity_mwh = item[0].item()
            simulation_params.duration_hr = item[1].item()
            simulation_params.dg_capacity_mw = item[2].item()

            simulation_params.solar_profile = np.divide(
                simulation_params.solar_profile, solar_scale
            )
            solar_scale = item[3].item() / peak_generation
            simulation_params.solar_profile = np.multiply(
                simulation_params.solar_profile, solar_scale
            )

            engine = SimulationEngine(params=simulation_params, year=year)
            simulation_result, _ = engine.run_simulation(
                template_id=template_id,
                job_id=job_id,
                simulation_id=simulation_id,
            )

            if i % 500 == 0:
                await batch_insert_green_sizing_data(results=simulation_results, db=db)
                simulation_results = []

            if i % intervals == 0:
                progress_percentage = round((i / combination_count) * 100, 2)

                if await should_simulation_stopped(
                    job_id=simulation_job.job_id, redis_client=redis
                ):
                    await db.delete(simulation_job)
                    await db.commit()

                    fail_event = SocketEvent(
                        resource_type=ResourceType.GREEN_ENERGY_CONFIG,
                        resource_id=job_id,
                        action_id=ActionType.CANCELLED,
                        status="error",
                        status_code="500",
                    )

                    await redis.publish(channel, fail_event.model_dump_json())

                    return {"status": "terminated", "message": "Simulation terminated."}

                simulation_job.completed_iterations = i
                await db.commit()
                await db.refresh(simulation_job)

                progress_data = ProgressData(
                    simulation_id=simulation_id,
                    current_config=i,
                    total_config=combination_count,
                    progress_percentage=progress_percentage,
                    current_config_details=GreenConfigDetails(
                        bess_size_mwh=item[0],
                        duration_hr=item[1],
                        dg_size_mw=item[2],
                        solar_mwp=item[3],
                    ),
                )

                complete_event = SocketEvent(
                    resource_type=ResourceType.GREEN_ENERGY_CONFIG,
                    resource_id=job_id,
                    action_id=ActionType.UPDATED,
                    data=progress_data,
                )
                await redis.publish(channel, complete_event.model_dump_json())
                print(f"Simulation {simulation_id} progress {progress_percentage}.")

            sim_result = GreenResult.model_validate(
                {k: v for k, v in simulation_result.__dict__.items()}
                | {
                    "job_id": simulation_job.id,
                    "simulation_id": simulation_id,
                    "solar_mwp": item[3].item(),
                }
            )

            sim_result.finalize()

            simulation_results.append(sim_result.model_dump(mode="python"))

        await batch_insert_green_sizing_data(results=simulation_results, db=db)

        simulation_job.status = SimulationJobStatus.COMPLETED
        simulation_job.completed_iterations = combination_count
        simulation_job.simulation.status = SimulationStatus.COMPLETED

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.RUN_GREEN_SIZING_SIMULATION,
            db=db,
        )

        await db.commit()

        complete_data = CompletedData(
            simulation_id=simulation_id,
            total_config=combination_count,
        )

        complete_event = SocketEvent(
            resource_type=ResourceType.GREEN_ENERGY_CONFIG,
            resource_id=job_id,
            action_id=ActionType.COMPLETED,
            data=complete_data,
        )
        await redis.publish(channel, complete_event.model_dump_json())
        print(f"Simulation {simulation_id} completed event sent.")

    except Exception as e:
        print(f"Error in simulation {simulation_id}: {e}")

        await db.rollback()

        if simulation_job:
            try:
                await db.execute(
                    update(GreenSizingSimulationJob)
                    .where(GreenSizingSimulationJob.simulation_id == simulation_id)
                    .values(status=SimulationJobStatus.FAILED)
                )
                await db.execute(
                    update(Simulation)
                    .where(Simulation.id == simulation_id)
                    .values(status=SimulationStatus.FAILED)
                )

                await db.commit()

            except Exception as db_err:
                print(f"Failed to commit FAILED status to DB: {db_err}")

        # INFO: Send Failed Event
        fail_data = FailedData(
            simulation_id=simulation_id,
            error_code="SIM_EXEC_ERROR",
            error_message=str(e),
        )
        fail_event = SocketEvent(
            resource_type=ResourceType.GREEN_ENERGY_CONFIG,
            resource_id=job_id,
            action_id=ActionType.FAILED,
            data=fail_data,
            status="error",
            status_code="500",
        )

        if redis:
            await redis.publish(channel, fail_event.model_dump_json())
        raise e

    return {"status": "success", "message": "Simulation completed"}


async def run_detailed_green_sizing_simulation(
    simulation_id: int,
    job_id: int,
    redis: Redis,
    db: AsyncSession,
    channel: str = SIMULATION_UPDATES_CHANEL,
):
    print(f"Running simulation for ID: {simulation_id} (Job: {job_id})")

    simulation_job = None

    try:
        # INFO: Send Started Event
        start_data = StartedData(simulation_id=simulation_id)

        start_event = SocketEvent(
            resource_type=ResourceType.DETAIL_GREEN_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.STARTED,
            data=start_data,
        )
        await redis.publish(channel, start_event.model_dump_json())

        (
            simulation_params,
            _,
            _,
            year,
            peak_generation,
        ) = await get_constant_simulation_params(simulation_id=simulation_id, db=db)

        (
            simulation_params.duration_hr,
            required_pieak,
            simulation_params.bess_capacity_mwh,
            simulation_params.dg_capacity_mw,
        ) = await get_detailed_green_configuration(simulation_id=simulation_id, db=db)

        solar_scale = required_pieak / peak_generation
        simulation_params.solar_profile = np.multiply(
            simulation_params.solar_profile, solar_scale
        )

        result = await db.execute(
            select(DetailGreenSimulationJob)
            .options(joinedload(DetailGreenSimulationJob.simulation))
            .where(
                DetailGreenSimulationJob.simulation_id == simulation_id,
                DetailGreenSimulationJob.job_id == job_id,
            )
        )

        simulation_job = result.scalar_one_or_none()
        if not simulation_job:
            raise ValueError(
                f"Simulation Job not found for detail green simulation {simulation_id} and job {job_id}"
            )

        simulation_job.status = SimulationJobStatus.IN_PROGRESS
        await db.commit()
        await db.refresh(simulation_job)

        template_id = SimulationEngine.get_template_id(params=simulation_params)

        engine = SimulationEngine(params=simulation_params, year=year)
        simulation_result, hourly_data = engine.run_simulation(
            template_id=template_id,
            job_id=job_id,
            store_hourly=True,
            simulation_id=simulation_id,
        )

        await batch_insert_green_hourly_data(db=db, results=hourly_data)

        filtered_result = GreenResult.model_validate(
            vars(simulation_result)
            | {
                "job_id": simulation_job.id,
                "simulation_id": simulation_id,
                "solar_mwp": required_pieak,
            }
        )
        filtered_result.finalize()

        sim_result = DetailedGreenSimulationResult(
            **filtered_result.model_dump(exclude={"dg_generation", "solar_generation"}),
        )
        db.add(sim_result)

        simulation_job.status = SimulationJobStatus.COMPLETED
        simulation_job.simulation.status = SimulationStatus.COMPLETED

        await db.commit()

        await progress_simulation_setup(
            simulation_id=simulation_id,
            to=SimulationSetupProgress.RUN_DETAILED_GREEN_ENERGY_SIMULATION,
            db=db,
        )

        # INFO: Send Completed Event
        complete_data = UpdateData(
            simulation_id=simulation_id,
            status_code="",
            message=f"Simulation {simulation_id} completed successfully",
        )
        complete_event = SocketEvent(
            resource_type=ResourceType.DETAIL_GREEN_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.COMPLETED,
            data=complete_data,
        )
        await redis.publish(channel, complete_event.model_dump_json())

    except Exception as e:
        print(f"Error in simulation {simulation_id}: {e}")

        await db.rollback()

        if simulation_job:
            try:
                await db.execute(
                    update(DetailGreenSimulationJob)
                    .where(DetailGreenSimulationJob.simulation_id == simulation_id)
                    .values(status=SimulationJobStatus.FAILED)
                )
                await db.execute(
                    update(Simulation)
                    .where(Simulation.id == simulation_id)
                    .values(status=SimulationStatus.FAILED)
                )

                await db.commit()

            except Exception as db_err:
                print(f"Failed to commit FAILED status to DB: {db_err}")

        # INFO: Send Failed Event
        fail_data = UpdateData(
            simulation_id=simulation_id,
            status_code="",
            message=str(e),
        )
        fail_event = SocketEvent(
            resource_type=ResourceType.DETAIL_GREEN_SIMULATION,
            resource_id=job_id,
            action_id=ActionType.FAILED,
            data=fail_data,
            status="error",
            status_code="500",
        )

        if redis:
            await redis.publish(channel, fail_event.model_dump_json())
        raise e

    return {"status": "success", "message": "Simulation completed"}
