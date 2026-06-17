import React from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { Text, TextVariants } from "../Text";
import { cn } from "../../utils/common.utils";
import { Icon, type IconTypes } from "../Icon";
import { Loader2 } from "lucide-react";

/**
 * Button Variants
 */
const buttonStyles = tv({
  slots: {
    base: "group w-fit flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed rounded-sm border border-transparent bg-transparent disabled:bg-primary-disabled!",
    text: "text-white! text-nowrap",
    icon: "text-white!",
  },
  variants: {
    variant: {
      primary: {
        base: "bg-primary hover:bg-primary-hover active:bg-primary-active",
      },
      secondary: {
        base: "border-primary hover:border-primary-hover disabled:border-primary-disabled! active:border-primary-active! disabled:bg-white!",
        text: "text-primary! group-disabled:text-primary-disabled! group-active:text-primary-active! group-hover:text-primary-hover!",
        icon: "text-primary! group-disabled:text-primary-disabled! group-active:text-primary-active! group-hover:text-primary-hover!",
      },
      tertiary: {
        base: "disabled:bg-transparent! hover:bg-primary-tint-2 active:bg-primary-active!",
        text: "text-primary! group-hover:text-primary-hover! group-active:text-white! group-disabled:text-primary-disabled!",
      },
      rounded: {
        base: "rounded-full! bg-primary hover:bg-primary-hover active:bg-primary-active",
        text: "text-white!",
      },
      destructive: {
        base: "rounded-md! border-[#D64545] bg-white! hover:bg-[#FFF5F5] active:bg-[#FEECEC] disabled:border-[#FCA5A5]! disabled:bg-white!",
        text: "text-[#D64545]! group-disabled:text-[#FCA5A5]!",
        icon: "text-[#D64545]! group-disabled:text-[#FCA5A5]!",
      },
      "tab-primary": {
        base: "bg-secondary rounded-full!",
        text: "text-white!",
      },
      "tab-secondary": {
        base: "bg-transparent border border-border rounded-full!",
        text: "text-text-secondary!",
      },
    },
    size: {
      lg: {
        base: "py-2 px-4 h-12!",
      },
      md: {
        base: "py-1 px-4 h-10!",
      },
      sm: {
        base: "py-[2px] px-4 h-9!",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
});
type ButtonVariants = VariantProps<typeof buttonStyles>;

const btnTextVariants: Record<
  NonNullable<ButtonVariants["size"]>,
  keyof typeof TextVariants
> = {
  lg: "btnLarge",
  md: "btnMedium",
  sm: "btnSmall",
};

/**
 * Button Props
 */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariants["variant"];
  size?: ButtonVariants["size"];
  className?: string;
  textClassName?: string;
  leftIcon?: IconTypes;
  rightIcon?: IconTypes;
  iconClassName?: string;
  text?: string;
  loading?: boolean;
}
export const Button: React.FC<ButtonProps> = (props) => {
  const {
    children,
    onClick,
    variant = "primary",
    size = "md",
    className,
    textClassName,
    leftIcon,
    rightIcon,
    iconClassName,
    text: btnText = "",
    loading = false,
    ...rest
  } = props;
  const { base, text, icon } = buttonStyles({ variant, size });

  const textVariants = btnTextVariants[size];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  };
  return (
    <button className={cn(base(), className)} onClick={handleClick} {...rest}>
      {leftIcon && (
        <Icon name={leftIcon} className={cn(icon(), iconClassName)} />
      )}
      {typeof children === "string" || btnText ? (
        <Text className={cn(text(), textClassName)} variant={textVariants}>
          {btnText || children}
        </Text>
      ) : (
        children
      )}
      {rightIcon && (
        <Icon name={rightIcon} className={cn(icon(), iconClassName)} />
      )}
      {loading && (
        <Loader2
          className={cn(
            "size-4 animate-spin",
            variant === "secondary" ? "text-primary" : "text-white",
          )}
        />
      )}
    </button>
  );
};
