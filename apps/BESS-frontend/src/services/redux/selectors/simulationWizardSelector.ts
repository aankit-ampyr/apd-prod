import {createSelector} from '@reduxjs/toolkit';
import {type RootState} from '../rootReducer';
import {SelectInputItem} from '@/interface';

/** ======================================
 * load profile - status selectors
 * ====================================== */
export const loadProfileSuccess = (state: RootState) => state.simulationWizard.loadProfileSuccess;

export const loadProfileError = (state: RootState) => state.simulationWizard.loadProfileError;

export const loadProfileLoading = (state: RootState) => state.simulationWizard.loadProfileLoading;

export const loadProfileSaved = (state: RootState) => state.simulationWizard.loadProfileSaved;

/** ======================================
 * load profile - data selectors
 * ====================================== */
export const loadProfileData = (state: RootState) => state.simulationWizard.loadProfileData;

export const savedLoadProfileData = (state: RootState) => state.simulationWizard.savedLoadProfileData;

/** output (useful for UI directly) */
export const loadProfileOutput = (state: RootState) => state.simulationWizard.loadProfileData?.output;

/** graph data (for LoadChart) */
export const loadProfileDataPoints = (state: RootState) => state.simulationWizard.loadProfileData?.output?.data_points;

/** summary metrics */
export const loadProfilePeakLoad = (state: RootState) => state.simulationWizard.loadProfileData?.output?.peak_load;

export const loadProfileTotalEnergy = (state: RootState) => state.simulationWizard.loadProfileData?.output?.total_energy;

export const loadProfileTotalHours = (state: RootState) => state.simulationWizard.loadProfileData?.output?.total_hours;

export const loadProfileHourPercentage = (state: RootState) => state.simulationWizard.loadProfileData?.output?.hour_percentage;

/** pattern + config (if needed in UI) */
export const loadProfilePattern = (state: RootState) => state.simulationWizard.loadProfileData?.pattern;

export const loadProfileConfig = (state: RootState) => state.simulationWizard.loadProfileData?.config;

export const simulationProject = (state: RootState) => state.simulationWizard.currentSelectedProject;

/** ======================================
 * solar profile - status selectors
 * ====================================== */
export const solarProfileSuccess = (state: RootState) => state.simulationWizard.solarProfileSuccess;

export const solarProfileError = (state: RootState) => state.simulationWizard.solarProfileError;

export const solarProfileLoading = (state: RootState) => state.simulationWizard.solarProfileLoading;

export const solarProfileFetchLoading = (state: RootState) => state.simulationWizard.solarProfileFetchLoading;

export const solarProfileSourceListSelector = createSelector([(state: RootState) => state.simulationWizard.solarProfileSourceList], solarProfileSourceList =>
  solarProfileSourceList?.map(
    (item: any): SelectInputItem => ({
      id: Number.isNaN(Number(item.id)) ? item.id : Number(item.id),
      label: item.name.replace('.csv', '').replace(/_/g, ' '),
    }),
  ),
);

/** ======================================
 * solar profile - data selectors
 * ====================================== */
export const solarProfileData = (state: RootState) => state.simulationWizard.solarProfileData;

/** ======================================
 * upload solar CSV - status selectors
 * ====================================== */
export const uploadSolarCSVSuccess = (state: RootState) => state.simulationWizard.uploadSolarCSVSuccess;

export const uploadSolarCSVError = (state: RootState) => state.simulationWizard.uploadSolarCSVError;

export const uploadSolarCSVLoading = (state: RootState) => state.simulationWizard.uploadSolarCSVLoading;

/** ======================================
 * upload solar CSV - data selectors
 * ====================================== */
export const uploadSolarCSVData = (state: RootState) => state.simulationWizard.uploadSolarCSVData;

/** ======================================
 * save solar profile - status selectors
 * ====================================== */
export const saveSolarProfileSuccess = (state: RootState) => state.simulationWizard.saveSolarProfileSuccess;

export const saveSolarProfileError = (state: RootState) => state.simulationWizard.saveSolarProfileError;

export const saveSolarProfileLoading = (state: RootState) => state.simulationWizard.saveSolarProfileLoading;

/** ======================================
 * get solar profile - status selectors
 * ====================================== */
export const getSolarProfileSuccess = (state: RootState) => state.simulationWizard.getSolarProfileSuccess;

export const getSolarProfileError = (state: RootState) => state.simulationWizard.getSolarProfileError;

export const getSolarProfileLoading = (state: RootState) => state.simulationWizard.getSolarProfileLoading;

/** ======================================
 * get solar profile - data selectors
 * ====================================== */
