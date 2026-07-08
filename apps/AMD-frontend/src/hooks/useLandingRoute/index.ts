import { Routes } from "@/navigation/Routes";
import { useRole } from "../useRole";

export function useLandingRoute() {
  const {isManagement, isAnalyst} = useRole();

  const defaultRoute = (() => {
    if (isManagement) return Routes.VIEW_ANALYSIS;
    if (isAnalyst) return Routes.ASSET_MANAGEMENT;
    return Routes.USER_MANAGEMENT;
  })();

  return defaultRoute;
}
