import {ENV} from '@/interface';

interface SocketConfig {
  currentEnv: string | undefined;
  baseUrls: Record<ENV, string>;
  socketUrl: {
    ws: string;
  };
}
const {VITE_APP_ENV, VITE_APP_SOCKET_LOC, VITE_APP_SOCKET_DEV, VITE_APP_SOCKET_QA, VITE_APP_SOCKET_UAT, VITE_APP_SOCKET_PROD} = import.meta.env;
export const SOCKET: SocketConfig = {
  currentEnv: VITE_APP_ENV,
  baseUrls: {
    loc: VITE_APP_SOCKET_LOC as string,
    dev: VITE_APP_SOCKET_DEV as string,
    prod: VITE_APP_SOCKET_PROD as string,
    qa: VITE_APP_SOCKET_QA as string,
    uat: VITE_APP_SOCKET_UAT as string,
  },

  socketUrl: {
    ws: 'api/v1/websocket/',
  },
};
