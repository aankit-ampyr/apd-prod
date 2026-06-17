import { UserRole } from "../../constants";

export type WithRoleProps = {
  roles: UserRole[];
  currentUserRole: UserRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function WithRoleComponent({
  roles,
  currentUserRole,
  children,
  fallback = null,
}: WithRoleProps) {
  if (!roles.includes(currentUserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}