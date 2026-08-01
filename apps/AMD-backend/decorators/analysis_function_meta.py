from typing import Any, Callable, List
from models.analytics_result_model import AssetAnalyticsValues
import inspect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from utils.common_utils import generate_json_hash
from functools import wraps

def asset_analytics_db_cache(
    *,
    section: str,
    widget: str,
    module: str,
    index: List[str],
    parameters: List[str] | None = None,
    persist_after_compute: bool = True,
):
    """
    PostgreSQL cache layer for computed analytics.

    index:
        Function arguments mapped directly to AssetAnalyticsValues columns.
        Example: ["asset_id", "month", "year"]

    parameters:
        Function arguments used to generate the custom analytics parameters hash.
        Example: ["market_strategy"]
    """

    parameters = parameters or []

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:

        @wraps(func)
        async def wrapper(*args, **kwargs):

            # =========================================
            # Extract function arguments
            # =========================================

            signature = inspect.signature(func)

            bound = signature.bind_partial(
                *args,
                **kwargs,
            )
            bound.apply_defaults()

            arguments = bound.arguments

            # =========================================
            # Extract DB session
            # =========================================

            db: AsyncSession | None = arguments.get("db")
            index_fields = {field_name: arguments.get(field_name) for field_name in index}

            if db is None:
                raise ValueError(
                    f"'db' argument is required for "
                    f"'{func.__name__}'"
                )

            # =========================================
            # Base analytics filters
            # =========================================

            filters = [
                AssetAnalyticsValues.module == module,
                AssetAnalyticsValues.section == section,
                AssetAnalyticsValues.widget == widget,
            ]

            # =========================================
            # Add index filters
            # =========================================

            for field_name in index:

                if field_name not in arguments:
                    raise ValueError(
                        f"Index field '{field_name}' was not found "
                        f"in '{func.__name__}' arguments"
                    )

                model_column = getattr(
                    AssetAnalyticsValues,
                    field_name,
                    None,
                )

                if model_column is None:
                    raise ValueError(
                        f"'{field_name}' is not a valid "
                        f"AssetAnalyticsValues column"
                    )

                filters.append(
                    model_column == arguments[field_name]
                )

            # =========================================
            # Generate parameters
            # =========================================

            parameters_dict = {}

            for parameter_name in parameters:

                if parameter_name not in arguments:
                    raise ValueError(
                        f"Parameter '{parameter_name}' was not found "
                        f"in '{func.__name__}' arguments"
                    )

                parameters_dict[parameter_name] = arguments[
                    parameter_name
                ]

            # =========================================
            # Add parameter hash filter
            # =========================================

            parameters_hash = generate_json_hash(
                parameters_dict
            )

            filters.append(
                AssetAnalyticsValues.parameters_hash
                == parameters_hash
            )

            # =========================================
            # Query computed analytics
            # =========================================

            stmt = (
                select(AssetAnalyticsValues)
                .where(*filters)
                .limit(1)
            )

            cached_result = (
                await db.execute(stmt)
            ).scalars().first()

            # =========================================
            # Inject cached analytics
            # =========================================

            if cached_result is not None:
                print("CACHE HIT!, Returning cached result from DB for function: ", func.__name__)
                kwargs["analytics_data"] = cached_result.result

            # pass mutable context to the service functions
            kwargs["compute_context"] = {
                "result": None
            }

            # =========================================
            # Execute service
            # =========================================
            result = await func(*args, **kwargs)

            computed_result = kwargs.get("compute_context")
            if persist_after_compute and computed_result is not None and computed_result.get("result") is not None:
                # =========================================
                # Save computed analytics to DB
                # =========================================
                print("CACHE MISS!, Saving computed result to DB for function: ", func.__name__)
                try:    
                    new_analytics = AssetAnalyticsValues(
                        **index_fields,
                        module=module,
                        section=section,
                        widget=widget,
                        parameters=parameters_dict,
                        parameters_hash=parameters_hash,
                        result=computed_result.get("result"),
                    )

                    db.add(new_analytics)
                    await db.commit()
                except Exception as e:
                    print("Error saving computed analytics to DB: ", e)

            return result
        return wrapper

    return decorator
def analytics_meta(
    *,
    section: str,
    widget: str,
    module: str,
):
    """
    This Decorator is used to add usefull meta data to the refactored compute function that will
    be later used by the analytics engine to generate analytics data for the dashboard via analytics
    pipeline.
    """

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:

        # Attaching meta data to the function object
        func.analytics_meta = {
            "section": section,
            "widget": widget,
            "module": module,
        }
        return func

    return decorator

