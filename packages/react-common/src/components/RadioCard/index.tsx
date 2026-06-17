import React from "react";
import { cn } from "../../utils";
import { Radio, Text } from "../../ui-kit";

type RadioCardProps = {
  label: string;
  subLabel?: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
  className?: string;
};

export const RadioCard: React.FC<RadioCardProps> = ({
  label,
  subLabel,
  checked,
  onChange,
  disabled = false,
  className,
}) => {
  const handleClick = () => {
    if (!disabled) {
      onChange(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "w-full bg-white! flex items-start gap-2.5 rounded-md border px-4 py-3 text-left transition cursor-pointer",
        checked ? "border-primary-tint-1" : "border-border bg-transparent",
        disabled && "cursor-not-allowed",
        className,
      )}
    >
        <Radio
          checked={checked}
          onCheckedChange={onChange}
          disabled={disabled}
          className="shrink-0 mt-1!"
        />

      <div className="flex flex-col gap-0.5">
        <Text
          variant="caption2"
          className="text-text-primary! font-InterSemiBold!"
        >
          {label}
        </Text>
        {subLabel && (
          <Text variant="small" className="text-text-secondary! leading-tight">
            {subLabel}
          </Text>
        )}
      </div>
    </button>
  );
};
