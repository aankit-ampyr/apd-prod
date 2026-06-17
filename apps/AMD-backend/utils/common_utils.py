import calendar

def get_days_in_month(month: int, year: int) -> int:
    if month == 2:
        return 28

    return calendar.monthrange(year, month)[1]        

def round_2_float(value: int | float):
    return round(float(value), 2)
