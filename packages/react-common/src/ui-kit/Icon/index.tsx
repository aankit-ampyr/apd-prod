import React from "react";
import { Icons } from "../../assets/icons";
import type { IconTypes } from "../../interface";
import { cn } from "../../utils/common.utils";
export type { IconTypes };

/**
 * ===============================================================
 * Icon component
 * ===============================================================
 * Icon component props
 * @param name - The name of the icon
 * @param size - The size of the icon
 * @param strokeWidth - The stroke width of the icon
 * @param className - The class name of the icon
 */
interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconTypes;
  size?: number;
  strokeWidth?: number;
}

export const Icon: React.FC<IconProps> = ({
  name,
  size = 16,
  strokeWidth = 2,
  className,
  ...props
}) => {
  const SvgIcon = Icons[name];

  return (
    <SvgIcon
      width={size}
      height={size}
      strokeWidth={strokeWidth}
      className={cn("shrink-0", className)}
      {...props}
    />
  );
};

/**
 * ===============================================================
 * Icon Button component
 * ===============================================================
 * Icon Button component props
 * @param name - The name of the icon
 * @param size - The size of the icon
 * @param strokeWidth - The stroke width of the icon
 * @param className - The class name of the icon
 */
/**
 * ===============================================================
 * Icon Button (hover menu button)
 * ===============================================================
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  name: IconTypes;
  size?: number;
  strokeWidth?: number;
  color?: string;
  iconClassName?: string
}

export const IconButton: React.FC<IconButtonProps> = ({
  name,
  size = 16,
  strokeWidth = 2,
  color,
  className,
  iconClassName,
  ...props
}) => {
  return (
    <button
      style={{
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        if (color)
          (e.currentTarget as HTMLElement).style.backgroundColor =
            `var(--color-${color})`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
      className={cn(
        "group inline-flex items-center justify-center rounded-sm transition-colors cursor-pointer p-1",
        className,
      )}
      {...props}
    >
      <Icon
        name={name}
        size={size}
        strokeWidth={strokeWidth}
        className={cn(`text-${color} group-hover:text-white!`, iconClassName)}
      />
    </button>
  );
};
