import { useEffect, useMemo, useState, type Ref } from "react";
import { Text } from "../Text";
import { Button } from "../Button";
import { CALENDAR_WEEK_DAYS, CALENDAR_MONTH_NAMES } from "../../constants";
import { getCallenderDay, isSelected, cn } from "../../utils";
import { DateRange, type CalendarDay as Day } from "../../interface";
import { DateNavigation, DayButton } from "./Calendar";
/**
 * =========================================================
 * Calender Component
 * =========================================================
 *
 *
 */
interface RangeCalendarProps {
  value: DateRange;
  onDateChange: (value: DateRange) => void;
  maxDate?: Date | null;
  minDate?: Date | null;
  style?: React.CSSProperties;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  /** Show Clear and Apply buttons at the bottom */
  showActions?: boolean;
  /** Callback when Clear button is clicked */
  onClear?: () => void;
  /** Callback when Apply button is clicked */
  onApply?: (value: DateRange) => void;
  /** Text for the clear button (default: "Clear") */
  clearText?: string;
  /** Text for the apply button (default: "Apply") */
  applyText?: string;
  /** Optional content shown above clear/apply actions */
  actionTopContent?: React.ReactNode;
  /** Default year to show when no value is selected */
  defaultYear?: number;
}

export const RangeCalendar: React.FC<RangeCalendarProps> = (props) => {
  const { 
    value, 
    onDateChange, 
    maxDate, 
    minDate, 
    style, 
    className, 
    ref,
    showActions = false,
    onClear,
    onApply,
    clearText = "Clear",
    applyText = "Apply",
    actionTopContent,
    defaultYear,
  } = props;

  // state
  const [viewDate1, setViewDate1] = useState<Date>(() => {
    if (value.start) {
      return new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate(),
      );
    }
    if (defaultYear) {
      return new Date(defaultYear, 0, 1);
    }
    return new Date();
  });
  const [viewDate2, setViewDate2] = useState<Date>(() => {
    const base = value.start
      ? new Date(value.start.getFullYear(), value.start.getMonth(), 1)
      : defaultYear
        ? new Date(defaultYear, 0, 1)
        : new Date();
    return new Date(base.getFullYear(), base.getMonth() + 1, 1);
  });

  const selectedDateStart = value.start
    ? new Date(
        value.start.getFullYear(),
        value.start.getMonth(),
        value.start.getDate(),
      )
    : null;

  const selectedDateEnd = value.end
    ? new Date(
        value.end.getFullYear(),
        value.end.getMonth(),
        value.end.getDate(),
      )
    : null;

  // =========================
  // memoized states
  // =========================
  const days1 = useMemo(() => {
    return getCallenderDay(viewDate1.getMonth(), viewDate1.getFullYear());
  }, [viewDate1]);

  const days2 = useMemo(() => {
    return getCallenderDay(viewDate2.getMonth(), viewDate2.getFullYear());
  }, [viewDate2]);

  /**
   * can go prev month
   */
  const canGoPrevMonth1 = useMemo(() => {
    if (!minDate) return true;

    return (
      viewDate1.getFullYear() > minDate.getFullYear() ||
      (viewDate1.getFullYear() === minDate.getFullYear() &&
        viewDate1.getMonth() > minDate.getMonth())
    );
  }, [minDate, viewDate1]);

  const canGoPrevMonth2 = useMemo(() => {
    if (!minDate) return true;
    const viewDate = new Date(viewDate2);

    const day = viewDate.getDate(); // preserve day
    viewDate.setDate(1); // prevent overflow
    viewDate.setMonth(viewDate.getMonth() - 1);
    viewDate.setDate(day);

    return (
      viewDate.getFullYear() > minDate.getFullYear() ||
      (viewDate.getFullYear() === minDate.getFullYear() &&
        viewDate.getMonth() > minDate.getMonth())
    );
  }, [minDate, viewDate1, viewDate2]);

  /**
   * can go next month
   */
  const canGoNextMonth1 = useMemo(() => {
    if (!maxDate) return true;

    const viewDate = new Date(viewDate1);

    const day = viewDate.getDate(); // preserve day
    viewDate.setDate(1); // prevent overflow
    viewDate.setMonth(viewDate.getMonth() + 1);
    viewDate.setDate(day);

    return (
      viewDate1.getFullYear() < maxDate.getFullYear() ||
      (viewDate1.getFullYear() === maxDate.getFullYear() &&
        viewDate1.getMonth() < maxDate.getMonth())
    );
  }, [maxDate, viewDate1]);

  const canGoNextMonth2 = useMemo(() => {
    if (!maxDate) return true;
    return (
      viewDate2.getFullYear() < maxDate.getFullYear() ||
      (viewDate2.getFullYear() === maxDate.getFullYear() &&
        viewDate2.getMonth() < maxDate.getMonth())
    );
  }, [maxDate, viewDate2]);

  /**
   * go to prev month
   */
  function gotoPrevMonth1() {
    if (!canGoPrevMonth1) return;
    setViewDate1((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function gotoPrevMonth2() {
    if (!canGoPrevMonth2) return;
    setViewDate1((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  /**
   * go to next month
   */
  function gotoNextMonth1() {
    if (!canGoNextMonth1) return;
    setViewDate1((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  function gotoNextMonth2() {
    if (!canGoNextMonth2) return;
    setViewDate1((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  const handleSelectDate = (date: Date) => {
    const clickedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );
    const start = selectedDateStart;
    const end = selectedDateEnd;

    // No start → first click
    if (!start) {
      onDateChange({ start: clickedDate, end: null });
      return;
    }

    // Start exists but no end → second click
    if (!end) {
      if (clickedDate.getTime() < start.getTime()) {
        // clicked before start → reset start
        onDateChange({ start: clickedDate, end: null });
      } else {
        // valid end
        onDateChange({ start, end: clickedDate });
      }
      return;
    }

    // Both exist → restart selection
    onDateChange({ start: clickedDate, end: null });
  };

  useEffect(() => {
    setViewDate2(new Date(viewDate1.getFullYear(), viewDate1.getMonth() + 1, 1));
  }, [viewDate1]);

  return (
    <div
      ref={ref}
      style={style}
      className={cn(
        "min-w-141 grid-cols-2 grid rounded-sm border border-border bg-white shadow-sm",
        className,
      )}
    >
      
        <InlineCalender
          canGoPrevMonth={canGoPrevMonth1}
          days={days1}
          canGoNextMonth={canGoNextMonth1}
          maxDate={maxDate ?? undefined}
          minDate={minDate ?? undefined}
          onSelectDate={handleSelectDate}
          selectedDate={{ start: selectedDateStart, end: selectedDateEnd }}
          date={viewDate1}
          gotoNextMonth={gotoNextMonth1}
          gotoPrevMonth={gotoPrevMonth1}
          className="rounded-r-none border-r-none"
        />
        <InlineCalender
          days={days2}
          onSelectDate={handleSelectDate}
          maxDate={maxDate ?? undefined}
          minDate={minDate ?? undefined}
          canGoPrevMonth={canGoPrevMonth2}
          canGoNextMonth={canGoNextMonth2}
          selectedDate={{ start: selectedDateStart, end: selectedDateEnd }}
          date={viewDate2}
          gotoNextMonth={gotoNextMonth2}
          gotoPrevMonth={gotoPrevMonth2}
          className="rounded-l-none"
        />

      {showActions && (
        <div className="col-span-2 p-4 border-t border-border">
          {actionTopContent ? (
            <div className="mb-3">{actionTopContent}</div>
          ) : null}

          <div className="flex justify-center gap-4">
            <Button
              variant="secondary"
              className="w-full justify-center"
              onClick={() => {
                onDateChange({ start: null, end: null });
                onClear?.();
              }}
            >
              {clearText}
            </Button>
            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => {
                onApply?.({ start: selectedDateStart, end: selectedDateEnd });
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

interface InlineCalenderProps {
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  gotoPrevMonth: () => void;
  gotoNextMonth: () => void;
  date: Date;
  maxDate?: Date;
  minDate?: Date;
  selectedDate: DateRange;
  onSelectDate?: (date: Date) => void;
  days: {
    current: Day[];
    prev: Day[];
    next: Day[];
  };
  className?: string;
}
function InlineCalender(props: InlineCalenderProps) {
  const {
    canGoNextMonth,
    canGoPrevMonth,
    date,
    gotoNextMonth,
    gotoPrevMonth,
    days,
    maxDate,
    minDate,
    selectedDate,
    onSelectDate,
    className,
  } = props;

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

  const isInRange = (day: Day) => {
    if (!selectedDate.start || !selectedDate.end) return false;

    const current = new Date(day.year, day.month, day.day).getTime();
    const start = selectedDate.start.getTime();
    const end = selectedDate.end.getTime();

    return current > start && current < end;
  };

  const isRangeStart = (day: Day) =>
    selectedDate.start != null && isSelected(day, selectedDate.start);

  const isRangeEnd = (day: Day) =>
    selectedDate.end != null && isSelected(day, selectedDate.end);

  return (
    <div className={cn("p-4 min-w-70 flex flex-col rounded-sm border border-border bg-white shadow-sm", className)}>
      <div className="flex items-center gap-4 w-full justify-between">
        {/* Previous Month */}
        <DateNavigation
          disabled={!canGoPrevMonth}
          onClick={gotoPrevMonth}
          iconName="chevron-left"
        />

        {/* Month and Year */}
        <Text variant="caption" className="font-InterMedium text-text-primary">
          {CALENDAR_MONTH_NAMES[date.getMonth()]} {date.getFullYear()}
        </Text>

        {/* Next Month */}
        <DateNavigation
          disabled={!canGoNextMonth}
          onClick={gotoNextMonth}
          iconName="chevron-right"
        />
      </div>

      <div className="bg-bg-card h-0.5 w-full my-4" />

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

      <div className="grid grid-cols-7">
        {days.prev.map((day) => (
          <DayButton
            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            className="w-full"
            // isSelected={
            //   isRangeStart(day) || isRangeEnd(day)
            // }
            // isRangeStart={isRangeStart(day)}
            // isRangeEnd={isRangeEnd(day)}
            isDisabled={isDisabledDay(day)}
            isSecondary
            // isInRange={isInRange(day)}
            // onSelect={(day) => {
            //   const clickedDate = new Date(day.year, day.month, day.day);
            //   onSelectDate?.(clickedDate);
            // }}
          />
        ))}
        {days.current.map((day) => (
          <DayButton
            className={cn(
              'w-full z-10',
              isInRange(day) && 'rounded-none',
              isRangeStart(day) && 'rounded rounded-r-none',
              isRangeEnd(day) && 'rounded rounded-l-none'
            )}
            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            isSelected={
              isRangeStart(day) || isRangeEnd(day)
            }
            isRangeStart={isRangeStart(day)}
            isRangeEnd={isRangeEnd(day)}
            isDisabled={isDisabledDay(day)}
            isInRange={isInRange(day)}
            onSelect={(day) => {
              const clickedDate = new Date(day.year, day.month, day.day);
              onSelectDate?.(clickedDate);
            }}
          />
        ))}
        {days.next.map((day) => (
          <DayButton

            key={`${day.year}-${day.month}-${day.day}`}
            {...day}
            className="w-full"
            // isSelected={
            //   isRangeStart(day) || isRangeEnd(day)
            // }
            // isRangeStart={isRangeStart(day)}
            // isRangeEnd={isRangeEnd(day)}
            isDisabled={isDisabledDay(day)}
            isSecondary
            // isInRange={isInRange(day)}
            // onSelect={(day) => {
            //   const clickedDate = new Date(day.year, day.month, day.day);
            //   onSelectDate?.(clickedDate);
            // }}
          />
        ))}
      </div>
    </div>
  );
}
