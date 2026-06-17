import React, {useEffect, useMemo, useRef, useState} from "react";
import {tv, type VariantProps} from "tailwind-variants";
import { cn } from "../../utils";

const otpInputStyles = tv({
  base: "size-10 border rounded-sm text-center text-text-primary outline-none text-[15px] transition-all",
  variants: {
    state: {
      default: "border-border",
      error: "border-error ring-error-tint-1/10",
    },
    focus: {
      default: "border-primary-tint-1 ring-3 ring-primary-tint-1/10",
      error: "ring-3 ring-error-tint-1/10",
      none: "",
    },
  },
});

interface OtpInputProps {
  value: string;
  length?: number;
  onChange: (value: string) => void;
  error?: string;
  touched?: boolean;
  showError?: boolean;
  inputClassName?: string;
  wrapperClassName?: string;
  className?: string;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  length = 6,
  onChange,
  error,
  touched,
  showError = true,
  inputClassName = "",
  wrapperClassName = "",
  className = "",
  onBlur,
  onFocus,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = useMemo(() => {
    if (!showError) return false;
    if (!error) return false;
    return Boolean(touched);
  }, [error, showError, touched]);

  const focusValue: NonNullable<VariantProps<typeof otpInputStyles>["focus"]> = useMemo(() => {
    if (!isFocused) return "none";
    return hasError ? "error" : "default";
  }, [hasError, isFocused]);

  const stateValue: NonNullable<VariantProps<typeof otpInputStyles>["state"]> = hasError ? "error" : "default";
  const inputBaseClassName = otpInputStyles({state: stateValue, focus: focusValue});

  const handleChange = (index: number, newValue: string) => {
    if (!/^[0-9]?$/.test(newValue)) return;
    const otpArray = value.split("");
    otpArray[index] = newValue;
    const updated = otpArray.join("").slice(0, length);
    onChange(updated);

    if (newValue && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    const digitsOnly = pastedData.replace(/\D/g, "").slice(0, length);

    if (digitsOnly) {
      onChange(digitsOnly);
      // Focus on the last filled input or the last input
      const focusIndex = Math.min(digitsOnly.length, length - 1);
      setTimeout(() => {
        inputsRef.current[focusIndex]?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Shift + Backspace or Ctrl + Backspace to clear all OTP
    if ((e.shiftKey || e.ctrlKey) && e.key === "Backspace") {
      e.preventDefault();
      onChange("");
      inputsRef.current[0]?.focus();
      return;
    }

    // Regular backspace to move to previous input
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div
        className={cn(
          "flex justify-center space-x-2 transition-transform duration-200",
          wrapperClassName,
        )}
      >
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el) as any}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] || ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={cn(
              inputBaseClassName,
              inputClassName,
            )}
          />
        ))}
      </div>
    </div>
  );
};
