import MuiSlider from "@mui/material/Slider";
import { styled } from "@mui/material/styles";
import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { Text } from "../../ui-kit";
import { cn } from "../../utils";

type SliderMark = number | { value: number; label?: ReactNode };

type IOSingleSliderProps = {
  label?: string;
  labelClassName?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (val: number) => void;
  unit?: string;
  valueLabel?: boolean;
  valueLabelOnThumb?: string;
  valueLabelClassName?: string;
  scaleMarks?: SliderMark[];
  scaleDistribution?: "proportional" | "even";
  snapToScaleMarks?: boolean;
  scaleClassName?: string;
  scaleWrapperClassName?: string;
  disabled?: boolean;
  /**
   * When true, the slider looks enabled but blocks all user interactions.
   * Unlike `disabled`, this does not apply greyed-out styles.
   */
  readOnly?: boolean;
};

const IOSStyledSingleSlider = styled(MuiSlider)(({ disabled }) => ({
  height: 6,
  "& .MuiSlider-thumb": {
    height: 22,
    width: 6,
    borderRadius: 5,
    backgroundColor: "#fff",
    border: "1px solid #151735",
    boxShadow: "none",
    "&:hover, &.Mui-active": {
      boxShadow: "none",
    },
  },
  "& .MuiSlider-track": {
    height: 6,
    border: "none",
    backgroundColor: disabled ? "#e5e7eb" : "#151735", // track color
  },
  "& .MuiSlider-rail": {
    height: 6,
    opacity: 1,
    backgroundColor: "#e5e7eb", // light gray
  },
  "& .MuiSlider-valueLabel": {
    top: -2,
    backgroundColor: "transparent",
    color: "#2A9D8F",
    fontSize: 14,
    fontWeight: 600,
    "&::before": { display: "none" },
  },
  /* ✅ CUSTOM DISABLED STYLE */
  "&.Mui-disabled": {
    opacity: 1, // prevent fade
    cursor: "not-allowed",
  },
  "&.Mui-disabled .MuiSlider-track": {
    backgroundColor: "#e5e7eb", // ensure track is light gray when disabled
  },
  "&.Mui-disabled .MuiSlider-rail": {
    backgroundColor: "#E5E7EB", // light gray
  },
  "&.Mui-disabled .MuiSlider-thumb": {
    backgroundColor: "#F3F4F6", // soft gray
    border: "1px solid #9CA3AF",
  },
  "&.Mui-disabled .MuiSlider-valueLabel": {
    color: "#9CA3AF",
  },
}));

