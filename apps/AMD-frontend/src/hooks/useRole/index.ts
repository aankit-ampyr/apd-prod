import {useSelector} from 'react-redux';
import {Platform, UserRole} from '@/constants/enums';
import { authDataSelector } from '@/services/redux/selectors';

export function useRole() {
  const authData = useSelector(authDataSelector);
  const currentUserRole = authData?.role;
  const isAnalyst = currentUserRole === UserRole.Analyst;
  const isAMDAdmin = currentUserRole === UserRole.Admin && authData?.platform?.includes(Platform.APD);
  const isBESSAdmin = currentUserRole === UserRole.Admin && authData?.platform?.includes(Platform.PSP);
  const isSuperAdmin = currentUserRole === UserRole.SuperAdmin;
  const isManagement = currentUserRole === UserRole.Management;
  const isViewer = currentUserRole === UserRole.Viewer;

  return {
    currentUserRole: currentUserRole!,
    isManagement,
    isAMDAdmin,
    isBESSAdmin,
    isSuperAdmin,
    isViewer,
    isAnalyst,
  };
}
