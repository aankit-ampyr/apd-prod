import {useEffect, useContext, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {toast} from 'sonner';
import NotificationToast from '@/components/common/NotificationToast';
import {WebSocketContext} from '@/context';
import {RootState} from '@/services/redux/rootReducer';
import {
  markNotificationReadRequest,
  setPendingDeepLink,
  fetchActiveNotificationsRequest,
  readCommentRequest,
} from '@/services/redux/slice';
import {authStatus} from '@/services/redux/selectors';
import {SocketEventType} from '@/constants';

export const useNotificationListener = () => {
  const dispatch = useDispatch();
  const {subscribe} = useContext(WebSocketContext);
  const activeNotifications = useSelector((state: RootState) => state.notification.activeNotifications);
  const shownNotifsRef = useRef<Set<string | number>>(new Set());
  const isAuthenticated = useSelector(authStatus);

  // 0. Fetch initial unread notifications
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchActiveNotificationsRequest());
    } else {
      // If user logs out (or is not authenticated), dismiss any lingering toasts so they don't show on the login screen
      toast.dismiss();
    }
  }, [isAuthenticated, dispatch]);

  // 1. Listen for new incoming socket pushes
  useEffect(() => {
    const dispatchReadComment = (meta: any) => {
      if (meta?.asset_id && meta?.comment_id) {
        const cIdStr = String(meta.comment_id);
        const cIdMatch = cIdStr.match(/\d+/);
        if (cIdMatch) {
          const cId = parseInt(cIdMatch[0], 10);
          if (!isNaN(cId)) {
            dispatch(readCommentRequest({assetId: Number(meta.asset_id), commentId: cId}));
          }
        }
      }
    };

    const unsubscribe = subscribe(event => {
      if (!isAuthenticated) return;
      if (event.type === SocketEventType.COMMENT_NOTIFICATION) {
        const notifType = event.notification_type;
        let title = 'New Notification';
        if (notifType === 'mention_comment') title = 'Mentioned You';
        else if (notifType === 'reply_to_comment') title = 'Replied to Your Comment';
        else if (notifType === 'mention_reply') title = 'Mentioned You in Reply';

        const notifId = event.notification_id || `socket_${Date.now()}`;

        const meta = {
          context_type: event.data.context_type,
          context_module: event.data.module,
          context_tab: event.data.tab,
          context_widget: null,
          context_year: event.data.year,
          context_month: event.data.month,
          asset_id: event.data.asset_id,
          comment_id: event.data.comment_id,
        };

        toast.custom(
          t => (
            <NotificationToast
              id={t}
              notificationId={notifId}
              title={title}
              message={event.text}
              createdAt={new Date().toISOString()}
              onClick={nId => {
                dispatch(setPendingDeepLink(meta));
                dispatch(markNotificationReadRequest({notification_id: nId}));
                dispatchReadComment(meta);
              }}
              onClose={nId => {
                dispatch(markNotificationReadRequest({notification_id: nId}));
              }}
            />
          ),
          {
            duration: 300000,
            position: 'top-right',
            onAutoClose: () => {
              dispatch(markNotificationReadRequest({notification_id: notifId}));
            },
            onDismiss: () => {
              dispatch(markNotificationReadRequest({notification_id: notifId}));
            },
          },
        );
      }
    });
    return unsubscribe;
  }, [subscribe, dispatch, isAuthenticated]);

  // 2. Trigger toasts for unread DB notifications on page load
  useEffect(() => {
    if (!isAuthenticated) return;

    const dispatchReadComment = (meta: any) => {
      if (meta?.asset_id && meta?.comment_id) {
        const cIdStr = String(meta.comment_id);
        const cIdMatch = cIdStr.match(/\d+/);
        if (cIdMatch) {
          const cId = parseInt(cIdMatch[0], 10);
          if (!isNaN(cId)) {
            dispatch(readCommentRequest({assetId: Number(meta.asset_id), commentId: cId}));
          }
        }
      }
    };

    if (activeNotifications && activeNotifications.length > 0) {
      // Delay slightly to ensure Sonner's <Toaster /> is fully mounted and listening
      const timer = setTimeout(() => {
        activeNotifications.slice(0, 5).forEach(notif => {
          if (!notif.is_read && !shownNotifsRef.current.has(notif.notification_id)) {
            toast.custom(
              t => (
                <NotificationToast
                  id={t}
                  notificationId={notif.notification_id}
                  title={notif.title}
                  message={notif.message}
                  createdAt={notif.created_at}
                  onClick={nId => {
                    dispatch(setPendingDeepLink(notif.meta));
                    dispatch(markNotificationReadRequest({notification_id: nId}));
                    dispatchReadComment(notif.meta);
                  }}
                  onClose={nId => {
                    dispatch(markNotificationReadRequest({notification_id: nId}));
                  }}
                />
              ),
              {
                duration: 300000,
                position: 'top-right',
                onAutoClose: () => {
                  dispatch(markNotificationReadRequest({notification_id: notif.notification_id}));
                },
                onDismiss: () => {
                  dispatch(markNotificationReadRequest({notification_id: notif.notification_id}));
                },
              },
            );
            shownNotifsRef.current.add(notif.notification_id);
          }
        });
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [activeNotifications, dispatch, isAuthenticated]);
};
