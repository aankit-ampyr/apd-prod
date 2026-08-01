import { Ref, useEffect, useMemo, useState } from "react";
import { Button } from "../Button";
import { CALENDAR_MONTHS_SHORT_NAMES as MONTHS } from "../../constants";
import { Icon } from "../Icon";
import { cn } from "../../utils";
import { Text } from "../Text";
import { MonthYear } from "../../interface";

/**
 * Checks if a month/year combination is disabled
 */
const isMonthDisabled = (
  month: number,
  year: number,
  disabledMonths?: MonthYear[],
  allowedMonths?: MonthYear[],
  maxDate?: MonthYear,
): boolean => {
  if (maxDate) {
    if (year > maxDate.year) return true;
    if (year === maxDate.year && month + 1 > maxDate.month) return true;
  }

  // If allowedMonths is specified, month must be in the list
  if (allowedMonths && allowedMonths.length > 0) {
    const isAllowed = allowedMonths.some((d) => d.month === month + 1 && d.year === year);
    if (!isAllowed) return true;
  }
  
  // If disabledMonths is specified, month must not be in the list
  if (disabledMonths && disabledMonths.length > 0) {
    return disabledMonths.some((d) => d.month === month + 1 && d.year === year);
  }
  
  return false;
};

const sortMonthYears = (values: MonthYear[]) =>
  [...values].sort((a, b) => a.year - b.year || a.month - b.month);

const EMPTY_MONTH_YEARS: MonthYear[] = [];

const buildSelectionMap = (values: MonthYear[]) =>
  values.reduce<Record<number, number[]>>((acc, value) => {
    const yearSelections = acc[value.year] ?? [];
    if (!yearSelections.includes(value.month - 1)) {
      acc[value.year] = [...yearSelections, value.month - 1];
    }
    return acc;
  }, {});

interface Props {
  value?: MonthYear;
  onChange?: (val: MonthYear) => void;
  onClose?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  handleDone?: (val: MonthYear) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: Ref<HTMLDivElement>;
  /** Text for the cancel/clear button (default: "Clear") */
  cancelText?: string;
  /** Text for the done/apply button (default: "Done") */
  doneText?: string;
  /** Array of month/year combinations to disable */
  disabledMonths?: MonthYear[];
  /** Array of month/year combinations to allow (if set, only these months are selectable) */
  allowedMonths?: MonthYear[];
  /** Default year to show when no value is selected */
  defaultYear?: number;
  /** Lock to a specific year, preventing navigation to other years */
  lockYear?: boolean;
  /** Disable any month/year after this date */
  maxDate?: MonthYear;
}

