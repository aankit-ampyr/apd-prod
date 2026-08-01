import React, {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
  type HTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { type SelectInputItem } from "../../interface";
import { cn } from "../../utils";
import { InputWrapper } from "../InputWrapper";
import { Icon, type IconTypes } from "../Icon";
import { Text, type TextVariantType } from "../Text";
import Dropdown from "./Dropdown";
import MultiSelectDropDown from "./MultiSelectDropDown";
import { usePortalPopup, useClickOutside } from "../../hooks";
import { Checkbox } from "../Checkbox";
import { Chip } from "../Chip";
import { Tooltip } from "../Tooltip";

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

interface SelectInputProps extends Omit<
  HTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  value?: SelectInputItem["id"] | null;
  label?: string;
  dropdownItemRenderer?: (
    option: SelectInputItem,
    isSelected: boolean,
  ) => React.ReactNode;
  placeholder?: string;
  options: SelectInputItem[];
  onChange?: (item: SelectInputItem) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  touched?: boolean;
  className?: string;
  wrapperClassName?: string;
  itemClassName?: string;
  buttonClassName?: string;
  leftIcon?: IconTypes;
  iconClassName?: string;
  textClassName?: string;
  dropdownClassName?: string;
  usePortal?: boolean;
  required?: boolean;
  portalRef?: any;
  isFilter?: boolean;
  readonly?: boolean;
  hideDropdown?: boolean;
  labelClassName?: string;
  info?: boolean;
  infoMessage?: string;
  valueLabelFormatter?: (item: SelectInputItem) => string;
  selectedDisplayLabel?: string;
}

export const SelectInput: React.FC<SelectInputProps> = (props) => {
  const {
    value = null,
    label,
    placeholder,
    options,
    onChange,
    disabled = false,
    error = "",
    helperText,
    touched = false,
    className,
    wrapperClassName,
    onBlur,
    onFocus,
    itemClassName,
    leftIcon,
    iconClassName,
    textClassName,
    dropdownClassName,
    usePortal = false,
    required,
    portalRef,
    buttonClassName,
    isFilter,
    hideDropdown = false,
    readonly,
    labelClassName,
    dropdownItemRenderer,
    valueLabelFormatter = (v) => v.label,
    selectedDisplayLabel,
  } = props;
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect: dropdownRect,
    style,
  } = usePortalPopup({
    isOpen,
    usePortal,
  });
  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalDropdownRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setIsOpen(false);
    setIsFocused(false);
  });

  const hasError = Boolean(error && touched && !disabled);
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  const selectedOption = useMemo(
    () => options?.find((option) => option.id === value) ?? null,
    [options, value],
  );
  const displayLabel = selectedOption
    ? valueLabelFormatter(selectedOption)
    : selectedDisplayLabel;
  const hasSelectedValue = Boolean(selectedOption || selectedDisplayLabel);

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
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

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleSelect = (option: SelectInputItem) => {
    onChange?.(option);
    setIsOpen(false);
    setIsFocused(false);
    triggerRef.current?.focus();
  };

  const inlineDropdown =
    !hideDropdown && isOpen && !disabled && !usePortal ? (
      <Dropdown
        className={cn(
          "absolute left-0 right-0 top-[calc(100%)] z-999",
          dropdownClassName,
        )}
        options={options}
        value={selectedOption}
        onSelect={handleSelect}
        dropdownItemClassName={itemClassName}
        itemRenderer={dropdownItemRenderer}
      />
    ) : null;

  const portalDropdown =
    !hideDropdown &&
    isOpen &&
    !disabled &&
    usePortal &&
    dropdownRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <Dropdown
            itemRenderer={dropdownItemRenderer}
            ref={portalDropdownRef}
            className={cn("z-9999", dropdownClassName)}
            style={style}
            options={options}
            value={selectedOption}
            onSelect={handleSelect}
            dropdownItemClassName={itemClassName}
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
        <Text variant="caption" className={labelClassName}>
          {label} {required && <span className="text-error">*</span>}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused || isOpen}
        className={cn(
          "flex items-center gap-2 py-2",
          wrapperClassName,
          readonly ? "bg-bg-card/50 border-0!" : "",
        )}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn(
            "w-full flex items-center gap-2 text-left px-4 outline-none disabled:cursor-not-allowed cursor-pointer",
            buttonClassName,
          )}
        >
          {leftIcon ? (
            <Icon
              name={leftIcon}
              className={cn("size-4 text-text-placeholder", iconClassName)}
            />
          ) : null}

          <Text
            variant="caption"
            className={cn(
              "grow text-start mt-1 truncate",
              hasSelectedValue
                ? "text-text-primary!"
                : "text-text-placeholder!",
              disabled && "text-disabled",
              textClassName,
            )}
          >
            {displayLabel ?? placeholder}
          </Text>

          {!hideDropdown && (
            <Icon
              name={isOpen ? "cheveron-up" : "cheveron-down"}
              className={cn(
                "size-3 text-text-placeholder",
                iconClassName,
                disabled && "text-disabled",
              )}
            />
          )}
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

