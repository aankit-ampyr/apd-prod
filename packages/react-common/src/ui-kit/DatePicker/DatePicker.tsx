import { cn } from "../../utils";
import { Icon } from "../Icon";
import { InputWrapper } from "../InputWrapper";
import { Text } from "../Text";
import { useCallback, useEffect, useRef, useState } from "react";
import { Calendar } from "./Calendar";
import { RangeCalendar } from "./RangeCalender";
import { useClickOutside, usePortalPopup } from "../../hooks";
import { MonthYearSelector, MultiMonthYearSelector } from "./MonthYear";
import { CALENDAR_MONTH_NAMES } from "../../constants";
import type { DateRange, MonthYear, PopupRect } from "../../interface";
import { createPortal } from "react-dom";

const formatDateShort = (date: Date, monthNames: string[]) =>
  `${date.getDate()}-${monthNames[date.getMonth()].slice(0, 3)}-${date.getFullYear()}`;

/**
 * ===============================================================
 * Date Picker component
 * ===============================================================
 * DatePicker component props
 * @param label - The label of the input
 * @param placeholder - The placeholder of the input
 * @param value - The value of the date input
 * @param onDateChange - The onChange event of the input
 * @param error - The error message of the input
 * @param helperText - The helper text of the input
 * @param leftIcon - The left icon of the input
 * @param rightIcon - The right icon of the input
 * @param className - The class name of the input
 * @param inputClassName - The class name of the input's input
 * @param wrapperClassName - The class name of the input wrapper
 * @param calendarClassName - The class name of the calender popup
 * @param touched - Whether the input is touched
 * @param onFocus - The onFocus event of the input
 * @param onBlur - The onBlur event of the input
 * @param disabled - Whether the input is disabled
 * @param required - Whether the input is required or not
 * @param maxDate?: - maximum value of date that can be selected
 * @param minDate?: - minimum value of date that can be selected
 * @param usePortal?: - flag to enable use of portal based popup for better UI when multiple element are stacked
 */

export interface DatePickerProps {
  label?: string;
  placeholder?: string;
  value?: Date | null;
  onDateChange?: (date: Date) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  calendarClassName?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  labelClassName?: string;
  touched?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  maxDate?: Date;
  minDate?: Date;
  isFilter?: boolean;
  usePortal?: boolean;
  iconClassName?:string;
  rightIconClassName?:string;
  /** Show Clear and Apply buttons at the bottom of the calendar */
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

const formatMonthYear = (value: MonthYear) =>
  `${CALENDAR_MONTH_NAMES[value.month - 1]} ${value.year}`;

const formatMonthYearShort = (value: MonthYear) =>
  `${CALENDAR_MONTH_NAMES[value.month - 1].slice(0, 3)}-${value.year}`;

const formatMonthYearList = (values: MonthYear[]) => {
  if (!values.length) return "";

  const sortedValues = [...values].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );

  if (sortedValues.length <= 2) {
    return sortedValues.map(formatMonthYear).join(", ");
  }

  return `${sortedValues.length} months selected`;
};

