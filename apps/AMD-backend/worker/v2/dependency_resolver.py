import inspect
import itertools
import logging

from dataclasses import dataclass
from datetime import datetime, time, timezone
from typing import Any, Callable, Literal, get_args, get_origin

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from constants.enums import (
    AnalysisModules,
)
from models.analytics_result_model import AssetAnalyticsValues
from services.asset_analysis_helper import AnalysisServiceHelper
from utils.common_utils import generate_json_hash


logger = logging.getLogger(__name__)


# ============================================================
# Context
# ============================================================

@dataclass(frozen=True)
class AnalyticsContext:
    asset_id: int
    year: int
    month: int | None = None


# ============================================================
# Dependency cache
# ============================================================

DependencyCache = dict[tuple[Any, ...], Any]


class DependencyResolver:

    def __init__(
        self,
        helper: AnalysisServiceHelper,
        db: AsyncSession,
    ):
        self.helper = helper
        self.db = db

        # Shared across the entire worker run
        self.cache: DependencyCache = {}

    def _build_loader_kwargs(
        self,
        loader: Callable,
        context: AnalyticsContext,
    ) -> dict[str, Any]:

        signature = inspect.signature(loader)

        available_context = {
            "db": self.db,
            "asset_id": context.asset_id,
            "month": context.month,
            "year": context.year,
        }

        kwargs = {}

        for name, param in signature.parameters.items():

            if name == "self":
                continue

            if param.kind in (
                inspect.Parameter.VAR_POSITIONAL,
                inspect.Parameter.VAR_KEYWORD,
            ):
                continue

            if name in available_context:
                value = available_context[name]

                if value is not None:
                    kwargs[name] = value

                elif param.default is inspect.Parameter.empty:
                    raise ValueError(
                        f"Dependency loader {loader.__name__} "
                        f"requires '{name}', but context has no value."
                    )

        return kwargs

    def _build_cache_key(
        self,
        dependency_type: type,
        loader: Callable,
        context: AnalyticsContext,
    ) -> tuple[Any, ...]:

        """
        Loader signature automatically determines scope.

        load_merged_file(asset_id, month, year)
            -> (MergedDataFrame, asset_id, month, year)

        load_asset_usable_capacity(asset_id)
            -> (AssetUsableCapacity, asset_id)

        load_tb_spread_benchmark(month, year)
            -> (TBSpreadBenchmark, month, year)

        load_modo_benchmark_industry_config(db)
            -> (ModoIndustryConfig,)
        """

        signature = inspect.signature(loader)

        context_values = {
            "asset_id": context.asset_id,
            "month": context.month,
            "year": context.year,
        }

        key: list[Any] = [dependency_type]

        for name, _ in signature.parameters.items():

            if name in context_values:
                key.extend((name, context_values[name]))

        return tuple(key)

    async def resolve(
        self,
        dependency_type: type,
        context: AnalyticsContext,
    ) -> Any:

        loader = self.helper.dependency_map.get(dependency_type)

        if loader is None:
            raise ValueError(
                f"No dependency loader registered for "
                f"{dependency_type.__name__}"
            )

        cache_key = self._build_cache_key(
            dependency_type,
            loader,
            context,
        )

        if cache_key in self.cache:
            return self.cache[cache_key]

        kwargs = self._build_loader_kwargs(
            loader,
            context,
        )

        logger.info(
            "Resolving %s with %s",
            dependency_type.__name__,
            kwargs.keys(),
        )

        value = await loader(**kwargs)

        self.cache[cache_key] = value

        return value

def is_monthly_module(module: str) -> bool:
    return module in {
        AnalysisModules.ASSET_ANALYSIS,
        AnalysisModules.SOLAR_ANALYSIS,
        # add other monthly modules here
    }

def get_all_compute_functions() -> list[Callable]:
    return [
        func
        for _, func in inspect.getmembers(
            AnalysisServiceHelper,
            predicate=inspect.isfunction,
        )
        if hasattr(func, "analytics_meta")
    ]


def get_compute_functions_for_dependencies(
    dependencies: list[str],
) -> list[Callable]:

    affected = []

    for func in get_all_compute_functions():

        signature = inspect.signature(func)

        for param in signature.parameters.values():

            annotation = param.annotation

            if (
                annotation is not inspect.Parameter.empty
                and getattr(annotation, "__name__", None)
                in dependencies
            ):
                affected.append(func)
                break

    return affected


def get_compute_functions_for_modules(
    modules: list[AnalysisModules],
) -> list[Callable]:

    return [
        func
        for func in get_all_compute_functions()
        if func.analytics_meta.get("module") in modules
    ]

def get_function_dependencies(
    func: Callable,
    dependency_map: dict[type, Callable],
) -> list[type]:

    dependencies = []

    signature = inspect.signature(func)

    for param in signature.parameters.values():

        if param.name == "self":
            continue

        annotation = param.annotation

        if annotation in dependency_map:
            dependencies.append(annotation)

    return dependencies

