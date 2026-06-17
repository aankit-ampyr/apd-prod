import { useContext } from "react";
import { ScreenOverrideContext } from "../../context";

export const useScreenOverride = () => {
  const context = useContext(ScreenOverrideContext);
  if (!context) {
    throw new Error("useScreenOverride must be used within ScreenOverrideProvider");
  }
  return context;
};