/**
 * ===============================================================
 * MultiSelect Input component
 * ===============================================================
 * MultiSelectInput component props
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

interface MultiSelectInputProps extends Omit<
  SelectInputProps,
  "value" | "onChange"
> {
  values: SelectInputItem["id"][] | null;
  onChange?: (items: SelectInputItem[]) => void;
  lockedValues?: SelectInputItem["id"][];
  selectedValueDisplay?: (items: SelectInputItem[]) => string | React.ReactNode;
  showSelectAll?: boolean;
  showChipsInInput?: boolean;
  placeholderClassName?: string;
  isIcon?: boolean;
  iconName?: IconTypes;
  showCountChip?: boolean;
  countChipLabel?: (items: SelectInputItem[]) => string;
  showPlaceholder?: boolean;
  showChipsAfterSelect?: boolean;
  countChipClassName?: string;
  maxVisibleChips?: number;
  overflowChipLabel?: (hiddenCount: number) => string;
  renderOverflowIndicatorAsChip?: boolean;
  overflowIndicatorClassName?: string;
  inlineChipClassName?: string;
  inlineChipTextClassName?: string;
  inlineChipTextVariant?: TextVariantType;
}

export const MultiSelectInput: React.FC<MultiSelectInputProps> = (props) => {
  const {
    values = null,
    label,
    placeholder,
    options,
    onChange,
    disabled = false,
    error = "",
    helperText,
    touched = false,
    className,
    wrapperClassName,
    onBlur,
    onFocus,
    itemClassName,
    leftIcon,
    iconClassName,
    textClassName,
    labelClassName,
    dropdownClassName,
    usePortal = false,
    required,
    portalRef,
    isFilter,
    lockedValues = [],
    selectedValueDisplay,
    showSelectAll = false,
    hideDropdown,
    showChipsInInput = false,
    placeholderClassName,
    isIcon = false,
    iconName,
    showCountChip = false,
    countChipLabel,
    showPlaceholder = false,
    showChipsAfterSelect = false,
    countChipClassName,
    maxVisibleChips,
    overflowChipLabel,
    renderOverflowIndicatorAsChip = true,
    overflowIndicatorClassName,
    inlineChipClassName,
    inlineChipTextClassName,
    inlineChipTextVariant,
    info,
    infoMessage,
    dropdownItemRenderer,
  } = props;

  const [isFocused, setIsFocused] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect: dropdownRect,
    style,
  } = usePortalPopup({
    isOpen,
    usePortal,
  });
  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalDropdownRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setIsOpen(false);
    setIsFocused(false);
  });

  const hasError = Boolean(error && touched && !disabled);
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  const selectedValues = (() => {
    if (!values || !Array.isArray(values) || values.length === 0) {
      return [];
    }
    return options.filter((option) => values.includes(option.id));
  })();

  const selectedItems = useMemo(
    () => options.filter((o) => values?.includes(o.id)),
    [values, options],
  );
  const visibleSelectedItems =
    typeof maxVisibleChips === "number" && maxVisibleChips >= 0
      ? selectedItems.slice(0, maxVisibleChips)
      : selectedItems;
  const hiddenChipCount =
    typeof maxVisibleChips === "number" && maxVisibleChips >= 0
      ? Math.max(selectedItems.length - visibleSelectedItems.length, 0)
      : 0;

  const removeChip = (id: SelectInputItem["id"]) => {
    const updated = selectedItems.filter((i) => i.id !== id);
    onChange?.(updated);
  };

  const textContent = (() => {
    if (selectedValueDisplay) {
      return selectedValueDisplay?.(selectedValues);
    }
    if (selectedValues.length === 0) {
      return "";
    }
    if (selectedValues.length === 1) {
      return selectedValues[0].label;
    }
    return `${selectedValues.length} selected`;
  })();

  const countLabel = (() => {
    if (countChipLabel) {
      return countChipLabel(selectedValues);
    }

    if (selectedValues.length === 0) return "";

    if (selectedValues.length === 1) {
      return selectedValues[0].label;
    }

    return `${selectedValues.length} selected`;
  })();

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
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

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleSelect = (options: SelectInputItem[]) => {
    onChange?.(options);
  };

  const inlineDropdown =
    !hideDropdown && isOpen && !disabled && !usePortal ? (
      <MultiSelectDropDown
        showSelectAll={showSelectAll}
        lockedValues={lockedValues}
        className={cn(
          "absolute left-0 right-0 top-[calc(100%)] z-999",
          dropdownClassName,
        )}
        options={options}
        values={values!}
        onSelect={handleSelect}
        dropdownItemClassName={itemClassName}
        itemRenderer={dropdownItemRenderer}
      />
    ) : null;

  const portalDropdown =
    !hideDropdown &&
    isOpen &&
    !disabled &&
    usePortal &&
    dropdownRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <MultiSelectDropDown
            showSelectAll={showSelectAll}
            ref={portalDropdownRef}
            className={cn("z-9999", dropdownClassName)}
            style={style}
            lockedValues={lockedValues}
            options={options}
            values={values!}
            onSelect={handleSelect}
            dropdownItemClassName={itemClassName}
            itemRenderer={dropdownItemRenderer}
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
        <Text
          variant="caption"
          className={cn(
            labelClassName,
            info && "inline-flex items-center gap-1",
          )}
        >
          {label} {required && <span className="text-error">*</span>}
          {info && (
            <span className="relative group">
              <Tooltip
                message={infoMessage ?? ""}
                textClassName="font-InterRegular!"
                position="top"
                portal
              />{" "}
              <Icon
                name="circle-info-2"
                className="text-text-secondary! size-4"
              />
            </span>
          )}
        </Text>
      ) : null}

      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused || isOpen}
        className={cn(
          "flex min-h-11 items-center gap-2 px-4 min-w-0",
          wrapperClassName,
        )}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="flex flex-1 min-w-0 items-center gap-2 text-left outline-none disabled:cursor-not-allowed cursor-pointer"
        >
          {isIcon && iconName ? (
            <Icon
              name={iconName}
              className={cn("size-4 text-text-placeholder", iconClassName)}
            />
          ) : leftIcon ? (
            <Icon
              name={leftIcon}
              className={cn("size-4 text-text-placeholder", iconClassName)}
            />
          ) : null}

          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {showChipsInInput && selectedItems?.length > 0 && (
              <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                {visibleSelectedItems.map((item) => (
                  <Chip
                    key={item.id}
                    value={item.label}
                    textVariant={inlineChipTextVariant}
                    removable
                    onRemove={() => removeChip(item.id)}
                    className={cn(
                      "shrink-0 whitespace-nowrap",
                      inlineChipClassName,
                    )}
                    textClassName={inlineChipTextClassName}
                  />
                ))}
                {hiddenChipCount > 0 &&
                  (renderOverflowIndicatorAsChip ? (
                    <Chip
                      value={
                        overflowChipLabel?.(hiddenChipCount) ??
                        `+${hiddenChipCount}`
                      }
                      textVariant={inlineChipTextVariant}
                      className={cn(
                        "shrink-0 whitespace-nowrap",
                        inlineChipClassName,
                      )}
                      textClassName={inlineChipTextClassName}
                    />
                  ) : (
                    <Text
                      variant="caption"
                      className={cn(
                        "text-text-secondary! mt-1 shrink-0 self-end whitespace-nowrap px-1 text-[18px]! leading-[12px]!",
                        overflowIndicatorClassName,
                      )}
                    >
                      {overflowChipLabel?.(hiddenChipCount) ??
                        `+${hiddenChipCount}`}
                    </Text>
                  ))}
              </div>
            )}

            {/* Placeholder */}
            {placeholder &&
              (showPlaceholder || selectedValues.length === 0) &&
              (!showChipsInInput || selectedItems.length === 0) && (
                <Text
                  variant="caption"
                  className={cn(
                    "min-w-0 truncate text-text-placeholder whitespace-nowrap",
                    placeholderClassName,
                  )}
                >
                  {placeholder}
                </Text>
              )}

            {/* Count Chip */}
            {showCountChip && selectedValues.length > 0 && (
              <div
                className={cn(
                  "px-3 py-1 rounded-full text-sm whitespace-nowrap",
                  countChipClassName,
                )}
              >
                {countLabel}
              </div>
            )}

            {/* Default Text (only when chip not used) */}
            {!showCountChip &&
              !showChipsInInput &&
              selectedValues.length > 0 &&
              (typeof textContent === "string" ? (
                <Text variant="caption" className="text-text-primary truncate">
                  {textContent}
                </Text>
              ) : (
                textContent
              ))}
          </div>

          {!hideDropdown && (
            <Icon
              name={isOpen ? "cheveron-up" : "cheveron-down"}
              className={cn(
                "size-3 shrink-0 text-text-placeholder",
                iconClassName,
                disabled && "text-disabled",
              )}
            />
          )}
        </button>
      </InputWrapper>
      {showChipsAfterSelect && !isOpen && selectedItems.length > 0 && (
        <div className="flex flex-wrap gap-2 boder-t-0 border border-border rounded-b-sm p-2 -mt-1.25">
          {selectedItems.map((item) => (
            <Chip
              key={item.id}
              value={item.label}
              removable
              onRemove={() => removeChip(item.id)}
            />
          ))}
        </div>
      )}
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

