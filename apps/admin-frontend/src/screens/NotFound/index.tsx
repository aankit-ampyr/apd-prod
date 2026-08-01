import {NotFound as NotFoundComponent} from '@/components';
import {Routes} from '@/navigation/Routes';
import {useNavigate} from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();

  const fallbackRoute = Routes.USER_MANAGEMENT;
  const ctaLabel = 'Go to dashboard';

  return <NotFoundComponent ctaLabel={ctaLabel} fallbackRoute={fallbackRoute} navigate={navigate} />;
}
