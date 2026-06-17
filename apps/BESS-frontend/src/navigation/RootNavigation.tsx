import {BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate} from 'react-router-dom';
import {Settings, AuditLog, Home, UserManagement, ProjectManagement, LoginScreen, SimulationListing} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout, ScreenWrapper} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import {OTPVerificationScreen} from '@/screens/Auth';
import {resetAuthMessage} from '@/services/redux/slice';
import SimulationWizard from '@/screens/SimulationWizard';

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
      <Route path={WebRoutes.INDEX} element={<Root />} />
      <Route path={WebRoutes.LOGIN} element={<LoginScreen />} />
      <Route path={WebRoutes.OTP_VERIFICATION} element={<OTPVerificationScreen />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route
            path={WebRoutes.USER_MANAGEMENT}
            element={
              <ScreenWrapper>
                <UserManagement />
              </ScreenWrapper>
            }
          />
          <Route
            path={WebRoutes.PROJECT_MANAGEMENT}
            element={
              <ScreenWrapper>
                <ProjectManagement />
              </ScreenWrapper>
            }
          />
          <Route path={WebRoutes.SIMULATION_WIZARD} element={<SimulationListing />} />
          <Route path={`${WebRoutes.SIMULATION_WIZARD}/:id`} element={<SimulationWizard />} />

          <Route
            path={WebRoutes.AUDIT_LOG}
            element={
              <ScreenWrapper>
                <AuditLog />
              </ScreenWrapper>
            }
          />
          <Route
            path={WebRoutes.SETTINGS}
            element={
              <ScreenWrapper>
                <Settings />
              </ScreenWrapper>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  return isAuthenticated ? <Navigate to={WebRoutes.USER_MANAGEMENT} /> : <Navigate to={WebRoutes.LOGIN} />;
}
