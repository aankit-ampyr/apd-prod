import type { SelectInputItem } from "../../interface";
import { cn } from "../../utils";
import React, { useRef, type Ref } from "react";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { Tooltip } from "../Tooltip";
import { useIsTruncated } from "../../hooks";

interface DropdownProps {
  options: SelectInputItem[];
  dropdownItemClassName?: string;
  value: SelectInputItem | null;
  onSelect: (value: SelectInputItem) => void;
  className?: string;
  ref?: Ref<HTMLDivElement>;
  style?: React.CSSProperties;
  itemRenderer?: (
    option: SelectInputItem,
    isSelected: boolean,
  ) => React.ReactNode;
}
const Dropdown: React.FC<DropdownProps> = (props) => {
  const {
    options,
    dropdownItemClassName,
    value,
    onSelect,
    className,
    ref,
    style,
  } = props;
  return (
    <div
      style={style}
      ref={ref}
      className={cn(
        "max-h-52 overflow-auto rounded-sm border border-border bg-white shadow-sm",
        className,
      )}
    >
      {options?.map((option) => {
        const isSelected = value?.id === option.id;
        return (
          <DropdownItem
            key={option.id}
            render={props.itemRenderer}
            isSelected={isSelected}
            option={option}
            onSelect={onSelect}
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
  render?: (option: SelectInputItem, isSelected: boolean) => React.ReactNode;
}

const DropdownItem: React.FC<DropdownItemProps> = (props) => {
  const { option, isSelected, itemClassName, onSelect, render } = props;

  return (
    <button
      key={option.id}
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => onSelect(option)}
      className={cn(
        "w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-primary-tint-1/10",
        isSelected && "bg-primary-tint-1/10",
        itemClassName,
      )}
    >
      {render ? (
        render(option, isSelected)
      ) : (
        <TruncatedDropdownLabel label={option.label} isSelected={isSelected} />
      )}
      {isSelected ? <Icon name="tick" className="size-4 text-primary" /> : null}
    </button>
  );
};

function TruncatedDropdownLabel({
  label,
  isSelected,
}: {
  label: string;
  isSelected: boolean;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const isTruncated = useIsTruncated(textRef);

  return (
    <div className="relative flex-1 min-w-0">
      <Text
        ref={textRef}
        variant="caption"
        className={cn(
          "block truncate",
          isSelected
            ? "font-InterMedium! text-text-primary"
            : "text-text-primary font-InterRegular!",
        )}
      >
        {label}
      </Text>

      {isTruncated ? <Tooltip message={label} position="top" portal /> : null}
    </div>
  );
}

export default Dropdown;
