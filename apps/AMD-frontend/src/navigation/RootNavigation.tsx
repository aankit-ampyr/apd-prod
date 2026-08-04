import {createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useNavigate} from 'react-router-dom';
import {
  AssetManagement,
  AuditLog,
  // DigestManagement,
  Help,
  Organizations,
  SettingsScreen,
  UserManagement,
  LoginScreen,
  OTPVerificationScreen,
  OnboardAssetScreen,
  AssetBenchmarkAnalysis,
  AssetAnalysis,
  NotFound,
  ExecutiveAnalysisScreen,
  InvoiceAnalysisScreen,
} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect, useRef} from 'react';
import {resetAssetFileUploadError, resetAuthMessage, resetCurrentSelectedAsset, setPendingDeepLink} from '@/services/redux/slice';
import {useLandingRoute, useRole, useRouteLeave, useScreenOverride} from '@/hooks';
import {toast} from 'sonner';
import {CommentModule} from '@/constants';

const ProtectedRoute = () => {
  const isAuthenticated = useSelector(authStatus);
  const fallback = WebRoutes.LOGIN;
  return isAuthenticated ? <Outlet /> : <Navigate to={fallback} />;
};

const PublicRoute = () => {
  const isAuthenticated = useSelector(authStatus);
  const defaultRoute = useLandingRoute();
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);

  if (isAuthenticated) {
    if (pendingDeepLink) {
      // Yield to AppLayout's deep link routing
      return null;
    }
    return <Navigate to={defaultRoute} replace />;
  }

  return <Outlet />;
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
        element: <PublicRoute />,
        children: [
          {
            path: WebRoutes.LOGIN,
            element: <LoginScreen />,
          },
          {
            path: WebRoutes.OTP_VERIFICATION,
            element: <OTPVerificationScreen />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <DashboardLayout />,
            children: [
              {path: WebRoutes.USER_MANAGEMENT, element: <UserManagement />},
              {path: WebRoutes.ORGANIZATIONS, element: <Organizations />},
              {path: WebRoutes.ASSET_MANAGEMENT, element: <AssetManagement />},
              {path: WebRoutes.ASSET_ONBOARDING, element: <OnboardAssetScreen key={'ASSET_ONBOARDING'} />},
              {path: WebRoutes.VIEW_ASSET_ONBOARDING, element: <OnboardAssetScreen key={'VIEW_ASSET_ONBOARDING'} />},
              {path: WebRoutes.VIEW_ASSET, element: <OnboardAssetScreen key={'VIEW_ASSET'} />},
              {path: WebRoutes.VIEW_ASSET_ANALYSIS, element: <AssetAnalysis key={'integrated'} />},
              // {path: WebRoutes.DIGEST_MANAGEMENT, element: <DigestManagement />},
              {path: WebRoutes.AUDIT_LOG, element: <AuditLog />},
              {path: WebRoutes.HELP, element: <Help />},
              {path: WebRoutes.SETTINGS, element: <SettingsScreen />},
              {path: WebRoutes.VIEW_ANALYSIS, element: <AssetAnalysis key={'seprate'} />},
              {path: WebRoutes.VIEW_ASSET_BENCHMARK, element: <AssetBenchmarkAnalysis key={'integrated'} />},
              {path: WebRoutes.VIEW_BENCHMARK, element: <AssetBenchmarkAnalysis key={'seperate'} />},
              {path: WebRoutes.EXECUTIVE_ANALYSIS, element: <ExecutiveAnalysisScreen />},
              {path: WebRoutes.INVOICE_ANALYSIS, element: <InvoiceAnalysisScreen key={'seperate'} />},
              {path: WebRoutes.VIEW_INVOICE_ANALYSIS, element: <InvoiceAnalysisScreen key={'integrated'} />},
            ],
          },
        ],
      },
      {
        path: '*',
        element: <AuthAwareFallback />,
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
  const pendingDeepLink = useSelector((state: any) => state.notification.pendingDeepLink);

  const {isManagement, isAnalyst} = useRole();
  const isAuthenticated = useSelector(authStatus);

  // Intercept deepLink synchronously before router redirects wipe it out
  const deepLinkRef = useRef<string | null>(null);
  if (deepLinkRef.current === null) {
    const searchParams = new URLSearchParams(window.location.search);
    deepLinkRef.current = searchParams.get('deepLink') || '';
  }

  useEffect(() => {
    if (deepLinkRef.current) {
      try {
        const decodedString = atob(deepLinkRef.current);
        const decodedMeta = JSON.parse(decodedString);
        dispatch(setPendingDeepLink(decodedMeta));

        if (window.location.search.includes('deepLink=')) {
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.delete('deepLink');
          const newUrl = `${window.location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
          window.history.replaceState({}, '', newUrl);
        }
      } catch (e) {
        console.error("Failed to parse deep link", e);
      }
    }
  }, [dispatch]);

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
        if (!pendingDeepLink) {
          navigate(initailRoute());
        }
      }

      // user logged out successfully
      if (authSuccessState === 'S-10092') {
        navigate(WebRoutes.LOGIN);
      }
    }
  }, [authSuccessState, navigate, dispatch, pendingDeepLink]);

  // hide override when navigation changes
  useEffect(() => {
    hide();
  }, [hide, location.key]);



  useEffect(() => {
    if (isAuthenticated && pendingDeepLink && pendingDeepLink.context_module) {
      switch (pendingDeepLink.context_module) {
        case CommentModule.ViewAnalysis:
          navigate(WebRoutes.VIEW_ANALYSIS);
          break;
        case CommentModule.BenchmarkAnalysis:
          navigate(WebRoutes.VIEW_BENCHMARK);
          break;
        case CommentModule.ExecutiveAnalysis:
          if (isAnalyst) {
            dispatch(setPendingDeepLink(null));
            toast.error('You do not have access to Executive Analysis.');
            break;
          }
          navigate(WebRoutes.EXECUTIVE_ANALYSIS);
          break;
        case CommentModule.InvoiceAnalysis:
          navigate(WebRoutes.INVOICE_ANALYSIS);
          break;
      }
    }
  }, [pendingDeepLink, navigate, isAuthenticated, isAnalyst, dispatch]);

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
  useRouteLeave(WebRoutes.EXECUTIVE_ANALYSIS, () => {
    dispatch(resetCurrentSelectedAsset());
  });
  useRouteLeave(WebRoutes.VIEW_INVOICE_ANALYSIS, () => {
    dispatch(resetCurrentSelectedAsset());
  });
  useRouteLeave(WebRoutes.INVOICE_ANALYSIS, () => {
    dispatch(resetCurrentSelectedAsset());
  });

  return <Outlet />;
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  const defaultRoute = useLandingRoute();

  return isAuthenticated ? <Navigate to={defaultRoute} replace /> : <Navigate to={WebRoutes.LOGIN} replace />;
}

function AuthAwareFallback() {
  const isAuthenticated = useSelector(authStatus);

  return isAuthenticated ? <NotFound /> : <Navigate to={WebRoutes.LOGIN} replace />;
}
