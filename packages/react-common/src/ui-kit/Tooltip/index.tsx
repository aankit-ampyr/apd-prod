import React, { useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../utils";
import { Text } from "../Text";

export type TooltipPosition = "top" | "bottom" | "left" | "right" | "left-top";

interface TooltipProps {
  message?: string | ReactNode;
  content?: ReactNode;
  position?: TooltipPosition;
  className?: string;
  textClassName?: string;
  arrowClassName?: string;
  portal?: boolean; // 👈 new flag
}

export const Tooltip: React.FC<TooltipProps> = (props) => {
  const {
    message,
    content,
    position = "right",
    className,
    textClassName,
    arrowClassName,
    portal = false,
  } = props;
  const resolvedContent = content ?? message;

  if (portal) {
    return (
      <PortalTooltipContent
        message={resolvedContent}
        position={position}
        className={className}
        textClassName={textClassName}
        arrowClassName={arrowClassName}
      />
    );
  }

  function getPositionStyles(position: TooltipPosition) {
    switch (position) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2";
      case "left-top":
        return "right-full bottom-full mb-2 -mr-7";

      default:
        return "";
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-50",
        "opacity-0 group-hover:opacity-100",
        "transition-all duration-200 ease-out",
        "px-3 py-2 text-sm rounded-sm shadow-md",
        "bg-primary-tint-2 text-slate-800 whitespace-nowrap",
        getPositionStyles(position),
        className,
      )}
    >
      {typeof resolvedContent === 'string' ? (
        <Text
          variant="caption"
          className={cn(
            "font-InterSemiBold! text-secondary! whitespace-pre",
            textClassName,
          )}
        >
          {resolvedContent}
        </Text>
      ) : (
        resolvedContent
      )}
      <TooltipArrow position={position} className={arrowClassName} />
    </div>
  );
};

interface TooltipArrowProps {
  position: TooltipPosition;
  className?: string;
}

const TooltipArrow: React.FC<TooltipArrowProps> = ({ position, className }) => {
  function getArrowStyles(position: TooltipPosition) {
    switch (position) {
      case "top":
        return "top-full left-1/2 -translate-x-1/2 -mt-1.5";
      case "bottom":
        return "bottom-full left-1/2 -translate-x-1/2 -mb-1.5";
      case "left":
        return "left-full top-1/2 -translate-y-1/2 -ml-1.5";
      case "right":
        return "right-full top-1/2 -translate-y-1/2 -mr-1.5";
      case "left-top":
        return "right-0 -bottom-1.5 -translate-x-full"; // arrow at bottom-right corner pointing toward trigger
      default:
        return "";
    }
  }
  return (
    <div
      className={cn(
        "absolute w-3 h-3 bg-primary-tint-2 rotate-45",
        getArrowStyles(position),
        className,
      )}
    />
  );
};

interface PortalTooltipContentProps extends Omit<TooltipProps, "portal"> {}

const PortalTooltipContent: React.FC<PortalTooltipContentProps> = ({
  message,
  content,
  position = "right",
  className,
  textClassName,
  arrowClassName,
}) => {
  const resolvedContent = content ?? message;
  const sentinelRef = useRef<HTMLSpanElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    const parent = sentinelRef.current?.parentElement;
    if (!parent) return;

    const handleEnter = () => {
      if (window.innerWidth <= 1024) return;
      setCoords(getPortalCoords(parent.getBoundingClientRect(), position));
    };
    const handleLeave = () => {
      if (window.innerWidth <= 1024) return;
      setCoords(null);
    };
    const handleClick = (e: Event) => {
      if (window.innerWidth <= 1024) {
        setCoords(prev => prev ? null : getPortalCoords(parent.getBoundingClientRect(), position));
      }
    };
    const handleDocClick = (e: Event) => {
      if (window.innerWidth <= 1024 && !parent.contains(e.target as Node)) {
        setCoords(null);
      }
    };

    parent.addEventListener("mouseenter", handleEnter);
    parent.addEventListener("mouseleave", handleLeave);
    parent.addEventListener("click", handleClick);
    document.addEventListener("click", handleDocClick, { capture: true });

    return () => {
      parent.removeEventListener("mouseenter", handleEnter);
      parent.removeEventListener("mouseleave", handleLeave);
      parent.removeEventListener("click", handleClick);
      document.removeEventListener("click", handleDocClick, { capture: true });
    };
  }, [position]);

  return (
    <>
      <span ref={sentinelRef} className="hidden" />
      {coords &&
        createPortal(
          <div
            className={cn(
              "fixed z-[9999] pointer-events-none",
              "transition-all duration-200 ease-out",
              "px-3 py-2 text-sm rounded-sm shadow-md",
              "bg-primary-tint-2 text-slate-800 whitespace-nowrap",
              getTranslate(position),
              className,
            )}
            style={{ top: coords.top, left: coords.left }}
          >
            {typeof resolvedContent === 'string' ? (
              <Text
                variant="caption"
                className={cn("font-InterSemiBold! text-secondary! whitespace-pre", textClassName)}
              >
                {resolvedContent}
              </Text>
            ) : (
              resolvedContent
            )}
            <TooltipArrow position={position} className={arrowClassName} />
          </div>,
          document.body,
        )}
    </>
  );
};

// --- Helpers ---

function getPortalCoords(rect: DOMRect, position: TooltipPosition) {
  const GAP = 8;
  switch (position) {
    case "top":      return { top: rect.top - GAP,             left: rect.left + rect.width / 2 };
    case "bottom":   return { top: rect.bottom + GAP,          left: rect.left + rect.width / 2 };
    case "left":     return { top: rect.top + rect.height / 2, left: rect.left - GAP };
    case "left-top": return { top: rect.top - GAP,             left: rect.left - GAP };
    case "right":
    default:         return { top: rect.top + rect.height / 2, left: rect.right + GAP };
  }
}

function getTranslate(position: TooltipPosition) {
  switch (position) {
    case "top":      return "-translate-x-1/2 -translate-y-full";
    case "bottom":   return "-translate-x-1/2";
    case "left":     return "-translate-x-full -translate-y-1/2";
    case "left-top": return "-translate-x-full -translate-y-full";
    case "right":
    default:         return "-translate-y-1/2";
  }
}

