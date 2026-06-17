import {useSelector} from 'react-redux';
import {Platform, UserRole} from '@/constants/enums';
import {authDataSelector} from '@/services/redux/selectors';

export function useRole() {
  const authData = useSelector(authDataSelector);

  const isAnalyst = authData?.role === UserRole.Analyst;
  const isAMDAdmin = authData?.role === UserRole.Admin && authData?.platform?.includes(Platform.APD);
  const isBESSAdmin = authData?.role === UserRole.Admin && authData?.platform?.includes(Platform.PSP);
  const isManagement = authData?.role === UserRole.Management;
  const isViewer = authData?.role === UserRole.Viewer;

  return {
    isManagement,
    isAMDAdmin,
    isBESSAdmin,
    isViewer,
    isAnalyst,
  };
}