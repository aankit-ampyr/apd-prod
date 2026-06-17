import { Badge } from "../../ui-kit";

export function StatusBadge({ status, className }: { status: boolean, className?:string }) {
  return (
    <Badge
      className={className}
      message={status ? "Active" : "Inactive"}
      color={status ? "green" : "navy"}
    />
  );
}
