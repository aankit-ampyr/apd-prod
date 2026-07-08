import type { SelectInputItem } from "../../interface";
import { cn } from "../../utils";
import React, { type Ref } from "react";
import { Text } from "../Text";
import { Checkbox } from "../Checkbox";

interface MultiSelectDropDownProps {
  options: SelectInputItem[];
  dropdownItemClassName?: string;
  values: SelectInputItem["id"][];
  onSelect: (value: SelectInputItem[]) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  lockedValues?: SelectInputItem["id"][];
  showSelectAll?: boolean;
  includeGhost?: boolean;
  itemRenderer?: (option: SelectInputItem, isSelected: boolean) => React.ReactNode;
}
const MultiSelectDropDown: React.FC<MultiSelectDropDownProps> = (props) => {
  const {
    options,
    includeGhost,
    dropdownItemClassName,
    values = [],
    onSelect,
    lockedValues = [],
    className,
    ref,
    style,
    showSelectAll = false,
    itemRenderer,
  } = props;

  const selectedValues = (() => {
    if (!values || !Array.isArray(values) || values.length === 0) {
      return [];
    }
    return options.filter((option) => values.includes(option.id));
  })();

  // Get selectable options (excluding locked)
  const selectableOptions = options?.filter((o) => !lockedValues?.includes(o?.id));
  const allSelected =
    selectableOptions?.length > 0 &&
    selectableOptions?.every((o) => values?.includes(o?.id));

  function handleSelectAll() {
    if (allSelected) {
      // Deselect all (keep locked values)
      const lockedItems = options?.filter((o) => lockedValues?.includes(o?.id));
      onSelect(lockedItems);
    } else {
      // Select all
      onSelect(options);
    }
  }

  function handleSelect(option: SelectInputItem) {
    const currentValues = values || [];
    let newSelectedItems: SelectInputItem[];
    if (lockedValues.includes(option.id)) {
      return;
    }

    if (currentValues.includes(option.id)) {
      // Remove if already selected
      newSelectedItems = selectedValues.filter((item) => item.id !== option.id);
    } else {
      // Add if not selected
      newSelectedItems = [...selectedValues, option];
    }

    onSelect?.(newSelectedItems);
  }

  return (
    <div
      style={style}
      ref={ref}
      className={cn(
        "max-h-52 overflow-auto rounded-sm border border-border bg-white shadow-sm",
        className,
      )}
    >
      {/* Select All */}
      {showSelectAll && (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSelectAll}
          className={cn(
            "w-full px-3 py-2 flex items-center gap-2 text-left border-b hover:bg-primary-tint-1/10 border-border",
            dropdownItemClassName,
          )}
        >
          <Checkbox checked={allSelected} onCheckedChange={() => {}} />
          <Text variant="caption" className="font-InterMedium!">
            Select All ({selectableOptions.length})
          </Text>
        </div>
      )}
      {options?.map((option) => {
        const isSelected = values?.includes(option?.id);
        if (itemRenderer) {
          return (
            <div
              key={option.id}
              role="button"
              tabIndex={0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelect(option)}
              className={cn(
                "w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-primary-tint-1/10",
                dropdownItemClassName,
              )}
            >
              {itemRenderer(option, isSelected)}
            </div>
          );
        }

        return (
          <MultiSelectDropdownItem
            key={option.id}
            isSelected={isSelected}
            option={option}
            onSelect={handleSelect}
            itemClassName={dropdownItemClassName}
          />
        );
      })}
    </div>
  );
};

interface DropdownItemProps {
  option: SelectInputItem;
  isSelected: boolean;
  itemClassName?: string;
  onSelect: (item: SelectInputItem) => void;
}

const MultiSelectDropdownItem: React.FC<DropdownItemProps> = (props) => {
  const { option, isSelected, itemClassName, onSelect } = props;
  return (
    <div
      key={option.id}
      role="button"
      tabIndex={0}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option)}
      className={cn(
        "w-full px-3 py-2 flex items-start gap-2 text-left hover:bg-primary-tint-1/10",
        itemClassName,
      )}
    >
      <Checkbox checked={isSelected} onCheckedChange={() => {}} className="mt-1" />
      <div>
        <Text
          variant="caption"
          className={cn(
            "truncate",
            isSelected
              ? "font-InterMedium! text-text-primary"
              : "text-text-primary font-InterRegular!",
          )}
        >
          {option.label}
        </Text>
        <Text
          variant="small"
          className={cn(
            "truncate text-text-secondary!",
            isSelected
              ? "font-InterMedium! "
              : "font-InterRegular!",
          )}
        >
          {option?.subLabel}
        </Text>
      </div>
    </div>
  );
};

export default MultiSelectDropDown;
