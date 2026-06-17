import type { ActionType, AuditLogModules, AuditLogScenario, Platform, ResourceType, UserRole } from '@/constants';
export { SortType } from '@lazarus/react-common/interface';
export { Auth } from '@lazarus/react-common/interface';
export type ENV = 'loc' | 'dev' | 'qa' | 'uat' | 'prod';
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// =============================== Entities ===============================
export interface User {
  id: number;
  user_id: string;
  name: string;
  email: string;
  role: UserRole;
  status: boolean;
  last_activity: string;
  platform?: Platform[];
}

export interface ProjectUser {
  id: number;
  name: string;
  role: UserRole;
}

export interface Project {
  id: number;
  proj_id: string;

  name: string;
  description: string;

  owned_by: ProjectUser;

  created_by: ProjectUser;

  assigned_users: ProjectUser[];

  status: number;

  created_date: string;
}

export interface SolarProfileSource {
  key: string;
  size: number;
  rows: number;
  name: string;
  id: string;
}

export interface Simulation {
  id: number;
  name: string;
  progress: number;
  edited_step: number;
  status: number;
  last_updated?: string;
  project_id: number;
  config?: {
    load: {
      id: number;
      pattern: {
        id: number;
        label: string;
      };
      config: {
        windows?: any;
        load_mw: number;
      };
      total_hours: number;
    };
    solar: {
      id: number;
      source: {
        id: number;
        name: string;
        year: number;
      };
      peak_generation: number;
      total_generation: number;
      avg_generation: number;
    };
    bess: {
      bess_min_soc: number;
      bess_max_soc: number;
      bess_initial_soc: number;
      bess_efficiency: number;
      bess_daily_cycle_limit: number;
      bess_enforce_cycle_limit: number;
    };
    dg: {
      load_coeff: null;
      no_load_coeff: null;
      is_included: boolean;
      is_binary: boolean;
      fuel_price: number;
      advanced_fuel_curve: boolean;
      flat_fuel_rate: number;
      min_stable_load?: number;
    };
    dispatch: {
      dg_run_schedule_mode: number;
      dg_trigger_type: number | null;
      is_dg_charging_bess: boolean | null;
      load_serving_priority: number | null;
      is_dg_takeover_full_load: boolean | null;
      is_cycle_charging_enabled: boolean | null;
    };
    bess_dg_sizing: {
      bess_min: number;
      bess_max: number;
      dg_min: number;
      dg_max: number;
      dg_step_size: number;
    };
  };
}

export interface SocketEvent {
  resource_type: ResourceType;
  resource_id: number;
  action_id: ActionType;
  data: any;
  status?: 'success' | 'error';
  status_code?: string;
}

export interface SimulationResults {
  bess_mwh: number;
  duration_hr: string;
  power_mw: number;
  containers: number;
  dg_mw: string;
  delivery_percentage: number;
  green_percentage: number;
  wastage_percentage: number;
  delivery_hrs: number;
  load_hrs: number;
  green_hrs: number;
  dg_hrs: number;
  dg_starts: number;
  bess_cycles: number;
  unserved_mwh: number;
  fuel_l: number;
}

export interface CustomHourlyResults {
  timestamp: string;
  hour: number;
  day: number;
  hour_of_day: number;
  load_mw: number;
  solar_mw: number;
  solar_to_load: number;
  solar_to_bess: number;
  solar_curtailed: number;
  bess_to_load: number;
  bess_power_mw: number;
  bess_state: number;
  dg_output_mw: number;
  is_dg_running: boolean;
  dg_to_load: number;
  dg_to_bess: number;
  dg_curtailed: number;
  soc_mwh: number;
  soc_percent: number;
  unmet_mw: number;
  delivery: boolean;
  daily_cycles: number;
  green_energy_to_load_mwh: number;
  dg_to_load_mwh: number;
  id: number;
  simulation_id: number;
}

export interface CustomMonthlyResults {
  month: string;
  load_met_pct: number;
  green_energy_pct: number;
  wastage_energy_pct: number;
  hours_fully_served: number;
  total_load_hours: number;
  generator_hours: number;
  green_energy_to_load_mwh: number;
  dg_to_load_mwh: number;
  curtailed_mwh: number;
}

export interface HouryChart {
  timestamp: string;
  solar: number;
  dg_output: number;
  bess_power: number;
  soc_pct: number;
  delivery_mwh: number;
  bess_energy: number;
  load: number;
}

export interface MultiYearProjectionResults {
  id: number;
  simulation_id: number;
  job_id: number;
  year: number;
  bess_mwh: number;
  capacity_percent: number;
  delivery_hours: number;
  load_hours: number;
  delivery_pct: number;
  dg_hours: number;
  green_energy_to_load_mwh: number;
  dg_to_load_mwh: number;
  solar_hrs: number;
  bess_hrs: number;
  wastage_mw: number;
  wastage_pct: number;
  load_solar_wastage_pct: number;
  bess_loss_mwh: number;
  solar_generation: number;
  dg_generation: number;
  solar_to_load: number;
  bess_to_load: number;
  dg_to_load: number;
  dg_curtailed: number;
  energy_to_load: number;
  delivery_met_mwh: number;
  charging_loss: number;
  discharging_loss: number;
  final_soc_pct: number;
  solar_gen_during_load: number;
  solar_curtailed_during_load: number;
  solar_curtailed: number;
  created_at: string;
}