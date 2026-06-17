import React, { HTMLAttributes, useState } from "react";
import { ScheduleTime } from "../../interface";
import { Text } from "../Text";
import { Icon } from "../Icon";
import { useClickOutside, usePortalPopup } from "../../hooks";
import { cn, getOrdinal } from "../../utils";
import { InputWrapper } from "../InputWrapper";
import { SchedulePickerPopup } from "./Schedule";
import { createPortal } from "react-dom";

interface ScheduleTimePickerProps extends Omit<
  HTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  value: ScheduleTime | null;
  showWeekSelector?: boolean;
  showMonthSelector?: boolean;
  onChange: (data: ScheduleTime) => void;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  touched?: boolean;
  className?: string;
  wrapperClassName?: string;
  iconClassName?: string;
  textClassName?: string;
  pickerClassName?: string;
  usePortal?: boolean;
  required?: boolean;
  portalRef?: any;
}

const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// API weekday (1–7, Monday=1, Sunday=7) → index (0–6, Sunday=0)
const apiToIndex = (d: number) => (d === 7 ? 0 : d);

export const SchedulePicker: React.FC<ScheduleTimePickerProps> = (props) => {
  const {
    showWeekSelector = false,
    showMonthSelector = false,
    onChange,
    value,
    className,
    disabled,
    pickerClassName,
    error,
    helperText,
    iconClassName,
    label,
    placeholder = " ",
    portalRef,
    required,
    textClassName,
    touched,
    usePortal,
    onBlur,
    onFocus,
    wrapperClassName,
  } = props;
  const [open, setOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect: dropdownRect,
    style,
  } = usePortalPopup({
    isOpen: open,
    usePortal,
  });

  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalDropdownRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setOpen(false);
    setIsFocused(false);
  });

  const hasError = Boolean(error && touched && !disabled);
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";
  const hasValue = value?.day_of_month || value?.time || value?.weekday;

  const handleToggle = () => {
    if (disabled) return;
    setOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 0);
    onBlur?.(e);
  };

  // 🔹 format display text
  const displayValue = (() => {
    if (!value?.time) return placeholder;

    if (showWeekSelector && value.weekday) {
      return `${DAYS_FULL[apiToIndex(value.weekday)]}, ${value.time}`;
    }

    if (showMonthSelector && value.day_of_month) {
      return `${getOrdinal(value.day_of_month)}, ${value.time}`;
    }

    return value.time;
  })();

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  // 🔹 handle popup save
  const handlePopupChange = (val: ScheduleTime) => {
    onChange(val);
    setOpen(false);
    setIsFocused(false);
  };

  const inlineDropdown =
    open && !disabled && !usePortal ? (
      <SchedulePickerPopup
        showMonthSelector={showMonthSelector}
        showWeekSelector={showWeekSelector}
        className={cn(
          "absolute left-0 right-0 top-[calc(100%)] z-999",
          pickerClassName,
        )}
        value={value}
        onChange={handlePopupChange}
        onCancel={() => setOpen(false)}
      />
    ) : null;

  const portalDropdown =
    open &&
    !disabled &&
    usePortal &&
    dropdownRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <SchedulePickerPopup
            ref={portalDropdownRef}
            showMonthSelector={showMonthSelector}
            showWeekSelector={showWeekSelector}
            className={cn("z-9999", pickerClassName)}
            value={value}
            style={style}
            onChange={handlePopupChange}
          />,
          portalRef?.current ?? document.body,
        )
      : null;

  return (
    <div
      ref={rootRef as any}
      className={cn("flex flex-col gap-1 relative", className)}
    >
      {label ? (
        <Text variant="caption">
          {label} {required && <span className="text-error">*</span>}
        </Text>
      ) : null}

      <InputWrapper
        state={currentState}
        focus={isFocused || open}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full flex items-center gap-2 text-left px-4 outline-none disabled:cursor-not-allowed cursor-pointer"
        >
          <Text
            variant="caption"
            className={cn(
              "grow truncate",
              hasValue ? "text-text-primary!" : "text-text-placeholder!",
              disabled && "text-disabled",
              textClassName,
            )}
          >
            {displayValue}
          </Text>

          <Icon
            name={"clock"}
            className={cn(
              "size-4 text-text-placeholder",
              iconClassName,
              disabled && "text-disabled",
            )}
          />
        </button>
      </InputWrapper>

      {inlineDropdown}
      {portalDropdown}

      {(helperText || hasError) && (
        <Text
          variant="small"
          className={cn(
            "text-text-secondary!",
            hasError ? "text-error-text!" : "",
          )}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};

//   const [hour, setHour] = useState('00');
//   const [minute, setMinute] = useState('00');
//   const [period, setPeriod] = useState<'AM' | 'PM'>('AM');

//   const [selectedDay, setSelectedDay] = useState<number | null>(null);
//   const [selectedDate, setSelectedDate] = useState<number | null>(null);

//   const handleSave = () => {
//     const time = `${hour}:${minute} ${period}`;

//     if (frequency === 'weekly' && selectedDay === null) return;
//     if (frequency === 'monthly' && selectedDate === null) return;

//     onChange({
//       time: time,
//       weekday: frequency === 'weekly' && selectedDay !== null ? indexToApiWeekday(selectedDay) : null,
//       day_of_month: frequency === 'monthly' ? selectedDate : null,
//     });

//     setOpen(false);
//   };

//   // Initialize picker state from the Schedule object
//   useEffect(() => {
//     if (!value || !value.time) {
//       setSelectedDay(null);
//       setSelectedDate(null);
//       return;
//     }

//     // Parse the time string "HH:MM AM|PM"
//     const timeMatch = value.time.match(/(\d{1,2}):([0-5]\d)\s?(AM|PM)$/i);
//     if (timeMatch) {
//       const h = Number(timeMatch[1]).toString().padStart(2, '0');
//       const m = timeMatch[2].toString();
//       const p = timeMatch[3].toUpperCase() as 'AM' | 'PM';
//       setHour(h);
//       setMinute(m);
//       setPeriod(p);
//     }

//     // Set weekday from Schedule object (convert API weekday 1-7 to index 0-6)
//     if (frequency === 'weekly' && value.weekday !== null && value.weekday !== undefined) {
//       setSelectedDay(apiWeekdayToIndex(value.weekday));
//     } else {
//       setSelectedDay(null);
//     }

//     // Set day_of_month from Schedule object
//     if (frequency === 'monthly' && value.day_of_month !== null && value.day_of_month !== undefined) {
//       setSelectedDate(value.day_of_month);
//     } else {
//       setSelectedDate(null);
//     }
//   }, [value, frequency]);

//   return (
//     <div className="relative" ref={rootRef as any}>
//       {/* Input */}
//       <InputWrapper state="default" focus={isFocused || open}>
//         <div
//           onClick={() => setOpen(prev => !prev)}
//           onFocus={() => setIsFocused(true)}
//           onBlur={() => setIsFocused(false)}
//           tabIndex={0}
//           className="rounded-md px-3 py-2 flex justify-between items-center cursor-pointer">
//           <Text variant="caption" className={value?.time ? 'text-text-primary!' : 'text-text-placeholder!'}>
//             {(() => {
//               if (!value?.time) return 'Select Schedule';
//               if (frequency === 'weekly' && value.weekday !== null && value.weekday !== undefined) {
//                 return `${DAYS_FULL[apiWeekdayToIndex(value.weekday)]}, ${value.time}`;
//               }
//               if (frequency === 'monthly' && value.day_of_month !== null && value.day_of_month !== undefined) {
//                 const suffix =
//                   value.day_of_month === 1
//                     ? 'st'
//                     : value.day_of_month === 2
//                       ? 'nd'
//                       : value.day_of_month === 3
//                         ? 'rd'
//                         : 'th';
//                 return `${value.day_of_month}${suffix}, ${value.time}`;
//               }
//               return value.time;
//             })()}
//           </Text>
//           <Icon name="clock" />
//         </div>
//       </InputWrapper>
//       {/* Popup */}
//       {open && (
//         <div className="absolute max-h-96 overflow-auto z-50 mt-2 min-w-80 bg-white shadow-lg rounded-md p-4 border border-border">
//           {/* WEEKLY */}
//           {frequency === 'weekly' && (
//             <>
//               <Text className="mb-2">Select Day</Text>
//               <div className="grid grid-cols-7 gap-1 mb-4">
//                 {DAYS_SHORT.map((day: any, i: any) => (
//                   <button
//                     key={day}
//                     onClick={() => setSelectedDay(i)}
//                     className={`py-2 rounded ${selectedDay === i ? 'bg-primary text-white' : 'bg-gray-100'}`}>
//                     {day}
//                   </button>
//                 ))}
//               </div>
//             </>
//           )}

//           {/* MONTHLY */}
//           {frequency === 'monthly' && (
//             <>
//               <Text className="mb-2">Select Date</Text>
//               <div className="grid grid-cols-7 gap-1 mb-4">
//                 {DATES.map(date => (
//                   <button
//                     key={date}
//                     onClick={() => setSelectedDate(date)}
//                     className={`py-2 rounded cursor-pointer ${selectedDate === date ? 'bg-primary text-white' : 'bg-gray-100'}`}>
//                     {date}
//                   </button>
//                 ))}
//               </div>
//             </>
//           )}

//           {/* TIME */}
//           <Text className="mb-2">Enter Time</Text>

//           <div className="flex items-center justify-center gap-3 bg-gray-100 p-3 rounded-lg">
//             {/* Hour */}
//             <input
//               type="number"
//               value={hour}
//               onChange={e => {
//                 let num = Math.min(Math.max(+e.target.value, 1), 12);
//                 setHour(num.toString().padStart(2, '0'));
//               }}
//               className="w-14 text-center text-lg bg-white rounded-md py-2"
//             />

//             <Text>:</Text>

//             {/* Minute */}
//             <input
//               type="number"
//               value={minute}
//               onChange={e => {
//                 let num = Math.min(Math.max(+e.target.value, 0), 59);
//                 setMinute(num.toString().padStart(2, '0'));
//               }}
//               className="w-14 text-center text-lg bg-white rounded-md py-2"
//             />

//             {/* AM PM */}
//             <div className="flex gap-2 ml-2">
//               {['AM', 'PM'].map(p => (
//                 <button
//                   key={p}
//                   onClick={() => setPeriod(p as any)}
//                   className={`px-2 py-1 cursor-pointer ${period === p ? 'text-primary font-semibold' : 'text-gray-400'}`}>
//                   {p}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Actions */}
//           <div className="flex justify-end gap-3 mt-4">
//             <Button variant="secondary" onClick={() => setOpen(false)}>
//               Cancel
//             </Button>
//             <Button onClick={handleSave}>Save</Button>
//           </div>
//         </div>
//       )}
//     </div>
//   );
