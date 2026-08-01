import {ToastProvider, ScreenOverrideProvider, ConfirmProvider, WebSocketProvider} from '@/context';
import '@/stylesheet/index.css';
import {RootNavigator} from '@/navigation/RootNavigation';
import {Provider, useDispatch, useSelector} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {store, persistor} from '@/services/redux/store';
import {PropsWithChildren, useEffect} from 'react';
import {cancelAuthRequest, cancelProjectRequest, cancelUserRequest, resetAuthWithReason} from './services/redux/slice';
import {authStatus} from './services/redux/selectors';
import {useInactivityTimer} from './hooks';
import {UserSessionEndReason} from './constants';
import {useSimulationStatus} from './components/SimulationWizard/SimulationStatusContext';
export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ToastProvider>
          <ScreenOverrideProvider>
            <ConfirmProvider>
              <WebSocketProvider>
                <AppRoot>
                  <RootNavigator />
                </AppRoot>
              </WebSocketProvider>
            </ConfirmProvider>
          </ScreenOverrideProvider>
        </ToastProvider>
      </PersistGate>
    </Provider>
  );
}

function AppRoot({children}: PropsWithChildren) {
  const dispatch = useDispatch();
  const {shouldPauseSessionTimeout} = useSimulationStatus() ?? {};

  const isAuthenticated = useSelector(authStatus);

  useInactivityTimer({
    onInactivity: () => dispatch(resetAuthWithReason({reason: UserSessionEndReason.IdleTimeout})),
    enabled: isAuthenticated && !shouldPauseSessionTimeout,
  });

  useEffect(() => {
    dispatch(cancelAuthRequest());
    dispatch(cancelUserRequest());
    dispatch(cancelProjectRequest());
  }, []);
  return children;
}
