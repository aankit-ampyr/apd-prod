import { useEffect, useMemo, useState, type Ref } from "react";
import { Icon, type IconTypes } from "../Icon";
import { Text } from "../Text";
import { Button } from "../Button";
import { CALENDAR_WEEK_DAYS, CALENDAR_MONTH_NAMES } from "../../constants";
import { getCallenderDay, isSelected, cn } from "../../utils";
import { type CalendarDay as Day, type DateRange } from "../../interface";

/**
 * =========================================================
 * Calender Component
 * =========================================================
 *
 *
 */
interface CalendarProps {
  value: Date | null;
  endValue?: Date | null;
  onDateChange: (date: Date, endDate?: Date | null) => void;
  maxDate?: Date | null;
  minDate?: Date | null;
  style?: React.CSSProperties;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  type?: "range" | "single";
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  /** Show Clear and Apply buttons at the bottom */
  showActions?: boolean;
  /** Callback when Clear button is clicked */
  onClear?: () => void;
  /** Callback when Apply button is clicked */
  onApply?: (date: Date | null) => void;
  /** Text for the clear button (default: "Cancel") */
  clearText?: string;
  /** Text for the apply button (default: "Apply") */
  applyText?: string;
  /** Optional content shown above clear/apply actions */
  actionTopContent?: React.ReactNode;
  /** Default year to show when no value is selected */
  defaultYear?: number;
  /** Enable range selection mode within single calendar */
  isRange?: boolean;
  /** Range value when isRange is true */
  rangeValue?: DateRange;
  /** Callback when range changes (used with isRange) */
  onRangeChange?: (range: DateRange) => void;
  /** Callback when Apply button is clicked with range (used with isRange) */
  onRangeApply?: (range: DateRange) => void;
}

