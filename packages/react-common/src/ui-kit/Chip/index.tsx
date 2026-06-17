import { cn } from "../../utils";
import { Icon } from "../Icon";
import { Text, type TextVariantType } from "../Text";

interface ChipProp {
  value?: string;
  className?: string;
  textClassName?: string;
  textVariant?: TextVariantType;
  removable?: boolean;
  onRemove?: (value?: any) => void;
}
export function Chip(props: ChipProp) {
  const {
    className,
    value,
    textClassName,
    textVariant = "small",
    onRemove,
    removable,
  } = props;
  return (
    <div className={cn("flex items-center gap-1 bg-primary-tint-2 px-2 py-1 rounded-full text-sm", className)}>
      <Text variant={textVariant} className={cn("text-text-primary", textClassName)}>{value}</Text>
      {removable && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.(value);
          }}
          className="cursor-pointer"
        >
          <Icon name="cross" className="size-2" />
        </span>
      )}
    </div>
  );
}
