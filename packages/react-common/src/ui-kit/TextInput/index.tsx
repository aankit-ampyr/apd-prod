import React from "react";
import { cn } from "../../utils";
import { InputWrapper } from "../InputWrapper";
import { Icon, type IconTypes } from "../Icon";
import { Text } from "../Text";
import { tv } from "tailwind-variants";
import { Tooltip } from "../Tooltip";

const textInputStyles = tv({
  slots: {
    root: "flex flex-col gap-1",
    label: "",
    input:
      "w-full bg-transparent outline-none placeholder:text-text-placeholder disabled:cursor-not-allowed font-InterRegular text-caption",
    leftIcon: "size-4 text-text-placeholder",
    rightIcon: "size-4 text-text-placeholder",
  },
  variants: {
    state: {
      default: {},
      focus: {},
      error: {
        rightIcon: "text-error",
      },
      disabled: {},
    },
  },
});

/**
 * ===============================================================
 * Text Input component
 * ===============================================================
 * TextInput component props
 * @param label - The label of the input
 * @param placeholder - The placeholder of the input
 * @param value - The value of the input
 * @param onChange - The onChange event of the input
 * @param disabled - Whether the input is disabled
 * @param error - The error message of the input
 * @param helperText - The helper text of the input
 * @param leftIcon - The left icon of the input
 * @param rightIcon - The right icon of the input
 * @param className - The class name of the input
 * @param inputClassName - The class name of the input's input
 * @param touched - Whether the input is touched
 * @param onFocus - The onFocus event of the input
 * @param onBlur - The onBlur event of the input
 * @param required - add displays red aestrisk (*) after the Label
 * @param maxLength - maximum length of the input field
 * @param minLength - minimul length of the input field
 * @param preventLeadingSpace - prevents space to be added before the content
 * @param preventTrailingSpace - prevents space to be added after the content
 * @param isFilter - whether ths input is used as a filter or not
 */
