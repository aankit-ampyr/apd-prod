import React from 'react';
import {arc} from 'd3-shape';
import {Badge, Skeleton, Text} from '@/ui-kits';
import {InvoiceExctractionQualitySummaryDataPoint, InvoiceExtractionQualitySummary} from '@/interface';
import {WithFallback} from '@lazarus/react-common';

interface ProgressCircleProps {
  color: string;
  percentage?: number;
  size?: number;
  strokeWidth?: number;
}

const QUALITY_FIELDS: Array<{
  key: keyof InvoiceExtractionQualitySummary;
  label: string;
  color: string;
}> = [
  {
    key: 'invoice_number',
    label: 'Invoice #',
    color: '#10B981',
  },
  {
    key: 'invoice_date',
    label: 'Dates',
    color: '#3B82F6',
  },
  {
    key: 'invoice_amount',
    label: 'Amounts',
    color: '#F59E0B',
  },
];

const FALLBACK_DATA_POINT: InvoiceExctractionQualitySummaryDataPoint = {
  extracted: 0,
  total: 0,
  missing: 0,
  percentage: 0,
};

function clampPercentage(value?: number) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 100);
}

function ProgressCircle(props: ProgressCircleProps) {
  const {color, percentage, size = 90, strokeWidth = 5} = props;

  const radius = size / 2 - strokeWidth / 2; // outer radius, stroke ke liye thoda margin
  const innerRadius = radius - strokeWidth;
  const resolvedPercentage = clampPercentage(percentage);
  const progress = resolvedPercentage === 0 ? 1 : resolvedPercentage / 100;
  const startAngle = 0;

  const progressArc = arc<unknown>()
    .innerRadius(innerRadius)
    .outerRadius(radius)
    .cornerRadius(strokeWidth)
    .startAngle(startAngle)
    .endAngle(progress * 2 * Math.PI);

  return (
    <div style={{width: size, height: size}} className="relative shrink-0">
      <svg width={size} height={size}>
        <g transform={`translate(${size / 2}, ${size / 2}) rotate(180)`}>
          <path d={progressArc({}) ?? undefined} fill={color} />
        </g>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Text variant="h3" className="leading-none font-InterBold! text-[#1D293D]">
          {Math.round(resolvedPercentage)}%
        </Text>
      </div>
    </div>
  );
}

interface InvoiceExtractionQualitySummaryProps {
  data?: InvoiceExtractionQualitySummary | null;
  isLoading?: boolean;
}

export function InvoiceExtractionQualitySummaryCard(props: InvoiceExtractionQualitySummaryProps) {
  const {data, isLoading = false} = props;

  return (
    <WithFallback isLoading={isLoading} fallback={<InvoiceExtractionQualitySummarySkeleton />}>
      <div className="bg-white p-4 flex grow min-w-80 max-w-200 flex-col gap-3 rounded-md border border-border">
        <div className="flex flex-col gap-1">
          <Text variant="h4">Extraction Quality</Text>
          <Text variant="12R" className="text-text-secondary!">
            Coverage of key fields across all uploaded invoices
          </Text>
        </div>

        {/* adding extra wrapper to make it centralling align with items-center */}
        <div className="flex items-center grow">
          <div className="grid flex-1 grid-cols-3 gap-4">
            {QUALITY_FIELDS.map(field => {
              const item = data?.[field.key] ?? FALLBACK_DATA_POINT;
              const extracted = item.extracted ?? 0;
              const total = item.total ?? 0;

              const diff = total - extracted;

              return (
                <div key={field.key} className="flex flex-col items-center gap-3">
                  <ProgressCircle color={field.color} percentage={item.percentage ?? 0} />

                  <div className="flex flex-col items-center gap-1">
                    <Text variant="12M" className="text-center uppercase">
                      {field.label}
                    </Text>
                    <Text variant="free" className="text-[18px] font-InterBold!">
                      {extracted}
                      <span className="font-InterRegular! text-text-secondary">/{total}</span>
                    </Text>

                    {diff > 0 && (
                      <Badge
                        message={`${diff} missing`}
                        className="mt-2"
                        size="sm"
                        color={diff < 10 ? 'mustard' : 'red'}
                        textStyle={{
                          fontFamily: 'Inter-Semibold',
                        }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WithFallback>
  );
}

function InvoiceExtractionQualitySummarySkeleton() {
  return (
    <div className="flex flex-col gap-4 grow w-fit bg-white rounded-lg border-border border p-4">
      <Skeleton className="h-4! w-[20%] rounded-full bg-[#D7D7D7]!" />
      <Skeleton className="h-3! w-[60%] rounded-full bg-[#F2F3F5]!" />

      <div className="grid grid-cols-3 my-auto">
        {Array.from({length: 3}).map((_, idx) => {
          return (
            <div key={idx} className="flex flex-col items-center gap-2">
              <Skeleton className="h-3! w-16 rounded-full bg-[#F2F3F5]!" />
              <Skeleton className="h-5! w-16 rounded-full bg-[#D7D7D7]!" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