/**
 * ===============================================================
 * Multi Select Searchable Input component
 * ===============================================================
 * Multi Select Searchable Input component props
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
interface MultiSelectSearchableInputProps extends MultiSelectInputProps {
  internalSearch?: boolean;
  searchKey?: string;
  onSearch?: (search: string) => void;
  rightIconClassName?: string;
}

export const SearchableMultiSelectInput: React.FC<
  MultiSelectSearchableInputProps
> = ({
  values = null,
  label,
  placeholder,
  options,
  onChange,
  disabled = false,
  error = "",
  helperText,
  touched = false,
  className,
  wrapperClassName,
  onBlur,
  onFocus,
  itemClassName,
  dropdownClassName,
  usePortal = false,
  required,
  isFilter,
  portalRef,
  lockedValues = [],
  showSelectAll = true,
  hideDropdown,
  internalSearch = true,
  onSearch,
  searchKey,
  rightIconClassName,
  placeholderClassName,
  showChipsInInput = false,
  showCountChip = false,
  countChipLabel,
  countChipClassName,
  maxVisibleChips,
  overflowChipLabel,
  renderOverflowIndicatorAsChip = true,
  overflowIndicatorClassName,
  inlineChipClassName,
  inlineChipTextClassName,
  inlineChipTextVariant,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(searchKey ?? "");
  const [isFocused, setIsFocused] = useState(false);
  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect: dropdownRect,
    style,
  } = usePortalPopup({ isOpen, usePortal });

  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalDropdownRef.current?.contains(target);
    if (isInsidePortalDropdown) return;

    setIsOpen(false);
    setIsFocused(false);
    if (internalSearch) {
      setSearch("");
    }
  });

  const hasError = Boolean(error && touched && !disabled);
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  // selected items
  const selectedItems = useMemo(
    () => options.filter((o) => values?.includes(o.id)),
    [values, options],
  );
  const visibleSelectedItems =
    typeof maxVisibleChips === "number" && maxVisibleChips >= 0
      ? selectedItems.slice(0, maxVisibleChips)
      : selectedItems;
  const hiddenChipCount =
    typeof maxVisibleChips === "number" && maxVisibleChips >= 0
      ? Math.max(selectedItems.length - visibleSelectedItems.length, 0)
      : 0;
  const countLabel = (() => {
    if (countChipLabel) {
      return countChipLabel(selectedItems);
    }

    if (selectedItems.length === 0) return "";
    if (selectedItems.length === 1) return selectedItems[0].label;
    return `${selectedItems.length} selected`;
  })();
  const hasInlineChips = showChipsInInput && selectedItems.length > 0;
  const hasOverflowIndicator = hiddenChipCount > 0;

  const inputValue = isOpen ? (internalSearch ? search : searchKey || "") : "";
  const hasSearchValue = Boolean(inputValue);
  const showSearchIcon =
    isOpen && !disabled && (!hasInlineChips || hasSearchValue);
  const resolvedPlaceholder = hasInlineChips ? "" : placeholder;

  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (internalSearch) {
      setSearch(value); // update internal state
    } else {
      onSearch?.(value); // external handler
    }
  };

  const filteredOptions = useMemo(() => {
    if (!internalSearch || !search) return options;

    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(search.toLowerCase()) ||
        o?.subLabel?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search, internalSearch]);

  const handleBlur = (e: any) => {
    setTimeout(() => {
      if (!rootRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
      }
    }, 0);
    onBlur?.(e);
  };

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const removeChip = (id: SelectInputItem["id"]) => {
    const updated = selectedItems.filter((i) => i.id !== id);
    onChange?.(updated);
  };

  const handleSelect = (newSelected: SelectInputItem[]) => {
    const filteredOptionIds = new Set(filteredOptions.map((item) => item.id));
    const preservedSelections = selectedItems.filter(
      (item) => !filteredOptionIds.has(item.id),
    );

    onChange?.([...preservedSelections, ...newSelected]);
  };

  useEffect(() => {
    if (!internalSearch) {
      setSearch(searchKey || "");
    }
  }, [searchKey, internalSearch]);

  const inlineDropdown =
    !hideDropdown && isOpen && !disabled && !usePortal ? (
      <MultiSelectDropDown
        showSelectAll={showSelectAll}
        lockedValues={lockedValues}
        className={cn(
          "absolute left-0 right-0 top-[calc(100%)] z-999",
          dropdownClassName,
        )}
        options={filteredOptions}
        values={values!}
        onSelect={handleSelect}
        dropdownItemClassName={itemClassName}
      />
    ) : null;

  const portalDropdown =
    !hideDropdown &&
    isOpen &&
    !disabled &&
    usePortal &&
    dropdownRect &&
    typeof document !== "undefined" &&
    document.body
      ? createPortal(
          <MultiSelectDropDown
            showSelectAll={showSelectAll}
            ref={portalDropdownRef}
            className={cn("z-9999", dropdownClassName)}
            style={style}
            lockedValues={lockedValues}
            options={filteredOptions}
            values={values!}
            onSelect={handleSelect}
            dropdownItemClassName={itemClassName}
          />,
          portalRef?.current ?? document.body,
        )
      : null;

  return (
    <div
      ref={rootRef as any}
      className={cn("flex flex-col gap-1 relative", className)}
    >
      {label && (
        <Text variant="caption">
          {label} {required && <span className="text-error">*</span>}
        </Text>
      )}

      {!showChipsInInput && selectedItems?.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-0.5">
          {selectedItems.map((item) => (
            <Chip
              key={item.id}
              value={item.label}
              removable
              onRemove={() => removeChip(item.id)}
            />
          ))}
        </div>
      )}
      <InputWrapper
        isFilter={isFilter}
        className={cn(
          "flex min-h-[44px] items-center gap-2 px-4 min-w-0",
          wrapperClassName,
        )}
        state={currentState}
        focus={isFocused || isOpen}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-2 overflow-hidden",
            hasInlineChips && !hasSearchValue && hasOverflowIndicator
              ? "w-auto flex-none"
              : "flex-1",
          )}
        >
          {hasInlineChips && (
            <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
              {visibleSelectedItems.map((item) => (
                <Chip
                  key={item.id}
                  value={item.label}
                  textVariant={inlineChipTextVariant}
                  removable
                  onRemove={() => removeChip(item.id)}
                  className={cn(
                    "shrink-0 whitespace-nowrap",
                    inlineChipClassName,
                  )}
                  textClassName={inlineChipTextClassName}
                />
              ))}
              {hiddenChipCount > 0 &&
                (renderOverflowIndicatorAsChip ? (
                  <Chip
                    value={
                      overflowChipLabel?.(hiddenChipCount) ??
                      `+${hiddenChipCount}`
                    }
                    textVariant={inlineChipTextVariant}
                    className={cn(
                      "shrink-0 whitespace-nowrap",
                      inlineChipClassName,
                    )}
                    textClassName={inlineChipTextClassName}
                  />
                ) : (
                  <Text
                    variant="caption"
                    className={cn(
                      "text-text-secondary! mt-1 shrink-0 self-end whitespace-nowrap px-1 text-[18px]! leading-[12px]!",
                      overflowIndicatorClassName,
                    )}
                  >
                    {overflowChipLabel?.(hiddenChipCount) ??
                      `+${hiddenChipCount}`}
                  </Text>
                ))}
            </div>
          )}
          {showSearchIcon && (
            <Icon
              name="search"
              className="size-4 shrink-0 text-text-secondary"
            />
          )}
          <input
            value={inputValue}
            onChange={handleSearchChange}
            ref={triggerRef as any}
            disabled={disabled}
            onClick={handleToggle}
            onFocus={handleFocus}
            spellCheck={false}
            onBlur={handleBlur}
            placeholder={resolvedPlaceholder}
            className={cn(
              "flex-1 basis-6 min-w-0 bg-transparent outline-none placeholder:text-text-placeholder disabled:cursor-not-allowed cursor-pointer font-InterRegular text-caption",
              (!isOpen || (hasInlineChips && !hasSearchValue)) &&
                "caret-transparent",
              hasInlineChips && !hasSearchValue && "basis-0 w-0 flex-none",
              hasInlineChips && !isOpen && "placeholder:text-transparent",
              placeholderClassName,
            )}
          />
          {showCountChip && selectedItems.length > 0 && (
            <div
              className={cn(
                "px-3 py-1 rounded-full text-sm whitespace-nowrap shrink-0",
                countChipClassName,
              )}
            >
              {countLabel}
            </div>
          )}
        </div>
        {!hideDropdown && (
          <Icon
            name={isOpen ? "cheveron-up" : "cheveron-down"}
            onClick={(e) => {
              if (disabled) return;
              e.stopPropagation();
              handleToggle();
            }}
            className={cn(
              "size-3 shrink-0 text-text-secondary! cursor-pointer",
              rightIconClassName,
              disabled && "cursor-not-allowed text-disabled",
            )}
          />
        )}
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

interface SearchableSelectInputProps extends SelectInputProps {
  /**
   * Custom error message to show when search text doesn't match any option.
   * If not provided, no invalid search error will be shown.
   */
  invalidSearchError?: string;
  /**
   * Callback fired when the internal search has no matches while the dropdown is open.
   * Useful for parent components that want to react to “no matches” (e.g., show empty state).
   */
  onInvalidSearchChange?: (invalid: boolean) => void;
  rightIconClassName?: string;
}