export const DatePicker: React.FC<DatePickerProps> = (props) => {
  const {
    label,
    placeholder = "Select Date",
    value,
    onDateChange,
    required,
    disabled,
    error,
    helperText,
    className,
    calendarClassName,
    wrapperClassName,
    inputClassName,
    touched,
    onFocus,
    onBlur,
    maxDate,
    minDate,
    isFilter,
    usePortal = false,
    iconClassName,
    showActions,
    onClear,
    onApply,
    clearText,
    applyText,
    actionTopContent,
    defaultYear,
    isRange,
    rangeValue,
    onRangeChange,
    onRangeApply,
  } = props;

  // states
  const hasError = Boolean(error && touched && !disabled);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [calenderRect, setCalendarRect] = useState<PopupRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalCalendarRef = useRef<HTMLDivElement>(null);

  // refs
  const rootRef = useClickOutside<HTMLDivElement>((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalCalendarRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setIsOpen(false);
    setIsFocused(false);
  });
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  // Format display
  const formatDisplay = (date: Date): string => {
    return `${date.getDate()}-${formatMonthYearShort({month: date.getMonth() + 1, year: date.getFullYear()})}`;
  };

  // Format range display
  const formatRangeDisplay = (range: DateRange): string => {
    if (range.start && range.end) {
      return `${formatDateShort(range.start, CALENDAR_MONTH_NAMES)} - ${formatDateShort(range.end, CALENDAR_MONTH_NAMES)}`;
    }
    if (range.start) {
      return formatDateShort(range.start, CALENDAR_MONTH_NAMES);
    }
    return "";
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        !rootRef.current?.contains(e.relatedTarget as Node)
      ) {
        setIsFocused(false);
        onBlur?.(e);
      }
    }, 0);
  };

  const measureCalendar = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCalendarRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  const handleDateChange = (date: Date) => {
    onDateChange?.(date);
    setIsFocused(false);
  };

  const handleApplyAction = (date: Date | null) => {
    onApply?.(date);
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleRangeApplyAction = (range: DateRange) => {
    onRangeApply?.(range);
    setIsOpen(false);
    setIsFocused(false);
  };

  useEffect(() => {
    if (!usePortal || !isOpen) return;
    measureCalendar();
  }, [isOpen, usePortal, measureCalendar]);

  useEffect(() => {
    if (!usePortal || !isOpen) return;

    const handlePositionUpdate = () => measureCalendar();
    window.addEventListener("scroll", handlePositionUpdate, true);
    window.addEventListener("resize", handlePositionUpdate);

    return () => {
      window.removeEventListener("scroll", handlePositionUpdate, true);
      window.removeEventListener("resize", handlePositionUpdate);
    };
  }, [isOpen, usePortal, measureCalendar]);

  // Calendar inline
  const inlineCalendar =
    isOpen && !disabled && !usePortal ? (
      <Calendar
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-[calc(100%)] z-20 overflow-auto",
          calendarClassName,
        )}
        value={value ?? null}
        onDateChange={handleDateChange}
        maxDate={maxDate}
        minDate={minDate}
        showActions={showActions}
        onClear={onClear}
        onApply={handleApplyAction}
        clearText={clearText}
        applyText={applyText}
        actionTopContent={actionTopContent}
        defaultYear={defaultYear}
        isRange={isRange}
        rangeValue={rangeValue}
        onRangeChange={onRangeChange}
        onRangeApply={handleRangeApplyAction}
      />
    ) : null;

  const portalDropdown =
    isOpen &&
    !disabled &&
    usePortal &&
    calenderRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <Calendar
            ref={portalCalendarRef}
            style={{
              position: "fixed",
              top: calenderRect.top + calenderRect.height + 10,
              left: calenderRect.left,
            }}
            className={cn("z-9999", calendarClassName)}
            value={value ?? null}
            onDateChange={handleDateChange}
            maxDate={maxDate}
            minDate={minDate}
            showActions={showActions}
            onClear={onClear}
            onApply={handleApplyAction}
            clearText={clearText}
            applyText={applyText}
            actionTopContent={actionTopContent}
            defaultYear={defaultYear}
            isRange={isRange}
            rangeValue={rangeValue}
            onRangeChange={onRangeChange}
            onRangeApply={handleRangeApplyAction}
          />,
          document.body,
        )
      : null;

  // Helper functions to avoid nested ternaries
  const hasValue = isRange ? Boolean(rangeValue?.start || rangeValue?.end) : Boolean(value);
  
  const getDisplayTextClass = () => hasValue ? "text-text-primary" : "text-text-placeholder";
  
  const getDisplayText = () => {
    if (isRange) {
      return rangeValue?.start ? formatRangeDisplay(rangeValue) : placeholder;
    }
    return value ? formatDisplay(value) : placeholder;
  };

  return (
    <div
      className={cn("flex flex-col gap-1 relative", className)}
      ref={rootRef}
    >
      {label ? (
        <Text variant="caption">
          {label} {required && <span className="text-error">*</span>}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          type="button"
          ref={triggerRef}
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full flex items-center gap-2 text-left px-4 outline-none disabled:cursor-not-allowed"
        >
          <Text
            variant="caption"
            className={cn(
              "grow text-start",
              getDisplayTextClass(),
              disabled && "text-disabled",
              inputClassName,
            )}
          >
            {getDisplayText()}
          </Text>
          <Icon
            name="calendar"
            className={cn(
              "size-4 text-text-placeholder shrink-0",
              disabled && "text-disabled",
              iconClassName,
            )}
          />
        </button>
      </InputWrapper>

      {inlineCalendar}
      {portalDropdown}

      {(helperText || hasError) && (
        <Text
          variant="small"
          className={cn("text-text-secondary!", hasError ? "text-error!" : "")}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};

/**
 * ===============================================================
 * Date Range Picker component
 * ===============================================================
 * DateRangePicker component props
 * @param label - The label of the input
 * @param placeholder - The placeholder of the input
 * @param values - The value of the date range input in array => [Date, Date]
 * @param onDateChange - The onChange event of the input, accepts function with signature (range: [Date, Date]) => void;
 * @param error - The error message of the input
 * @param helperText - The helper text of the input
 * @param leftIcon - The left icon of the input
 * @param rightIcon - The right icon of the input
 * @param className - The class name of the input
 * @param inputClassName - The class name of the input's input
 * @param wrapperClassName - The class name of the input wrapper
 * @param calendarClassName - The class name of the calender popup
 * @param touched - Whether the input is touched
 * @param onFocus - The onFocus event of the input
 * @param onBlur - The onBlur event of the input
 * @param disabled - Whether the input is disabled
 * @param required - Whether the input is required or not
 * @param maxDate?: - maximum value of date that can be selected
 * @param minDate?: - minimum value of date that can be selected
 * @param usePortal?: - flag to enable use of portal based popup for better UI when multiple element are stacked
 */

interface DateRangePickerProps extends Omit<
  DatePickerProps,
  "value" | "onDateChange" | "onApply" | "onClear"
> {
  values: DateRange;
  onDateChange: (range: DateRange) => void;
  /** Show Clear and Apply buttons in the calendar dropdown */
  showActions?: boolean;
  /** Callback when Clear button is clicked */
  onClear?: () => void;
  /** Callback when Apply button is clicked */
  onApply?: (range: DateRange) => void;
  /** Text for the clear button (default: "Clear") */
  clearText?: string;
  /** Text for the apply button (default: "Apply") */
  applyText?: string;
  /** Default year to show when no value is selected */
  defaultYear?: number;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = (props) => {
  const {
    label,
    placeholder = "Select Date",
    values,
    onDateChange,
    required,
    disabled,
    error,
    helperText,
    className,
    calendarClassName,
    wrapperClassName,
    inputClassName,
    touched,
    onFocus,
    onBlur,
    maxDate,
    minDate,
    isFilter,
    usePortal = false,
    showActions = false,
    onClear,
    onApply,
    clearText,
    applyText,
    actionTopContent,
    defaultYear,
  } = props;
  // states
  const hasError = Boolean(error && touched && !disabled);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const {
    triggerRef,
    portalRef: portalCalendarRef,
    rect: calenderRect,
    style,
  } = usePortalPopup({
    isOpen,
    usePortal,
    advancedPositioning: true,
  });

  // refs
  const rootRef = useClickOutside<HTMLDivElement>((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalCalendarRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setIsOpen(false);
    setIsFocused(false);
  });
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  // Format display
  const formatDisplay = (dates: DateRange): string => {
    const { start, end } = dates;
    if (start && end) {
      const formatFunc = (date: Date) =>
        `${date.getDate()}-${formatMonthYearShort({month: date.getMonth() + 1, year: date.getFullYear()})}`;
      return `${formatFunc(start)}-${formatFunc(end)}`;
    }
    return "";
  };

  const formatSingle = (date: Date) =>
    `${date.getDate()}-${formatMonthYearShort({month: date.getMonth() + 1, year: date.getFullYear()})}`;

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        !rootRef.current?.contains(e.relatedTarget as Node)
      ) {
        setIsFocused(false);
        onBlur?.(e);
      }
    }, 0);
  };

  const handleDateChange = (values: DateRange) => {
    onDateChange?.(values);
    // Only auto-close if showActions is false (no Clear/Apply buttons)
    if (!showActions && values.start && values.end) {
      setIsOpen(false);
      setIsFocused(false);
    }
  };

  const handleClear = () => {
    onDateChange?.({ start: null, end: null });
    onClear?.();
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleApply = (range: DateRange) => {
    onApply?.(range);
    setIsOpen(false);
    setIsFocused(false);
  };

  // Calendar inline
  const inlineCalendar =
    isOpen && !disabled && !usePortal ? (
      <RangeCalendar
        className={cn(
          "absolute left-0 top-[calc(100%)] z-20 overflow-auto",
          calendarClassName,
        )}
        value={values}
        onDateChange={handleDateChange}
        maxDate={maxDate}
        minDate={minDate}
        showActions={showActions}
        onClear={handleClear}
        onApply={handleApply}
        clearText={clearText}
        applyText={applyText}
        actionTopContent={actionTopContent}
        defaultYear={defaultYear}
      />
    ) : null;

  const portalDropdown =
    isOpen &&
    !disabled &&
    usePortal &&
    calenderRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <RangeCalendar
            ref={portalCalendarRef}
            style={style}
            className={cn("z-9999", calendarClassName)}
            value={values}
            onDateChange={handleDateChange}
            maxDate={maxDate}
            minDate={minDate}
            showActions={showActions}
            onClear={handleClear}
            onApply={handleApply}
            clearText={clearText}
            applyText={applyText}
            actionTopContent={actionTopContent}
            defaultYear={defaultYear}
          />,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("flex flex-col gap-1 relative", className)}
      ref={rootRef}
    >
      {label ? (
        <Text variant="caption">
          {label} {required && <span className="text-error">*</span>}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          type="button"
          ref={triggerRef as any}
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full flex items-center gap-2 cursor-pointer text-left px-4 outline-none disabled:cursor-not-allowed"
        >
          <Text
            variant="caption"
            className={cn(
              "grow text-start",
              values.start || values.end
                ? "text-text-primary"
                : "text-text-placeholder!",
              disabled && "text-disabled",
              inputClassName,
            )}
          >
            {values.start
              ? values.end
                ? formatDisplay(values)
                : formatSingle(values.start)
              : placeholder}
          </Text>
          <Icon
            name="calendar"
            className={cn(
              "size-4 text-text-placeholder shrink-0",
              disabled && "text-disabled",
            )}
          />
        </button>
      </InputWrapper>

      {inlineCalendar}
      {portalDropdown}

      {(helperText || hasError) && (
        <Text
          variant="caption"
          className={cn("text-text-secondary!", hasError ? "text-error!" : "")}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};

export interface MonthYearPickerProps extends Omit<DatePickerProps, 'value'> {
  label?: string;
  placeholder?: string;
  value?: MonthYear | null;
  onChange?: (val: MonthYear) => void;
  handleDone?: (val: MonthYear) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  calendarClassName?: string;
  touched?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  usePortal?: boolean;
  isFilter?: boolean;
  /** Array of month/year combinations to disable */
  disabledMonths?: MonthYear[];
  /** Array of month/year combinations to allow (if set, only these months are selectable) */
  allowedMonths?: MonthYear[];
  /** Default year to show when no value is selected */
  defaultYear?: number;
  /** Lock to a specific year, preventing navigation to other years */
  lockYear?: boolean;

  doneText?: string;
}

export const MonthYearPicker: React.FC<MonthYearPickerProps> = (props) => {
  const {
    label,
    placeholder = "Select Month & Year",
    value,
    onChange,
    handleDone,
    required,
    disabled,
    error,
    helperText,
    className,
    wrapperClassName,
    inputClassName,
    calendarClassName,
    touched,
    onFocus,
    onBlur,
    usePortal = false,
    labelClassName,
    isFilter,
    iconClassName,
    rightIconClassName,
    disabledMonths,
    allowedMonths,
    defaultYear,
    lockYear,
    doneText
  } = props;

  const hasError = Boolean(error && touched && !disabled);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { triggerRef, portalRef, rect, style } = usePortalPopup({
    isOpen,
    usePortal,
    advancedPositioning: true,
  });

  const rootRef = useClickOutside<HTMLDivElement>((e) => {
    const target = e.target as Node;
    const isInsidePortal = portalRef.current?.contains(target);
    if (isInsidePortal) return;
    setIsOpen(false);
    setIsFocused(false);
  });

  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  const formatDisplay = (val: { month: number; year: number }) => {
    return `${CALENDAR_MONTH_NAMES[val.month-1]} ${val.year}`;
  };

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        !rootRef.current?.contains(e.relatedTarget as Node)
      ) {
        setIsFocused(false);
        onBlur?.(e);
      }
    }, 0);
  };

  const handleChange = (val: MonthYear) => {
    onChange?.(val);
    setIsFocused(false);
    setIsOpen(false);
  };

  const inline =
    isOpen && !disabled && !usePortal ? (
      <MonthYearSelector
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-[calc(100%)] z-20",
          calendarClassName,
        )}
        value={value ?? undefined}
        onChange={handleChange}
        handleDone={handleDone}
        onClose={() => setIsOpen(false)}
        disabledMonths={disabledMonths}
        allowedMonths={allowedMonths}
        defaultYear={defaultYear}
        lockYear={lockYear}
        doneText={doneText}
      />
    ) : null;

  const portal =
    isOpen && !disabled && usePortal && rect && typeof document !== "undefined"
      ? createPortal(
          <MonthYearSelector
            ref={portalRef}
            className={cn("z-9999", calendarClassName)}
            style={style}
            value={value ?? undefined}
            onChange={handleChange}
            handleDone={handleDone}
            onClose={() => setIsOpen(false)}
            disabledMonths={disabledMonths}
            allowedMonths={allowedMonths}
            defaultYear={defaultYear}
            lockYear={lockYear}
          />,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("flex flex-col gap-1 relative", className)}
      ref={rootRef}
    >
      {label && (
        <Text variant="caption" className={labelClassName}>
          {label} {required && <span className="text-error">*</span>}
        </Text>
      )}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full flex items-center gap-2 text-left px-4 outline-none disabled:cursor-not-allowed"
        >
          <Text
            variant="caption"
            className={cn(
              "grow text-start",
              value ? "text-text-primary" : "text-text-placeholder",
              disabled && "text-disabled",
              inputClassName,
            )}
          >
            {value ? formatDisplay(value) : placeholder}
          </Text>

          <Icon
            name="calendar"
            className={cn(
              "size-4 text-text-placeholder shrink-0",
              disabled && "text-disabled",
              iconClassName,
              rightIconClassName,
            )}
          />
        </button>
      </InputWrapper>

      {inline}
      {portal}

      {(helperText || hasError) && (
        <Text
          variant="small"
          className={cn("text-text-secondary!", hasError && "text-error!")}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};

export interface MultiMonthYearPickerProps extends Omit<DatePickerProps, "value" | "onDateChange"> {
  label?: string;
  placeholder?: string;
  value?: MonthYear[] | null;
  onChange?: (val: MonthYear[]) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  wrapperClassName?: string;
  inputClassName?: string;
  calendarClassName?: string;
  touched?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  usePortal?: boolean;
  isFilter?: boolean;
  /** Default year to show when no value is selected */
  defaultYear?: number;
  doneText?: string;
  /** Lock to a specific year, preventing navigation to other years */
  lockYear?: boolean;
}

export const MultiMonthYearPicker: React.FC<MultiMonthYearPickerProps> = (
  props,
) => {
  const {
    label,
    placeholder = "Select Months & Years",
    value,
    onChange,
    required,
    disabled,
    error,
    helperText,
    className,
    wrapperClassName,
    inputClassName,
    calendarClassName,
    touched,
    onFocus,
    onBlur,
    usePortal = false,
    labelClassName,
    isFilter,
    iconClassName,
    rightIconClassName,
    defaultYear,
    doneText = "Apply",
    lockYear,
  } = props;

  const hasError = Boolean(error && touched && !disabled);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { triggerRef, portalRef, rect, style } = usePortalPopup({
    isOpen,
    usePortal,
    advancedPositioning: true,
  });

  const rootRef = useClickOutside<HTMLDivElement>((e) => {
    const target = e.target as Node;
    const isInsidePortal = portalRef.current?.contains(target);
    if (isInsidePortal) return;
    setIsOpen(false);
    setIsFocused(false);
  });

  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (
        !rootRef.current?.contains(document.activeElement) &&
        !rootRef.current?.contains(e.relatedTarget as Node)
      ) {
        setIsFocused(false);
        onBlur?.(e);
      }
    }, 0);
  };

  const handleChange = (val: MonthYear[]) => {
    onChange?.(val);
    setIsFocused(false);
    setIsOpen(false);
  };

  const handleClose = (action?: "forceClose" | "close") => {
    if (action === "forceClose") {
      onChange?.([]);
    }
    setIsOpen(false);
    setIsFocused(false);
  };

  const inline =
    isOpen && !disabled && !usePortal ? (
      <MultiMonthYearSelector
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-[calc(100%)] z-20",
          calendarClassName,
        )}
        value={value ?? undefined}
        onChange={handleChange}
        onClose={handleClose}
        defaultYear={defaultYear}
        doneText = {doneText}
        lockYear={lockYear}
      />
    ) : null;

  const portal =
    isOpen && !disabled && usePortal && rect && typeof document !== "undefined"
      ? createPortal(
          <MultiMonthYearSelector
            ref={portalRef}
            className={cn("z-9999", calendarClassName)}
            style={style}
            value={value ?? undefined}
            onChange={handleChange}
            onClose={handleClose}
            defaultYear={defaultYear}
            doneText={doneText}
            lockYear={lockYear}
          />,
          document.body,
        )
      : null;

  return (
    <div
      className={cn("flex flex-col gap-1 relative", className)}
      ref={rootRef}
    >
      {label && (
        <Text variant="caption" className={labelClassName}>
          {label} {required && <span className="text-error">*</span>}
        </Text>
      )}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full flex items-center gap-2 text-left px-4 outline-none disabled:cursor-not-allowed"
        >
          <Text
            variant="caption"
            className={cn(
              "grow text-start",
              value && value.length > 0
                ? "text-text-primary"
                : "text-text-placeholder",
              disabled && "text-disabled",
              inputClassName,
            )}
          >
            {value && value.length > 0
              ? formatMonthYearList(value)
              : placeholder}
          </Text>

          <Icon
            name="calendar"
            className={cn(
              "size-4 text-text-placeholder shrink-0",
              disabled && "text-disabled",
              iconClassName,
              rightIconClassName,
            )}
          />
        </button>
      </InputWrapper>

      {inline}
      {portal}

      {(helperText || hasError) && (
        <Text
          variant="small"
          className={cn("text-text-secondary!", hasError && "text-error!")}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};
