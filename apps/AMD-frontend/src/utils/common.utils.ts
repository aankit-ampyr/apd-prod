import {Asset, InvoiceExctractionQualitySummaryDataPoint} from '@/interface';

export function getUniqueYearsFromAsset(
  asset: {available_periods?: Asset['available_periods']} | null | undefined,
): number[] {
  const periods = asset?.available_periods ?? [];

  return Array.from(new Set(periods.map(p => p.year))).sort((a, b) => b - a);
}

export function getUniqueInvoiceYearsFromAsset(
  asset: {available_invoice_periods?: Asset['available_invoice_periods']} | null | undefined,
): number[] {
  const periods = asset?.available_invoice_periods ?? [];

  return Array.from(new Set(periods.map(p => p.year))).sort((a, b) => b - a);
}

export const mergeQualityMetric = (
  current: InvoiceExctractionQualitySummaryDataPoint,
  incoming: InvoiceExctractionQualitySummaryDataPoint,
): InvoiceExctractionQualitySummaryDataPoint => {
  const extracted = current.extracted + incoming.extracted;
  const total = current.total + incoming.total;
  const missing = current.missing + incoming.missing;

  return {
    extracted,
    total,
    missing,
    percentage: total ? (extracted / total) * 100 : 0,
  };
};
