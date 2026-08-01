import inspect
import itertools
import logging
from typing import Dict, Any, Literal, get_origin, get_args, List
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from services.asset_analysis_helper import AnalysisServiceHelper
from models.analytics_result_model import AssetAnalyticsValues
from constants.enums import AnalysisModules, AnalysisSections, AnalysisWidget
import traceback
from utils.common_utils import generate_json_hash
from pprint import pprint

logger = logging.getLogger(__name__)


async def get_resolved_dependencies(
    asset_id: int | Literal["all"],
    month: int | Literal["all"],
    year: int | Literal["all"],
    db: AsyncSession,
    asset_analyser: AnalysisServiceHelper,
    dependencies: List[str] | None = None,
    modules: List[AnalysisModules] | None = None,
) -> Dict[str, Any]:
    # ================================================================================
    # Resolve all the affected compute function based on the dependencies/modules passed.
    # ================================================================================
    if dependencies is not None:
        affected_functions = get_compute_functions_for_dependencies(dependencies)
    elif modules is not None:
        affected_functions = get_compute_functions_for_modules(modules)
    else:
        affected_functions = get_all_compute_functions()

    # ================================================================================
    # Then resolve all the other depedency for the affected functions
    # ================================================================================
    final_dependencies = set()
    for func in affected_functions:
        func_dependencies = get_dependencies_for_compute_function(func)
        final_dependencies.update(
            func_dependencies
        )  # use update instead of add to merge lists
    # ================================================================================
    # Resolve all the overall dependencies and store them in resolved_cache
    # ================================================================================
    final_dependencies = list(
        final_dependencies
    )  # convert set back to list for processing

    print(f"Final dependencies to resolve: {final_dependencies}")

    resolved_cached_dependencies: Dict[int, Dict[int, Dict[int, Any]]] = {}

    for dependency_class, resolver_func in asset_analyser.dependency_map.items():
        # Only resolve dependencies that are in the final_dependencies list
        if dependency_class.__name__ not in final_dependencies:
            continue

        print(f"Resolving dependency {dependency_class}")
        try:
            resolved_cached_dependencies[dependency_class] = await resolver_func(
                asset_id=asset_id, month=month, year=year, db=db
            )
        except Exception as e:
            logger.error(
                f"Error resolving dependency {dependency_class.__name__}: {e}",
                exc_info=True,
            )
            resolved_cached_dependencies[dependency_class] = None

    return resolved_cached_dependencies


def get_compute_functions_for_dependencies(dependencies: List[str]) -> List[Any]:
    compute_functions = []

    for _, func in inspect.getmembers(
        AnalysisServiceHelper, predicate=inspect.isfunction
    ):
        if not hasattr(func, "analytics_meta"):
            continue

        sig = inspect.signature(func)

        parameters = sig.parameters.items()

        annotations = [
            (
                param.annotation.__name__
                if hasattr(param.annotation, "__name__")
                else param.annotation
            )
            for _, param in parameters
        ]
        if any(dep in annotations for dep in dependencies):
            compute_functions.append(func)

    return compute_functions


def get_compute_functions_for_modules(modules: List[AnalysisModules]) -> List[Any]:
    compute_functions = []

    for _, func in inspect.getmembers(
        AnalysisServiceHelper, predicate=inspect.isfunction
    ):
        if not hasattr(func, "analytics_meta"):
            continue

        meta = func.analytics_meta  # type: ignore
        module = meta.get("module")

        if module in modules:
            compute_functions.append(func)

    return compute_functions


def get_all_compute_functions() -> List[Any]:
    compute_functions = []

    for _, func in inspect.getmembers(
        AnalysisServiceHelper, predicate=inspect.isfunction
    ):
        if not hasattr(func, "analytics_meta"):
            continue

        compute_functions.append(func)

    return compute_functions


def get_dependencies_for_compute_function(func: Any) -> List[str]:
    if not hasattr(func, "analytics_meta"):
        return []

    sig = inspect.signature(func)

    parameters = sig.parameters.items()

    annotations = []
    print("function : ", func.__name__)
    print("-------------------------------")
    for _, param in parameters:
        print(
            "param : ",
            param.name,
            ", annotation: ",
            (
                param.annotation.__name__
                if hasattr(param.annotation, "__name__")
                else param.annotation
            ),
            end="",
        )

        # ignore 'self' and variable positional/keyword arguments
        if param.name == "self":
            print("❌")
            continue
        # ignore variable positional and keyword arguments for exaple *args and **kwargs
        if param.kind in (
            inspect.Parameter.VAR_POSITIONAL,
            inspect.Parameter.VAR_KEYWORD,
        ):
            print("❌")
            continue
        # ignore parameters without annotations or with basic types
        if param.annotation is inspect.Parameter.empty:
            print("❌")
            continue

        if (
            get_origin(param.annotation) is Literal
            or getattr(param.annotation, "__origin__", None) is Literal
        ):
            print("❌")
            continue

        # ignore basic types like int, str, float, bool, list, dict
        if param.annotation in [int, str, float, bool, list, dict]:
            print("❌")
            continue

        annotations.append(
            param.annotation.__name__
            if hasattr(param.annotation, "__name__")
            else param.annotation
        )
        print("✅")

    print("\n\n\n")

    return annotations


