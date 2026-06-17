import {BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate} from 'react-router-dom';
import {
  AuditLog,
  Home,
  Settings,
  UserManagement,
  LoginScreen,
  OTPVerificationScreen,
} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import { resetAuthMessage } from '@/services/redux/slice';

const ProtectedRoute = () => {
  const isAuthenticated = useSelector(authStatus);
  const fallback = WebRoutes.LOGIN;
  return isAuthenticated ? <Outlet /> : <Navigate to={fallback} />;
};

export function RootNavigator() {
  return (
    <BrowserRouter>
      <RoutesWrapper />
    </BrowserRouter>
  );
}

export function RoutesWrapper() {
  const authSuccessState = useSelector(authSuccessStatus);
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
  return (
    <Routes>
      {/* Default Route */}
      <Route path={WebRoutes.LOGIN} element={<LoginScreen />} />
      <Route path={WebRoutes.OTP_VERIFICATION} element={<OTPVerificationScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path={WebRoutes.HOME} element={<Home />}/>
          <Route path={WebRoutes.USER_MANAGEMENT} element={<UserManagement />} />
          <Route path={WebRoutes.AUDIT_LOG} element={<AuditLog />} />
          <Route path={WebRoutes.SETTINGS} element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  );
}