interface TextInputProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  leftIcon?: IconTypes;
  rightIcon?: IconTypes;
  className?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  readOnlyClassName?: string;
  touched?: boolean;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  preventLeadingSpace?: boolean;
  preventTrailingSpace?: boolean;
  isFilter?: boolean;
  labelClassName?: string;
  allowedRegex?: RegExp;
  integer?: boolean;
  showStepper?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
  min?: number;
  max?: number;
  allowFloat?: boolean;
  info?: boolean;
  infoMessage?: string;
  readonly?: boolean;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export const TextInput: React.FC<TextInputProps> = (props) => {
  const {
    label,
    placeholder,
    value = "",
    onChange,
    disabled = false,
    error = "",
    helperText,
    leftIcon,
    rightIcon,
    className,
    inputClassName,
    wrapperClassName,
    readOnlyClassName,
    onFocus,
    maxLength = 50,
    minLength = 2,
    onBlur,
    touched = false,
    required,
    preventLeadingSpace = false,
    preventTrailingSpace = false,
    isFilter = false,
    labelClassName,
    allowedRegex,
    info,
    readonly=false,
    infoMessage,
    integer = false,
    showStepper = false,
    onIncrement,
    onDecrement,
    min,
    max,
    allowFloat = false,
    decrementDisabled = false,
    incrementDisabled = false,
    autoFocus,
    onKeyDown,
  } = props;

  const [isFocused, setIsFocused] = React.useState(false);
  const hasError = Boolean(error && touched && !disabled);

  const currentState = disabled ? "disabled" : hasError ? "error" : "default";
  const {
    root,
    input,
    leftIcon: leftIconStyle,
    rightIcon: rightIconStyle,
  } = textInputStyles({
    state: currentState,
  });

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    let text = e.target.value;

    // allow empty input
    if (text === "") {
      onChange?.("");
      return;
    }
    // INTEGER MODE
    if (integer) {
      text = text.replace(/[^0-9]/g, "");
      // Allow any value - validation will handle range errors
    }

    // FLOAT MODE
    else if (allowFloat) {
      text = text.replace(/[^0-9.]/g, "");

      // prevent multiple dots
      const parts = text.split(".");
      if (parts.length > 2) {
        text = parts[0] + "." + parts.slice(1).join("");
      }

      // Allow any value - validation will handle range errors
    }

    if (preventLeadingSpace) {
      // Prevent leading spaces and collapse multiple spaces
      text = text.replace(/^\s+/, "");
    }
    if (preventTrailingSpace) {
      text = text.replace(/\s{2,}/g, " ");
    }
    // Apply allowed regex: keep only valid characters
    if (allowedRegex) {
      text = text
        .split("")
        .filter((char) => allowedRegex.test(char))
        .join("");
    }
    onChange?.(text);
  }

  return (
    <div
      className={cn(root(), className)}
      style={placeholder ? { minWidth: `${placeholder?.length - 3}ch` } : {}}
    >
      {label ? (
        <Text
          variant="caption"
          className={cn(
            labelClassName,
            info && "inline-flex items-center gap-1",
          )}
        >
          {label} {required && <span className="text-error">*</span>}{" "}
          {info && (
            <span className="relative group">
              <Tooltip
                message={infoMessage ?? ""}
                textClassName="font-InterRegular!"
                position="bottom"
              />{" "}
              <Icon name="infoCircle" className="text-text-secondary! size-4" />
            </span>
          )}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={readonly ? "default" : currentState}
        focus={isFocused}
        className={cn(
          "flex items-center gap-2 px-2 py-2",
          readonly ? cn("bg-bg-card/50 border-0!", readOnlyClassName) : '',
          wrapperClassName,
        )}
      >
        {leftIcon ? <Icon name={leftIcon} className={leftIconStyle()} /> : null}

        <div className="flex w-full items-center">
          {readonly ? (
            <Text variant="caption" className="text-text-primary! w-full">
              {value}
            </Text>
          ) : (
            <input
              value={value}
              placeholder={placeholder}
              disabled={disabled}
              onChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              minLength={minLength}
              maxLength={maxLength}
              min={min}
              max={max}
              className={cn(input(), inputClassName, "w-full")}
              autoFocus={autoFocus}
              onKeyDown={onKeyDown}
            />
          )}
          {/* Stepper buttons */}
          {showStepper && (integer || allowFloat) && (
            <div className="flex items-center h-full ml-2 border-l border-gray-300">
              <button
                type="button"
                onClick={onDecrement}
                disabled={decrementDisabled}
                className="px-3 border-r cursor-pointer border-gray-300 h-full flex items-center justify-center text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                −
              </button>

              <button
                type="button"
                onClick={onIncrement}
                disabled={incrementDisabled}
                className="px-3 h-full cursor-pointer flex items-center justify-center text-lg text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                +
              </button>
            </div>
          )}
        </div>
        {hasError ? (
          <Icon
            name="infoCircle"
            className={cn(rightIconStyle(), "text-error")}
          />
        ) : rightIcon ? (
          <Icon name={rightIcon} className={rightIconStyle()} />
        ) : null}
      </InputWrapper>

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

/**
 * ===============================================================
 * Text Area component
 * ===============================================================
 * TextArea component props
 * @param label - The label of the textarea
 * @param placeholder - The placeholder of the textarea
 * @param value - The value of the textarea
 * @param onChange - The onChange event of the textarea
 * @param disabled - Whether the textarea is disabled
 * @param error - The error message of the textarea
 * @param helperText - The helper text of the textarea
 * @param className - The class name of the textarea
 * @param inputClassName - The class name of the textarea's textarea
 * @param touched - Whether the textarea is touched
 * @param onFocus - The onFocus event of the textarea
 * @param onBlur - The onBlur event of the textarea
 * @param required - add displays red aestrisk (*) after the Label
 * @param maxLength - maximum length of the input field
 * @param minLength - minimul length of the input field
 * @param preventLeadingSpace - prevents space to be added before the content
 * @param preventTrailingSpace - prevents space to be added after the content
 * @param isFilter - whether ths input is used as a filter or not
 */

interface TextAreaProps extends Omit<
  TextInputProps,
  "onFocus" | "onBlur" | "multiline" | "rightIcon" | "leftIcon"
> {
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  allowedRegex?: RegExp;
}

export const TextArea: React.FC<TextAreaProps> = (props) => {
  const {
    label,
    placeholder,
    value = "",
    onChange,
    disabled = false,
    error = "",
    helperText,
    className,
    inputClassName,
    onFocus,
    onBlur,
    touched = false,
    wrapperClassName,
    required,
    preventLeadingSpace = false,
    preventTrailingSpace = false,
    isFilter = false,
    allowedRegex,
  } = props;

  const [isFocused, setIsFocused] = React.useState(false);
  const hasError = Boolean(error && touched && !disabled);

  const currentState = disabled ? "disabled" : hasError ? "error" : "default";
  const { root, input } = textInputStyles({
    state: currentState,
  });

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    let text = e.target.value;
    if (preventLeadingSpace) {
      // Prevent leading spaces and collapse multiple spaces
      text = text.replace(/^\s+/, "");
    }
    if (preventTrailingSpace) {
      text = text.replace(/\s{2,}/g, " ");
    }
    // Apply allowed regex: keep only valid characters
    if (allowedRegex && !allowedRegex.test(text)) {
      return; // ignore invalid input
    }
    onChange?.(text);
  }

  return (
    <div className={cn(root(), className)}>
      {label ? (
        <Text variant="caption">
          {label} {required && <span className="text-error">*</span>}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused}
        className={cn("flex items-center gap-2 px-2 py-2", wrapperClassName)}
      >
        <textarea
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn("resize-none h-32", input(), inputClassName)}
        />
      </InputWrapper>

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
