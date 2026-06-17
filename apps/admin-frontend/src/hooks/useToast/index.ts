import { ToastContext, type ToastContextType } from "@/context";
import { useContext } from "react";

export function useToast(){
    const {showToast} = useContext<ToastContextType>(ToastContext);
    return {showToast};
}