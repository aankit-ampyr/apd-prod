from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc, insert, select, update
from constants.enums import SimulationSetupProgress
from models import SimulationHourlyResult
from models.simulation_model import (
    GreenEnergySizingSimulationResult,
    GreenSimulationHourlyResult,
    MultiYearSimulationJob,
    MultiYearSimulationResult,
    Simulation,
    SimulationDebug,
    SimulationJob,
    SimulationResult,
)


async def batch_insert_simulation_results(
    db: AsyncSession, results: List[Dict[str, Any]]
):
    """
    Batch inserts a list of simulation results into the database.

    Args:
        db (AsyncSession): The database session.
        results (List[Dict[str, Any]]): A list of dictionaries representing SimulationResult records.
    """
    if not results:
        print("no results")
        return

    stmt = insert(SimulationResult)
    await db.execute(stmt, results)
    await db.commit()


async def batch_insert_simulation_debug_state(
    db: AsyncSession, results: List[Dict[str, Any]]
):
    if not results:
        print("no results")
        return

    stmt = insert(SimulationDebug)
    await db.execute(stmt, results)
    await db.commit()


async def batch_insert_multi_year_projection(
    db: AsyncSession, results: List[Dict[str, Any]]
):
    if not results:
        print("no results")
        return

    stmt = insert(MultiYearSimulationResult)
    await db.execute(stmt, results)
    await db.commit()


async def batch_insert_green_sizing_data(
    db: AsyncSession, results: List[Dict[str, Any]]
):
    if not results:
        print("no results")
        return

    stmt = insert(GreenEnergySizingSimulationResult)
    await db.execute(stmt, results)
    await db.commit()


async def handle_simulation_termination(current_sim_id: int, db: AsyncSession):
    sim_job_result = await db.execute(
        select(SimulationJob)
        .where(SimulationJob.simulation_id == current_sim_id, SimulationJob.is_fallback)
        .order_by(desc(SimulationJob.created_at))
    )

    prev_job = sim_job_result.scalars().first()

    if prev_job:
        prev_job.is_fallback = False
        await db.flush()


async def batch_insert_hourly_data(db: AsyncSession, results: List[Dict[str, Any]]):
    if not results:
        print("no results")
        return

    stmt = insert(SimulationHourlyResult)
    await db.execute(stmt, results)
    await db.commit()


async def batch_insert_green_hourly_data(
    db: AsyncSession, results: List[Dict[str, Any]]
):
    if not results:
        print("no results")
        return

    stmt = insert(GreenSimulationHourlyResult)
    await db.execute(stmt, results)
    await db.commit()


async def progress_simulation_setup(
    simulation_id: int, to: SimulationSetupProgress, db: AsyncSession
):
    response = await db.execute(
        select(Simulation).where(Simulation.id == simulation_id)
    )
    simulation = response.scalar_one_or_none()

    if not simulation:
        print(f"Simulation with Id: {simulation_id} not found.")
        raise
    if simulation.step < to:
        simulation.step = to

    simulation.edit_step = to

    await db.commit()