export const Calendar: React.FC<CalendarProps> = (props) => {
  const {
    value,
    endValue,
    type = "single",
    onDateChange,
    maxDate,
    minDate,
    style,
    className,
    ref,
    rangeStart,
    rangeEnd,
    showActions = false,
    onClear,
    onApply,
    clearText = "Cancel",
    applyText = "Apply",
    actionTopContent,
    defaultYear,
    isRange = false,
    rangeValue,
    onRangeChange,
    onRangeApply,
  } = props;

  // Internal range state for isRange mode
  const [internalRangeStart, setInternalRangeStart] = useState<Date | null>(rangeValue?.start ?? null);
  const [internalRangeEnd, setInternalRangeEnd] = useState<Date | null>(rangeValue?.end ?? null);

  // Sync internal state with external rangeValue
  useEffect(() => {
    if (isRange && rangeValue) {
      setInternalRangeStart(rangeValue.start);
      setInternalRangeEnd(rangeValue.end);
    }
  }, [isRange, rangeValue?.start?.getTime(), rangeValue?.end?.getTime()]);

  // state
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      return new Date(value.getFullYear(), value.getMonth(), value.getDate());
    }
    if (defaultYear) {
      return new Date(defaultYear, 0, 1);
    }
    return new Date();
  });
  const [endViewDate, setEndViewDate] = useState<Date>(() =>
    endValue
      ? new Date(
          endValue.getFullYear(),
          endValue.getMonth(),
          endValue.getDate(),
        )
      : new Date(),
  );

  // =========================
  // memoized states
  // =========================
  const days = useMemo(() => {
    return getCallenderDay(viewDate.getMonth(), viewDate.getFullYear());
  }, [viewDate]);

  const canGoPrevMonth = useMemo(() => {
    if (!minDate) return true;

    return (
      viewDate.getFullYear() > minDate.getFullYear() ||
      (viewDate.getFullYear() === minDate.getFullYear() &&
        viewDate.getMonth() > minDate.getMonth())
    );
  }, [minDate, viewDate]);

  const canGoNextMonth = useMemo(() => {
    if (!maxDate) return true;
    return (
      viewDate.getFullYear() < maxDate.getFullYear() ||
      (viewDate.getFullYear() === maxDate.getFullYear() &&
        viewDate.getMonth() < maxDate.getMonth())
    );
  }, [maxDate, viewDate]);

  // Use internal range state when isRange is true, otherwise use external props
  const effectiveRangeStart = isRange ? internalRangeStart : rangeStart;
  const effectiveRangeEnd = isRange ? internalRangeEnd : rangeEnd;

  const isInRange = (day: Day): boolean => {
    if (!effectiveRangeStart || !effectiveRangeEnd) return false;
    const dayDate = new Date(day.year, day.month, day.day).getTime();
    const startTime = new Date(
      effectiveRangeStart.getFullYear(),
      effectiveRangeStart.getMonth(),
      effectiveRangeStart.getDate(),
    ).getTime();
    const endTime = new Date(
      effectiveRangeEnd.getFullYear(),
      effectiveRangeEnd.getMonth(),
      effectiveRangeEnd.getDate(),
    ).getTime();
    return dayDate > startTime && dayDate < endTime;
  };

  const isRangeStart = (day: Day): boolean => {
    if (!effectiveRangeStart) return false;
    return (
      day.day === effectiveRangeStart.getDate() &&
      day.month === effectiveRangeStart.getMonth() &&
      day.year === effectiveRangeStart.getFullYear()
    );
  };

  const isRangeEnd = (day: Day): boolean => {
    if (!effectiveRangeEnd) return false;
    return (
      day.day === effectiveRangeEnd.getDate() &&
      day.month === effectiveRangeEnd.getMonth() &&
      day.year === effectiveRangeEnd.getFullYear()
    );
  };

  const selectedDate = value
    ? new Date(value.getFullYear(), value.getMonth(), value.getDate())
    : null;

  // =========================
  // functions
  // =========================
  const isDisabledDay = (item: Day) => {
    const itemDate = new Date(item.year, item.month, item.day);
    const itemTime = itemDate.getTime();
    if (maxDate) {
      const maxAtMidnight = new Date(
        maxDate.getFullYear(),
        maxDate.getMonth(),
        maxDate.getDate(),
      ).getTime();
      if (itemTime > maxAtMidnight) return true;
    }
    if (minDate) {
      const minAtMidnight = new Date(
        minDate.getFullYear(),
        minDate.getMonth(),
        minDate.getDate(),
      ).getTime();
      if (itemTime < minAtMidnight) return true;
    }
    return false;
  };

  function gotoPrevMonth() {
    if (!canGoPrevMonth) return;
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function gotoNextMonth() {
    if (!canGoNextMonth) return;
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const isLesserThanCurrentDate = (item: Day) => {
    return (
      item.year < viewDate.getFullYear() ||
      item.month < viewDate.getMonth() ||
      item.day < viewDate.getDate()
    );
  };

  const isEndDay = (item: Day) => {
    if (endViewDate) {
      return (
        item.day === endViewDate.getDate() &&
        item.month === endViewDate.getMonth() &&
        item.year === endViewDate.getFullYear()
      );
    }
    return false;
  };

  const updateDate = (day: Day) => {
    const itemDate = new Date(day.year, day.month, day.day);
    
    // Handle range selection mode
    if (isRange) {
      // No start selected yet, or both already selected (restart)
      if (!internalRangeStart || (internalRangeStart && internalRangeEnd)) {
        setInternalRangeStart(itemDate);
        setInternalRangeEnd(null);
        onRangeChange?.({ start: itemDate, end: null });
      } else {
        // Start is selected, now selecting end
        if (itemDate.getTime() < internalRangeStart.getTime()) {
          // Clicked before start, make it new start
          setInternalRangeStart(itemDate);
          setInternalRangeEnd(null);
          onRangeChange?.({ start: itemDate, end: null });
        } else {
          // Valid end date
          setInternalRangeEnd(itemDate);
          onRangeChange?.({ start: internalRangeStart, end: itemDate });
        }
      }
      return;
    }
    
    if (type === "single") {
      onDateChange?.(new Date(itemDate));
    } else {
      if (isLesserThanCurrentDate(day) || isEndDay(day)) {
        setViewDate(itemDate);
        setEndViewDate(itemDate);
      } else {
        setEndViewDate(itemDate);
      }
    }
  };

  // =========================
  // side effects
  // =========================
  useEffect(() => {
    if (value) {
      setViewDate(
        new Date(value.getFullYear(), value.getMonth(), value.getDate()),
      );
    } else if (defaultYear) {
      setViewDate(new Date(defaultYear, 0, 1));
    } else {
      setViewDate(new Date());
    }
  }, [value?.getTime() ?? 0, defaultYear]);

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "p-4 min-w-70 flex flex-col rounded-sm border border-border bg-white shadow-sm",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-4 w-full justify-between">
        {/* Previous Month */}
        <DateNavigation
          disabled={!canGoPrevMonth}
          onClick={gotoPrevMonth}
          iconName="chevron-left"
        />

        {/* Month and Year */}
        <Text variant="caption" className="font-InterMedium text-text-primary">
          {CALENDAR_MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>

        {/* Next Month */}
        <DateNavigation
          disabled={!canGoNextMonth}
          onClick={gotoNextMonth}
          iconName="chevron-right"
        />
      </div>

      {/* divider */}
      <div className="bg-bg-card h-0.5 w-full my-4" />

      {/* Days */}
      <div className="grid grid-cols-7">
        {CALENDAR_WEEK_DAYS.map((day) => (
          <Text
            key={day}
            variant="caption"
            className="text-center text-text-secondary! w-8"
          >
            {day}
          </Text>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7">
        {days.prev.map((day) => (
          <DayButton
            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            isSelected={isRange ? (isRangeStart(day) || isRangeEnd(day)) : (selectedDate != null && isSelected(day, selectedDate))}
            isRangeStart={isRange && isRangeStart(day)}
            isRangeEnd={isRange && isRangeEnd(day)}
            isInRange={isRange && isInRange(day)}
            isDisabled={isDisabledDay(day)}
            isSecondary
            // onSelect={updateDate}
          />
        ))}
        {days.current.map((day) => (
          <DayButton
            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            isSelected={isRange ? (isRangeStart(day) || isRangeEnd(day)) : (selectedDate != null && isSelected(day, selectedDate))}
            isRangeStart={isRange && isRangeStart(day)}
            isRangeEnd={isRange && isRangeEnd(day)}
            isInRange={isRange && isInRange(day)}
            isDisabled={isDisabledDay(day)}
            onSelect={updateDate}
          />
        ))}
        {days.next.map((day) => (
          <DayButton
            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            isSelected={isRange ? (isRangeStart(day) || isRangeEnd(day)) : (selectedDate != null && isSelected(day, selectedDate))}
            isRangeStart={isRange && isRangeStart(day)}
            isRangeEnd={isRange && isRangeEnd(day)}
            isInRange={isRange && isInRange(day)}
            isDisabled={isDisabledDay(day)}
            isSecondary
            // onSelect={updateDate}
          />
        ))}
      </div>

      {showActions && (
        <div className="pt-4 mt-4 border-t border-border">
          {actionTopContent ? (
            <div className="mb-3">{actionTopContent}</div>
          ) : null}

          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => {
                if (isRange) {
                  setInternalRangeStart(null);
                  setInternalRangeEnd(null);
                }
                onClear?.();
              }}
            >
              {clearText}
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                if (isRange) {
                  onRangeApply?.({ start: internalRangeStart, end: internalRangeEnd });
                } else {
                  onApply?.(selectedDate);
                };
              }}
            >
              {applyText}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * =========================================================
 * Month Navigation Button
 * =========================================================
 *
 *
 */
export function DateNavigation({
  disabled,
  onClick,
  iconName,
}: {
  disabled: boolean;
  onClick: () => void;
  iconName: IconTypes;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "rounded-full group size-9 flex justify-center items-center cursor-pointer",
        !disabled
          ? "bg-primary-tint-2 hover:bg-primary"
          : "bg-primary-tint-2 opacity-50 cursor-not-allowed",
      )}
      onClick={onClick}
    >
      <Icon
        name={iconName}
        className={cn("text-text-placeholder size-3 group-hover:text-white")}
      />
    </button>
  );
}

/**
 * =========================================================
 * Date/Day Button
 * =========================================================
 *
 *
 */
interface CalenderDayButtonProps extends Day {
  isSelected?: boolean;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isDisabled?: boolean;
  isSecondary?: boolean;
  isInRange?: boolean;
  onSelect?: (date: Day) => void;
  className?: string;
}
export function DayButton(props: CalenderDayButtonProps) {
  const {
    day,
    month,
    year,
    isSelected,
    isRangeStart,
    isRangeEnd,
    isDisabled,
    isInRange,
    isSecondary,
    onSelect,
    className,
  } = props;
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => !isDisabled && onSelect?.({ day, month, year })}
      className={cn(
        "aspect-square! w-8 shrink-0 flex items-center justify-center text-center rounded-sm font-InterRegular cursor-pointer",
        isSelected && "bg-primary",
        isRangeStart && "ring-1 ring-primary",
        isRangeEnd && "ring-1 ring-primary",
        !isSelected && !isSecondary && "hover:bg-primary-tint-1/10",
        isDisabled && "opacity-25 cursor-not-allowed text-disabled!",
        isSecondary && "text-text-secondary opacity-50!",
        isRangeStart && "bg-primary rounded-r-none",
        isRangeEnd && "bg-primary rounded-l-none",
        isInRange && "bg-primary-tint-2 rounded-none",
        className,
      )}
    >
      {
        <Text
          variant="caption"
          className={cn(
            "text-center",
            isSelected && "text-white!",
            isSecondary && !isSelected && "text-text-secondary!",
            isDisabled && "text-disabled!",
            
          )}
        >
          {day}
        </Text>
      }
    </button>
  );
}
