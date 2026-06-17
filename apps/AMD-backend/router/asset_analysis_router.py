from fastapi import APIRouter
from controller.asset_analysis_controller import AnalysisController


class AnalysisRouter:

    def __init__(self):
        self.router = APIRouter()
        self.endpoint = "/assets"
        self.tags = ["Assets"]

        self.controller = AnalysisController()
        # analysis 
        self.router.get("/{asset_id}/analysis/benchmark")(self.controller.get_benchmark_analysis)
        self.router.get("/{asset_id}/analysis/benchmark/export")(self.controller.download_benchmark_report)

        # operation
        self.router.get("/{asset_id}/analysis/operations/summary")(self.controller.get_operations_summary)
        self.router.get("/{asset_id}/analysis/operations/market-summary")(self.controller.get_market_summary)
        self.router.get("/{asset_id}/analysis/operations/energy-price")(self.controller.get_asset_energy_price_comparison)
        self.router.get("/{asset_id}/analysis/operations/battery-power-over-time")(self.controller.get_batter_power)
        
        # multi market optmization
        self.router.get("/{asset_id}/analysis/market/summary")(self.controller.get_market_analysis_summary)
        self.router.get("/{asset_id}/analysis/market/utilization")(self.controller.get_market_utilization)
        self.router.get("/{asset_id}/analysis/market/statistics")(self.controller.get_market_statistics_table)
        self.router.get("/{asset_id}/analysis/market/statistics/export")(self.controller.download_market_statistics_table)
        self.router.get("/{asset_id}/analysis/market/revenue-distribution")(self.controller.get_revenue_distribution_chart)
        self.router.get("/{asset_id}/analysis/market/best-markets")(self.controller.get_best_markets)
        self.router.get("/{asset_id}/analysis/market/best-markets/export")(self.controller.export_best_markets)

        # market prices
        self.router.get("/{asset_id}/analysis/market/price-spread")(self.controller.get_price_spread_analysis)
        self.router.get("/{asset_id}/analysis/market-price/volatility")(self.controller.get_price_volatility_analysis)
        self.router.get("/{asset_id}/analysis/market/hourly-price-patterns")(self.controller.get_hourly_price_patterns)
        self.router.get("/{asset_id}/analysis/price/correlation-matrix")(self.controller.get_price_correlation_matrix)

        # ancillary services
        self.router.get("/{asset_id}/analysis/ancillary/summary")(self.controller.get_ancillary_summary)
        self.router.get("/{asset_id}/analysis/ancillary/revenue-breakdown")(self.controller.get_ancillary_breakdown)
        self.router.get("/{asset_id}/analysis/ancillary/revenue-breakdown/export")(self.controller.export_ancillary_breakdown)
        self.router.get("/{asset_id}/analysis/ancillary/service-revenue-by-hour")(self.controller.get_service_revenue_by_hour)
        self.router.get("/{asset_id}/analysis/ancillary/opportunity-cost-analysis")(self.controller.get_opportunity_cost_analysis)

        # benchmark analysis
        self.router.get("/{asset_id}/benchmark/revenue-iar-vs-actual")(self.controller.get_revenue_iar_vs_actual)
        self.router.get("/{asset_id}/benchmark/revenue-iar-vs-actual/export")(self.controller.export_revenue_iar_vs_actual)
        self.router.get("/{asset_id}/benchmark/multi-market-optimized-vs-actual")(self.controller.get_multi_market_optimized_vs_actual)
        self.router.get("/{asset_id}/benchmark/multi-market-optimized-vs-actual/export")(self.controller.export_multi_market_optimized_vs_actual)

        # imbalance analysis
        self.router.get("/{asset_id}/analysis/imbalance/summary")(self.controller.get_imbalance_summary)
        self.router.get("/{asset_id}/analysis/imbalance/hourly-charges")(self.controller.get_imbalance_hourly_charges)
        self.router.get("/{asset_id}/analysis/imbalance/daily-breakdown")(self.controller.get_daily_imbalance_breakdown)
        self.router.get("/{asset_id}/analysis/imbalance/worst-days")(self.controller.get_top_5_worst_imbalance_days)
        self.router.get("/{asset_id}/analysis/imbalance/worst-days/export")(self.controller.export_top_5_worst_imbalance_days)

        # battery health analysis
        self.router.get("/{asset_id}/analysis/battery-health/summary")(self.controller.get_battery_health_analysis)
        self.router.get("/{asset_id}/analysis/battery-health/cycle-comparison")(self.controller.get_cycle_comparison)
        self.router.get("/{asset_id}/analysis/battery-health/strategy-cycling-comparison")(self.controller.get_strategy_cycling_comparison)
        self.router.get("/{asset_id}/analysis/battery-health/annual-projection-report")(self.controller.get_annual_projection_report)
        self.router.get("/{asset_id}/analysis/battery-health/daily-cycles")(self.controller.get_daily_cycles)
        self.router.get("/{asset_id}/analysis/battery-health/warranty-exceedance")(self.controller.get_warranty_limit_exceedance)

        # tb spread analysis
        self.router.get("/{asset_id}/analysis/tb-spread/summary")(self.controller.get_tb_spread_summary)
        self.router.get("/{asset_id}/analysis/tb-spread/details")(self.controller.get_tb_spread_details)
        self.router.get("/{asset_id}/analysis/tb-spread/details/export")(self.controller.export_tb_spread_details)