export const SearchableSelectInput: React.FC<SearchableSelectInputProps> = ({
  value = null,
  options,
  onChange,
  placeholder,
  label,
  isFilter,
  wrapperClassName,
  onBlur,
  className,
  dropdownClassName,
  usePortal = false,
  disabled = false,
  error = "",
  helperText,
  touched = false,
  invalidSearchError,
  hideDropdown,
  required,
  leftIcon,
  rightIconClassName,
  onInvalidSearchChange,
  dropdownItemRenderer,
  labelClassName,
  readonly,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [hasInvalidSearch, setHasInvalidSearch] = useState(false);

  // Show error if touched with invalid search, or regular error
  const displayError =
    hasInvalidSearch && invalidSearchError ? invalidSearchError : error;
  const hasError = Boolean(
    (displayError && touched && !disabled) ||
    (hasInvalidSearch && invalidSearchError),
  );
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect,
    style,
  } = usePortalPopup({
    isOpen,
    usePortal,
  });

  const selectedOption = useMemo(
    () => options.find((o) => o.id === value) ?? null,
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [options, search]);

  // Check if search is invalid in real-time (has text but no matches)
  useEffect(() => {
    if (isOpen && search) {
      const hasMatches = options.some((o) =>
        o.label.toLowerCase().includes(search.toLowerCase()),
      );
      const invalid = !hasMatches;
      setHasInvalidSearch(invalid);
      onInvalidSearchChange?.(invalid);
    } else {
      setHasInvalidSearch(false);
      onInvalidSearchChange?.(false);
    }
  }, [search, options, isOpen, onInvalidSearchChange]);

  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortalDropdown = portalDropdownRef.current?.contains(target);
    if (isInsidePortalDropdown) return;
    setIsOpen(false);
    setIsFocused(false);
    // Clear search when closing
    setSearch("");
    // Ensure invalid flag resets on close
    onInvalidSearchChange?.(false);
  });

  const handleToggle = () => {
    // Clear search when opening dropdown
    if (!isOpen) {
      setSearch("");
    }
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  const handleSelect = (option: SelectInputItem) => {
    onChange?.(option);
    setIsOpen(false);
    setSearch(""); // reset
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const displayValue = isOpen ? search : selectedOption?.label || "";

  const inlineDropdown =
    isOpen && !disabled && !usePortal ? (
      filteredOptions.length > 0 ? (
        <Dropdown
          itemRenderer={dropdownItemRenderer}
          className={cn(
            "absolute left-0 right-0 top-[calc(100%)] z-999",
            dropdownClassName,
          )}
          options={filteredOptions}
          value={selectedOption}
          onSelect={handleSelect}
        />
      ) : (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%)] z-999 mt-1 rounded-md border border-border bg-white p-3 text-center shadow-lg",
            dropdownClassName,
          )}
        >
          <Text variant="caption" className="text-text-secondary!">
            No results found
          </Text>
        </div>
      )
    ) : null;

  const portalDropdown =
    isOpen && !disabled && usePortal && rect && document?.body
      ? createPortal(
          filteredOptions.length > 0 ? (
            <Dropdown
              ref={portalDropdownRef}
              itemRenderer={dropdownItemRenderer}
              className={cn("z-9999", dropdownClassName)}
              style={style}
              options={filteredOptions}
              value={selectedOption}
              onSelect={handleSelect}
            />
          ) : (
            <div
              ref={portalDropdownRef}
              style={style}
              className={cn(
                "z-9999 rounded-md border border-border bg-white p-3 text-center shadow-lg",
                dropdownClassName,
              )}
            >
              <Text variant="caption" className="text-text-secondary!">
                No results found
              </Text>
            </div>
          ),
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef as any}
      className={cn("flex flex-col gap-1 relative", className)}
    >
      {label && (
        <Text variant="caption" className={labelClassName}>
          {label} {required && <span className="text-error">*</span>}
        </Text>
      )}

      <InputWrapper
        isFilter={isFilter}
        focus={isFocused || isOpen}
        className={cn(
          "flex items-center gap-2 px-4 py-2",
          readonly ? "bg-bg-card/50 border-0!" : "",
          wrapperClassName,
        )}
        state={currentState}
      >
        {!isOpen && leftIcon && <Icon name={leftIcon} className="size-4" />}
        {isOpen && <Icon name="search" className="size-4" />}

        <input
          ref={triggerRef as any}
          value={displayValue}
          onChange={handleSearchChange}
          onBlur={(e) => {
            onBlur?.(e as any);
          }}
          spellCheck={false}
          disabled={disabled}
          onClick={handleToggle}
          onFocus={() => setIsFocused(true)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-transparent outline-none placeholder:text-text-placeholder disabled:cursor-not-allowed cursor-pointer font-InterRegular text-caption",
            !isOpen && "caret-transparent",
          )}
        />

        {!hideDropdown && (
          <Icon
            name={isOpen ? "cheveron-up" : "cheveron-down"}
            onClick={(e) => {
              if (disabled) return;
              e.stopPropagation();
              handleToggle();
            }}
            className={cn(
              "size-3 text-text-secondary! cursor-pointer",
              rightIconClassName,
              disabled && "cursor-not-allowed",
            )}
          />
        )}
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
          {hasError ? displayError : helperText}
        </Text>
      )}
    </div>
  );
};