export const savedSolarProfileData = (state: RootState) => state.simulationWizard.savedSolarProfileData;

export const bessConfigSuccess = (state: RootState) => state.simulationWizard.bessContainerConfigSuccess;
export const bessContainerConfigData = (state: RootState) => state.simulationWizard.bessContainerConfigData;

export const initiateSimulationError = (state: RootState) => state.simulationWizard.simulationError;

/** ======================================
 * common selectors
 * ====================================== */

export const simulationData = (state: RootState) => state.simulationWizard.simulationData;

export const generatorSuccess = (state: RootState) => state.simulationWizard.generatorDgSuccess;

export const generatorFailure = (state: RootState) => state.simulationWizard.generatorDgError;
export const generatorData = (state: RootState) => state.simulationWizard.generatorDgData;

export const generatorFuelCurveData = (state: RootState) => state.simulationWizard.generatorFuelCurveData;

export const dispatchRuleData = (state: RootState) => state.simulationWizard.dispatchRuleData;
export const dispatchRuleDataLoading = (state: RootState) => state.simulationWizard.getDispatchRuleLoading;

export const dispatchRuleDataSuccess = (state: RootState) => state.simulationWizard.dispatchRuleSuccess;

export const dispatchRuleDataFailure = (state: RootState) => state.simulationWizard.dispatchRuleError;

export const dgSizingDataSuccess = (state: RootState) => state.simulationWizard.dgSizingSuccess;

export const dgSizingDataFailure = (state: RootState) => state.simulationWizard.dgSizingError;

export const dgSizingData = (state: RootState) => state.simulationWizard.dgSizingData;

export const simulationListError = (state: RootState) => state.simulationWizard.simulationListError;
export const simulationListSuccess = (state: RootState) => state.simulationWizard.simulationListSuccess;

export const updateSimulationSuccess = (state: RootState) => state.simulationWizard.updateSimulationSuccess;
export const updateSimulationError = (state: RootState) => state.simulationWizard.updateSimulationError;

export const deleteSimulationSuccess = (state: RootState) => state.simulationWizard.deleteSimulationSuccess;
export const deleteSimulationError = (state: RootState) => state.simulationWizard.deleteSimulationError;

export const projectSimulationSuccess = (state: RootState) => state.simulationWizard.projectSimulationSuccess;
export const projectSimulationError = (state: RootState) => state.simulationWizard.projectSimulationError;

export const simulationListLoading = (state: RootState) => state.simulationWizard.simulationListLoading;
export const simulationListData = (state: RootState) => state.simulationWizard.simulationListData;

export const projectSimulationData = (state: RootState) => state.simulationWizard.projectSimulationData;
export const initiateSimulationData = (state: RootState) => state.simulationWizard.initiateSimulationData;

export const runSimulationSuccess = (state: RootState) => state.simulationWizard.runSimulationSuccess;
export const runSimulationData = (state: RootState) => state.simulationWizard.runSimulationData;
export const simulationProgressSuccess = (state: RootState) => state.simulationWizard.simulationProgressSuccess;
export const simulationProgressError = (state: RootState) => state.simulationWizard.simulationProgressError;
export const simulationProgressData = (state: RootState) => state.simulationWizard.simulationProgressData;
export const simulationProgressLoading = (state: RootState) => state.simulationWizard.simulationProgressLoading;
export const simulationResultError = (state: RootState) => state.simulationWizard.simulationResultsError;
export const simulationResultSuccess = (state: RootState) => state.simulationWizard.simulationResultsSuccess;

export const simulationResultLoading = (state: RootState) => state.simulationWizard.simulationResultsLoading;
export const simulationResultsData = (state: RootState) => state.simulationWizard.simulationResultsData;

// Custom Configuration - View Detailed Analysis
export const showDetailedAnalysisSelector = (state: RootState) => state.simulationWizard.showDetailedAnalysis;

export const customConfigSuccess = (state: RootState) => state.simulationWizard.customConfigSuccess;
export const customConfigError = (state: RootState) => state.simulationWizard.customConfigError;
export const customConfigRunError = (state: RootState) => state.simulationWizard.runCustomSimulationError;
export const customConfigData = (state: RootState) => state.simulationWizard.customConfigData;

export const customConfigLoading = (state: RootState) => state.simulationWizard.getCustomConfigLoading;

export const customSimulationSuccess = (state: RootState) => state.simulationWizard.customSimulationResultSuccess;

