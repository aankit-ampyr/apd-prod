import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Images } from "../../assets/images";
import type { SideNavOptionType } from "../../interface";
import { Icon, Text, Tooltip } from "../../ui-kit";
import { cn } from "../../utils";
import { useWindowDimensions } from "../../hooks";
import { Divider } from "../Divider";
import { TABLET_SCREEN_BREAKPOINT } from "../../constants";

export interface SideNavSection<T extends string = string> {
  title: string;
  options: SideNavOptionType<T>[];
}

export interface SideNavBarProps<T extends string = string> {
  sections: SideNavSection<T>[];
  platformLabel: string;
  isRouteActive: (route: T) => boolean;
  className?: string;
  platformLabelClassName?: string;
  brandTitle?: string;
  brandSubtitle?: string;
  /** Optional callback triggered before navigation to a route */
  onNavigate?: (route: T) => void;
}

export function SideNavBar<T extends string = string>({
  sections,
  platformLabel,
  isRouteActive,
  className,
  platformLabelClassName,
  brandTitle = "LAZARUS",
  brandSubtitle = "by AMPYR",
  onNavigate,
}: SideNavBarProps<T>) {
  const { width } = useWindowDimensions();
  const [alwaysShrink, setAlwaysShrink] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const isExpanded = alwaysShrink ? false : expanded;

  useEffect(() => {
    setAlwaysShrink(width <= TABLET_SCREEN_BREAKPOINT);
  }, [width]);

  const resolvedSections = sections.filter((item) => item.options.length > 0);

  return (
    <div className="relative h-full shrink-0">
      <div
        className={cn(
          "bg-white flex flex-col overflow-y-scroll scroll-none h-full border-r border-bg-card shadow-sm shrink-0 transition-all duration-300",
          className,
          isExpanded ? "w-fit" : 'w-25'
        )}
      >
        <SideNavHeader
          alwaysShrink={alwaysShrink}
          expanded={isExpanded}
          toggleExpanded={() => setExpanded((prev) => !prev)}
          platformLabel={platformLabel}
          platformLabelClassName={platformLabelClassName}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
        />

        <Divider className="shrink-0 -mt-1 mb-6 w-[80%] h-0.5! translate-x-[10%]" />

        {resolvedSections.map((section, index) => {
          if (!section.options.length) return null;

          return (
            <React.Fragment key={section.title}>
              {(isExpanded || !alwaysShrink) && (
                <Text
                  variant="small"
                  className={cn(
                    // index > 0 && "mt-2",
                    "text-text-placeholder!",
                    isExpanded ? "ml-6" : "self-center",
                    isExpanded ? "text-sm" : "text-[10px]!",

                  )}
                >
                  {section.title}
                </Text>
              )}

              <div
                className={cn(
                  "flex flex-col gap-2 px-3",
                  index === resolvedSections.length - 1 && "mb-6",
                )}
              >
                {section.options.map((option) => (
                  <SideNavOption
                    key={`${section.title}-${option.label}`}
                    expanded={isExpanded}
                    isRouteActive={isRouteActive}
                    alwaysShrink={alwaysShrink}
                    onNavigate={onNavigate}
                    {...option}
                  />
                ))}
              </div>
              {(isExpanded || !alwaysShrink) && index !== resolvedSections.length - 1 && (
                <Divider className="shrink-0 mt-4 mb-6 w-[80%] h-0.75! translate-x-[10%]" />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* 3. Collapse button lifted OUT of the scrollable div */}
      {!alwaysShrink && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="absolute top-16 right-0 translate-x-1/2 z-50 border border-bg-card bg-white cursor-pointer shadow p-1.5 rounded-xs"
        >
          <Icon name={isExpanded ? "collapse-right" : "collapse-left"} />
        </button>
      )}
    </div>
  );
}

interface SideNavOptionProps<
  T extends string = string,
> extends SideNavOptionType<T> {
  expanded: boolean;
  isRouteActive: (route: T) => boolean;
  depth?: number;
  alwaysShrink?: boolean;
  onNavigate?: (route: T) => void;
}

function SideNavOption<T extends string = string>({
  icon,
  label,
  route,
  children,
  expanded,
  isRouteActive,
  depth = 0,
  onNavigate,
  alwaysShrink,
}: SideNavOptionProps<T>) {
  const navigate = useNavigate();
  const hasChildren = Boolean(children?.length);
  const isActive = route ? isRouteActive(route) : false;
  const hasActiveChild = Boolean(
    children?.some((child) => hasActiveDescendant(child, isRouteActive)),
  );
  const isExpandedByDefault = hasChildren && hasActiveChild;
  const [open, setOpen] = useState(isExpandedByDefault);
  const isNavigableRoute = route ? !route.includes(":") : false;
  const showLabelBelowIcon = alwaysShrink && !expanded;

  useEffect(() => {
    if (isExpandedByDefault) {
      setOpen(true);
    }
  }, [isExpandedByDefault]);

  return (
    <div className={cn("flex flex-col", depth > 0 && "relative")}>
      <button
        onClick={() => {
          if (hasChildren) {
            setOpen((prev) => !prev);
            return;
          }
          if (!isNavigableRoute || !route) return;
          onNavigate?.(route);
          navigate(route);
        }}
        className={cn(
          "flex items-center group relative rounded-md transition-all duration-200 hover:bg-bg-card",
          expanded
            ? "gap-3 px-4 py-3"
            : cn(
                "self-center justify-center px-2 py-3",
                showLabelBelowIcon ? "min-w-18 flex-col" : "w-fit p-3",
              ),
          depth > 0 && expanded && "ml-5",
          hasChildren
            ? "cursor-pointer"
            : isNavigableRoute
              ? "cursor-pointer"
              : "cursor-default",
          isActive || hasActiveChild
            ? alwaysShrink
              ? "text-black"
              : "text-black bg-primary-tint-2!"
            : "text-text-secondary",
          depth > 0 &&
            (isActive || hasActiveChild) &&
            "border border-primary bg-primary-tint-2 hover:bg-white",
        )}
      >
        {/* {icon ? <Icon name={icon} size={20} /> : expanded && depth > 0 ? <span className="size-2 rounded-full bg-current opacity-40" /> : null} */}
        {icon && (
          <div
            className={cn(
              "flex items-center  justify-center rounded-md transition-colors",
              alwaysShrink && "p-3",
              alwaysShrink &&
                (isActive || hasActiveChild) &&
                "bg-primary-tint-2",
            )}
          >
            {" "}
            <Icon name={icon} size={20} />{" "}
          </div>
        )}

        {expanded ? (
          <Text variant="body1" className="whitespace-nowrap text-left">
            {label}
          </Text>
        ) : (
          showLabelBelowIcon && (
            <Text
              variant="small"
              className={cn("mt-1 text-center leading-tight max-w-18 flex items-center justify-center", isActive ? "text-black!" : "text-text-secondary!")}
            >
              {label}
            </Text>
          )
        )}
        {hasChildren && expanded && (
          <span className="ml-auto">
            <Icon
              name={open ? "cheveron-up" : "cheveron-down"}
              className="size-3"
            />
          </span>
        )}

        {!expanded && !alwaysShrink && (
          <Tooltip message={label} position="right" portal />
        )}
      </button>

      {expanded && hasChildren && open && (
        <div className="relative mt-2 ml-2 flex flex-col gap-2 pl-4">
          <div className="absolute left-4 top-0 bottom-9 w-0.5 rounded-full bg-[#DBF2F0]" />
          {children?.map((child) => (
            <div key={`${label}-${child.label}`} className="relative">
              <div className="absolute left-0 -top-2 h-6 w-5 translate-y-1/2 rounded-bl-[16px] border-b-2 border-l-2 border-[#DBF2F0]" />
              <SideNavOption
                expanded={expanded}
                isRouteActive={isRouteActive}
                depth={depth + 1}
                onNavigate={onNavigate}
                {...child}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function hasActiveDescendant<T extends string = string>(
  option: SideNavOptionType<T>,
  isRouteActive: (route: T) => boolean,
): boolean {
  if (option.route && isRouteActive(option.route)) {
    return true;
  }

  return Boolean(
    option.children?.some((child) => hasActiveDescendant(child, isRouteActive)),
  );
}

interface SideNavHeaderProps {
  expanded: boolean;
  toggleExpanded: () => void;
  platformLabel: string;
  platformLabelClassName?: string;
  brandTitle: string;
  brandSubtitle: string;
  alwaysShrink?: boolean;
}

function SideNavHeader({
  expanded,
  platformLabel,
  platformLabelClassName,
  brandTitle,
  brandSubtitle,
}: SideNavHeaderProps) {
  return (
    <>
      <div className={cn(
        "relative overflow-visible flex flex-col items-center pt-8 pb-6",
        expanded ? 'px-6' : 'px-4'
      )}>
        {expanded ? (
          <>
            <div className="flex items-center gap-2">
              <img src={Images.logo} className="w-12 h-8 object-contain" />
              <Text
                variant="h1"
                className="text-xl font-InterSemiBold! text-secondary!"
              >
                {brandTitle}
              </Text>
            </div>

            <Text variant="caption" className="text-primary! self-end">
              {brandSubtitle}
            </Text>
          </>
        ) : (
          <img src={Images.logo} className="w-12 h-8 object-contain" />
        )}
      </div>

      <Text
        className={cn(
          "text-text-secondary! p-3 text-center font-semibold",

          platformLabelClassName,
          expanded ? "text-base!" : "text-sm!",
          expanded ? 'px-6' : 'px-1',
          expanded ? 'self-start' : 'self-center'
        )}
      >
        {platformLabel}
      </Text>
    </>
  );
}
