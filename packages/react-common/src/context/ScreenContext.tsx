import React, {
  createContext,
  useCallback,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";

type ScreenOverrideContextType = {
  override: ReactNode | null;
  isFullscreenActive: boolean;
  show: (component: ReactNode, options?: { onHide?: () => void }) => void;
  hide: () => void;
  exitFullscreen?: () => void;
  setFullscreenExitHandler?: (handler: (() => void) | null) => void;
};

export const ScreenOverrideContext =
  createContext<ScreenOverrideContextType | null>(null);

export const ScreenOverrideProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [override, setOverride] = useState<ReactNode | null>(null);
  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const onHideRef = useRef<(() => void) | null>(null);
  const fullscreenExitRef = useRef<(() => void) | null>(null);

  const hide = useCallback(() => {
    setOverride(null);
    setIsFullscreenActive(false);
    fullscreenExitRef.current = null;
    const onHide = onHideRef.current;
    onHideRef.current = null;
    onHide?.();
  }, []);

  const show = useCallback(
    (component: ReactNode, options?: { onHide?: () => void }) => {
      onHideRef.current = options?.onHide ?? null;
      fullscreenExitRef.current = hide;
      setIsFullscreenActive(true);
      setOverride(component); // replace previous (only one at a time)
    },
    [hide],
  );

  const exitFullscreen = useCallback(() => {
    fullscreenExitRef.current?.();
    setIsFullscreenActive(false);
  }, []);

  const setFullscreenExitHandler = useCallback(
    (handler: (() => void) | null) => {
      fullscreenExitRef.current = handler;
      setIsFullscreenActive(Boolean(handler));
    },
    [],
  );

  const value = useMemo(
    () => ({
      override,
      isFullscreenActive,
      show,
      hide,
      exitFullscreen,
      setFullscreenExitHandler,
    }),
    [
      exitFullscreen,
      hide,
      isFullscreenActive,
      override,
      setFullscreenExitHandler,
      show,
    ],
  );

  return (
    <ScreenOverrideContext.Provider value={value}>
      {children}
    </ScreenOverrideContext.Provider>
  );
};
