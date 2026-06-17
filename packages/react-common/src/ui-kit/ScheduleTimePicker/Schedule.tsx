import React, { useEffect, useState, useCallback, Ref } from "react";
import { ScheduleTime } from "../../interface";
import { Text } from "../Text";
import { Button } from "../Button";
import { Icon } from "../Icon";
import { cn } from "../../utils";

type peroid = "AM" | "PM";
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DATES = Array.from({ length: 31 }, (_, i) => i + 1);

const parseTime = (time?: string) => {
  const match = time?.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
  return match
    ? {
        hour: match[1].padStart(2, "0"),
        minute: match[2],
        period: match[3].toUpperCase() as peroid,
      }
    : { hour: "10", minute: "00", period: "AM" };
};

const formatTime = (h: string, m: string, p: peroid) => `${h}:${m} ${p}`;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sanitizeTimePartInput = (raw: string) => raw.replace(/\D/g, "").slice(0, 2);

interface Props {
  value?: ScheduleTime | null;
  onChange: (val: ScheduleTime) => void;
  className?: string;
  style?: React.CSSProperties;
  showWeekSelector?: boolean;
  showMonthSelector?: boolean;
  ref?: Ref<HTMLElement>;
  onCancel?: () => void;
}

export const SchedulePickerPopup = (props: Props) => {
  const {
    value,
    onChange,
    className,
    style,
    showWeekSelector = false,
    showMonthSelector = false,
    onCancel,
  } = props;
  const [hour, setHour] = useState("10");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState<peroid>("AM");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [date, setDate] = useState<number | null>(null);
  const requiresDaySelection = showWeekSelector || showMonthSelector;
  const hasRequiredDaySelection = showWeekSelector
    ? typeof weekday === "number"
    : showMonthSelector
      ? typeof date === "number"
      : true;

  useEffect(() => {
    const t = parseTime(value?.time);
    setHour(t.hour);
    setMinute(t.minute);
    setPeriod(t.period as peroid);
    setWeekday(value?.weekday ?? null);
    setDate(value?.day_of_month ?? null);
  }, [value]);

  const handleSave = useCallback(() => {
    const parsedHour = Number.parseInt(hour || "0", 10);
    const parsedMinute = Number.parseInt(minute || "0", 10);
    const normalizedHour = clamp(Number.isNaN(parsedHour) ? 1 : parsedHour, 1, 12)
      .toString()
      .padStart(2, "0");
    const normalizedMinute = clamp(Number.isNaN(parsedMinute) ? 0 : parsedMinute, 0, 59)
      .toString()
      .padStart(2, "0");

    onChange({
      time: formatTime(normalizedHour, normalizedMinute, period),
      weekday: showWeekSelector ? weekday : null,
      day_of_month: showMonthSelector ? date : null,
    });
  }, [
    hour,
    minute,
    period,
    weekday,
    date,
    showWeekSelector,
    showMonthSelector,
    onChange,
  ]);

  return (
    <div
      style={style}
      className={cn(
        "min-w-full bg-white border border-bg-card rounded-lg shadow p-4 flex flex-col gap-4",
        className,
      )}
    >
      {showWeekSelector && (
        <>
          <Text variant="small">Select Day</Text>
          <div className="grid grid-cols-7 border-border border-1 divide-x-1 rounded overflow-hidden">
            {DAYS_SHORT.map((d, i) => {
              const val = i === 0 ? 7 : i;
              return (
                <button
                  key={d}
                  onClick={() => {
                    setWeekday(val);
                    setDate(null);
                  }}
                  className={cn(
                    "py-2 cursor-pointer  border-border",
                    weekday === val
                      ? "bg-primary text-white"
                      : "bg-white text-text-secondary",
                  )}
                >
                  <Text variant="small" className="text-inherit!">
                    {d}
                  </Text>
                </button>
              );
            })}
          </div>
        </>
      )}

      {showMonthSelector && (
        <>
          <Text variant="small">Select Date</Text>
          <div className="grid grid-cols-7 overflow-hidden border-border">
            {DATES.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setDate(d);
                  setWeekday(null);
                }}
                className={cn(
                  "py-2 cursor-pointer border-r border-b border-border",
                  (d - 1) % 7 === 0 && "border-l",
                  d <= 7 && "border-t",
                  d === 1 && "rounded-tl",
                  d === 7 && "rounded-tr",
                  d === 31 && "rounded-br",
                  d === 29 && "rounded-bl",
                  date === d
                    ? "bg-primary text-white"
                    : "bg-white text-text-secondary",
                )}
              >
                <Text variant="small" className="text-inherit!">
                  {d}
                </Text>
              </button>
            ))}
          </div>
        </>
      )}

      <Text variant="small">Enter Time</Text>

      <div
        className={cn(
          "flex items-center gap-2 bg-gray-100 p-3 rounded-md",
          requiresDaySelection && !hasRequiredDaySelection && "opacity-60 pointer-events-none",
        )}
      >
        <input
          value={hour}
          onChange={(e) => {
            setHour(sanitizeTimePartInput(e.target.value));
          }}
          onBlur={() => {
            const parsedHour = Number.parseInt(hour || "0", 10);
            const normalizedHour = clamp(Number.isNaN(parsedHour) ? 1 : parsedHour, 1, 12)
              .toString()
              .padStart(2, "0");
            setHour(normalizedHour);
          }}
          className="w-12 text-center focus:border-primary-tint-1! ring-3 ring-primary-tint-1/10 outline-none text-[26px] font-InterMedium text-text-primary bg-white rounded w-[53px] h-[47px]"
        />

        <Text
          variant="free"
          className="font-InterMedium text-[28px] text-text-primary"
        >
          :
        </Text>

        <input
          value={minute}
          onChange={(e) => {
            setMinute(sanitizeTimePartInput(e.target.value));
          }}
          onBlur={() => {
            const parsedMinute = Number.parseInt(minute || "0", 10);
            const normalizedMinute = clamp(Number.isNaN(parsedMinute) ? 0 : parsedMinute, 0, 59)
              .toString()
              .padStart(2, "0");
            setMinute(normalizedMinute);
          }}
          className="w-12 text-center focus:border-primary-tint-1! ring-3 ring-primary-tint-1/10 outline-none text-[26px] font-InterMedium text-text-primary bg-white rounded w-[53px] h-[47px]"
        />

        {["AM", "PM"].map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p as "AM" | "PM")}
            className={cn(
              "px-2 cursor-pointer w-[53px] h-[47px] rounded-sm",
              period === p ? "text-primary bg-white" : "text-gray-400",
            )}
          >
            <Text
              variant="caption2"
              className="text-inherit! font-InterMedium text-[20px]!"
            >
              {p}
            </Text>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          className="w-full justify-center"
          onClick={() => onCancel?.()}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          className="w-full justify-center"
          disabled={!hasRequiredDaySelection}
          onClick={handleSave}
        >
          Save
        </Button>
      </div>
    </div>
  );
};
