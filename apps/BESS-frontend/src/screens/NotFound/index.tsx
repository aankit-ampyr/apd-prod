import {NotFound as NotFoundComponent} from '@/components';
import {useRole} from '@/hooks';
import {Routes} from '@/navigation/Routes';
import {useNavigate} from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();
  const {isAnalyst, isBESSAdmin} = useRole();

  const fallbackRoute = isBESSAdmin || isAnalyst ? Routes.USER_MANAGEMENT : Routes.SIMULATION_WIZARD;
  const ctaLabel = 'Go to dashboard';

  return <NotFoundComponent ctaLabel={ctaLabel} fallbackRoute={fallbackRoute} navigate={navigate} />;
}