/**
 * HourlySelectInput Props
 */
interface HourlySelectInputProps extends Omit<
  HTMLAttributes<HTMLButtonElement>,
  "onChange"
> {
  value?: number | null;
  label?: string;
  placeholder?: string;
  onChange?: (value: number) => void;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  touched?: boolean;
  className?: string;
  wrapperClassName?: string;
  dropdownClassName?: string;
  textClassName?: string;
  labelClassName?: string;
  required?: boolean;
  usePortal?: boolean;
  portalRef?: any;
  isFilter?: boolean;
  hideDropdown?: boolean;
}

/**
 * HourlySelectInput Component
 * Valid clock hours 00:00 → 23:00 (hours 0–23 in 24-hour time).
 */
export const HourlySelectInput: React.FC<HourlySelectInputProps> = (props) => {
  const {
    value = null,
    label,
    placeholder = "Select hour",
    onChange,
    disabled = false,
    error = "",
    helperText,
    touched = false,
    className,
    wrapperClassName,
    dropdownClassName,
    textClassName,
    labelClassName,
    required,
    usePortal = false,
    portalRef,
    isFilter,
    hideDropdown = false,
  } = props;

  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const {
    triggerRef,
    portalRef: portalDropdownRef,
    rect,
    style,
  } = usePortalPopup({
    isOpen,
    usePortal,
  });

  const rootRef = useClickOutside((e) => {
    const target = e.target as Node;
    const isInsidePortal = portalDropdownRef.current?.contains(target);
    if (isInsidePortal) return;

    setIsOpen(false);
    setIsFocused(false);
  });

  const hasError = Boolean(error && touched && !disabled);
  const currentState = disabled ? "disabled" : hasError ? "error" : "default";

  /**
   * Generate hours 00 → 23 (valid 24-hour values only)
   */
  const options = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const label = `${i.toString().padStart(2, "0")}:00`;
      return {
        id: i,
        label,
      };
    });
  }, []);

  /**
   * Selected value
   */
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.id === value) || null;
  }, [options, value]);

  /**
   * Toggle dropdown
   */
  const handleToggle = () => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    setIsFocused(true);
  };

  /**
   * Select hour
   */
  const handleSelect = (option: any) => {
    onChange?.(option.id);
    setIsOpen(false);
    setIsFocused(false);
    triggerRef.current?.focus();
  };

  /**
   * Dropdowns
   */
  const inlineDropdown =
    !hideDropdown && isOpen && !disabled && !usePortal ? (
      <Dropdown
        className={cn(
          "absolute left-0 right-0 top-[calc(100%)] z-999",
          dropdownClassName,
        )}
        options={options}
        value={selectedOption}
        onSelect={handleSelect}
      />
    ) : null;

  const portalDropdown =
    !hideDropdown &&
    isOpen &&
    !disabled &&
    usePortal &&
    rect &&
    typeof document !== "undefined"
      ? createPortal(
          <Dropdown
            ref={portalDropdownRef}
            className={cn("z-9999", dropdownClassName)}
            style={style}
            options={options}
            value={selectedOption}
            onSelect={handleSelect}
          />,
          portalRef?.current ?? document.body,
        )
      : null;

  return (
    <div
      ref={rootRef as any}
      className={cn("flex flex-col gap-1 relative", className)}
    >
      {/* Label */}
      {label && (
        <Text variant="caption" className={labelClassName}>
          {label} {required && <span className="text-error">*</span>}
        </Text>
      )}

      {/* Input */}
      <InputWrapper
        isFilter={isFilter}
        state={currentState}
        focus={isFocused || isOpen}
        className={cn("flex items-center gap-2 py-2", wrapperClassName)}
      >
        <button
          ref={triggerRef as any}
          type="button"
          disabled={disabled}
          onClick={handleToggle}
          className="w-full flex items-center gap-2 text-left px-4 outline-none cursor-pointer disabled:cursor-not-allowed"
        >
          <Text
            variant="caption"
            className={cn(
              "grow text-start truncate",
              selectedOption ? "text-text-primary!" : "text-text-placeholder!",
              disabled && "text-disabled",
              textClassName,
            )}
          >
            {selectedOption?.label || placeholder}
          </Text>

          {!hideDropdown && (
            <Icon
              name={isOpen ? "cheveron-up" : "cheveron-down"}
              className="size-3 text-text-placeholder"
            />
          )}
        </button>
      </InputWrapper>

      {/* Dropdown */}
      {inlineDropdown}
      {portalDropdown}

      {/* Error / Helper */}
      {(helperText || hasError) && (
        <Text
          variant="small"
          className={cn("text-text-secondary!", hasError && "text-error-text!")}
        >
          {hasError ? error : helperText}
        </Text>
      )}
    </div>
  );
};