export const IOSSingleSlider = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  unit = "%",
  valueLabel,
  valueLabelOnThumb = "on",
  labelClassName,
  disabled = false,
  valueLabelClassName,
  scaleMarks,
  scaleDistribution = "proportional",
  snapToScaleMarks = false,
  scaleClassName,
  scaleWrapperClassName,
  readOnly = false,
}: IOSingleSliderProps) => {
  const marks = scaleMarks ?? [min, max];

  const getMarkValue = (mark: SliderMark) =>
    typeof mark === "number" ? mark : mark.value;

  const getMarkLabel = (mark: SliderMark) =>
    typeof mark === "number" ? mark : mark.label ?? mark.value;

  const markValues = marks.map(getMarkValue);
  const shouldUseEvenSnap =
    snapToScaleMarks && scaleDistribution === "even" && markValues.length > 1;
  const sliderValue = shouldUseEvenSnap
    ? markValues.reduce(
        (nearestIndex, markValue, index) =>
          Math.abs(markValue - value) < Math.abs(markValues[nearestIndex] - value)
            ? index
            : nearestIndex,
        0,
      )
    : value;
  const formatSliderValue = (sliderVal: number) =>
    shouldUseEvenSnap ? markValues[sliderVal] ?? value : sliderVal;
  const displayValue = formatSliderValue(sliderValue);

  return (
    <Box className={cn("w-full", readOnly && "pointer-events-none")}>
      {/* Label + Value */}
      <div className="flex gap-2 items-center">
        {label && (
          <span
            className={cn(
              "text-sm font-medium",
              disabled ? "text-gray-400!" : "text-text-secondary!",
              labelClassName,
            )}
          >
            {label}
          </span>
        )}
        {valueLabel && !disabled ? (
          <Text
            variant="caption"
            className={cn(
              disabled
                ? "text-gray-400! font-InterSemiBold!"
                : "text-[#2A9D8F]! font-InterSemiBold!",
              valueLabelClassName,
            )}
          >
            ({`${displayValue}${unit}`})
          </Text>
        ) : null}
      </div>

      <div className="relative">
        <IOSStyledSingleSlider
          min={shouldUseEvenSnap ? 0 : min}
          max={shouldUseEvenSnap ? markValues.length - 1 : max}
          step={shouldUseEvenSnap ? 1 : step}
          value={sliderValue}
          onChange={(_: any, val: any) => {
            if (!readOnly) {
              onChange(formatSliderValue(val as number));
            }
          }}
          valueLabelDisplay={
            valueLabelOnThumb as "on" | "auto" | "off" | undefined
          }
          valueLabelFormat={(v: any) => `${formatSliderValue(v as number)}${unit}`}
          disabled={disabled}
        />
        {!disabled && (
          <div className={cn("absolute bottom-2! w-full", scaleWrapperClassName)}>
            {marks.map((mark, index) => {
              const value = getMarkValue(mark);
              const left =
                scaleDistribution === "even" && marks.length > 1
                  ? (index / (marks.length - 1)) * 100
                  : ((value - min) / (max - min)) * 100;
              const offsetClass =
                left <= 0 ? "translate-x-0" : left >= 100 ? "-translate-x-full" : "-translate-x-1/2";

              return (
                <Text
                  key={value}
                  variant="caption"
                  className={cn("absolute text-text-primary!", offsetClass, scaleClassName)}
                  style={{ left: `${left}%` }}
                >
                  {getMarkLabel(mark)}
                </Text>
              );
            })}
          </div>
        )}
      </div>
    </Box>
  );
};

/** IOSDoubleSlider: For range selection with two thumbs (e.g., min/max SOC) */

type IOSDoubleSliderProps = {
  min: number;
  max: number;
  value: number[]; // range only
  onChange: (val: number[]) => void;
  unit?: string;
  midPoint?: number;
  step?: number;
};

const IOSStyledSlider = styled(MuiSlider)(() => ({
  color: "transparent",
  height: 6,
  padding: "20px 0",

  "& .MuiSlider-track": {
    display: "none",
  },

  "& .MuiSlider-rail": {
    display: "none",
  },

  "& .MuiSlider-thumb": {
    height: 22,
    width: 6,
    borderRadius: 5,
    backgroundColor: "#fff",
    border: "1px solid #151735",
    marginTop: -10,
    "&:hover": {
      boxShadow: "none",
    },
  },

  "& .MuiSlider-valueLabel": {
    top: -2,
    backgroundColor: "transparent",
    color: "#2A9D8F",
    fontSize: 14,
    fontWeight: 600,
    "&::before": { display: "none" },
  },
}));