async def build_function_argument_combinations(
    *,
    func: Callable,
    context: AnalyticsContext,
    resolver: DependencyResolver,
) -> list[tuple[dict[str, Any], dict[str, Any]]]:

    signature = inspect.signature(func)

    names = []
    possible_values = []
    literal_flags = []

    for name, param in signature.parameters.items():

        if name == "self":
            continue

        if param.kind in (
            inspect.Parameter.VAR_POSITIONAL,
            inspect.Parameter.VAR_KEYWORD,
        ):
            continue

        annotation = param.annotation

        # ----------------------------------------
        # Literal
        # ----------------------------------------

        if get_origin(annotation) is Literal:

            values = list(get_args(annotation))

            names.append(name)
            possible_values.append(values)
            literal_flags.append(True)

            continue

        # ----------------------------------------
        # Dependency
        # ----------------------------------------

        if annotation in resolver.helper.dependency_map:

            value = await resolver.resolve(
                annotation,
                context,
            )

            names.append(name)
            possible_values.append([value])
            literal_flags.append(False)

            continue

        # ----------------------------------------
        # Context
        # ----------------------------------------

        if name == "db":
            value = resolver.db

        elif name == "asset_id":
            value = context.asset_id

        elif name == "month":
            value = context.month

        elif name == "year":
            value = context.year

        elif param.default is not inspect.Parameter.empty:
            value = param.default

        else:
            value = None

        names.append(name)
        possible_values.append([value])
        literal_flags.append(False)

    combinations = []

    for values in itertools.product(*possible_values):

        kwargs = dict(zip(names, values))

        parameters = {
            name: value
            for name, value, is_literal
            in zip(names, values, literal_flags)
            if is_literal
        }

        combinations.append(
            (kwargs, parameters)
        )

    return combinations

async def execute_compute_function(
    *,
    helper: AnalysisServiceHelper,
    resolver: DependencyResolver,
    context: AnalyticsContext,
    func: Callable,
):

    combinations = await build_function_argument_combinations(
        func=func,
        context=context,
        resolver=resolver,
    )

    results = []

    for kwargs, parameters in combinations:

        logger.info(
            "Computing %s for %s",
            func.__name__,
            context,
        )

        if inspect.iscoroutinefunction(func):
            result = await func(
                helper,
                **kwargs,
            )
        else:
            result = func(
                helper,
                **kwargs,
            )

        results.append(
            (parameters, result)
        )

    logger.info(
        "DONE computing %s for %s",
        func.__name__,
        context,
    )
    return results

async def store_result(
    *,
    db: AsyncSession,
    context: AnalyticsContext,
    module: str,
    section: str,
    widget: str,
    parameters: dict[str, Any],
    result: Any,
):

    parameters_hash = generate_json_hash(parameters)

    monthly = is_monthly_module(module)

    stmt = select(
        AssetAnalyticsValues
    ).where(
        AssetAnalyticsValues.asset_id == context.asset_id,
        AssetAnalyticsValues.year == context.year,
        AssetAnalyticsValues.module == module,
        AssetAnalyticsValues.section == section,
        AssetAnalyticsValues.widget == widget,
        AssetAnalyticsValues.parameters_hash == parameters_hash,
    )

    if monthly:
        stmt = stmt.where(
            AssetAnalyticsValues.month == context.month
        )
    else:
        stmt = stmt.where(
            AssetAnalyticsValues.month.is_(None)
        )

    existing = (
        await db.execute(stmt)
    ).scalars().first()

    now = datetime.now(timezone.utc)

    if existing:

        existing.result = result
        existing.parameters = parameters
        existing.updated_at = now

    else:

        db.add(
            AssetAnalyticsValues(
                asset_id=context.asset_id,
                month=context.month if monthly else None,
                year=context.year,
                module=module,
                section=section,
                widget=widget,
                parameters=parameters,
                parameters_hash=parameters_hash,
                result=result,
                generated_at=now,
                updated_at=now,
            )
        )

    logger.info(
        "Storing result for %s, %s, %s, %s, %s, %s",
        context.asset_id,
        context.year,
        context.month,
        module,
        section,
        widget,
    )

async def resolve_computation_contexts(
    *,
    db: AsyncSession,
    asset_id: int | Literal["all"],
    month: int | Literal["all"],
    year: int | Literal["all"],
) -> list[AnalyticsContext]:

    stmt = select(
        AssetAnalyticsValues.asset_id,
        AssetAnalyticsValues.year,
        AssetAnalyticsValues.month,
    ).distinct()

    if asset_id != "all":
        stmt = stmt.where(
            AssetAnalyticsValues.asset_id == asset_id
        )

    if year != "all":
        stmt = stmt.where(
            AssetAnalyticsValues.year == year
        )

    if month != "all":
        stmt = stmt.where(
            AssetAnalyticsValues.month == month
        )

    rows = (
        await db.execute(stmt)
    ).all()

    return [
        AnalyticsContext(
            asset_id=row.asset_id,
            year=row.year,
            month=row.month,
        )
        for row in rows
    ]