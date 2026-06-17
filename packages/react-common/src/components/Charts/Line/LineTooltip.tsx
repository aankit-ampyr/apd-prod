import { format } from "date-fns";
import { Text } from "../../../ui-kit";

type PrimitiveValue = string | number | null | undefined;

type ChartRow = Record<string, PrimitiveValue>;

export type LineTooltipPayload<T extends ChartRow> = {
  payload?: T;
  value?: number | string | Array<number | string>;
  color?: string;
  name?: string;
  dataKey?: string;
};

export type LineTooltipProps<T extends ChartRow> = {
  active?: boolean;
  payload?: ReadonlyArray<LineTooltipPayload<T>>;
  label?: string | number;
  titleFormatter?: (value: string | number, row?: T) => string;
  valueFormatter?: (value: number, seriesName: string, row?: T) => string;
};

function formatDefaultTitle(value: string | number): string {
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return format(date, "dd-MMM yyyy | HH:mm");
}

function formatDefaultValue(value: number): string {
  if (!Number.isFinite(value)) return "-";

  const rounded = Math.round(value * 100) / 100;
  const rendered = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");

  return rendered;
}

export function LineTooltip<T extends ChartRow>(props: LineTooltipProps<T>) {
  const { active, payload, label, titleFormatter, valueFormatter } = props;

  if (!active || !payload?.length) return null;

  const row = payload[0]?.payload;
  const title = titleFormatter ? titleFormatter(label ?? "", row) : formatDefaultTitle(label ?? "");

  return (
    <div className="min-w-44 rounded-sm border border-border bg-white px-4 py-3 shadow-[0_10px_30px_rgba(16,19,41,0.14)]">
      <Text
        variant="14SB"
        className="text-text-primary! mb-2 text-[19px] leading-[26px] font-InterMedium!"
      >
        {title}
      </Text>

      <div className="flex flex-col gap-1">
        {payload.map((entry) => {
          const rawValue = Array.isArray(entry.value) ? entry.value[1] : entry.value;
          const numericValue =
            typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
          const seriesName = entry.name ?? String(entry.dataKey ?? "");
          const resolvedValue = valueFormatter
            ? valueFormatter(numericValue, seriesName, row)
            : formatDefaultValue(numericValue);

          return (
            <div
              key={`${String(entry.dataKey ?? seriesName)}-${seriesName}`}
              className="flex items-center gap-2"
            >
              <Text variant="14M" style={{ color: entry.color || "var(--color-text-primary)" }}>{seriesName}:</Text>
              <Text variant="14M" style={{ color: entry.color || "var(--color-text-primary)" }}>{resolvedValue}</Text>
            </div>
          );
        })}
      </div>
    </div>
  );
}