export const IOSDoubleSlider = ({
  min,
  max,
  value,
  onChange,
  unit = "%",
  midPoint = 50,
  step = 1,
}: IOSDoubleSliderProps) => {
  const [minVal, maxVal] = value;

  const percent = (val: number) => ((val - min) / (max - min)) * 100;

  return (
    <Box className="w-full relative">
      <div className="relative h-6">
        {/* 🔥 BASE RAIL */}
        <div className="absolute top-1/2 w-full h-[6px] bg-gray-200 rounded-full -translate-y-1/2" />

        {/* 🔥 LEFT FILLED (0 → min) */}
        <div
          className="absolute top-1/2 h-[6px] bg-[#151735] rounded-full -translate-y-1/2"
          style={{
            left: "0%",
            width: `${percent(minVal)}%`,
          }}
        />

        {/* 🔥 RIGHT FILLED (mid → max) */}
        <div
          className="absolute top-1/2 h-[6px] bg-[#151735] rounded-full -translate-y-1/2"
          style={{
            left: `${percent(midPoint)}%`,
            width: `${percent(maxVal) - percent(midPoint)}%`,
          }}
        />

        {/* 🔥 CENTER DIVIDER */}
        <div
          className="absolute top-1/2 w-[2px] h-5 bg-[#151735] -translate-y-1/2"
          style={{ left: `${percent(midPoint)}%` }}
        />

        <IOSStyledSlider
          min={min}
          max={max}
          value={value}
          step={step}
          onChange={(_: any, val: any) => {
            let [newMin, newMax] = val as number[];

            let updatedMin = newMin;
            let updatedMax = newMax;

            // 🔥 Restrict left thumb (<= midpoint)
            if (updatedMin > midPoint) {
              updatedMin = midPoint;
            }

            // 🔥 Restrict right thumb (>= midpoint)
            if (updatedMax < midPoint) {
              updatedMax = midPoint;
            }

            // ✅ NEW: midpoint constraints
            if (updatedMin === midPoint && updatedMax < midPoint + step) {
              updatedMax = midPoint + step; // 55
            }

            if (updatedMax === midPoint && updatedMin > midPoint - step) {
              updatedMin = midPoint - step; // 45
            }

            onChange([updatedMin, updatedMax]);
          }}
          valueLabelDisplay="on"
          valueLabelFormat={(v: any) => `${v}${unit}`}
        />

        {Array.isArray(value) && (
          <>
            <span
              className="absolute text-orange-500 text-sm font-medium"
              style={{ left: "25%", bottom: "-20px" }}
            >
              Min SOC
            </span>

            <span
              className="absolute text-orange-500 text-sm font-medium"
              style={{ right: "25%", bottom: "-20px" }}
            >
              Max SOC
            </span>
          </>
        )}
      </div>

      <div className="flex justify-between text-sm">
        <Text variant="caption" className="text-text-primary!">
          {min}
        </Text>

        <Text
          variant="caption"
          className="text-text-primary! absolute left-1/2 -translate-x-1/2"
        >
          {midPoint}
        </Text>
        <Text variant="caption" className="text-text-primary!">
          {max}
        </Text>
      </div>
    </Box>
  );
};

/* ========================
  PROGRESS SLIDER STYLE
=========================== */
const IOSProgressStyledSlider = styled(MuiSlider)(() => ({
  color: "transparent",
  height: 6,
  padding: "20px 0",

  "& .MuiSlider-track": {
    display: "none",
  },

  "& .MuiSlider-rail": {
    display: "none",
  },

  /* 🔥 ROUND THUMB */
  "& .MuiSlider-thumb": {
    height: 24,
    width: 24,
    borderRadius: "50%",
    backgroundColor: "#2F9C8F",
    border: "1px solid #151735",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    marginTop: -8,

    "&:hover, &.Mui-active": {
      boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
    },
  },
}));

type IOSProgressSliderProps = {
  min: number;
  max: number;
  value: number;
  onChange: (val: number) => void;
  step?: number;
  markStep?: number;
  unit?: string;
};

export const IOSProgressSlider = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  markStep = 5,
  unit = "%",
}: IOSProgressSliderProps) => {
  const percent = ((value - min) / (max - min)) * 100;

  // 🔥 Generate marks (10,15,20...)
  const marks: number[] = [];
  for (let i = min; i <= max; i += markStep) {
    marks.push(i);
  }

  return (
    <Box className="w-full relative">
      <div className="relative h-8">
        {/* BASE RAIL */}
        <div className="absolute top-1/2 w-full h-1.5 bg-[#4B5563] rounded-full -translate-y-1/2" />

        {/* FILLED TRACK */}
        <div
          className="absolute top-1/2 h-1.5 bg-[#2F9C8F] rounded-full -translate-y-1/2"
          style={{ width: `${percent}%` }}
        />

        {/* 🔥 IMPORTANT: USE CORRECT SLIDER */}
        <IOSProgressStyledSlider
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(_, val) => onChange(val as number)}
        />
      </div>

      {/* SCALE NUMBERS */}
      <div className="relative mt-2 h-5">
        {marks.map((mark) => {
          const left = ((mark - min) / (max - min)) * 100;

          return (
            <span
              key={mark}
              className="absolute text-small text-gray-500 -translate-x-1/2"
              style={{ left: `${left}%` }}
            >
              {mark}
            </span>
          );
        })}
      </div>
    </Box>
  );
};
