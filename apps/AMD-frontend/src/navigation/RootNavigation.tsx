import {createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useNavigate} from 'react-router-dom';
import {
  AssetManagement,
  AuditLog,
  DigestManagement,
  Help,
  Home,
  Organizations,
  SettingsScreen,
  UserManagement,
  LoginScreen,
  OTPVerificationScreen,
  OnboardAssetScreen,
  AssetBenchmarkAnalysis,
  AssetAnalysis,
} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import {resetAssetFileUploadError, resetAuthMessage, resetCurrentSelectedAsset} from '@/services/redux/slice';
import {useRole, useRouteLeave, useScreenOverride} from '@/hooks';
import {toast} from 'sonner';

const ProtectedRoute = () => {
  const isAuthenticated = useSelector(authStatus);
  const fallback = WebRoutes.LOGIN;
  return isAuthenticated ? <Outlet /> : <Navigate to={fallback} />;
};

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: WebRoutes.INDEX,
        element: <Root />,
      },
      {
        path: WebRoutes.LOGIN,
        element: <LoginScreen />,
      },
      {
        path: WebRoutes.OTP_VERIFICATION,
        element: <OTPVerificationScreen />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {path: WebRoutes.HOME, element: <Home />},
              {path: WebRoutes.USER_MANAGEMENT, element: <UserManagement />},
              {path: WebRoutes.ORGANIZATIONS, element: <Organizations />},
              {path: WebRoutes.ASSET_MANAGEMENT, element: <AssetManagement />},
              {path: WebRoutes.ASSET_ONBOARDING, element: <OnboardAssetScreen key={'ASSET_ONBOARDING'} />},
              {path: WebRoutes.VIEW_ASSET_ONBOARDING, element: <OnboardAssetScreen key={'VIEW_ASSET_ONBOARDING'} />},
              {path: WebRoutes.VIEW_ASSET, element: <OnboardAssetScreen key={'VIEW_ASSET'} />},
              {path: WebRoutes.VIEW_ASSET_ANALYSIS, element: <AssetAnalysis key={'integrated'} />},
              {path: WebRoutes.DIGEST_MANAGEMENT, element: <DigestManagement />},
              {path: WebRoutes.AUDIT_LOG, element: <AuditLog />},
              {path: WebRoutes.HELP, element: <Help />},
              {path: WebRoutes.SETTINGS, element: <SettingsScreen />},
              {path: WebRoutes.VIEW_ANALYSIS, element: <AssetAnalysis key={'seprate'} />},
              {path: WebRoutes.VIEW_ASSET_BENCHMARK, element: <AssetBenchmarkAnalysis key={'integrated'} />},
              {path: WebRoutes.VIEW_BENCHMARK, element: <AssetBenchmarkAnalysis key={'seperate'} />},
            ],
          },
        ],
      },
    ],
  },
]);

export function RootNavigator() {
  return <RouterProvider router={router} />;
}

export function AppLayout() {
  const authSuccessState = useSelector(authSuccessStatus);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const {hide} = useScreenOverride();

  const {isManagement, isAnalyst} = useRole();
  const initailRoute = () => {
    if (isManagement) {
      return WebRoutes.VIEW_ANALYSIS;
    }
    if (isAnalyst) {
      return WebRoutes.ASSET_MANAGEMENT;
    }
    return WebRoutes.USER_MANAGEMENT;
  };

  useEffect(() => {
    if (authSuccessState) {
      // S-10017: OTP sent successfully - navigate to OTP verification screen
      if (authSuccessState === 'S-10017') {
        dispatch(resetAuthMessage());
        navigate(WebRoutes.OTP_VERIFICATION);
      }
      // S-10018: OTP verified successfully - navigate to dashboard
      if (authSuccessState === 'S-10018') {
        dispatch(resetAuthMessage());
        navigate(initailRoute());
      }
    }
  }, [authSuccessState, navigate, dispatch]);

  // hide override when navigation changes
  useEffect(() => {
    hide();
  }, [hide, location.key]);

  // Clear stale toasts when moving to a different route.
  useEffect(() => {
    toast.dismiss();
  }, [location.key]);

  // reset currentSelectedAsset, also its file upload error when go back to another screen other than asset onboard
  useRouteLeave(WebRoutes.VIEW_ASSET_ONBOARDING, () => {
    dispatch(resetCurrentSelectedAsset());
    dispatch(resetAssetFileUploadError());
  });
  useRouteLeave(WebRoutes.ASSET_ONBOARDING, () => {
    dispatch(resetCurrentSelectedAsset());
    dispatch(resetAssetFileUploadError());
  });
  useRouteLeave(WebRoutes.VIEW_ASSET, () => {
    dispatch(resetCurrentSelectedAsset());
    dispatch(resetAssetFileUploadError());
  });
  useRouteLeave(WebRoutes.VIEW_ASSET_ANALYSIS, () => {
    dispatch(resetCurrentSelectedAsset());
  });
  useRouteLeave(WebRoutes.VIEW_ANALYSIS, () => {
    dispatch(resetCurrentSelectedAsset());
  });
  useRouteLeave(WebRoutes.VIEW_BENCHMARK, () => {
    dispatch(resetCurrentSelectedAsset());
  });

  return <Outlet />;
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  const {isManagement, isAnalyst} = useRole();
  const initailRoute = () => {
    if (isManagement) {
      return WebRoutes.VIEW_ANALYSIS;
    }
    if (isAnalyst) {
      return WebRoutes.ASSET_MANAGEMENT;
    }
    return WebRoutes.USER_MANAGEMENT;
  };

  return isAuthenticated ? <Navigate to={initailRoute()} /> : <Navigate to={WebRoutes.LOGIN} />;
}
