import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {useDispatch} from 'react-redux';
import {createPortal} from 'react-dom';
import {toast} from 'sonner';
import {Icon, Button, Text} from '@/ui-kits';
import {Routes} from '@/navigation/Routes';
import {resetAnalyticsFilter} from '@/services/redux/slice/analyticsFilterSlice';
import {
  resetAssetMessage,
  setPanelOpen,
  setPendingDeepLink,
  fetchActiveNotificationsRequest,
} from '@/services/redux/slice';

interface NoAssetAccessProps {
  isOpen: boolean;
  onReset: () => void;
}

export function NoAssetAccess({isOpen, onReset}: NoAssetAccessProps) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Dismiss all notification toasts the moment the modal becomes visible
  useEffect(() => {
    if (isOpen) {
      toast.dismiss();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-[#00000073]">
      <div className="w-[563px] h-[338px] rounded-[20px] bg-white flex flex-col items-center justify-start pt-[22px] px-[28px] shadow-2xl">
        {/* Icon */}
        <div className="w-[71px] h-[71px] rounded-full bg-[#EFFAF9] flex items-center justify-center mb-[24px]">
          <style>{`
            .no-access-icon path {
              stroke-width: 4.5px !important;
            }
          `}</style>
          <Icon name={'message-square-x' as any} className="w-[35px] h-[36px] text-[#A0D0C6] no-access-icon" />
        </div>

        {/* Text Frame Container */}
        <div className="w-[534px] h-[114px] flex flex-col items-center justify-center gap-[12px] mb-[24px]">
          {/* Title */}
          <Text className="font-InterSemiBold! text-[18px]! leading-[30px]! text-center text-[#101329]! m-0 p-0 whitespace-nowrap">
            You no longer have access
          </Text>

          {/* Detail text */}
          <Text className="font-InterRegular! text-[14px]! leading-[24px]! text-center text-[#555A77]! m-0 p-0">
          You no longer have access to the asset associated with this comment. 
          Your organization or asset access may have changed. 
          Please contact your administrator if you believe you should still have access.
          </Text>
        </div>

        {/* Button */}
        <Button
          onClick={() => {
            // 1. We Clear deep link FIRST — so deepLinkMiddleware won't block setPanelOpen(false)
            dispatch(setPendingDeepLink(null));
            // 2. Now We close the panel (middleware won't block this anymore)
            dispatch(setPanelOpen(false));
            // 3. Reset asset error and analytics filter in Redux
            dispatch(resetAssetMessage());
            dispatch(resetAnalyticsFilter());
            // 4. WE Tell parent to clear its local state (asset ID, period/year, showNoAssetAccess)
            onReset();
            // 5. Silently refresh active notifications so any revoked ones are cleared out by backend
            dispatch(fetchActiveNotificationsRequest());
            // 6. Soft navigate — same JS session, Redux already has cleared values,
            //    no localStorage race condition
            navigate(Routes.VIEW_ANALYSIS);
          }}
          className="w-[221px] h-[40px] rounded-[8px] bg-[var(--Primary-Color,#2F9C8F)]! border-none! flex items-center justify-center m-0 hover:bg-[#2F9C8F]/90!">
          <span className="text-white! font-InterSemiBold! text-[16px]!">Go to View Analysis</span>
        </Button>
      </div>
    </div>,
    document.body,
  );
}
