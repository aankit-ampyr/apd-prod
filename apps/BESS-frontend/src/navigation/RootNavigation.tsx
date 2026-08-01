import {BrowserRouter, Navigate, Route, Routes, useNavigate} from 'react-router-dom';
import {Settings, AuditLog, UserManagement, ProjectManagement, LoginScreen, SimulationListing, NotFound} from '@/screens';
import {Routes as WebRoutes} from './Routes';
import {DashboardLayout, ScreenWrapper} from '@/components';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus, authSuccessStatus} from '@/services/redux/selectors';
import {useEffect} from 'react';
import {OTPVerificationScreen} from '@/screens/Auth';
import {resetAuthMessage} from '@/services/redux/slice';
import SimulationWizard from '@/screens/SimulationWizard';
import {useRole} from '@/hooks/useRole';

const getLandingRoute = (isBESSAdmin: boolean, isAnalyst: boolean) => (isBESSAdmin || isAnalyst ? WebRoutes.USER_MANAGEMENT : WebRoutes.SIMULATION_WIZARD);

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
  const {isBESSAdmin, isAnalyst} = useRole();
  const isAdminUser = Boolean(isBESSAdmin);

  useEffect(() => {
    if (authSuccessState) {
      // S-10017: OTP sent successfully - navigate to OTP verification screen
      if (authSuccessState === 'S-10017') {
        dispatch(resetAuthMessage());
        navigate(WebRoutes.OTP_VERIFICATION);
      }
      // S-10018: OTP verified successfully - navigate to the appropriate landing page
      if (authSuccessState === 'S-10018') {
        dispatch(resetAuthMessage());
        navigate(getLandingRoute(isAdminUser, isAnalyst));
      }
    }

    // user logged out successfully
    if (authSuccessState === 'S-10092') {
      navigate(WebRoutes.LOGIN);
    }
  }, [authSuccessState, navigate, dispatch, isAdminUser, isAnalyst]);

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path={WebRoutes.LOGIN} element={<LoginScreen />} />
        <Route path={WebRoutes.OTP_VERIFICATION} element={<OTPVerificationScreen />} />
        {/* any arbitiary route, falback to login */}
        <Route path="*" element={<Navigate to={WebRoutes.LOGIN} />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Redirect public routes when logged in or index route */}
        <Route path={WebRoutes.INDEX} element={<Navigate to={getLandingRoute(Boolean(isBESSAdmin), isAnalyst)} replace />} />
        <Route path={WebRoutes.LOGIN} element={<Navigate to={getLandingRoute(Boolean(isBESSAdmin), isAnalyst)} replace />} />

        <Route path={WebRoutes.OTP_VERIFICATION} element={<Navigate to={getLandingRoute(Boolean(isBESSAdmin), isAnalyst)} replace />} />
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

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function Root() {
  const isAuthenticated = useSelector(authStatus);
  const {isBESSAdmin, isAnalyst} = useRole();
  return isAuthenticated ? <Navigate to={getLandingRoute(Boolean(isBESSAdmin), isAnalyst)} /> : <Navigate to={WebRoutes.LOGIN} />;
}
