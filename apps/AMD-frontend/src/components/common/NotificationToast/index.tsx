import {useEffect, useState} from 'react';
import {formatDistanceToNow} from 'date-fns';
import {toast} from 'sonner';
import {Icon} from '@lazarus/react-common/ui-kit';

export interface NotificationToastProps {
  id: string | number;
  notificationId: string;
  title: string;
  message: string;
  createdAt: string;
  onClick: (notificationId: string) => void;
  onClose?: (notificationId: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  notificationId,
  title,
  message,
  createdAt,
  onClick,
  onClose,
}) => {
  const formatTimeAgo = () => {
    const t = formatDistanceToNow(new Date(createdAt), {addSuffix: true});
    return t.replace('about ', '').replace('minutes', 'mins').replace('minute', 'min');
  };

  const [timeAgo, setTimeAgo] = useState(formatTimeAgo());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo());
    }, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClose) onClose(notificationId);
    toast.dismiss(id);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick(notificationId);
    toast.dismiss(id);
  };

  let name = '';
  let restOfMessage = message;
  const nameMatch = message.match(/^([a-zA-Z\s]+?)\s+(mentioned|replied|commented)/i);
  if (nameMatch) {
    name = nameMatch[1];
    restOfMessage = message.substring(name.length);
  }

  return (
    <>
      <style>{`
        [data-expanded="true"] .notif-toast-container {
          transform: translateY(calc(var(--index, 0) * 40px));
        }
      `}</style>
      <div
        onClick={handleClick}
        className="notif-toast-container relative flex w-[382px] h-[96px] cursor-pointer flex-col justify-center rounded-[16px] bg-white pt-[16px] pb-[16px] pl-[76px] pr-[16px] shadow-[0px_4px_16px_rgba(0,0,0,0.08)] transition-all duration-300 hover:bg-slate-50 -mr-8 -mt-10">
        <div
          className="absolute left-[16px] top-[24px] flex h-[48px] w-[48px] items-center justify-center rounded-[40px]"
          style={{background: 'linear-gradient(180deg, #E9FFFD -3.24%, #F9F9F9 100%)'}}>
          <Icon name="bell" color="#2F9C8F" className="h-[19.27px] w-[16px]" />
        </div>

        <div className="flex flex-col gap-1 pr-2">
          <div className="flex w-full items-start justify-between">
            <span className="truncate text-[14px] font-semibold leading-[24px] tracking-[0.02em] text-[#111827]">
              {title}
            </span>
            <span className="shrink-0 font-PlusJakartaSans text-[12px] font-semibold leading-[24px] tracking-[0.02em] text-[#4B5563]">
              {timeAgo}
            </span>
          </div>

          <span className="line-clamp-2 text-[12px] leading-[20px] tracking-[0.02em]">
            {name ? <span className="font-semibold text-[#6B7280]">{name}</span> : null}
            <span className="font-normal text-[#6B7280]">{restOfMessage}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="absolute -right-[8px] top-[2px] z-50 flex h-[24px] w-[24px] items-center justify-center rounded-[40px] bg-white shadow-[0px_4px_16px_rgba(0,0,0,0.1)] border border-gray-100 transition-colors hover:bg-gray-100">
          <Icon name="cross" color="#151735" className="h-[9.64px] w-[9.64px]" />
        </button>
      </div>
    </>
  );
};

export default NotificationToast;
