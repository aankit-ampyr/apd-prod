import {BrowserRouter, Navigate, Route, Routes, useNavigate} from 'react-router-dom';
import {AuditLog, UserManagement, LoginScreen, OTPVerificationScreen, NotFound} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import {resetAuthMessage} from '@/services/redux/slice';
import {useRole} from '@/hooks';

const getLandingRoute = (isSuperAdmin: boolean) => (isSuperAdmin ? WebRoutes.USER_MANAGEMENT : WebRoutes.LOGIN);

export function RootNavigator() {
  return (
    <BrowserRouter>
      <RoutesWrapper />
    </BrowserRouter>
  );
}

export function RoutesWrapper() {
  const authSuccessState = useSelector(authSuccessStatus);
  const isAuthenticated = useSelector(authStatus);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {isSuperAdmin} = useRole();
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
        navigate(getLandingRoute(isSuperAdmin));
      }
    }
  }, [authSuccessState, navigate, dispatch, isSuperAdmin]);

  // Public routes for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path={WebRoutes.LOGIN} element={<LoginScreen />} />
        <Route path={WebRoutes.OTP_VERIFICATION} element={<OTPVerificationScreen />} />
        <Route path="*" element={<Navigate to={WebRoutes.LOGIN} />} />
      </Routes>
    );
  }
  // protected routes for authenticated users
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route path={WebRoutes.INDEX} element={<Navigate to={getLandingRoute(isSuperAdmin)} replace />} />
        <Route path={WebRoutes.LOGIN} element={<Navigate to={getLandingRoute(isSuperAdmin)} replace />} />
        <Route path={WebRoutes.OTP_VERIFICATION} element={<Navigate to={getLandingRoute(isSuperAdmin)} replace />} />
        <Route path={WebRoutes.USER_MANAGEMENT} element={<UserManagement />} />
        <Route path={WebRoutes.AUDIT_LOG} element={<AuditLog />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  const {isSuperAdmin} = useRole();

  return isAuthenticated ? <Navigate to={getLandingRoute(isSuperAdmin)} /> : <Navigate to={WebRoutes.LOGIN} />;
}
