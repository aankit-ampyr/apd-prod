import {configureStore} from '@reduxjs/toolkit';
import {persistStore, persistReducer, type PersistConfig} from 'redux-persist';
import rootReducer, {type RootState} from './rootReducer';
import createSagaMiddleware from 'redux-saga';
import rootSaga from './saga';
import storage from 'redux-persist/lib/storage';
import {PERSIST_KEY} from '@/constants/keys';
const persistConfig: PersistConfig<RootState> = {
  key: PERSIST_KEY,
  storage,
  whitelist: ['auth'],

};

const sagaMiddleware = createSagaMiddleware();

const persistedReducer = persistReducer<RootState>(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware => getDefaultMiddleware({thunk: false, serializableCheck: false}).concat(sagaMiddleware),
});

const persistor = persistStore(store);

sagaMiddleware.run(rootSaga);

export {store, persistor};