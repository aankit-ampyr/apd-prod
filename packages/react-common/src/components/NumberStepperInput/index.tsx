import { Icon, Text, Tooltip } from "../../ui-kit";

type NumberStepperInputProps = {
  label: string;
  value: string;
  setValue: (val: string) => void;
  min: number;
  max: number;
  step: number;
  defaultValue: string;
  showTooltip?: boolean;
  toolTipMessage?: string;
  disabled?: boolean;
};

export function NumberStepperInput({
  label,
  value,
  setValue,
  min,
  max,
  step,
  defaultValue,
  showTooltip = false,
  toolTipMessage,
  disabled = false,
}: Readonly<NumberStepperInputProps>) {
  // ✅ Dynamic precision based on step
  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    return stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
  };

  const precision = getPrecision(step);
  const handleIncrement = () => {
    if (disabled) return;
    const num = Number.parseFloat(value) || min;
    const next = Math.min(max, +(num + step).toFixed(precision));
    setValue(next.toFixed(precision));
  };

  const handleDecrement = () => {
    if (disabled) return;
    const num = Number.parseFloat(value) || min;
    const next = Math.max(min, +(num - step).toFixed(precision));
    setValue(next.toFixed(precision));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const val = e.target.value;

    // ✅ Dynamic regex based on precision
    const regex = new RegExp(String.raw`^\d*\.?\d{0,${precision}}$`);
    if (!regex.test(val)) return;

    if (val === "" || val.endsWith(".")) {
      setValue(val);
      return;
    }

    let num = Number.parseFloat(val);

    if (!Number.isNaN(num)) {
      if (num < min) {
        setValue(min.toFixed(precision));
        return;
      }
      if (num > max) {
        setValue(max.toFixed(precision));
        return;
      }
    }

    setValue(val);
  };

  const handleBlur = () => {
    if (disabled) return;
    let num = Number.parseFloat(value);

    if (Number.isNaN(num)) {
      setValue(defaultValue);
      return;
    }

    num = Math.min(max, Math.max(min, num));
    setValue(num.toFixed(precision));
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3">
        <Text
          variant="caption"
          className="text-text-primary! font-InterMedium! my-3 whitespace-nowrap"
        >
          {label}
        </Text>
        {showTooltip && (
          <span className="relative group">
            <Tooltip
              message={toolTipMessage || ""}
              position="right"
              className="absolute"
            />
            <Icon
              name="questionCircle"
              className="text-text-placeholder! size-4"
            />
          </span>
        )}
      </div>

      <div
        className={`flex items-center gap-2 ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <button
          onClick={handleDecrement}
          disabled={disabled || Number.parseFloat(value || "0") <= min}
          className={`w-10 h-10 cursor-pointer border flex items-center justify-center border-border rounded-sm ${
            disabled || Number.parseFloat(value || "0") <= min
              ? "opacity-40 cursor-not-allowed"
              : ""
          }`}
        >
          <Icon name="minus" size={12} />
        </button>

        <input
          type="text"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          readOnly={disabled}
          className={`w-20 px-3 py-2 border border-border rounded-sm text-center outline-none ${disabled ? "bg-bg-card cursor-not-allowed" : ""}`}
        />

        <button
          onClick={handleIncrement}
          disabled={disabled || Number.parseFloat(value || "0") >= max}
          className={`w-10 h-10 cursor-pointer border flex items-center justify-center border-border rounded-sm ${
            disabled || Number.parseFloat(value || "0") >= max
              ? "opacity-40 cursor-not-allowed"
              : ""
          }`}
        >
          <Icon name="plus" size={12} />
        </button>
      </div>
    </div>
  );
}
