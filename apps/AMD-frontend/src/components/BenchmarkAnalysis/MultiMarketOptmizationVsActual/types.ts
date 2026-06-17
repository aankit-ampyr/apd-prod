import { AssetBenchmarkMultiMarketOptmizationVsActual } from "@/interface";

export type MonthlyEntry = {
  month: number;
  year: number;
  streams: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['revenue_streams'];
  totals: AssetBenchmarkMultiMarketOptmizationVsActual['monthly_data'][string]['totals'];
};