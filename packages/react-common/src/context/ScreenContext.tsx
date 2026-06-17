import React, { createContext, useRef, useState, ReactNode } from "react";

type ScreenOverrideContextType = {
  override: ReactNode | null;
  show: (component: ReactNode, options?: { onHide?: () => void }) => void;
  hide: () => void;
};

export const ScreenOverrideContext = createContext<ScreenOverrideContextType | null>(null);

export const ScreenOverrideProvider = ({ children }: { children: ReactNode }) => {
  const [override, setOverride] = useState<ReactNode | null>(null);
  const onHideRef = useRef<(() => void) | null>(null);

  const show = (component: ReactNode, options?: { onHide?: () => void }) => {
    onHideRef.current = options?.onHide ?? null;
    setOverride(component); // replace previous (only one at a time)
  };

  const hide = () => {
    setOverride(null);
    const onHide = onHideRef.current;
    onHideRef.current = null;
    onHide?.();
  };

  return (
    <ScreenOverrideContext.Provider value={{ override, show, hide }}>
      {children}
    </ScreenOverrideContext.Provider>
  );
};

