from typing import Tuple
from constants.enums import BessState, DGTriggerType, LoadServingPriority
from simulation_engine.schemas import (
    HourlyResult,
    SimulationParams,
    SimulationState,
    SingleSimulationResult,
)
from simulation_engine.utils import (
    get_datetime_from_hour_of_year,
    is_within_march_to_october,
)


class SimulationEngine:
    def __init__(self, params: SimulationParams, year: int):
        self.TOLERANCE = 0.001
        self.SIMULATION_TEMPLATES = {
            0: self.__template_0,
            1: self.__template_1,
            2: self.__template_2,
            3: self.__template_3,
        }
        self.params = params
        self.year = year
        self.state: SimulationState = SimulationState(
            current_soc=params.bess_initial_soc_mwh
        )
        self.hourly_result = HourlyResult()

    def __charge_bess(
        self, solar_energy_avl: float = 0.0, dg_energy_avl: float = 0.0
    ) -> Tuple[float, float]:
        energy_avl = solar_energy_avl + dg_energy_avl
        if energy_avl <= 0 or self.state.bess_dissabled:
            self.hourly_result.solar_curtailed = solar_energy_avl
            self.hourly_result.dg_curtailed = dg_energy_avl
            return solar_energy_avl, dg_energy_avl

        self.hourly_result.solar_to_bess = 0.0
        self.hourly_result.dg_to_bess = 0.0

        if solar_energy_avl > 0:
            physical_gap = max(0, self.params.bess_max_soc_mwh - self.state.current_soc)
            bess_capacity_avl = physical_gap / self.params.charge_discharge_efficiency

            charge = min(
                solar_energy_avl,
                self.params.bess_power_mw,
                bess_capacity_avl,
            )

            solar_energy_avl -= charge

            if charge > 0:
                self.state.bess_used = True

            self.hourly_result.solar_to_bess = charge
            soc_mwh_increase = charge * self.params.charge_discharge_efficiency

            self.hourly_result.solar_curtailed = solar_energy_avl
            self.state.current_soc += soc_mwh_increase
            self.state.solar_in_bess += soc_mwh_increase
            self.hourly_result.charging_loss += charge - soc_mwh_increase

        if dg_energy_avl > 0:
            if self.params.cycle_charging_enabled:
                physical_gap = max(
                    0, self.params.cycle_charging_off_soc_mwh - self.state.current_soc
                )
                bess_capacity_avl = (
                    physical_gap / self.params.charge_discharge_efficiency
                )
            else:
                physical_gap = max(
                    0, self.params.bess_max_soc_mwh - self.state.current_soc
                )
                bess_capacity_avl = (
                    physical_gap / self.params.charge_discharge_efficiency
                )

            charge = min(
                dg_energy_avl,
                self.params.bess_power_mw,
                bess_capacity_avl,
            )

            dg_energy_avl -= charge

            if charge > 0:
                self.state.bess_used = True

            self.hourly_result.dg_to_bess = charge
            self.hourly_result.dg_curtailed = dg_energy_avl

            soc_mwh_increase = charge * self.params.charge_discharge_efficiency
            self.state.current_soc += soc_mwh_increase
            self.hourly_result.charging_loss += charge - soc_mwh_increase

        return solar_energy_avl, dg_energy_avl

    def __get_bess_discharge_amount(self, energy_required: float):
        if energy_required <= 0 or self.state.bess_dissabled:
            return 0.0

        cycles_remaining = max(
            0, self.params.bess_daily_cycle_limit - self.state.daily_cycles
        )
        cycle_limit_mwh = cycles_remaining * self.params.usable_cycle_range_mwh

        bess_power_avl = max(0, self.state.current_soc - self.params.bess_min_soc_mwh)
        bess_discharge_limit_to_load = (
            bess_power_avl * self.params.charge_discharge_efficiency
        )

        return min(
            energy_required,
            self.params.bess_power_mw,
            cycle_limit_mwh,
            bess_discharge_limit_to_load,
        )

    def __discharge_bess(self, energy_required: float) -> float:
        """
        Executes BESS discharge to satisfy the required load, updates the state of charge
        and cycle metrics, and returns the remaining unsatisfied load.

        Note: Enforces daily cycle limits but does not capture granular hourly time-series data.
        """

        discharge = self.__get_bess_discharge_amount(energy_required=energy_required)
        self.hourly_result.bess_to_load = discharge

        if discharge <= 0:
            return energy_required

        self.state.bess_used = True

        actual_soc_reduction = discharge / self.params.charge_discharge_efficiency
        self.hourly_result.discharging_loss += actual_soc_reduction - discharge
        self.state.current_soc -= actual_soc_reduction
        self.state.total_bess_discharge_mwh += discharge

        self.state.hourly_cycle = discharge / self.params.usable_cycle_range_mwh
        self.state.daily_cycles += self.state.hourly_cycle

        if self.state.daily_cycles >= self.params.bess_daily_cycle_limit - 1e-9:
            self.state.bess_dissabled = True

        return energy_required - discharge

    def __can_dg_proceed(
        self,
        remaining_load,
        dg_available: bool,
    ) -> bool:
        if (
            not self.params.dg_enabled
            or not dg_available
            or self.params.dg_capacity_mw <= 0
        ):
            self.state.is_dg_running = False
            return False

        # Evaluate Trigger Logic
        if self.params.dg_trigger_type == DGTriggerType.SOC_THRESHOLD:
            # Use MWh thresholds for comparison
            if (
                self.state.current_soc < self.params.dg_soc_on_mwh
                and not self.state.is_dg_running
            ):
                self.state.is_dg_running = True
                self.state.dg_start_count += 1
            elif self.state.current_soc > self.params.dg_soc_off_mwh:
                self.state.is_dg_running = False

        # INFO: Working of PREEMPTIVE_NIGHT is not clear.
        elif (
            self.params.dg_trigger_type == DGTriggerType.SOLAR_BATTERY_DEFICIT
            or self.params.dg_trigger_type == DGTriggerType.PREEMPTIVE_NIGHT
        ):
            if remaining_load > self.TOLERANCE and not self.state.is_dg_running:
                self.state.is_dg_running = True
                self.state.dg_start_count += 1
            elif remaining_load <= self.TOLERANCE:
                self.state.is_dg_running = False

        # Early exit if DG is OFF
        if not self.state.is_dg_running:
            return False

        return True

    def __dispatch_dg(
        self,
        remaining_load: float,
        dg_available: bool,
    ) -> Tuple[float, float, float]:
        """
        Dispatches the Diesel Generator to fulfill the remaining load.
        Returns the final unserved load, excess DG power and fuel.
        """

        # WARNING: Need to fix the variable mode logic.
        if not self.__can_dg_proceed(
            remaining_load=remaining_load,
            dg_available=dg_available,
        ):
            return remaining_load, 0.0, 0.0

        dg_to_load = min(self.params.dg_capacity_mw, remaining_load)
        remaining_load -= dg_to_load

        if not self.params.dg_operation_binary:
            if self.params.cycle_charging_enabled:
                minimum_stable_load = self.params.cycle_charging_min_load_mwh
            else:
                minimum_stable_load = self.params.min_stable_load_mw
            self.hourly_result.dg_output_mw = max(dg_to_load, minimum_stable_load)
        else:
            self.hourly_result.dg_output_mw = self.params.dg_capacity_mw

        self.hourly_result.dg_to_load = dg_to_load
        self.state.dg_generation = self.hourly_result.dg_output_mw

        remaining_dg_power = self.hourly_result.dg_output_mw - dg_to_load

        fuel = self.__calculate_fuel(dg_output_mw=self.hourly_result.dg_output_mw)
        self.state.fuel_consumption_l = fuel

        return remaining_load, remaining_dg_power, fuel

    def __calculate_fuel(self, dg_output_mw: float):
        if self.params.dg_fuel_curve_enabled:
            return (self.params.dg_fuel_f0 * self.params.dg_capacity_mw * 1000) + (
                self.params.dg_fuel_f1 * dg_output_mw * 1000
            )
        return self.params.dg_capacity_mw * 1000 * self.params.dg_fuel_flat_rate

    def __template_0(
        self,
        remaining_load: float,
        excess_solar: float,
        dg_available: bool = False,
        **kwargs,
    ) -> Tuple[float, float, float, float]:
        """Solar and BESS only."""

        energy_val, _ = self.__charge_bess(
            solar_energy_avl=excess_solar, dg_energy_avl=0
        )
        self.hourly_result.solar_curtailed = energy_val

        energy_required = self.__discharge_bess(energy_required=remaining_load)

        return energy_val, 0.0, energy_required, 0.0

    def __template_1(
        self,
        remaining_load: float,
        excess_solar: float,
        dg_available: bool = False,
        **kwargs,
    ) -> Tuple[float, float, float, float]:
        """BESS First + DG Fills Gap"""
        energy_required = self.__discharge_bess(energy_required=remaining_load)

        remaining_load, excess_dg, fuel = self.__dispatch_dg(
            remaining_load=energy_required,
            dg_available=dg_available,
        )

        unprocessed_dg = 0.0
        if not self.params.dg_charges_bess:
            unprocessed_dg = excess_dg
            excess_dg = 0.0

        exess_solar, excess_dg = self.__charge_bess(
            solar_energy_avl=excess_solar, dg_energy_avl=excess_dg
        )

        if unprocessed_dg > 0:
            self.hourly_result.dg_curtailed += unprocessed_dg

        return exess_solar, unprocessed_dg + excess_dg, remaining_load, fuel

    def __template_2(
        self,
        remaining_load: float,
        excess_solar: float,
        dg_available: bool = False,
        **kwargs,
    ) -> Tuple[float, float, float, float]:
        """DG First + BESS Second"""

        remaining_load, excess_dg, fuel = self.__dispatch_dg(
            remaining_load=remaining_load,
            dg_available=dg_available,
        )
        energy_required = self.__discharge_bess(energy_required=remaining_load)

        unprocessed_dg = 0.0
        if not self.params.dg_charges_bess:
            unprocessed_dg = excess_dg
            excess_dg = 0.0

        exess_solar, excess_dg = self.__charge_bess(
            solar_energy_avl=excess_solar, dg_energy_avl=excess_dg
        )

        if unprocessed_dg > 0:
            self.hourly_result.dg_curtailed += unprocessed_dg

        return exess_solar, unprocessed_dg + excess_dg, energy_required, fuel

    def __template_3(
        self,
        remaining_load: float,
        excess_solar: float,
        dg_available: bool = False,
        **kwargs,
    ) -> Tuple[float, float, float, float]:
        """BESS First + DG Takeover"""
        bess_possible = self.__get_bess_discharge_amount(energy_required=remaining_load)
        fuel = 0.0

        if bess_possible < (remaining_load - 1e-9):
            # DG Takeover
            excess_solar = kwargs.get("solar", 0.0)
            load: float = kwargs.get("load", 0.0)

            # Since DG takes over the entire load, solar does not go to load directly
            self.hourly_result.solar_to_load = 0.0

            remaining_load, excess_dg, fuel = self.__dispatch_dg(
                remaining_load=load,
                dg_available=dg_available,
            )

            unprocessed_dg = 0.0
            if not self.params.dg_charges_bess:
                unprocessed_dg = excess_dg
                excess_dg = 0.0

        else:
            remaining_load = self.__discharge_bess(energy_required=remaining_load)

            # Only to turn off dg
            remaining_load, excess_dg, fuel = self.__dispatch_dg(
                remaining_load=remaining_load,
                dg_available=dg_available,
            )

            unprocessed_dg = 0.0
            if not self.params.dg_charges_bess:
                unprocessed_dg = excess_dg
                excess_dg = 0.0

        exess_solar, excess_dg = self.__charge_bess(
            solar_energy_avl=excess_solar, dg_energy_avl=excess_dg
        )

        if unprocessed_dg > 0:
            self.hourly_result.dg_curtailed += unprocessed_dg

        return exess_solar, unprocessed_dg + excess_dg, remaining_load, fuel

    @classmethod
    def get_template_id(cls, params: SimulationParams) -> int:
        if params.dg_enabled is False:
            return 0
        if params.dg_takeover_mode:
            return 3
        if params.load_priority == LoadServingPriority.DG_FIRST:
            return 2

        return 1

    def run_simulation(
        self,
        template_id: int,
        simulation_id: int,
        job_id: int,
        total_hours=8760,
        store_hourly: bool = False,
    ) -> tuple[SingleSimulationResult, list[dict]]:

        result: SingleSimulationResult = SingleSimulationResult(
            bess_mwh=self.params.bess_capacity_mwh,
            duration_hr=self.params.duration_hr,
            power_mw=self.params.bess_capacity_mwh / self.params.duration_hr,
            containers=int(self.params.bess_capacity_mwh / 5),
            dg_mw=self.params.dg_capacity_mw,
            load_hours=self.params.total_load_hours,
            solar_generation=self.params.total_solar_generated,
        )

        hourly_resutls: list[dict] = []

        for hour in range(total_hours):
            day_of_year = (hour // 24) + 1
            self.hourly_result.hour = hour
            self.state.hourly_cycle = 0.0
            self.state.fuel_consumption_l = 0
            self.state.dg_generation = 0

            self.hourly_result.reset()

            if day_of_year > self.state.current_day:
                self.state.current_day = day_of_year
                self.hourly_result.day = day_of_year
                self.state.bess_dissabled = False
                result.bess_cycles += self.state.daily_cycles

                self.state.daily_cycles = 0.0

                if self.state.bess_used:
                    self.state.bess_operation_day += 1

                self.state.bess_used = False

            load = self.params.load_profile[hour]
            solar = self.params.solar_profile[hour]

            self.hourly_result.load_mw = load
            self.hourly_result.solar_mw = solar

            solar_to_load = min(solar, load)
            remaining_load = load - solar_to_load
            excess_solar = solar - solar_to_load

            self.hourly_result.solar_to_load = solar_to_load

            waste_solar_mw, waste_dg_mw, unserved_load, fuel = (
                self.SIMULATION_TEMPLATES.get(template_id, self.__template_0)(
                    remaining_load=remaining_load,
                    excess_solar=excess_solar,
                    dg_available=self.params.dg_hours[hour],
                    solar=solar,
                    load=load,
                )
            )

            internal_bess_needed = (
                self.hourly_result.bess_to_load
                / self.params.charge_discharge_efficiency
            )

            green_bess_to_load = min(self.state.solar_in_bess, internal_bess_needed)
            self.state.solar_in_bess -= green_bess_to_load
            self.hourly_result.green_energy_to_load_mwh = (
                self.hourly_result.solar_to_load
                + (green_bess_to_load * self.params.charge_discharge_efficiency)
            )

            self.hourly_result.bess_power_mw = self.hourly_result.bess_to_load - (
                self.hourly_result.solar_to_bess + self.hourly_result.dg_to_bess
            )

            if (
                self.hourly_result.bess_power_mw == 0
                and self.hourly_result.bess_to_load == 0
            ):
                self.hourly_result.bess_state = BessState.IDLE
            elif self.hourly_result.bess_power_mw > self.TOLERANCE:
                self.hourly_result.bess_state = BessState.DISCHARGING
            else:
                self.hourly_result.bess_state = BessState.CHARGING

            self.hourly_result.unmet_mw = unserved_load
            self.hourly_result.soc_mwh = self.state.current_soc
            self.hourly_result.soc_percent = (
                self.state.current_soc / self.params.bess_capacity_mwh
            ) * 100
            self.hourly_result.daily_cycles = self.state.daily_cycles
            self.hourly_result.is_dg_running = self.state.is_dg_running

            result.unserved_mwh += unserved_load
            if load > 0:
                result.solar_gen_during_load += solar
                result.solar_curtailed_during_load += waste_solar_mw

                is_mar_to_oct = is_within_march_to_october(
                    year=self.year, hour_of_year=hour
                )
                if is_mar_to_oct:
                    result.load_hours_mar_oct += 1

                if unserved_load <= self.TOLERANCE:
                    result.delivery_hours += 1
                    result.delivery_met_mwh += load
                    self.hourly_result.delivery = True
                    if not self.state.is_dg_running:
                        if is_mar_to_oct:
                            result.green_hours_mar_oct += 1
                        result.green_hours += 1

            result.dg_generation += self.state.dg_generation
            result.wastage_mw += waste_solar_mw
            result.solar_curtailed += waste_solar_mw
            result.dg_curtailed += waste_dg_mw
            result.green_energy_to_load_mwh += (
                self.hourly_result.green_energy_to_load_mwh
            )
            result.solar_to_load += self.hourly_result.solar_to_load
            result.solar_hrs += int(self.hourly_result.solar_to_load > self.TOLERANCE)

            result.dg_to_load += self.hourly_result.dg_to_load
            result.energy_to_load += (
                self.hourly_result.solar_to_load
                + self.hourly_result.bess_to_load
                + self.hourly_result.dg_to_load
            )
            result.discharging_loss += self.hourly_result.discharging_loss
            result.charging_loss += self.hourly_result.charging_loss
            result.bess_hrs += int(self.state.hourly_cycle > self.TOLERANCE)
            if self.state.is_dg_running:
                result.dg_hours += 1
                result.fuel_consumption_l += fuel

            # Store the Hourly result
            if store_hourly:
                self.hourly_result.timestamp, self.hourly_result.hour_of_day = (
                    get_datetime_from_hour_of_year(year=self.year, hour_of_year=hour)
                )
                hourly_resutls.append(
                    {k: v for k, v in self.hourly_result.__dict__.items()}
                    | {
                        "simulation_id": simulation_id,
                        "custom_job_id": job_id,
                        "job_id": job_id,
                    },
                )

        # result.bess_cycles = self.state.total_bess_discharge_mwh / (
        #     self.params.bess_max_soc_mwh - self.params.bess_min_soc_mwh
        # )

        if self.state.bess_operation_day > 0:
            result.bess_cycles = result.bess_cycles / self.state.bess_operation_day
        else:
            result.bess_cycles = 0

        result.final_soc_pct = (
            self.state.current_soc / self.params.bess_capacity_mwh
        ) * 100
        result.bess_to_load = self.state.total_bess_discharge_mwh
        result.dg_starts = self.state.dg_start_count

        return result, hourly_resutls
