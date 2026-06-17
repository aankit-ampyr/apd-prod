import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  Children,
  isValidElement,
  useMemo,
  PropsWithChildren,
} from "react";
import { cn } from "../../utils/common.utils";

interface TabsContextType {
  active: string;
  setActive: (val: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

const useTabs = () => {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs.Screen must be used inside Tabs");
  return ctx;
};

interface TabsProps {
  defaultValue?: string;
  children: ReactNode;
  className?: string;
  tabButtonClassName?: string;
  activeTabButtonClassName?: string;
  activeTabIndicator?: string;
}

interface ScreenProps extends PropsWithChildren {
  name: string;
  label?: string;
  element?: ReactNode;
}

const TabsRoot: React.FC<TabsProps> = ({
  defaultValue,
  children,
  className,
  tabButtonClassName,
  activeTabButtonClassName,
  activeTabIndicator,
}) => {
  // extract screens
  const screens = useMemo(() => {
    return Children.toArray(children).filter(isValidElement) as React.ReactElement<ScreenProps>[];
  }, [children]);

  const firstTab = screens[0]?.props.name;
  const [active, setActive] = useState(defaultValue || firstTab);

  const uniqueScreens = new Set(screens.map(screen => screen.props.name))
  
  if (uniqueScreens.size !== screens.length){
    throw new Error('duplicate tabs index found')
  }

  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={cn("w-full h-full flex flex-col", className)}>
        
        {/* Tabs Header */}
        <div className="flex gap-8 border-b border-disabled overflow-x-auto scroll-none">
          {screens.map(screen => {
            const isActive = active === screen.props.name;

            return (
              <button
                key={screen.props.name}
                onClick={() => setActive(screen.props.name)}
                className={cn(
                  "relative shrink-0 pb-3 cursor-pointer text-lg transition-colors text-[16px] leading-[24px]",
                  isActive
                    ? "text-primary font-InterBold "
                    : "text-primary-tint-1 font-InterRegular",
                  tabButtonClassName,
                  isActive && activeTabButtonClassName,
                )}
              >
                {screen.props.name || screen.props.label}

                {isActive && (
                  <span className={cn("absolute left-0 bottom-0 h-0.5 w-full bg-teal-tint", activeTabIndicator)} />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Content */}
        <div className="mt-4 grow">
          {screens.map(screen => {
            if (screen.props.name !== active) return null;
            return screen.props.element || screen.props.children;
          })}
        </div>
      </div>
    </TabsContext.Provider>
  );
};

const TabsScreen: React.FC<ScreenProps> = ({ children }) => {
  return <>{children}</>;
};

export const Tabs = Object.assign(TabsRoot, {
  Screen: TabsScreen,
});