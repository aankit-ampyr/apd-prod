import {BrowserRouter, Navigate, Route, Routes, useNavigate} from 'react-router-dom';
import {AuditLog, Settings, UserManagement, LoginScreen, OTPVerificationScreen} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import {resetAuthMessage} from '@/services/redux/slice';

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
        navigate(WebRoutes.USER_MANAGEMENT);
      }
    }
  }, [authSuccessState, navigate, dispatch]);

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
        <Route path={WebRoutes.USER_MANAGEMENT} element={<UserManagement />} />
        <Route path={WebRoutes.AUDIT_LOG} element={<AuditLog />} />
        <Route path="*" element={<Navigate to={WebRoutes.USER_MANAGEMENT} />} />
      </Route>
    </Routes>
  );
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  const initailRoute = WebRoutes.USER_MANAGEMENT;

  return isAuthenticated ? <Navigate to={initailRoute} /> : <Navigate to={WebRoutes.LOGIN} />;
}
