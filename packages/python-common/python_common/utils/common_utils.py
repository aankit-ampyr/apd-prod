import math
import secrets
import string
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from math import ceil
from sqlalchemy import func, select
from python_common.dto import Pagination
import tzlocal
from python_common.constants.defaults import LOCAL_TZ

def to_utc(dt):
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=LOCAL_TZ)  # assume file local hai
    return dt.astimezone(timezone.utc)

def get_local_timezone():
    return tzlocal.get_localzone_name()

def print_log(msg: str):

    print(f"[{datetime.now().isoformat()}] msg", end=" ")


def generate_otp(length: int = 6) -> str:
    """
    Generate a cryptographically secure random OTP of specified length.

    Args:
        length (int): The number of digits in the OTP. Defaults to 6.

    Returns:
        str: A string of numeric digits.
    """
    return "".join(secrets.choice(string.digits) for _ in range(length))


async def paginate(
    db: AsyncSession, base_query, page: int, limit: int, order_by=None, scalar=True
) -> Pagination:
    """
    Apply pagination, sorting, and total count calculation on a SQLAlchemy query.

    This utility function takes a pre-built base query (with filters applied)
    and returns paginated results along with metadata such as total records,
    total pages, and next page.

    Args:
        db (AsyncSession): SQLAlchemy async database session.
        base_query (Select): SQLAlchemy select query with all filtering conditions applied.
                             This query should NOT include pagination (offset/limit).
        page (int): Current page number (1-based index).
        limit (int): Number of records per page.
        order_by (list, optional): List of SQLAlchemy column expressions for sorting.
                                  Example: [User.created_at.desc(), User.id.desc()]

    Returns:
        dict: A dictionary containing:
            - records (list): List of ORM objects for the current page.
            - total_results (int): Total number of matching records.
            - total_pages (int): Total number of pages.
            - current_page (int): Current page number.
            - next_page (int | None): Next page number if available, else None.

    Behavior:
        - Executes two queries:
            1. Count query to determine total_results.
            2. Data query with offset and limit applied.
        - Applies ordering if provided.
        - Uses subquery wrapping to ensure count query respects all filters.

    Notes:
        - This function assumes page >= 1 and limit > 0.
        - For large datasets, count queries may become expensive.
        - Can be extended to support cursor-based pagination if needed.

    Example:
        base_query = select(User).where(User.is_active == True)

        result = await paginate(
            db=db,
            base_query=base_query,
            page=1,
            limit=10,
            order_by=[User.created_at.desc()]
        )
    """
    # Count query
    count_query = select(func.count()).select_from(base_query.subquery())
    total_results = (await db.execute(count_query)).scalar() or 0

    # Apply ordering (optional)
    if order_by is not None:
        base_query = base_query.order_by(*order_by)

    # Calculate total pages and adjust page number if out of range
    total_pages = math.ceil(total_results / limit)
    # total_pages = math.ceil(total_results / limit) if limit > 0 else 0
    if page > total_pages and total_pages > 0:
        page = total_pages
    offset = (page - 1) * limit

    # Apply pagination, (ignore limit if limit = -1)
    if limit < 0:
        data_query = base_query
    else:
        data_query = base_query.offset(offset).limit(limit)

    result = await db.execute(data_query)
    if scalar:
        records = result.scalars().all()
    else:
        records = result.all()

    # Metadata
    next_page = page + 1 if page < total_pages else None

    return Pagination(
        records=records,
        total_results=total_results,
        total_pages=total_pages,
        current_page=page,
        next_page=next_page,
    )
