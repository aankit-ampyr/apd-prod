from sqlalchemy.ext.asyncio import AsyncSession
from taskiq import TaskiqDepends, Context
from typing import Literal
from broker import broker
from typing import List
from .v2 import (
    asset_computation,
    asset_analytics_deletion,
)
from constants.enums import AnalysisModules


async def get_db(
    context: Context = TaskiqDepends(),
) -> AsyncSession:
    async with context.state.db_session_factory() as session:
        yield session  # type: ignore


@broker.task(task_name="asset_computation_task")
async def asset_computation_task(
    asset_id: int | Literal['all'],
    month: int | Literal['all'],
    year: int | Literal['all'],
    dependencies: List[str] | None = None,
    modules: List[AnalysisModules] | None = None,
    db: AsyncSession = TaskiqDepends(get_db),
):
    try:
        return await asset_computation(
            asset_id=asset_id,
            month=month,
            year=year,
            dependencies=dependencies,
            modules=modules,
            db=db,
        )
    except Exception as e:
        return {"status": "error", "message": str(e)}

@broker.task(task_name="asset_analytics_deletion_task")
async def asset_analytics_deletion_task(
    asset_id: int,
    month: int,
    year: int,
    dependencies: List[str] | None = None,
    modules: List[AnalysisModules] | None = None,
    db: AsyncSession = TaskiqDepends(get_db),
):
    try:
        return await asset_analytics_deletion(
            asset_id=asset_id,
            month=month,
            year=year,
            dependencies=dependencies,
            modules=modules,
            db=db,
        )

    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
        }