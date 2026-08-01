import calendar
import hashlib
import json
from typing import Any
from decimal import Decimal, ROUND_HALF_UP

def get_days_in_month(month: int, year: int) -> int:
    if month == 2:
        return 28

    return calendar.monthrange(year, month)[1]


def round_2_float(value: int | float):
    return round(float(value), 2)


def generate_json_hash(data: dict[str, Any]) -> str:
    """
    Generate a deterministic SHA-256 hash for a JSON-serializable object.

    Example:
        generate_json_hash({})
        generate_json_hash({"market_strategy": "multi"})
    """
    canonical_json = json.dumps(
        data,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )

    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

def round_decimal(value, places=2):
    """
    Round a number using Decimal with HALF_UP rounding.
    """
    if value is None:
        return 0.0

    quantizer = Decimal("1").scaleb(-places)  # places=2 -> Decimal("0.01")

    return float(
        Decimal(str(value)).quantize(
            quantizer,
            rounding=ROUND_HALF_UP,
        )
    )