import React from "react";
import { cn } from "../../utils";
import { Text } from "../Text";
import { tv, type VariantProps } from "tailwind-variants";
import { Icon, IconTypes } from "../Icon";

const badgeStyles = tv({
  slots: {
    base: "w-fit shrink-0 rounded-pill flex items-center gap-1 h-fit justify-center whitespace-nowrap",
    text: "whitespace-nowrap",
  },
  variants: {
    size: {
      sm: {
        text: "text-[12px]!",
        base: "px-2.5 py-[1px]",
        icon: 'size-2'
      },
      md: {
        text: "text-[14px]!",
        base: "px-2.5 py-0.5",
        icon: 'size-3'
      },
      lg: {
        text: "text-[14px]!",
        base: "px-3 py-1",
        icon: 'size-4'
      },
    },
    color: {
      gray: {
        text: "text-secondary!",
        base: "bg-[#F5F5F5]",
      },
      voilet: {
        text: "text-[#6941C6]!",
        base: "bg-[#F9F5FF]",
      },
      red: {
        text: "text-[#D64545]!",
        base: "bg-[#FEF3F2]",
      },
      mustard: {
        text: "text-warning!",
        base: "bg-warning/5",
      },
      green: {
        text: "text-[#1F8A4C]!",
        base: "bg-[#ECFDF3]",
      },
      navy: {
        text: "text-[#363F72]!",
        base: "bg-[#F8F9FC]",
      },
      darkblue: {
        text: "text-[#026AA2]!",
        base: "bg-[#F0F9FF]",
      },
      blue: {
        text: "text-[#0284C7]!",
        base: "bg-[#EFF8FF]",
      },
      indigo: {
        text: "text-[#3538CD]!",
        base: "bg-[#EEF4FF]",
      },
      magenta: {
        text: "text-[#C11574]!",
        base: "bg-[#FDF2FA]",
      },
      rose: {
        text: "text-[#C01048]!",
        base: "bg-[#FFF1F3]",
      },
      orange: {
        text: "text-[#C4320A]!",
        base: "bg-[#FFF6ED]",
      },
      primary: {
        text: "text-primary!",
        base: "bg-primary-tint-2!",
      },
      blue_gray: {
        text: "text-[#363F72]!",
        base: "bg-[#F9F5FF]",
      },
      light_brown: {
        text: "text-[#B54708]!",
        base: "bg-[#FFFAE0]!",
      },
      brown_gray: {
        text: "text-[#444638]!",
        base: "bg-[#F8FFCF]!",
      }
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export type BadgeVariants = VariantProps<typeof badgeStyles>;

interface BadgeProps {
  message: string | React.ReactNode;
  className?: string;
  textClassName?: string;
  icon?: IconTypes;
  size?: BadgeVariants["size"];
  color?: BadgeVariants["color"];
  textStyle?: React.CSSProperties;
}
export const Badge: React.FC<BadgeProps> = (props) => {
  const { message, icon, size = "md", color = "gray", className, textClassName, textStyle } = props;
  const { base, text } = badgeStyles({ size, color });
  return (
    <span className={cn(base(), className)}>
      {icon && <Icon name={icon} className={cn(text(), "size-3")}/>}
      <Text style={textStyle} className={cn(text(), textClassName)}>{message}</Text>
    </span>
  );
};
