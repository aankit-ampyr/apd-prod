import { ToastContext, type ToastContextType } from "../../context";
import { useContext } from "react";

export function useToast(){
    const {showToast, dismissToast} = useContext<ToastContextType>(ToastContext);
    return {showToast, dismissToast};
}
