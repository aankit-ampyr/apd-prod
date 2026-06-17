import {useRole} from '@/hooks';
import {WithRoleComponent, type WithRoleProps} from '@lazarus/react-common/components';

type RoleBasedUIProps = Omit<WithRoleProps, 'currentUserRole'> ;

export function WithRole(props: RoleBasedUIProps) {
  const {currentUserRole} = useRole();
  const {children, ...rest} = props;

  return (
    <WithRoleComponent {...rest} currentUserRole={currentUserRole}>
      {children}
    </WithRoleComponent>
  );
}