export const customSimulationLoading = (state: RootState) => state.simulationWizard.customSimulationResultLoading;
export const customSimulationError = (state: RootState) => state.simulationWizard.customSimulationResultError;
export const customSimulationResults = (state: RootState) => state.simulationWizard.customSimulationResultData;

export const customHourlySimulationResults = (state: RootState) => state.simulationWizard.hourlySimulationResultsData;
export const customMonthlySuccess = (state: RootState) => state.simulationWizard.monthlySimulationResultsSuccess;
export const customMonthlySimulationResults = (state: RootState) => state.simulationWizard.monthlySimulationResultsData;

export const customHourlyChart = (state: RootState) => state.simulationWizard.hourlyChartData;

export const showDetailedMultiYearProjectionAnalysisSelector = (state: RootState) => state.simulationWizard.showDetailedMultiYearProjectionAnalysis;

export const multiYearProjectionSaveSuccess = (state: RootState) => state.simulationWizard.multiYearProjectionSuccess;
export const multiYearProjectionResultSuccess = (state: RootState) => state.simulationWizard.multiYearProjectionResultSuccess;
export const multiYearProjectionResultError = (state: RootState) => state.simulationWizard.multiYearProjectionResultError;
export const multiYearProjectionData = (state: RootState) => state.simulationWizard.multiYearProjectionData;
export const multiYearProjectionComputeData = (state: RootState) => state.simulationWizard.multiYearProjectionComputeData;
export const multiYearProjectionResultLoading = (state: RootState) => state.simulationWizard.multiYearProjectionResultLoading;
export const multiYearSaveError = (state: RootState) => state.simulationWizard.multiYearProjectionError;
export const multiYearRunError = (state: RootState) => state.simulationWizard.runMultiYearProjectionError;

export const multiYearProjectionResultData = (state: RootState) => state.simulationWizard.multiYearProjectionResultData;
export const multiYearProjectionProgressLoading = (state: RootState) => state.simulationWizard.multiYearProjectionProgressLoading;
export const customRunSuccess = (state: RootState) => state.simulationWizard.runCustomSimulationSuccess;
export const multiYearResults = (state: RootState) => state.simulationWizard.multiYearProjectionResultsData;
export const multiYearResultsLoading = (state: RootState) => state.simulationWizard.multiYearProjectionResultsLoading;
export const multiYearProgressData = (state: RootState) => state.simulationWizard.multiYearProjectionProgressData;
export const multiYearRunSuccess = (state: RootState) => state.simulationWizard.runMultiYearProjectionSuccess;
export const simulationProjectLoading = (state: RootState) => state.simulationWizard.projectSimulationLoading;
export const greenAnalysisSuccess = (state: RootState) => state.simulationWizard.greenAnalysisSuccess;
export const greenAnalysisData = (state: RootState) => state.simulationWizard.greenAnalysisData;
export const showGreenAnalysisResults = (state: RootState) => state.simulationWizard.showGreenAnalysisResults;
export const greenaAnalysisResultsData = (state: RootState) => state.simulationWizard.greenAnalysisResultsData;
export const greenAnalysisProgressData = (state: RootState) => state.simulationWizard.greenAnalysisProgressData;
export const greenAnalysisRunSuccess = (state: RootState) => state.simulationWizard.runGreenAnalysisSuccess;
export const detailedGreenAnalysis = (state: RootState) => state.simulationWizard.showDetailedGreenAnalysis;
export const detailedGreenError = (state: RootState) => state.simulationWizard.detailedGreenAnalysisError;
export const detailedGreenRunError = (state: RootState) => state.simulationWizard.runDetailedGreenAnalysisError;
export const detailedGreenAnalysisSuccess = (state: RootState) => state.simulationWizard.detailedGreenAnalysisSuccess;
export const detailedGreenAnalysisData = (state: RootState) => state.simulationWizard.detailedGreenAnalysisData;
export const detailedGreenAnalysisProgressData = (state: RootState) => state.simulationWizard.detailedGreenAnalysisProgressData;
export const detailedGreenAnalysisResultData = (state: RootState) => state.simulationWizard.detailedGreenAnalysisResultData;
export const detailedGreenRunSuccess = (state: RootState) => state.simulationWizard.runDetailedGreenAnalysisSuccess;
export const detailedResultSuccess = (state: RootState) => state.simulationWizard.detailedGreenAnalysisResultSuccess;
export const detailedResultLoading = (state: RootState) => state.simulationWizard.detailedGreenAnalysisResultLoading;
export const editedStepData = (state: RootState) => state.simulationWizard.editedStepSimulationData;
export const detailedLoading = (state: RootState) => state.simulationWizard.detailedGreenAnalysisDataLoading;
