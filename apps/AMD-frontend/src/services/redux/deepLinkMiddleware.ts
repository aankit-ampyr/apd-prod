import {Middleware} from '@reduxjs/toolkit';
import {RootState} from './rootReducer';

export const deepLinkMiddleware: Middleware<{}, RootState> = store => next => (action: any) => {
  if (action?.type === 'comment/setPanelOpen' && action?.payload === false) {
    const state = store.getState();
    if (state?.notification?.pendingDeepLink) {
      console.warn('[DeepLink] Blocked panel from closing due to active deep link navigation');
      return; // Stop the action from reaching the reducers
    }
  }

  return next(action);
};
