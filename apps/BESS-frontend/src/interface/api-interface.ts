import type { AuditLogModules, AuditLogScenario, UserRole } from '@/constants';
import type { ENV, User, Project, SolarProfileSource, Simulation, SimulationResults, CustomHourlyResults, CustomMonthlyResults, HouryChart, MultiYearProjectionResults } from './common-interface';
import type { SortType, APIResponse, AuditLog } from '@lazarus/react-common/interface';
export type { APIResponse, LoginRequest, VerifyOtpRequest } from '@lazarus/react-common/interface/api-interface';

export interface ApiConfigInterface {
  currentEnv: string | undefined;
  baseUrls: Record<ENV, string>;
  webAppUrls: Record<ENV, string>;
  noAuthUrls: {
    demo: string;
    login: string;
    verifyOtp: string;
  };
  authUrls: {
    users: string;
    projects: string;
    loadProfile: string;
    loadProfileSave: string;
    solarProfile: string;
    solarUploadCSV: string;
    solarProfileSave: string;
    bessConfig: string;
    solarProfileSource: (simulation_id: string) => string;
    generatorDg: string;
    dispatchRules: string;
    dgSizing: string;
    simulationList: string;
    projectSimulation: string;
    runSizingSimulation: string;
    audit_logs: string;
    custom_config: string;
    runSimulation: string;
    multiYearProjection: string;
    multiYearProjectionRun: string;

    // websocket
    ws_token: string;
    ws: string;
  };
}

// =============================== Users Slice ===============================
export interface UserListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    platform?: number;
    organization?: number;
    status?: boolean;
    start_date?: string;
    end_date?: string;
    sort?: SortType;
  };
  response: APIResponse<{
    users: User[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_results: number;
  }>;
}

// ============================== Simulation Slice =============================
export interface SolarProfileSourceListRequest {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    files: SolarProfileSource[];
  }>;
}

// =============================== Project Slice ===============================
export interface ProjectListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
  };

  response: APIResponse<{
    projects: Project[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_results: number;
  }>;
}
export interface ReassignProjectOwnerRequest {
  params: {
    project_id: number;
  };
  payload: {
    user_id: number;
  };
  response: APIResponse<{
    proj_id: number;
    owned_by: {
      id: number;
      name: string;
      role: number;
    };
  }>;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  responsible_user_id: number | null;
  status: boolean;
  assigned_users: number[];
}

export interface UpdateProjectPayload {
  projectId: number;
  payload: {
    name: string;
    description: string;
    responsible_user_id: number | null;
    status: boolean;
    assigned_users: number[];
  };
}

export interface DeleteProjectRequest {
  payload: {
    id: number;
  };
  response: APIResponse<{
    id: number;
  }>;
}

