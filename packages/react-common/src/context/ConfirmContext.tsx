import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ConfirmModal } from "../components/ConfirmModal";

export type ConfirmRenderProps = {
  confirm: () => void;
  cancel: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export type ConfirmRenderFn = (props: ConfirmRenderProps) => ReactNode;

export type ConfirmModalClassNames = {
  overlay?: string;
  modal?: string;
  title?: string;
  message?: string;
  footer?: string;
  cancelButton?: string;
  confirmButton?: string;
};

export type ConfirmModalStyles = {
  overlay?: CSSProperties;
  modal?: CSSProperties;
  title?: CSSProperties;
  message?: CSSProperties;
  footer?: CSSProperties;
  cancelButton?: CSSProperties;
  confirmButton?: CSSProperties;
};

export type ConfirmOptions = {
  title?: ReactNode;
  message?: ReactNode;
  confirmText?: ReactNode;
  cancelText?: ReactNode;
  classNames?: ConfirmModalClassNames;
  styles?: ConfirmModalStyles;
  render?: ConfirmRenderFn;
};

type ConfirmRequest = ConfirmOptions & {
  id: number;
};

export type ConfirmContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export const ConfirmProvider = ({ children }: PropsWithChildren) => {
  const [activeRequest, setActiveRequest] = useState<ConfirmRequest | null>(null);
  const activeRequestRef = useRef<ConfirmRequest | null>(null);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);
  const requestIdRef = useRef(0);

  const settleConfirm = useCallback((result: boolean) => {
    const resolve = resolverRef.current;
    if (resolve) {
      resolverRef.current = null;
      resolve(result);
    }
    activeRequestRef.current = null;
    setActiveRequest(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    if (activeRequestRef.current) {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      requestIdRef.current += 1;
      const request = {
        ...options,
        id: requestIdRef.current,
      };

      activeRequestRef.current = request;
      setActiveRequest(request);
    });
  }, []);

  const contextValue = useMemo<ConfirmContextValue>(
    () => ({
      confirm,
    }),
    [confirm],
  );

  const handleConfirm = useCallback(() => {
    settleConfirm(true);
  }, [settleConfirm]);

  const handleCancel = useCallback(() => {
    settleConfirm(false);
  }, [settleConfirm]);

  useEffect(() => {
    return () => {
      const resolve = resolverRef.current;
      if (resolve) {
        resolverRef.current = null;
        resolve(false);
      }
      activeRequestRef.current = null;
    };
  }, []);

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <ConfirmModal
        key={activeRequest?.id ?? "confirm-modal"}
        open={Boolean(activeRequest)}
        title={activeRequest?.title}
        message={activeRequest?.message}
        confirmText={activeRequest?.confirmText}
        cancelText={activeRequest?.cancelText}
        classNames={activeRequest?.classNames}
        styles={activeRequest?.styles}
        render={activeRequest?.render}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ConfirmContext.Provider>
  );
};
