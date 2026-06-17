import { useState } from "react";
import { Icon, IconTypes, Text } from "../../ui-kit";
import clsx from "clsx";

interface AccordionProps {
  readonly heading: string;
  readonly defaultOpen?: boolean;
  readonly children: React.ReactNode;
  readonly icon?: IconTypes;
  readonly className?: string;
}

export function Accordion({
  heading,
  defaultOpen = true,
  children,
  icon = undefined,
  className = "",
}: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      {/* Header */}
      <button
        type="button"
        className={clsx(
          "flex items-center rounded-tl-lg rounded-tr-lg justify-between px-4 py-3 cursor-pointer w-full text-left bg-transparent border-0 outline-none",
          className,
        )}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
      >
        <div className="flex items-center gap-3">
          {icon && (
            <Icon name={icon} size={16} className="text-text-primary!" />
          )}

          <Text
            variant="body1"
            className="font-InterMedium! text-text-primary!"
          >
            {heading}
          </Text>
        </div>
        <Icon
          name="cheveron-down"
          size={16}
          className={`transition-transform duration-200 text-text-secondary! ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Content */}
      {isOpen && <div className="p-4">{children}</div>}
    </div>
  );
}
