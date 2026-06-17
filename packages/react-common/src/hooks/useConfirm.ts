import { useContext } from "react";
import { ConfirmContext, type ConfirmContextValue } from "../context/ConfirmContext";

export const useConfirm = (): ConfirmContextValue["confirm"] => {
  const context = useContext(ConfirmContext);

  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider.");
  }

  return context.confirm;
};