export interface GeneratorDg {
  payload: {
    simulation_id: number;
    is_included: boolean;
    is_binary: boolean;
    min_stable_load: number | null;
    fuel_price: number | null;
    advanced_fuel_curve: boolean;
    flat_fuel_rate: number | null;
    no_load_coeff: number | null;
    load_coeff: number | null;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    is_included: boolean;
    is_binary: boolean;
    min_stable_load: number | null;
    fuel_price: number;
    advanced_fuel_curve: boolean;
    flat_fuel_rate: number | null;
    no_load_coeff: number | null;
    load_coeff: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GetGeneratorDg {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    is_included: boolean;
    is_binary: boolean;
    min_stable_load: number | null;
    fuel_price: number;
    advanced_fuel_curve: boolean;
    flat_fuel_rate: number | null;
    no_load_coeff: number | null;
    load_coeff: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GeneratorDgFuelCurve {
  payload: {
    simulation_id: number;
    no_load_coeff: number | null;
    load_coeff: number | null;
  };
  response: APIResponse<{
    fuel_curve_points: {
      load_percentage: number;
      output_mw: number;
      fuel_rate_l_hr: number;
      specific_fuel_rate_l_kwh: number;
    }[];
  }>;
}
export interface DispatchRule {
  payload: {
    simulation_id: number;
    dg_run_schedule_mode: number;
    dg_start_time: number | null;
    dg_end_time: number | null;
    dg_trigger_type: number | null;
    dg_soc_on_threshold: number | null;
    dg_soc_off_threshold: number | null;
    is_dg_charging_bess: boolean | null;
    load_serving_priority: number | null;
    is_dg_takeover_full_load: boolean | null;
    is_cycle_charging_enabled: boolean | null;
    min_load: number | null;
    stop_soc: number | null;
  };

  response: APIResponse<{
    id: number;
    simulation_id: number;
    dg_run_schedule_mode: number;
    dg_start_time: number | null;
    dg_end_time: number | null;
    dg_trigger_type: number | null;
    dg_soc_on_threshold: number | null;
    dg_soc_off_threshold: number | null;
    is_dg_charging_bess: boolean | null;
    load_serving_priority: number | null;
    is_dg_takeover_full_load: boolean | null;
    is_cycle_charging_enabled: boolean | null;
    min_load: number | null;
    stop_soc: number | null;
    is_generator_included?: boolean | null;
    is_generator_binary?: boolean | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GetDispatchRule {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    dg_run_schedule_mode: number;
    dg_start_time: number | null;
    dg_end_time: number | null;
    dg_trigger_type: number | null;
    dg_soc_on_threshold: number | null;
    dg_soc_off_threshold: number | null;
    is_dg_charging_bess: boolean | null;
    load_serving_priority: number | null;
    is_dg_takeover_full_load: boolean | null;
    is_cycle_charging_enabled: boolean | null;
    min_load: number | null;
    stop_soc: number | null;
    is_generator_included?: boolean | null;
    is_generator_binary?: boolean | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface DGSizing {
  payload: {
    simulation_id: number;
    bess_min: number;
    bess_max: number | null;
    dg_min: number | null;
    dg_max: number | null;
    dg_step_size: number | null;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    bess_min: number | null;
    bess_max: number | null;
    dg_min: number | null;
    dg_max: number | null;
    dg_step_size: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GetDGSizing {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    bess_min: number | null;
    bess_max: number | null;
    dg_min: number | null;
    dg_max: number | null;
    dg_step_size: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface SimulationListRequest {
  params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    start_date?: string;
    end_date?: string;
    project_id: number;
  };

  response: APIResponse<{
    simulations: SimulationResults[];
    total_pages: number;
    current_page: number;
    next_page: number;
    total_count: number;
  }>;
}

export interface UpdateSimulationRequest {
  payload: {
    simulation_id: number;
    name?: string;
  };
  response: APIResponse<Simulation>;
}

export interface InitiateSimulation {
  payload: {
    project_id: number;
  };
  response: APIResponse<Simulation>;
}

export interface RunSimulationRequest {
  payload: {
    simulation_id: number;
  };
  response: APIResponse<{
    simulation_job_id: number;
  }>;
}

export interface GetSimulationProgress {
  payload: {
    simulation_id: number;
  };
  response: APIResponse<{
    simulation_job_id: number;
    current_config: number;
    total_config: number;
    progress_percentage: number;
    status: number;
  }>;
}

export interface SimulationResultRequest {
  params: {
    page?: number;
    limit?: number;
    duration_hr?: number[];
    dg_capacity?: number[];
    bess_capacity?: number[];
    delivery_percentage?: number;
    dg_runtime_hours?: number;
    sort?: string[];
    simulation_id: number;
    fileName?: string;
  };

  response: APIResponse<{
    results: SimulationResults[];
    total_configs: number;
    total_pages: number;
    current_page: number;
    next_page: number;
  }>;
}

// =============================== Websocket ===============================
export interface GetWsTokenRequest {
  response: APIResponse<{
    user_id: number;
    ephemeral_token: string;
  }>;
}


// =============================== Audit Log Slice ===============================
export interface AuditLogListRequest {
  params: {
    page?: number;
    limit?: number;
    user_id?: string;
    log_id?: string;
    role?: UserRole;
    module?: AuditLogModules;
    action?: AuditLogScenario;
    start_date?: string;
    end_date?: string;
    search?: string;
  };
  response: APIResponse<{
    logs: AuditLog[];
    total_pages: number;
    current_page: number;
    next_page: number | null;
    total_results: number;
  }>;
}

// =============================== Custom Config ===============================
export interface CustomConfig {
  payload: {
    simulation_id: number;
    duration_class: number;
    bess_capacity: number | null;
    dg_capacity: number | null;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    duration_class: number;
    bess_capacity: number | null;
    dg_capacity: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GetCustomConfig {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    id: number;
    simulation_id: number;
    duration_class: number;
    bess_capacity: number | null;
    dg_capacity: number | null;
    created_at: string;
    updated_at: string;
  }>;
}

export interface GetCustomSimulationResult {
  params: {
    simulation_id: number;
  };
  response: APIResponse<SimulationResults>;
}

export interface CustomHourlyResult {
  params: {
    page?: number;
    limit?: number;
    sort?: string[];
    simulation_id: number;
    start_time?: string;
    end_time?: string;
    fileName?: string;
  };

  response: APIResponse<{
    year: number;
    results: CustomHourlyResults[];
    total_configs: number;
    total_pages: number;
    current_page: number;
    next_page: number;
  }>;
}

export interface CustomMonthlyResult {
  params: {
    page?: number;
    limit?: number;
    sort?: string;
    simulation_id: number;
    month?: number[];
    fileName?: string;
  };

  response: APIResponse<{
    year: number;
    result: CustomMonthlyResults[];
    total_configs: number;
    total_pages: number;
    current_page: number;
    next_page: number;
  }>;
}

export interface CustomHourlyChartResult {
  params: {
    simulation_id: number;
    start_timestamp?: string;
    end_timestamp?: string;
  };

  response: APIResponse<{
    simulation_id: number;
    hourly_data: HouryChart[];
    curtailed_mwh: number;
    curtailed_pct: number;
    avg_soc_pct: number;
    total_delivery_hours: number;
    total_dg_hours: number;
    dg_on_pct: number;
    dg_off_pct: number;
  }>;
}

// =============================== Multi-Year Projection ===============================

type MultiYearProjectionOutput = {
  factory_degradation: number;
  annual_degradation: number;
  sizing_strategy: number;
  output: {
    nameplate_size_mwh: number;
    power_mw: number;
    containers: number;
    sizing_margin_pct: number;
    capacity_breakdown: {
      year_1_bol: {
        mwh: number;
        mw: number;
        bol_pct: number;
      };
      year_5: {
        mwh: number;
        mw: number;
        bol_pct: number;
      };
      year_10: {
        mwh: number;
        mw: number;
        bol_pct: number;
      };
      year_20: {
        mwh: number;
        mw: number;
        bol_pct: number;
      };
    };
  };
};
export interface MultiYearProjection {
  payload: {
    simulation_id: number;
    factory_degradation: number;
    annual_degradation: number | null;
    sizing_strategy: number | null;
  };
  response: APIResponse<MultiYearProjectionOutput>;
}

export interface GetMultiYearProjection {
  params: {
    simulation_id: number;
  };
  response: APIResponse<{
    config: {
      load: {
        pattern: {
          id: number;
          label: string;
        };
        config: {
          [key: string]: string | number | boolean | null;
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
      };
      bess: {
        bess_capacity: number;
        bess_power: number;
      };
      dg: {
        is_included: boolean;
        size: number;
      };
    };
    factory_degradation: number;
    annual_degradation: number;
    sizing_strategy: number;
    output: MultiYearProjectionOutput['output'];
  }>;
}

export interface MultiYearProjectionRequest {
  params: {
    simulation_id: number;
    sort?: string[];
    until_year?: number;
    bess_mwh? : number;
    capacity_percent? : number;
    delivery_hours? : number;
    load_hours? : number;
    delivery_pct? : number;
    dg_hours? : number;
    green_energy_to_load_mwh? : number;
    bess_hrs? : number;
    wastage_mw? : number;
    wastage_pct? : number;
    load_solar_wastage_pct? : number;
    bess_loss_mwh? : number;
    solar_generation? : number;
    solar_hrs? : number;
    dg_generation? : number;
    solar_to_load? : number;
    bess_to_load? : number;
    dg_to_load? : number;
    dg_curtailed? : number;
    energy_to_load? : number;
    delivery_met_mwh? : number;
    charging_loss? : number;
    discharging_loss? : number;
    final_soc_pct? : number;
    solar_gen_during_load? : number;
    solar_curtailed_during_load? : number;
    solar_curtailed? : number;
  };

  response: APIResponse<{
    results: MultiYearProjectionResults[]
  }>;
}

export interface GetMultiYearProgress {
  payload: {
    simulation_id: number;
  };
  response: APIResponse<{
    simulation_job_id: number;
    status: number;
  }>;
}