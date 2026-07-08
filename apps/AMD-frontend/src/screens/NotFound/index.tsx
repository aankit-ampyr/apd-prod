import {NotFound as NotFoundComponent} from '@/components';
import {useLandingRoute} from '@/hooks';
import {authStatus} from '@/services/redux/selectors';
import {useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';

export function NotFound() {
  const navigate = useNavigate();
  const isAuthenticated = useSelector(authStatus);
  const fallbackRoute = useLandingRoute();

  const ctaLabel = isAuthenticated ? 'Go to dashboard' : 'Go to login';

  return <NotFoundComponent ctaLabel={ctaLabel} fallbackRoute={fallbackRoute} navigate={navigate} />;
}
