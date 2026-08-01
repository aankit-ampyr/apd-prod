import {createContext, PropsWithChildren, useMemo, useState, useEffect, useRef, useCallback, useContext} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {authStatus} from '@/services/redux/selectors';
import {API, SOCKET, SUCCESS_KEY} from '@/constants';
import {getWsToken} from '@/services/api';
import {GetWsTokenRequest, SocketEvent} from '@/interface';

import {ToastContextType, ToastContext} from '@lazarus/react-common/context';
import {ToastType} from '@/ui-kits';
import {SocketManager} from '@/socket/SocketManager';
import {setEnsureWebSocketConnectionHandler} from './webSocketBridge';

export interface WebSocketContextInterface {
  isConnectionOpen: boolean;
  sendMessage: (message: SocketEvent) => void;
  subscribe: (callback: (event: SocketEvent) => void) => () => void;
}

export const WebSocketContext = createContext<WebSocketContextInterface>({
  isConnectionOpen: false,
  sendMessage: () => {},
  subscribe: () => () => {},
});

export const WebSocketProvider: React.FC<PropsWithChildren> = props => {
  const {children} = props;

  // ==============
  // hooks
  // ==============

  const {showToast} = useContext<ToastContextType>(ToastContext);
  const dispatch = useDispatch();

  // ==============
  // selectors
  // ==============
  const isAuthenticated = useSelector(authStatus);

  // ==============
  // state
  // ==============
  const [isConnectionOpen, setIsConnectionOpen] = useState<boolean>(false);
  const showGlobalToast = useCallback(
    (message: string, type: ToastType) => {
      showToast(message, type);
    },
    [showToast],
  );

  const socketManagerRef = useRef<SocketManager>(new SocketManager(dispatch, showGlobalToast, setIsConnectionOpen));
  const isConnectingRef = useRef<boolean>(false);
  const isConnectionOpenRef = useRef<boolean>(false);
  isConnectionOpenRef.current = isConnectionOpen;

  // ==============
  // functions
  // ==============
  const getWsUrl = useCallback(async (): Promise<string | null> => {
    // get ephemeral ws token
    let token = '';
    const response = await getWsToken();
    const data = response.data as GetWsTokenRequest['response'];
    if (data.status === SUCCESS_KEY) {
      token = data.data?.ephemeral_token ?? '';
    }

    // if token is not found, return null
    if (!token) {
      return null;
    }

    // establish websocket connection with the server using ephemeral ws token
    const socketBaseUrl = API.currentEnv ? API.baseUrls[API.currentEnv as keyof typeof API.baseUrls] : API.baseUrls.dev;

    const params = new URLSearchParams({token});

    const socketUrl = `${socketBaseUrl}${SOCKET.socketUrl.ws}?${params.toString()}`;
    return socketUrl;
  }, []);

  const sendMessage = (msg: SocketEvent) => {
    socketManagerRef.current.send(msg);
  };

  const subscribe = useCallback((callback: (event: SocketEvent) => void) => {
    socketManagerRef.current.addMessageListener(callback);
    return () => socketManagerRef.current.removeMessageListener(callback);
  }, []);

  // ==============
  // side effects
  // ==============
  useEffect(() => {
    // if not authenticated, close the connection and unregister bridge
    if (!isAuthenticated) {
      setEnsureWebSocketConnectionHandler(null);
      socketManagerRef.current.close();
      isConnectingRef.current = false;
      return;
    }

    const connect = async () => {
      if (isConnectingRef.current) return;
      if (socketManagerRef.current.isConnecting()) return; // ← ADD THIS
      if (socketManagerRef.current.isOpen()) return; // ← ADD THIS
      isConnectingRef.current = true;
      try {
        const url = await getWsUrl();
        if (url) {
          socketManagerRef.current.connect(url);
        }
      } finally {
        isConnectingRef.current = false;
      }
    };

    connect();

    // Register handler so API requests can trigger reconnect when disconnected
    setEnsureWebSocketConnectionHandler(() => {
      if (!isConnectionOpenRef.current && !isConnectingRef.current) {
        connect();
      }
    });

    return () => {
      setEnsureWebSocketConnectionHandler(null);
    };
  }, [isAuthenticated]);
  const contextValues = useMemo<WebSocketContextInterface>(() => {
    return {
      isConnectionOpen,
      sendMessage,
      subscribe,
    };
  }, [isConnectionOpen, subscribe]);
  return <WebSocketContext.Provider value={contextValues}>{children}</WebSocketContext.Provider>;
};

export default WebSocketContext;
