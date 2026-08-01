import React from 'react';
import {Alert, Icon, Text} from '@/ui-kits';
import {cn} from '@/utils';
import {CALENDAR_MONTHS_SHORT_NAMES} from '@/constants';

interface MonthsYearFilterProps {
  year: number;
  months: number[];
  available_months: number[];
  onMonthChange: (months: number[]) => void;
  disabled?: boolean;
}
export function MonthsYearFilter(props: MonthsYearFilterProps) {
  const {year, months, available_months, onMonthChange, disabled = false} = props;

  /**
   * ===============================
   * Derived States
   * ===============================
   */
  const sortedMonths = available_months.sort((a, b) => a - b);

  /**
   * ===============================
   * Function
   * ===============================
   */

  function handleMonthClick(idx: number) {
    // Only one available month, nothing to change
    if (available_months.length === 1) return;

    const alreadySelected = new Set(months);

    if (alreadySelected.has(idx)) {
      // Don't allow removing the last selected month
      if (alreadySelected.size === 1) return;

      alreadySelected.delete(idx);
    } else {
      alreadySelected.add(idx);
    }

    onMonthChange(Array.from(alreadySelected));
  }

  return (
    <div className="border flex flex-col gap-4 border-border rounded-lg py-5 px-6">
      <Text variant="16SB">Select Months in {year}</Text>

      <div className="flex gap-4">
        {sortedMonths.map(month => (
          <MonthSelectorButton
            key={month}
            m={CALENDAR_MONTHS_SHORT_NAMES[month - 1]}
            idx={month}
            isActive={months.includes(month)}
            handleMonthClick={handleMonthClick}
          />
        ))}

        {!disabled && (
          <button
            className="bg-white cursor-pointer border-black rounded-sm border px-4 py-2"
            onClick={() => onMonthChange(available_months)}>
            <Text>Select All</Text>
          </button>
        )}
        {months.length > 1 && (
          <button
            className="bg-white cursor-pointer border-error rounded-sm border px-4 py-2 flex gap-2 items-center"
            onClick={() => onMonthChange([available_months[0]])}>
            <Icon name="cross" className="text-text-secondary!" />
            <Text>Clear</Text>
          </button>
        )}
      </div>

      <Alert message="Current behavior: KPI shows selected-month total, graph shows selected-month stream totals, and tables keep the month split visible. At least one month must remain selected." />
    </div>
  );
}

interface MonthSelectorButtonProps {
  m: string;
  idx: number;
  isActive: boolean;
  disabled?: boolean;
  handleMonthClick: (idx: number) => void;
}
function MonthSelectorButton(props: MonthSelectorButtonProps) {
  const {m, idx, isActive, disabled = false, handleMonthClick} = props;
  return (
    <button
      type="button"
      key={m}
      disabled={disabled}
      onClick={() => handleMonthClick(idx)}
      className={cn(
        'py-2 px-5 cursor-pointer rounded-sm text-sm transition-colors group',
        isActive ? 'bg-primary' : 'bg-white border border-border',
        disabled && 'cursor-not-allowed opacity-50',
      )}>
      <Text
        variant="free"
        className={cn(
          'text-text-secondary! text-sm',
          disabled && 'text-text-disabled!',
          isActive ? 'font-InterSemiBold text-white!' : 'font-InterRegular text-text-secondary!',
        )}>
        {m}
      </Text>
    </button>
  );
}
