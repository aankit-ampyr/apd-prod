import {type RootState} from '../rootReducer';

/** error/success selector */
export const settingsSuccess = (state: RootState) => state.settings.settingsSuccess;
export const settingsFailure = (state: RootState) => state.settings.settingsError;

/** loading selector */
export const settingsLoading = (state: RootState) => state.settings.isLoading;
export const benchmarkLoading = (state: RootState) => state.settings.benchmarkLoading;
export const benchmarkUpdateLoading = (state: RootState) => state.settings.benchmarkUpdateLoading;
export const monthlyValuesLoading = (state: RootState) => state.settings.monthlyValuesLoading;
export const monthlyValuesUpdateLoading = (state: RootState) => state.settings.monthlyValuesUpdateLoading;

/** mertics selector */
export const benchmarkMetrics = (state: RootState) => state.settings.metrics.industryBenchmarck;
export const monthlyMetricsValues = (state: RootState) => state.settings.metrics.monthlyMetricValues;