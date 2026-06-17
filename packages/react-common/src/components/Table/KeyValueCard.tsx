import { Skeleton, Text } from "../../ui-kit";
import { cn } from "../../utils";
import { WithFallback } from "../SkelatonWrapper";

export type KeyValueCardItem = {
  label: string;
  value: string | number;
};

interface KeyValueCardProps {
  title?: string;
  data: KeyValueCardItem[];
  className?: string;
  headerClassName?: string;
  loading?: boolean;
}

export function KeyValueCard(props: KeyValueCardProps) {
  const { data, title, className, headerClassName, loading = false } = props;
  return (
    <div
      className={cn(
        "rounded-md border border-gray-200 overflow-hidden bg-white",
        className,
      )}
    >
      {/* Header */}
      {title && (
        <div
          className={cn(
            "px-4 py-3 border-b border-border",
            headerClassName,
          )}
        >
          <Text variant="14SB">{title}</Text>
        </div>
      )}

      {/* Body */}
      <div>
        {data.map((item, idx) => (
          <div
            key={item.label}
            className={`grid grid-cols-2 ${
              idx !== data.length - 1 ? "border-b border-border" : ""
            }`}
          >
            {/* Label */}
            <div className="px-4 py-3 bg-[#EEF0F5] justify-center flex text-text-secondary">
              <Text variant="12M">{item.label}</Text>
            </div>

            {/* Value */}
            <div className="px-4 py-3 bg-white justify-center flex text-text-secondary">
              <WithFallback
                isLoading={loading}
                fallback={
                  <Skeleton
                    animation="wave"
                    variant="rectangular"
                    className={cn("rounded-full")}
                    width={60}
                    height={16}
                  />
                }
              >
                <Text variant="12R">{item.value}</Text>
              </WithFallback>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
