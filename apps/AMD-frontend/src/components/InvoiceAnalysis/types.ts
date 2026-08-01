import { MonthYear } from "@/interface";

export interface AssetInvoiceAnalysisTab {
  assetId: number | null;
  assetSystemGenerationId?: string;
  year: number;
  month?: number;

  reportingPeriod?: MonthYear;
}