export const MonthYearSelector = ({
  value,
  onChange,
  onClose,
  handleDone,
  className,
  style,
  ref,
  cancelText = "Clear",
  doneText = "Done",
  disabledMonths,
  allowedMonths,
  defaultYear,
  lockYear = false,
  maxDate,
}: Props) => {
  const today = new Date();

  const [month, setMonth] = useState<number>(
    value?.month ? value.month - 1 : today.getMonth(),
  );
  const [year, setYear] = useState<number>(value?.year ?? defaultYear ?? today.getFullYear());
  const selectableMonthIndexes = useMemo(
    () =>
      MONTHS.map((_, idx) => idx).filter((idx) => !isMonthDisabled(idx, year, disabledMonths, allowedMonths)),
    [allowedMonths, disabledMonths, year],
  );
  const hasSelectableMonths = selectableMonthIndexes.length > 0;
  const isCurrentMonthSelectable = selectableMonthIndexes.includes(month);

  useEffect(() => {
    if (!hasSelectableMonths) return;
    if (isCurrentMonthSelectable) return;

    setMonth(selectableMonthIndexes[0]);
  }, [hasSelectableMonths, isCurrentMonthSelectable, selectableMonthIndexes]);

  const handleApply = () => {
    if (!hasSelectableMonths || !isCurrentMonthSelectable) return;

    const nextValue = { month: month + 1, year };
    onChange?.(nextValue);
    handleDone?.(nextValue);
    onClose?.();
  };

  const handlePrevYear = () => setYear((y) => y - 1);
  const handleNextYear = () => setYear((y) => y + 1);

  const handleMonthClick = (idx: number) => {
    if (isMonthDisabled(idx, year, disabledMonths, allowedMonths, maxDate)) return;
    setMonth(idx);
  };

  return (
    <div
      ref={ref}
      className={cn(
        "p-4 w-75 bg-white rounded-xl shadow flex flex-col gap-4",
        className,
      )}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevYear}
          disabled={lockYear}
          className={cn(
            "p-2 rounded-full bg-primary-tint-2",
            lockYear ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <Icon name="chevron-left" className="size-3 text-text-secondary" />
        </button>

        <Text
          variant="free"
          className="text-base font-InterMedium text-text-primary"
        >
          {year}
        </Text>

        <button
          type="button"
          onClick={handleNextYear}
          disabled={lockYear}
          className={cn(
            "p-2 rounded-full bg-primary-tint-2",
            lockYear ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <Icon name="chevron-right" className="size-3 text-text-secondary" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-4 gap-3">
        {MONTHS.map((m, idx) => {
          const isActive = month === idx;
          const isDisabled = isMonthDisabled(idx, year, disabledMonths, allowedMonths, maxDate);

          return (
            <button
              type="button"
              key={m}
              disabled={isDisabled}
              onClick={() => handleMonthClick(idx)}
              className={cn(
                "py-2 rounded-md text-sm transition-colors group",
                isDisabled && "cursor-not-allowed opacity-50",
                isActive && !isDisabled
                  ? "bg-primary text-white"
                  : !isDisabled &&
                      "text-text-secondary hover:text-text-primary hover:bg-primary-tint-2",
              )}
            >
              <Text
                variant="caption"
                className={cn(
                  "text-text-secondary!",
                  isDisabled && "text-text-disabled!",
                  !isActive && !isDisabled && "group-hover:text-text-primary!",
                  isActive && !isDisabled && "text-white!",
                )}
              >
                {m}
              </Text>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-2">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={onClose}
        >
          {cancelText}
        </Button>

        <Button
          variant="primary"
          className="w-full justify-center"
          disabled={!hasSelectableMonths || !isCurrentMonthSelectable}
          onClick={handleApply}
        >
          {doneText}
        </Button>
      </div>
    </div>
  );
};

interface MultiMonthYearSelectorProps {
  value?: MonthYear[];
  onChange?: (val: MonthYear[]) => void;
  onClose?: (action?: "forceClose" | "close", e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  style?: React.CSSProperties;
  ref?: Ref<HTMLDivElement>;
  cancelText?: string;
  doneText?: string;
  /** Array of month/year combinations to disable */
  disabledMonths?: MonthYear[];
  /** Default year to show when no value is selected */
  defaultYear?: number;
  /** Lock to a specific year, preventing navigation to other years */
  lockYear?: boolean;
  /** Disable any month/year after this date */
  maxDate?: MonthYear;
}

export const MultiMonthYearSelector = ({
  value,
  onChange,
  onClose,
  className,
  style,
  ref,
  cancelText = "Clear",
  doneText = "Done",
  disabledMonths,
  defaultYear,
  lockYear = false,
  maxDate,
}: MultiMonthYearSelectorProps) => {
  const currentYear = new Date().getFullYear();
  const selectedValues = value ?? EMPTY_MONTH_YEARS;
  const initialYear = selectedValues[0]?.year ?? defaultYear ?? currentYear;

  const [year, setYear] = useState<number>(initialYear);
  const [selectedByYear, setSelectedByYear] = useState<Record<number, number[]>>(
    () => buildSelectionMap(selectedValues),
  );

  useEffect(() => {
    setSelectedByYear(buildSelectionMap(selectedValues));
    if (selectedValues[0]?.year) {
      setYear(selectedValues[0].year);
      return;
    }

    setYear(defaultYear ?? currentYear);
  }, [currentYear, defaultYear, selectedValues]);

  const selectedMonths = selectedByYear[year] ?? [];

  const handleToggleMonth = (idx: number) => {
    if (isMonthDisabled(idx, year, disabledMonths, undefined, maxDate)) return;
    setSelectedByYear((prev) => {
      const currentYearSelections = prev[year] ?? [];
      const nextSelections = currentYearSelections.includes(idx)
        ? currentYearSelections.filter((m) => m !== idx)
        : [...currentYearSelections, idx];

      return {
        ...prev,
        [year]: nextSelections,
      };
    });
  };

  const handleApply = () => {
    const result = sortMonthYears(
      Object.entries(selectedByYear).flatMap(([selectedYear, months]) =>
        months.map((month) => ({
          month: month + 1,
          year: Number(selectedYear),
        })),
      ),
    );

    onChange?.(result);
    onClose?.("close");
  };

  const handlePrevYear = () => setYear((y) => y - 1);
  const handleNextYear = () => setYear((y) => y + 1);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      ref={ref}
      className={cn(
        "p-4 w-75 bg-white rounded-xl shadow flex flex-col gap-4",
        className,
      )}
      style={style}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevYear}
          disabled={lockYear}
          className={cn(
            "p-2 rounded-full bg-primary-tint-2",
            lockYear ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <Icon name="chevron-left" className="size-3 text-text-secondary" />
        </button>

        <Text variant="free" className="text-base font-InterMedium">
          {year}
        </Text>

        <button
          type="button"
          onClick={handleNextYear}
          disabled={lockYear}
          className={cn(
            "p-2 rounded-full bg-primary-tint-2",
            lockYear ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
        >
          <Icon name="chevron-right" className="size-3 text-text-secondary" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-4 gap-3">
        {MONTHS.map((m, idx) => {
          const isActive = selectedMonths.includes(idx);
          const isDisabled = isMonthDisabled(idx, year, disabledMonths, undefined, maxDate);

          return (
            <button
              key={m}
              type="button"
              disabled={isDisabled}
              onClick={() => handleToggleMonth(idx)}
              className={cn(
                "py-2 rounded-md text-sm transition-colors",
                isDisabled && "cursor-not-allowed opacity-50",
                isActive && !isDisabled
                  ? "bg-primary text-white"
                  : !isDisabled &&
                      "text-text-secondary hover:bg-primary-tint-2",
              )}
            >
              <Text
                variant="14R"
                className={cn(
                  isDisabled && "text-text-disabled!",
                  isActive && !isDisabled
                    ? "text-white!"
                    : !isDisabled && "text-text-secondary!",
                )}
              >
                {m}
              </Text>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-2">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => onClose?.("forceClose")}
        >
          {cancelText}
        </Button>

        <Button
          variant="primary"
          className="w-full justify-center"
          onClick={handleApply}
        >
          {doneText}
        </Button>
      </div>
    </div>
  );
};
