import React, { createContext, type PropsWithChildren } from "react";
import { Toaster, toast } from "sonner";
import { Toast, type ToastType } from "../ui-kit";
import { toastDuration } from "../constants/defaults";

export interface ToastContextType {
  showToast: (message: string, toastType: ToastType) => void;
  dismissToast: () => void;
}
export const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  dismissToast: () => {},
});

export const ToastProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const showToast: ToastContextType["showToast"] = (
    msg: string,
    toastType: ToastType,
  ) => {
    toast.custom((tid) => (
      <Toast
        title={msg}
        type={toastType}
        onDismiss={() => toast.dismiss(tid)}
      />
    ));
  };
  const dismissToast: ToastContextType["dismissToast"] = () => {
    toast.dismiss();
  };
  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      <Toaster
        toastOptions={{ duration: toastDuration, className: "max-w-none w-auto" }}
        dir="auto"
        swipeDirections={["right"]}
        position="top-right"
        offset={70}
        richColors
      />
      {children}
    </ToastContext.Provider>
  );
};
