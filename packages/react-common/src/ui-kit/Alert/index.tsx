import React from "react";
import { Icon, IconTypes } from "../Icon";
import { Text } from "../Text";
import clsx from "clsx";
import { cn } from "../../utils";

type AlertVariant = "warning" | "success" | "info" | "error";

interface AlertProps {
  variant?: AlertVariant;
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  message: React.ReactNode;
  iconName?: IconTypes;
}

const variantStyles: Record<
  AlertVariant,
  {
    container: string;
    icon: string;
    iconName: IconTypes;
  }
> = {
  warning: {
    container: "bg-warning/5 border-warning",
    icon: "text-warning",
    iconName: "warning-triangle",
  },
  success: {
    container: "bg-[#F5FFFB] border-success",
    icon: "text-success",
    iconName: "circle-info",
  },
  info: {
    container: "bg-[#F8FCFF] border-blue",
    icon: "text-blue",
    iconName: "circle-info",
  },
  error: {
    container: "bg-[#FFF6F3] border-error",
    icon: "text-error-text",
    iconName: "warning-triangle",
  },
};

export function Alert({
  variant = "info",
  className,
  textClassName,
  iconClassName,
  message,
  iconName,
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      className={clsx(
        "flex gap-2 border rounded-sm px-3 py-2",
        styles.container,
        className,
      )}
    >
      <Icon
        name={iconName || styles.iconName}
        className={clsx("size-4 mt-0.5", styles.icon, iconClassName)}
      />
      <Text
        variant="small"
        className={clsx("text-text-secondary", textClassName)}
      >
        {message}
      </Text>
    </div>
  );
}

interface AlertBoxProps extends AlertProps {
  description: React.ReactNode;
  infoUi?: React.ReactNode;
}
export function AlertBox(props: AlertBoxProps) {
  const {
    description,
    infoUi,
    message,
    className,
    iconClassName,
    iconName,
    textClassName,
    variant = "info",
  } = props;
  const styles = variantStyles[variant];
  return (
    <div
      className={cn(
        "flex gap-2 border border-l-3 rounded-md px-3 py-2",
        styles.container,
        className,
      )}
    >
      <Icon
        name={iconName || styles.iconName}
        className={clsx("size-4 mt-0.5", styles.icon, iconClassName)}
      />

      <div className="flex flex-col gap-1">
        <Text
          variant="caption"
          className={clsx("text-text-primary! font-InterMedium!", textClassName)}
        >
          {message}
        </Text>
        <Text variant="caption" className="text-text-secondary!">
          {description}
        </Text>
      </div>
      {infoUi}
    </div>
  );
}
