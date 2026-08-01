from fastapi import APIRouter, Depends
from context.dependency import validate_simulation_access
from controller import RunSimulationController, SimulationSetupController


class SimulationRouter:
    def __init__(self):
        self.router = APIRouter(dependencies=[Depends(validate_simulation_access)])
        self.endpoint = "/simulation"
        self.controller = SimulationSetupController()
        self.run_controller = RunSimulationController()
        self.tags = ["Simulations"]

        # Load profile endpoints
        self.router.post("/{simulation_id}/load-profile/compute")(
            self.controller.compute_load_profile
        )
        self.router.post("/{simulation_id}/load-profile")(
            self.controller.compute_and_save_load_profile
        )
        self.router.get("/{simulation_id}/load-profile")(
            self.controller.get_load_profile
        )

        # BESS configuration endpoints
        self.router.post("/{simulation_id}/container-config")(
            self.controller.save_bess_config
        )
        self.router.get("/{simulation_id}/container-config")(
            self.controller.get_bess_config
        )

        # DG configuration endpoints
        self.router.get("/{simulation_id}/dg")(self.controller.get_dg_config)
        self.router.post("/{simulation_id}/dg")(self.controller.upsert_dg_config)
        self.router.post("/{simulation_id}/dg/fuel-curve")(
            self.controller.fuel_curve_calculation
        )

        # Dispatch rule configuration endpoints
        self.router.post("/{simulation_id}/dispatch-rule")(
            self.controller.upsert_dispatch_rules
        )
        self.router.get("/{simulation_id}/dispatch-rule")(
            self.controller.get_dispatch_rules
        )

        # BESS & DG sizing endpoints
        self.router.post("/{simulation_id}/bess-dg-sizing")(
            self.controller.upsert_bess_dg_sizing
        )
        self.router.get("/{simulation_id}/bess-dg-sizing")(
            self.controller.get_bess_dg_sizing
        )
        self.router.patch("/{simulation_id}")(self.controller.update_simulation)
        self.router.delete("/{simulation_id}")(self.controller.delete_simulation)
        self.router.get("/{simulation_id}")(self.controller.get_simulation_details)
        self.router.get("/{simulation_id}/step")(self.controller.fetch_simulation_step)

        # Run sizing Simulation
        self.router.post("/{simulation_id}/sizing/run")(
            self.run_controller.run_sizing_simulation
        )
        self.router.post("/{simulation_id}/sizing/stop")(
            self.run_controller.stop_simulation
        )
        self.router.get("/{simulation_id}/sizing/progress")(
            self.run_controller.get_simulation_progress
        )
        self.router.get("/{simulation_id}/sizing/results")(
            self.run_controller.get_simulation_results
        )
        self.router.get("/{simulation_id}/sizing/results/export")(
            self.run_controller.export_simulation_results
        )

        # Custom configuration endpoints
        self.router.post("/{simulation_id}/custom-config")(
            self.controller.upsert_custom_config
        )
        self.router.get("/{simulation_id}/custom-config")(
            self.controller.get_custom_config
        )

        # Run Simulation
        self.router.post("/{simulation_id}/run")(self.run_controller.run_simulation)
        self.router.get("/{simulation_id}/results")(
            self.run_controller.get_single_simulation_results
        )
        self.router.get("/{simulation_id}/hourly-results")(
            self.run_controller.get_single_hourly_simulation_results
        )
        self.router.get("/{simulation_id}/hourly-chart")(
            self.run_controller.get_single_hourly_simulation_chart_results
        )
        self.router.get("/{simulation_id}/hourly-results/export")(
            self.run_controller.export_single_simulation_results
        )
        self.router.get("/{simulation_id}/monthly-results")(
            self.run_controller.get_monthly_simulation_result
        )
        self.router.get("/{simulation_id}/monthly-results/export")(
            self.run_controller.export_monthly_simulation_results
        )
        self.router.get("/{simulation_id}/multi-year-projection/")(
            self.controller.get_multi_year_projection
        )
        self.router.post("/{simulation_id}/multi-year-projection/compute")(
            self.controller.compute_multi_year_projection
        )
        self.router.post("/{simulation_id}/multi-year-projection")(
            self.controller.save_multi_year_projection
        )
        self.router.post("/{simulation_id}/multi-year/run")(
            self.run_controller.run_multi_year_simulation
        )
        self.router.post("/{simulation_id}/multi-year/stop")(
            self.run_controller.stop_multi_year_simulation
        )
        self.router.get("/{simulation_id}/multi-year/progress")(
            self.run_controller.get_multi_year_simulation_progress
        )
        self.router.get("/{simulation_id}/multi-year/results")(
            self.run_controller.get_multi_year_simulation_results
        )
        self.router.get("/{simulation_id}/multi-year/results/export")(
            self.run_controller.export_multi_year_simulation_results
        )

        # Green energy analysis endpoints
        self.router.post("/{simulation_id}/green-energy-analysis")(
            self.controller.upsert_green_energy_config
        )
        self.router.get("/{simulation_id}/green-energy-analysis")(
            self.controller.get_green_energy_config
        )

        # Run Green Energy Simulation endpoints
        self.router.post("/{simulation_id}/green-energy-analysis/run")(
            self.run_controller.run_green_energy_simulation
        )
        self.router.post("/{simulation_id}/green-energy-analysis/stop")(
            self.run_controller.stop_green_energy_simulation
        )
        self.router.get("/{simulation_id}/green-energy-analysis/progress")(
            self.run_controller.get_green_energy_simulation_progress
        )
        self.router.get("/{simulation_id}/green-energy-analysis/results")(
            self.run_controller.get_green_energy_simulation_results
        )
        self.router.get("/{simulation_id}/green-energy-analysis/results/export")(
            self.run_controller.export_green_energy_simulation_results
        )

        # Detail green configuration endpoints
        self.router.post("/{simulation_id}/detailed-green-energy")(
            self.controller.upsert_detail_green_config
        )
        self.router.get("/{simulation_id}/detailed-green-energy")(
            self.controller.get_detail_green_config
        )

        # Detailed green simulation run/results endpoints
        self.router.post("/{simulation_id}/detailed-green-energy/run")(
            self.run_controller.run_detailed_green_simulation
        )
        self.router.get("/{simulation_id}/detailed-green-energy/result")(
            self.run_controller.get_detailed_green_simulation_results
        )
        self.router.get("/{simulation_id}/detailed-green-energy/hourly/export")(
            self.run_controller.export_detailed_green_hourly_results
        )
        self.router.get("/{simulation_id}/detailed-green-energy/monthly/export")(
            self.run_controller.export_detailed_green_monthly_results
        )
        self.router.get("/{simulation_id}/detailed-green-energy/progress")(
            self.run_controller.get_detailed_green_simulation_progress
        )
