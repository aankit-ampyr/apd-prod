import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {
  AddMonthlyValuesRequest,
  APIResponse,
  GetMonthlyValuesRequest,
  MetricsBenchmarksRequest,
  SettingsSliceInitialState,
  UpdateBenchmarkMetricRequest,
  UpdateMonthlyValuesRequest,
} from '@/interface';

const initialState: SettingsSliceInitialState = {
  isLoading: false,
  settingsError: false,
  settingsSuccess: false,

  benchmarkLoading: false,
  benchmarkUpdateLoading: false,

  monthlyValuesLoading: false,
  monthlyValuesUpdateLoading: false,

  metrics: {
    industryBenchmarck: [],
    monthlyMetricValues: {
      metric: [],
      monthly_values: [],
    },
  },
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    // =========================
    // fetch benchmark metrics
    // =========================
    getBenchmarkMetricsRequest(state) {
      state.benchmarkLoading = true;
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    getBenchmarkMetricsSuccess(state, action: PayloadAction<MetricsBenchmarksRequest['response']>) {
      state.benchmarkLoading = false;
      state.settingsSuccess = action.payload.status_code;
      state.metrics.industryBenchmarck = action.payload.data ?? [];
    },
    getBenchmarkMetricsFailure(state, action: PayloadAction<APIResponse>) {
      state.benchmarkLoading = false;
      state.settingsError = action.payload.status_code;
    },

    // =========================
    // fetch benchmark metrics
    // =========================
    updateBenchmarkMetricsRequest(state, _action: PayloadAction<UpdateBenchmarkMetricRequest['payload']>) {
      state.benchmarkUpdateLoading = true;
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    updateBenchmarkMetricsSuccess(state, action: PayloadAction<UpdateBenchmarkMetricRequest['response']>) {
      state.benchmarkUpdateLoading = false;
      state.settingsSuccess = action.payload.status_code;
      if (action.payload.data) {
        for (const updatedMetric of action.payload.data) {
          for (let i = 0; i < state.metrics.industryBenchmarck.length; i++) {
            if (state.metrics.industryBenchmarck[i].id === updatedMetric.id) {
              state.metrics.industryBenchmarck[i] = {
                ...state.metrics.industryBenchmarck[i],
                ...updatedMetric,
              };
              break;
            }
          }
        }
      }
    },
    updateBenchmarkMetricsFailure(state, action: PayloadAction<APIResponse>) {
      state.benchmarkUpdateLoading = false;
      state.settingsError = action.payload.status_code;
    },

    // =========================
    // fetch monthly values
    // =========================
    getMonthlyValuesRequest(state, _action: PayloadAction<GetMonthlyValuesRequest['payload']>) {
      state.monthlyValuesLoading = true;
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    getMonthlyValuesSuccess(state, action: PayloadAction<GetMonthlyValuesRequest['response']>) {
      state.monthlyValuesLoading = false;
      state.settingsSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.metrics.monthlyMetricValues = {
          metric: action.payload.data.metrics ?? [],
          monthly_values: action.payload.data.monthly_values ?? [],
        };
      }
    },
    getMonthlyValuesFailure(state, action: PayloadAction<APIResponse>) {
      state.monthlyValuesLoading = false;
      state.settingsError = action.payload.status_code;
    },

    // =========================
    // add monthly values
    // =========================
    addMonthlyValuesRequest(state, _action: PayloadAction<AddMonthlyValuesRequest['payload']>) {
      state.monthlyValuesUpdateLoading = true;
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    addMonthlyValuesSuccess(state, action: PayloadAction<AddMonthlyValuesRequest['response']>) {
      state.monthlyValuesUpdateLoading = false;
      state.settingsSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.metrics.monthlyMetricValues.monthly_values = [
          ...action.payload.data, 
          ...state.metrics.monthlyMetricValues.monthly_values
        ];
      }
    },
    addMonthlyValuesFailure(state, action: PayloadAction<APIResponse>) {
      state.monthlyValuesUpdateLoading = false;
      state.settingsError = action.payload.status_code;
    },

    // =========================
    // update monthly values
    // =========================
    updateMonthlyValuesRequest(state, _action: PayloadAction<UpdateMonthlyValuesRequest['payload']>) {
      state.monthlyValuesUpdateLoading = true;
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    updateMonthlyValuesSuccess(state, action: PayloadAction<UpdateMonthlyValuesRequest['response']>) {
      state.monthlyValuesUpdateLoading = false;
      state.settingsSuccess = action.payload.status_code;

      if (action.payload.data) {
        for (const updatedMetric of action.payload.data) {
          for (let i = 0; i < state.metrics.monthlyMetricValues.metric.length; i++) {
            if (state.metrics.monthlyMetricValues.metric[i].id === updatedMetric.id) {
              state.metrics.monthlyMetricValues.metric[i] = {
                ...state.metrics.monthlyMetricValues.metric[i],
                ...updatedMetric,
              };
              break;
            }
          }
        }
      }
    },
    updateMonthlyValuesFailure(state, action: PayloadAction<APIResponse>) {
      state.monthlyValuesUpdateLoading = false;
      state.settingsError = action.payload.status_code;
    },

    // =========================
    // utilites
    // =========================
    resetSettingsMessage(state) {
      state.settingsError = false;
      state.settingsSuccess = false;
    },
    cancelSettingsRequest(state) {
      state.isLoading = false;
      state.benchmarkLoading = false;
      state.benchmarkUpdateLoading = false;
    },
  },
});

export const {
  // get benchmark metrics
  getBenchmarkMetricsFailure,
  getBenchmarkMetricsRequest,
  getBenchmarkMetricsSuccess,

  // update benchmark metrics
  updateBenchmarkMetricsFailure,
  updateBenchmarkMetricsRequest,
  updateBenchmarkMetricsSuccess,

  // get monthly values
  getMonthlyValuesRequest,
  getMonthlyValuesSuccess,
  getMonthlyValuesFailure,

  // add monthly values
  addMonthlyValuesRequest,
  addMonthlyValuesSuccess,
  addMonthlyValuesFailure,

  // update monthly values
  updateMonthlyValuesRequest,
  updateMonthlyValuesSuccess,
  updateMonthlyValuesFailure,

  // utilities
  resetSettingsMessage,
  cancelSettingsRequest,
} = settingsSlice.actions;

export default settingsSlice.reducer;