async def evaluate_and_store_result(
    asset_id: int, 
    month: int, 
    year: int,
    db: AsyncSession, 
    func: Any, 
    resolved_cached_dependencies: Dict[str, Any],
    asset_analyser: AnalysisServiceHelper,
    section: AnalysisSections,
    widget: AnalysisWidget,
    module: AnalysisModules,

):
    is_monthly_module = module in [AnalysisModules.ASSET_ANALYSIS]
    
    sig = inspect.signature(func)
    names = []
    val_lists = []
    is_literal_flags = []

    for param_name, param in sig.parameters.items():
        if param_name == "self":
            continue
        if param.kind in (
            inspect.Parameter.VAR_POSITIONAL,
            inspect.Parameter.VAR_KEYWORD,
        ):
            continue

        annotation = param.annotation
        is_literal = False
        possible_vals = []

        if (
            get_origin(annotation) is Literal
            or getattr(annotation, "__origin__", None) is Literal
        ):
            possible_vals = list(get_args(annotation))
            is_literal = True
        elif annotation in resolved_cached_dependencies:
            possible_vals = [resolved_cached_dependencies[annotation]]
        elif param_name == "db":
            possible_vals = [db]
        elif param_name == "asset_id":
            possible_vals = [asset_id]
        elif param_name == "month":
            possible_vals = [month]
        elif param_name == "year":
            possible_vals = [year]
        else:
            if param.default is not inspect.Parameter.empty:
                possible_vals = [param.default]
            else:
                possible_vals = [None]

        names.append(param_name)
        val_lists.append(possible_vals)
        is_literal_flags.append(is_literal)

    # Generate all combinations of the parameter values
    for combo in itertools.product(*val_lists):
        func_kwargs = dict(zip(names, combo))

        # Extract the literal parameter combinations to store in parameters JSONB
        parameters_dict = {}
        for p_name, val, is_lit in zip(names, combo, is_literal_flags):
            if is_lit:
                parameters_dict[p_name] = val

        try:
            parameters_hash = generate_json_hash(parameters_dict)

            print(f"computing the results for : {func.__name__}")
            # Run the calculation
            result = func(asset_analyser, **func_kwargs)

            print(f"storing  the results for : {func.__name__}")
            # Query to find if an existing row matches the unique constraint
            query = select(AssetAnalyticsValues).where(
                AssetAnalyticsValues.asset_id == asset_id,
                AssetAnalyticsValues.year == year,
                AssetAnalyticsValues.section == section,
                AssetAnalyticsValues.module == module,
                AssetAnalyticsValues.widget == widget,
                AssetAnalyticsValues.parameters == parameters_dict,
            )
            if is_monthly_module:
                query = query.where(AssetAnalyticsValues.month == month)
            existing_record = (await db.execute(query)).scalars().first()

            if existing_record:
                existing_record.result = result
            else:
                new_record = AssetAnalyticsValues(
                    asset_id=asset_id,
                    year=year,
                    section=section,
                    widget=widget,
                    module=module,
                    parameters=parameters_dict,
                    parameters_hash=parameters_hash,
                    result=result,
                    generated_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )

                db.add(new_record)
                await db.flush()

                if is_monthly_module:
                    new_record.month = month

            await db.commit()

        except Exception as e:
            logger.error(
                f"Error computing widget {widget} in section {section} "
                f"with parameters {parameters_dict}: {e}",
                exc_info=True,
            )
            await db.rollback()


async def asset_computation(
    asset_id: int | Literal["all"],
    month: int | Literal["all"],
    year: int | Literal["all"],
    db: AsyncSession,
    dependencies: List[str] | None = None,
    modules: List[AnalysisModules] | None = None,
):
    asset_analyser = AnalysisServiceHelper()

    resolved_cached_dependencies = await get_resolved_dependencies(
        asset_analyser=asset_analyser,
        asset_id=asset_id,
        month=month,
        year=year,
        db=db,
        dependencies=dependencies,
        modules=modules,
    )

    functions_to_compute = get_compute_functions_for_dependencies(dependencies)

    for func in functions_to_compute:
        if not hasattr(func, "analytics_meta"):
            continue
        try:
            print(f"Computing result for {func.__name__}")
            meta = func.analytics_meta  # type: ignore

            module = meta.get("module")
            section = meta.get("section")
            widget = meta.get("widget")

            await evaluate_and_store_result(
                asset_id=asset_id,
                month=month,
                year=year,
                db=db,
                func=func,
                resolved_cached_dependencies=resolved_cached_dependencies,
                asset_analyser=asset_analyser,
                section=section,
                widget=widget,
                module=module,
            )

        except Exception as e:
            print(e.with_traceback())
            print("===============================================\n\n\n")
