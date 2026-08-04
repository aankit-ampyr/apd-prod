import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import type {
  APIResponse,
  BessContainerConfigRequest,
  BessContainerConfigResponse,
  CustomConfig,
  CustomHourlyChartResult,
  CustomHourlyResult,
  CustomMonthlyResult,
  DetailedGreenAnalysis,
  DGSizing,
  DispatchRule,
  GeneratorDg,
  GeneratorDgFuelCurve,
  GetCustomConfig,
  GetCustomSimulationResult,
  GetDetailedGreenAnalysis,
  GetDetailedGreenAnalysisSimulationResult,
  GetDGSizing,
  GetDispatchRule,
  GetEditedStepSimulation,
  GetGeneratorDg,
  GetGreenAnalysis,
  GetMultiYearProgress,
  GetMultiYearProjection,
  GetSimulationProgress,
  GetSolarProfileRequest,
  GreenAnalysis,
  GreenAnalysisResultRequest,
  InitiateSimulation,
  InitiateSimulationRequest,
  InitiateSimulationResponse,
  LoadProfileRequest,
  LoadProfileResponse,
  MultiYearProjection,
  MultiYearProjectionRequest,
  RunSimulationRequest,
  SaveSolarProfileRequest,
  SimulationListRequest,
  SimulationResultRequest,
  SolarProfileData,
  SolarProfileRequest,
  SolarProfileResponse,
  SolarProfileSourceListRequest,
  UpdateSimulationRequest,
  UploadSolarCSVData,
  UploadSolarCSVRequest,
  UploadSolarCSVResponse,
} from '@/interface/api-interface';
import {Simulation, SolarProfileSource} from '@/interface/common-interface';

// ==============================
// STATE
// ==============================

interface SimulationWizardState {
  // load profile
  loadProfileLoading: boolean;
  loadProfileError: string | false;
  loadProfileSuccess: string | false;
  loadProfileSaved: string | false;
  loadProfileData: LoadProfileResponse['data'] | null;
  savedLoadProfileData: LoadProfileResponse['data'] | null;

  // simulation
  simulationLoading: boolean;
  simulationError: string | false;
  simulationSuccess: string | false;
  simulationData: Simulation | null;
  currentSelectedProject: {
    id: number;
    name: string;
  } | null;

  // solar profile
  solarProfileLoading: boolean;
  solarProfileError: string | false;
  solarProfileSuccess: string | false;
  solarProfileData: SolarProfileData | null;

  solarProfileFetchLoading: boolean;
  solarProfileFetchSuccess: string | false;
  solarProfileFetchError: string | false;

  // upload solar CSV
  uploadSolarCSVLoading: boolean;
  uploadSolarCSVError: string | false;
  uploadSolarCSVSuccess: string | false;
  uploadSolarCSVData: UploadSolarCSVData | null;

  // save solar profile
  saveSolarProfileLoading: boolean;
  saveSolarProfileError: string | false;
  saveSolarProfileSuccess: string | false;

  // get solar profile (saved data)
  getSolarProfileLoading: boolean;
  getSolarProfileError: string | false;
  getSolarProfileSuccess: string | false;
  savedSolarProfileData: SolarProfileData | null;

  // bess container config
  bessContainerConfigLoading: boolean;
  bessContainerConfigError: string | false;
  bessContainerConfigSuccess: string | false;
  bessContainerConfigData: BessContainerConfigResponse['data'] | null;

  solarProfileSourceList: SolarProfileSource[];

  generatorDgLoading: boolean;
  generatorDgError: string | false;
  generatorDgSuccess: string | false;
  generatorDgData: GetGeneratorDg['response']['data'] | null;
  generatorFuelCurveData: GeneratorDgFuelCurve['response']['data'] | null;

  dispatchRuleLoading: boolean;
  dispatchRuleError: string | false;
  dispatchRuleSuccess: string | false;
  dispatchRuleData: GetDispatchRule['response']['data'] | null;

  getDispatchRuleLoading: boolean;
  getDispatchRuleError: string | false;
  getDispatchRuleSuccess: string | false;

  dgSizingLoading: boolean;
  dgSizingError: string | false;
  dgSizingSuccess: string | false;

  getDgSizingLoading: boolean;
  getDgSizingError: string | false;
  getDgSizingSuccess: string | false;
  dgSizingData: GetDGSizing['response']['data'] | null;

  simulationListLoading: boolean;
  simulationListError: string | false;
  simulationListSuccess: string | false;
  simulationListData: SimulationListRequest['response']['data'] | null;
  projectSimulationData: UpdateSimulationRequest['response']['data'] | null;
  initiateSimulationData: InitiateSimulation['response']['data'] | null;

  projectSimulationLoading: boolean;
  projectSimulationError: string | false;
  projectSimulationSuccess: string | false;

  updateSimulationLoading: boolean;
  updateSimulationSuccess: string | false;
  updateSimulationError: string | false;

  deleteSimulationLoading: boolean;
  deleteSimulationSuccess: string | false;
  deleteSimulationError: string | false;

  runSimulationLoading: boolean;
  runSimulationSuccess: string | false;
  runSimulationError: string | false;
  runSimulationData: RunSimulationRequest['response']['data'] | null;

  stopSimulationLoading: boolean;
  stopSimulationSuccess: string | false;
  stopSimulationError: string | false;

  simulationProgressLoading: boolean;
  simulationProgressError: string | false;
  simulationProgressSuccess: string | false;
  simulationProgressData: GetSimulationProgress['response']['data'] | null;

  simulationResultsLoading: boolean;
  simulationResultsError: string | false;
  simulationResultsSuccess: string | false;
  simulationResultsData: SimulationResultRequest['response']['data'] | null;
  showDetailedAnalysis: boolean;

  customConfigLoading: boolean;
  customConfigError: string | false;
  customConfigSuccess: string | false;

  getCustomConfigLoading: boolean;
  getCustomConfigError: string | false;
  getCustomConfigSuccess: string | false;
  customConfigData: CustomConfig['response']['data'] | null;

  runCustomSimulationLoading: boolean;
  runCustomSimulationSuccess: string | false;
  runCustomSimulationError: string | false;
  runCustomSimulationData: RunSimulationRequest['response']['data'] | null;

  customSimulationResultLoading: boolean;
  customSimulationResultError: string | false;
  customSimulationResultSuccess: string | false;
  customSimulationResultData: GetCustomSimulationResult['response'] | null;

  hourlySimulationResultsLoading: boolean;
  hourlySimulationResultsError: string | false;
  hourlySimulationResultsSuccess: string | false;
  hourlySimulationResultsData: CustomHourlyResult['response']['data'] | null;

  monthlySimulationResultsLoading: boolean;
  monthlySimulationResultsError: string | false;
  monthlySimulationResultsSuccess: string | false;
  monthlySimulationResultsData: CustomMonthlyResult['response']['data'] | null;

  hourlyChartLoading: boolean;
  hourlyChartError: string | false;
  hourlyChartSuccess: string | false;
  hourlyChartData: CustomHourlyChartResult['response']['data'] | null;

  showDetailedMultiYearProjectionAnalysis: boolean;

  multiYearProjectionLoading: boolean;
  multiYearProjectionSuccess: string | false;
  multiYearProjectionError: string | false;
  multiYearProjectionData: MultiYearProjection['response']['data'] | null;

  multiYearProjectionComputeLoading: boolean;
  multiYearProjectionComputeSuccess: string | false;
  multiYearProjectionComputeError: string | false;
  multiYearProjectionComputeData: MultiYearProjection['response']['data'] | null;

  multiYearProjectionResultLoading: boolean;
  multiYearProjectionResultError: string | false;
  multiYearProjectionResultSuccess: string | false;
  multiYearProjectionResultData: GetMultiYearProjection['response']['data'] | null;

  runMultiYearProjectionLoading: boolean;
  runMultiYearProjectionSuccess: string | false;
  runMultiYearProjectionError: string | false;
  runMultiYearProjectionData: RunSimulationRequest['response']['data'] | null;

  stopMultiYearProjectionLoading: boolean;
  stopMultiYearProjectionSuccess: string | false;
  stopMultiYearProjectionError: string | false;

  multiYearProjectionResultsLoading: boolean;
  multiYearProjectionResultsSuccess: string | false;
  multiYearProjectionResultsError: string | false;
  multiYearProjectionResultsData: MultiYearProjectionRequest['response']['data'] | null;

  multiYearProjectionProgressLoading: boolean;
  multiYearProjectionProgressSuccess: string | false;
  multiYearProjectionProgressError: string | false;
  multiYearProjectionProgressData: GetMultiYearProgress['response']['data'] | null;

  greenAnalysisLoading: boolean;
  greenAnalysisSuccess: string | false;
  greenAnalysisError: string | false;

  greenAnalysisDataLoading: boolean;
  greenAnalysisDataSuccess: string | false;
  greenAnalysisDataError: string | false;
  greenAnalysisData: GetGreenAnalysis['response']['data'] | null;

  showGreenAnalysisResults: boolean;

  runGreenAnalysisLoading: boolean;
  runGreenAnalysisSuccess: string | false;
  runGreenAnalysisError: string | false;
  runGreenAnalysisData: RunSimulationRequest['response']['data'] | null;

  stopGreenAnalysisLoading: boolean;
  stopGreenAnalysisSuccess: string | false;
  stopGreenAnalysisError: string | false;

  greenAnalysisResultsLoading: boolean;
  greenAnalysisResultsError: string | false;
  greenAnalysisResultsSuccess: string | false;
  greenAnalysisResultsData: GreenAnalysisResultRequest['response']['data'] | null;

  greenAnalysisProgressLoading: boolean;
  greenAnalysisProgressError: string | false;
  greenAnalysisProgressSuccess: string | false;
  greenAnalysisProgressData: GetSimulationProgress['response']['data'] | null;

  showDetailedGreenAnalysis: boolean;

  detailedGreenAnalysisLoading: boolean;
  detailedGreenAnalysisSuccess: string | false;
  detailedGreenAnalysisError: string | false;

  detailedGreenAnalysisDataLoading: boolean;
  detailedGreenAnalysisDataSuccess: string | false;
  detailedGreenAnalysisDataError: string | false;
  detailedGreenAnalysisData: GetDetailedGreenAnalysis['response']['data'] | null;

  runDetailedGreenAnalysisLoading: boolean;
  runDetailedGreenAnalysisSuccess: string | false;
  runDetailedGreenAnalysisError: string | false;
  runDetailedGreenAnalysisData: RunSimulationRequest['response']['data'] | null;

  detailedGreenAnalysisProgressLoading: boolean;
  detailedGreenAnalysisProgressSuccess: string | false;
  detailedGreenAnalysisProgressError: string | false;
  detailedGreenAnalysisProgressData: GetMultiYearProgress['response']['data'] | null;

  detailedGreenAnalysisResultLoading: boolean;
  detailedGreenAnalysisResultError: string | false;
  detailedGreenAnalysisResultSuccess: string | false;
  detailedGreenAnalysisResultData: GetDetailedGreenAnalysisSimulationResult['response']['data'] | null;

  editedStepSimulationLoading: boolean;
  editedStepSimulationError: string | false;
  editedStepSimulationSuccess: string | false;
  editedStepSimulationData: GetEditedStepSimulation['response']['data'] | null;
}

const initialState: SimulationWizardState = {
  // load profile
  loadProfileLoading: false,
  loadProfileError: false,
  loadProfileSuccess: false,
  loadProfileSaved: false,
  loadProfileData: null,
  savedLoadProfileData: null,

  // simulation
  simulationLoading: false,
  simulationError: false,
  simulationSuccess: false,
  simulationData: null,
  currentSelectedProject: null,

  // solar profile
  solarProfileLoading: false,
  solarProfileError: false,
  solarProfileSuccess: false,
  solarProfileData: null,

  solarProfileFetchLoading: false,
  solarProfileFetchSuccess: false,
  solarProfileFetchError: false,

  // upload solar CSV
  uploadSolarCSVLoading: false,
  uploadSolarCSVError: false,
  uploadSolarCSVSuccess: false,
  uploadSolarCSVData: null,

  // save solar profile
  saveSolarProfileLoading: false,
  saveSolarProfileError: false,
  saveSolarProfileSuccess: false,

  // get solar profile (saved data)
  getSolarProfileLoading: false,
  getSolarProfileError: false,
  getSolarProfileSuccess: false,
  savedSolarProfileData: null,

  // bess container config
  bessContainerConfigLoading: false,
  bessContainerConfigError: false,
  bessContainerConfigSuccess: false,
  bessContainerConfigData: null,

  solarProfileSourceList: [],

  generatorDgLoading: false,
  generatorDgError: false,
  generatorDgSuccess: false,
  generatorDgData: null,
  generatorFuelCurveData: null,

  dispatchRuleLoading: false,
  dispatchRuleError: false,
  dispatchRuleSuccess: false,
  dispatchRuleData: null,

  getDispatchRuleLoading: false,
  getDispatchRuleError: false,
  getDispatchRuleSuccess: false,

  dgSizingLoading: false,
  dgSizingError: false,
  dgSizingSuccess: false,

  getDgSizingLoading: false,
  getDgSizingError: false,
  getDgSizingSuccess: false,
  dgSizingData: null,

  simulationListLoading: false,
  simulationListError: false,
  simulationListSuccess: false,
  simulationListData: null,
  projectSimulationData: null,
  initiateSimulationData: null,

  projectSimulationLoading: false,
  projectSimulationError: false,
  projectSimulationSuccess: false,

  updateSimulationLoading: false,
  updateSimulationSuccess: false,
  updateSimulationError: false,

  deleteSimulationLoading: false,
  deleteSimulationSuccess: false,
  deleteSimulationError: false,

  runSimulationLoading: false,
  runSimulationSuccess: false,
  runSimulationError: false,
  runSimulationData: null,

  stopSimulationLoading: false,
  stopSimulationSuccess: false,
  stopSimulationError: false,

  simulationProgressLoading: false,
  simulationProgressError: false,
  simulationProgressSuccess: false,
  simulationProgressData: null,

  simulationResultsLoading: false,
  simulationResultsError: false,
  simulationResultsSuccess: false,
  simulationResultsData: null,

  // Custom Configuration - View Detailed Analysis
  customConfigLoading: false,
  customConfigError: false,
  customConfigSuccess: false,

  getCustomConfigLoading: false,
  getCustomConfigError: false,
  getCustomConfigSuccess: false,
  customConfigData: null,
  showDetailedAnalysis: false,

  runCustomSimulationLoading: false,
  runCustomSimulationSuccess: false,
  runCustomSimulationError: false,
  runCustomSimulationData: null,

  customSimulationResultLoading: false,
  customSimulationResultError: false,
  customSimulationResultSuccess: false,
  customSimulationResultData: null,

  hourlySimulationResultsLoading: false,
  hourlySimulationResultsError: false,
  hourlySimulationResultsSuccess: false,
  hourlySimulationResultsData: null,

  monthlySimulationResultsLoading: false,
  monthlySimulationResultsError: false,
  monthlySimulationResultsSuccess: false,
  monthlySimulationResultsData: null,

  hourlyChartLoading: false,
  hourlyChartError: false,
  hourlyChartSuccess: false,
  hourlyChartData: null,

  showDetailedMultiYearProjectionAnalysis: false,

  multiYearProjectionLoading: false,
  multiYearProjectionSuccess: false,
  multiYearProjectionError: false,
  multiYearProjectionData: null,

  multiYearProjectionComputeLoading: false,
  multiYearProjectionComputeSuccess: false,
  multiYearProjectionComputeError: false,
  multiYearProjectionComputeData: null,

  multiYearProjectionResultLoading: false,
  multiYearProjectionResultSuccess: false,
  multiYearProjectionResultError: false,
  multiYearProjectionResultData: null,

  runMultiYearProjectionLoading: false,
  runMultiYearProjectionSuccess: false,
  runMultiYearProjectionError: false,
  runMultiYearProjectionData: null,

  stopMultiYearProjectionLoading: false,
  stopMultiYearProjectionSuccess: false,
  stopMultiYearProjectionError: false,

  multiYearProjectionResultsLoading: false,
  multiYearProjectionResultsSuccess: false,
  multiYearProjectionResultsError: false,
  multiYearProjectionResultsData: null,

  multiYearProjectionProgressLoading: false,
  multiYearProjectionProgressSuccess: false,
  multiYearProjectionProgressError: false,
  multiYearProjectionProgressData: null,

  greenAnalysisLoading: false,
  greenAnalysisSuccess: false,
  greenAnalysisError: false,

  greenAnalysisDataLoading: false,
  greenAnalysisDataSuccess: false,
  greenAnalysisDataError: false,
  greenAnalysisData: null,

  showGreenAnalysisResults: false,

  runGreenAnalysisLoading: false,
  runGreenAnalysisSuccess: false,
  runGreenAnalysisError: false,
  runGreenAnalysisData: null,

  stopGreenAnalysisLoading: false,
  stopGreenAnalysisSuccess: false,
  stopGreenAnalysisError: false,

  greenAnalysisResultsLoading: false,
  greenAnalysisResultsError: false,
  greenAnalysisResultsSuccess: false,
  greenAnalysisResultsData: null,

  greenAnalysisProgressLoading: false,
  greenAnalysisProgressError: false,
  greenAnalysisProgressSuccess: false,
  greenAnalysisProgressData: null,

  showDetailedGreenAnalysis: false,

  detailedGreenAnalysisLoading: false,
  detailedGreenAnalysisSuccess: false,
  detailedGreenAnalysisError: false,

  detailedGreenAnalysisDataLoading: false,
  detailedGreenAnalysisDataSuccess: false,
  detailedGreenAnalysisDataError: false,
  detailedGreenAnalysisData: null,

  runDetailedGreenAnalysisLoading: false,
  runDetailedGreenAnalysisSuccess: false,
  runDetailedGreenAnalysisError: false,
  runDetailedGreenAnalysisData: null,

  detailedGreenAnalysisProgressLoading: false,
  detailedGreenAnalysisProgressSuccess: false,
  detailedGreenAnalysisProgressError: false,
  detailedGreenAnalysisProgressData: null,

  detailedGreenAnalysisResultLoading: false,
  detailedGreenAnalysisResultError: false,
  detailedGreenAnalysisResultSuccess: false,
  detailedGreenAnalysisResultData: null,

  editedStepSimulationLoading: false,
  editedStepSimulationError: false,
  editedStepSimulationSuccess: false,
  editedStepSimulationData: null,
};

// ==============================
// SLICE
// ==============================

const simulationWizardSlice = createSlice({
  name: 'simulationWizard',
  initialState,
  reducers: {
    // ======================================
    // load profile calculation (PREVIEW)
    // ======================================
    loadProfileRequest: (state, action: PayloadAction<LoadProfileRequest>) => {
      state.loadProfileLoading = true;
      state.loadProfileError = false;
      state.loadProfileSuccess = false;
    },

    loadProfileSuccess: (state, action: PayloadAction<LoadProfileResponse>) => {
      state.loadProfileLoading = false;
      state.loadProfileSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.loadProfileData = action.payload.data;
      }
    },

    loadProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.loadProfileLoading = false;
      state.loadProfileError = action.payload.status_code;

      // optional reset if needed
      if (['E-10015', 'E-10014'].includes(action.payload.status_code)) {
        state.loadProfileData = null;
      }
    },

    // ======================================
    // reset
    // ======================================
    resetLoadProfileMessage: state => {
      state.loadProfileError = false;
      state.loadProfileSuccess = false;
    },

    // ======================================
    // clear data (useful when changing pattern)
    // ======================================
    clearLoadProfileData: state => {
      state.loadProfileData = null;
    },

    // ======================================
    // cancel request
    // ======================================
    cancelLoadProfileRequest: state => {
      state.loadProfileLoading = false;
    },

    // ======================================
    // initiate / fetch simulation
    // ======================================
    initiateSimulationRequest: (state, action: PayloadAction<InitiateSimulationRequest>) => {
      state.simulationLoading = true;
      state.simulationError = false;
      state.simulationSuccess = false;
      // Reset all tab completion states when selecting a new project
      state.loadProfileSaved = false;
      state.saveSolarProfileSuccess = false;
      state.bessContainerConfigSuccess = false;
      state.generatorDgSuccess = false;
      state.dispatchRuleSuccess = false;
      state.dgSizingSuccess = false;
      // Clear all wizard data when selecting a new project to prevent stale data
      state.loadProfileData = null;
      state.savedLoadProfileData = null;
      state.solarProfileData = null;
      state.savedSolarProfileData = null;
      state.bessContainerConfigData = null;
      state.generatorDgData = null;
      state.dispatchRuleData = null;
      state.dgSizingData = null;
      state.greenAnalysisData = null;
      state.greenAnalysisProgressData = null;
      state.greenAnalysisResultsData = null;
      state.showGreenAnalysisResults = false;
      state.greenAnalysisDataLoading = false;
      state.greenAnalysisProgressLoading = false;
      state.greenAnalysisResultsLoading = false;
    },

    initiateSimulationSuccess: (state, action: PayloadAction<{data: InitiateSimulationResponse; project_name?: string}>) => {
      state.simulationLoading = false;
      state.simulationSuccess = action.payload.data.status_code;

      if (action.payload.data) {
        state.simulationData = action.payload.data.data;
        state.currentSelectedProject = {
          id: action.payload.data.data.project_id,
          name: action.payload.project_name || '',
        };
      }
    },

    initiateSimulationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.simulationLoading = false;
      state.simulationError = action.payload.status_code;
    },

    // ======================================
    // reset simulation
    // ======================================
    resetSimulationMessage: state => {
      state.simulationError = false;
      state.simulationSuccess = false;
    },

    // ======================================
    // SAVE LOAD PROFILE (persist)
    // ======================================
    saveLoadProfileRequest: (state, action: PayloadAction<LoadProfileRequest>) => {
      state.loadProfileLoading = true;
      state.loadProfileError = false;
      state.loadProfileSuccess = false;
    },

    saveLoadProfileSuccess: (state, action: PayloadAction<LoadProfileResponse>) => {
      state.loadProfileLoading = false;
      state.loadProfileSuccess = action.payload.status_code;
      state.loadProfileSaved = action.payload.status_code;

      if (action.payload.data) {
        state.loadProfileData = action.payload.data; // keep UI synced
        state.savedLoadProfileData = action.payload.data; // update saved snapshot
      }
    },

    saveLoadProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.loadProfileLoading = false;
      state.loadProfileError = action.payload.status_code;
    },

    // ======================================
    // GET LOAD PROFILE (fetch saved data)
    // ======================================
    getLoadProfileRequest: (
      state,
      action: PayloadAction<{
        simulation_id: number;
        params?: Record<string, unknown>;
      }>,
    ) => {
      state.loadProfileLoading = true;
      state.loadProfileError = false;
      state.loadProfileSuccess = false;
    },

    getLoadProfileSuccess: (state, action: PayloadAction<LoadProfileResponse>) => {
      state.loadProfileLoading = false;

      if (action.payload.data) {
        state.loadProfileData = action.payload.data;
        state.savedLoadProfileData = action.payload.data; // persist server snapshot for comparison
        // Set loadProfileSaved when loading existing data - shows tick mark for previously saved data
        // This will be cleared when user starts editing (making changes)
        state.loadProfileSaved = 'S-20004';
      }
    },

    // Clear the load profile saved flag when user starts editing
    clearLoadProfileSaved: state => {
      state.loadProfileSaved = false;
    },

    getLoadProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.loadProfileLoading = false;
      state.loadProfileError = action.payload.status_code;

      // Clear loadProfileData when no load profile exists for this simulation
      if (action.payload.status_code === 'E-20024') {
        state.loadProfileData = null;
      }
    },

    // ======================================
    // SOLAR PROFILE
    // ======================================
    solarProfileRequest: (state, action: PayloadAction<SolarProfileRequest>) => {
      state.solarProfileFetchLoading = true;
      state.solarProfileFetchError = false;
      state.solarProfileFetchSuccess = false;
      state.solarProfileError = false;
      state.solarProfileSuccess = false;
    },

    solarProfileSuccess: (state, action: PayloadAction<SolarProfileResponse>) => {
      state.solarProfileFetchLoading = false;
      state.solarProfileFetchSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.solarProfileData = action.payload.data;
      }
    },

    solarProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.solarProfileFetchLoading = false;
      state.solarProfileFetchError = action.payload.status_code;
    },

    // ======================================
    // reset solar profile
    // ======================================
    resetSolarProfileMessage: state => {
      state.solarProfileError = false;
      state.solarProfileSuccess = false;
    },

    // ======================================
    // clear solar profile data
    // ======================================
    clearSolarProfileData: state => {
      state.solarProfileData = null;
    },

    // ======================================
    // UPLOAD SOLAR PROFILE CSV
    // ======================================
    uploadSolarCSVRequest: (state, action: PayloadAction<UploadSolarCSVRequest>) => {
      state.uploadSolarCSVLoading = true;
      state.uploadSolarCSVError = false;
      state.uploadSolarCSVSuccess = false;
      state.uploadSolarCSVData = null;
    },

    uploadSolarCSVSuccess: (state, action: PayloadAction<UploadSolarCSVResponse>) => {
      state.uploadSolarCSVLoading = false;
      state.uploadSolarCSVSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.uploadSolarCSVData = action.payload.data;
        state.uploadSolarCSVData.created_at = new Date().toISOString();
        state.solarProfileSourceList = [
          ...state.solarProfileSourceList,
          {
            id: String(action.payload.data.id),
            name: action.payload.data.name,
            size: action.payload.data.size,
            rows: action.payload.data.rows,
            key: action.payload.data.key,
          },
        ];
      }
    },

    uploadSolarCSVFailure: (state, action: PayloadAction<APIResponse>) => {
      state.uploadSolarCSVLoading = false;
      state.uploadSolarCSVSuccess = false;
      state.uploadSolarCSVError = action.payload.status_code;
      state.uploadSolarCSVData = null;
    },

    // ======================================
    // reset upload solar CSV
    // ======================================
    resetUploadSolarCSVMessage: state => {
      state.uploadSolarCSVError = false;
      state.uploadSolarCSVSuccess = false;
    },

    // ======================================
    // clear upload solar CSV data
    // ======================================
    clearUploadSolarCSVData: state => {
      state.uploadSolarCSVData = null;
    },

    // ======================================
    // SAVE SOLAR PROFILE
    // ======================================
    saveSolarProfileRequest: (state, action: PayloadAction<SaveSolarProfileRequest>) => {
      state.saveSolarProfileLoading = true;
      state.saveSolarProfileError = false;
    },

    saveSolarProfileSuccess: (state, action: PayloadAction<SolarProfileResponse>) => {
      state.saveSolarProfileLoading = false;
      state.saveSolarProfileSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.solarProfileData = action.payload.data;
        state.savedSolarProfileData = action.payload.data;
      }
    },

    saveSolarProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.saveSolarProfileLoading = false;
      state.saveSolarProfileError = action.payload.status_code;
    },

    // ======================================
    // reset save solar profile
    // ======================================
    resetSaveSolarProfileMessage: state => {
      state.saveSolarProfileError = false;
      state.saveSolarProfileSuccess = false;
    },

    // ======================================
    // GET SOLAR PROFILE (fetch saved data)
    // ======================================
    getSolarProfileRequest: (state, action: PayloadAction<GetSolarProfileRequest>) => {
      state.getSolarProfileLoading = true;
      state.getSolarProfileError = false;
      state.getSolarProfileSuccess = false;
      state.savedSolarProfileData = null;
      state.solarProfileData = null;
    },

    getSolarProfileSuccess: (state, action: PayloadAction<SolarProfileResponse>) => {
      state.getSolarProfileLoading = false;
      state.getSolarProfileSuccess = action.payload.status_code;

      if (action.payload.data) {
        // Only persist server snapshot here. Do not overwrite solarProfileData:
        // compute/preview from a newly uploaded CSV lives in solarProfileData and
        // must not be replaced when this GET completes later (race with upload flow).
        state.savedSolarProfileData = action.payload.data;
        // Set saveSolarProfileSuccess when loading existing data - shows tick mark for previously saved data
        // This will be cleared when user starts editing (making changes)
        state.saveSolarProfileSuccess = 'S-20006';
      }
    },

    // Clear the solar profile saved flag when user starts editing
    clearSolarProfileSaved: state => {
      state.saveSolarProfileSuccess = false;
    },

    getSolarProfileFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getSolarProfileLoading = false;
      state.getSolarProfileError = action.payload.status_code;

      // Clear savedSolarProfileData when no solar profile exists for this simulation
      if (['E-20005', 'E-20024'].includes(action.payload.status_code)) {
        state.savedSolarProfileData = null;
      }
    },

    // ======================================
    // reset get solar profile
    // ======================================
    resetGetSolarProfileMessage: state => {
      state.getSolarProfileError = false;
      state.getSolarProfileSuccess = false;
    },

    // ======================================
    // clear saved solar profile data
    // ======================================
    clearSavedSolarProfileData: state => {
      state.savedSolarProfileData = null;
    },

    // ======================================
    // BESS Container Config
    // ======================================
    bessContainerConfigRequest: (state, action: PayloadAction<BessContainerConfigRequest>) => {
      state.bessContainerConfigLoading = true;
      state.bessContainerConfigError = false;
    },

    bessContainerConfigSuccess: (state, action: PayloadAction<BessContainerConfigResponse>) => {
      state.bessContainerConfigLoading = false;
      state.bessContainerConfigSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.bessContainerConfigData = action.payload.data;
      }
    },

    bessContainerConfigFailure: (state, action: PayloadAction<APIResponse>) => {
      state.bessContainerConfigLoading = false;
      state.bessContainerConfigError = action.payload.status_code;
    },

    resetBessContainerConfigMessage: state => {
      state.bessContainerConfigError = false;
      state.bessContainerConfigSuccess = false;
    },

    clearBessContainerConfigData: state => {
      state.bessContainerConfigData = null;
    },

    getBessConfigRequest: (state, action: PayloadAction<{simulation_id: number}>) => {
      state.bessContainerConfigLoading = true;
      state.bessContainerConfigError = false;
    },

    getBessConfigSuccess: (state, action: PayloadAction<BessContainerConfigResponse>) => {
      state.bessContainerConfigLoading = false;
      if (action.payload.data) {
        state.bessContainerConfigData = action.payload.data;
        // Set bessContainerConfigSuccess when loading existing data - shows tick mark for previously saved data
        // This will be cleared when user starts editing (making changes)
        state.bessContainerConfigSuccess = 'S-20011';
      }
    },

    // ==========================
    // fetch solar profile source
    // ==========================
    getSolarProfileSourceRequest: state => {
      state.solarProfileLoading = true;
      state.solarProfileError = false;
      state.solarProfileSuccess = false;
    },
    getSolarProfileSourceSuccess: (state, action: PayloadAction<SolarProfileSourceListRequest['response']>) => {
      state.solarProfileLoading = false;
      state.solarProfileSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.solarProfileSourceList = action.payload.data.files;
      }
    },
    getSolarProfileSourceFailure: (state, action: PayloadAction<APIResponse>) => {
      state.solarProfileLoading = false;
      state.solarProfileError = action.payload.status_code;
      state.solarProfileSourceList = [];
    },

    // Clear the BESS config saved flag when user starts editing
    clearBessConfigSaved: state => {
      state.bessContainerConfigSuccess = false;
    },

    getBessConfigFailure: (state, action: PayloadAction<APIResponse>) => {
      state.bessContainerConfigLoading = false;
      state.bessContainerConfigError = action.payload.status_code;
    },

    resetCurrentSelectedProject: state => {
      state.currentSelectedProject = null;
      state.simulationData = null;
    },

    resetSimulation: state => {
      return {...initialState};
    },

    generatorDgRequest: (state, action: PayloadAction<GeneratorDg['payload']>) => {
      state.generatorDgLoading = true;
      state.generatorDgError = false;
    },
    generatorDgSuccess: (state, action: PayloadAction<GeneratorDg['response']>) => {
      state.generatorDgLoading = false;
      state.generatorDgSuccess = action.payload.status_code;
      state.generatorDgData = action.payload.data;
    },
    generatorDgFailure: (state, action: PayloadAction<APIResponse>) => {
      state.generatorDgLoading = false;
      state.generatorDgError = action.payload.status_code;
      state.generatorDgData = null;
    },

    // ======================================
    // get generator DG data
    // ======================================

    getGeneratorDgRequest: (state, _action: PayloadAction<GetGeneratorDg['params']>) => {
      state.generatorDgLoading = true;
      state.generatorDgError = false;
    },
    getGeneratorDgSuccess: (state, action: PayloadAction<GetGeneratorDg['response']>) => {
      state.generatorDgLoading = false;
      state.generatorDgSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.generatorDgData = action.payload.data;
        state.generatorDgSuccess = 'S-20019'; // Set success code to show tick mark for completed generator config step
      }
    },
    getGeneratorDgFailure: (state, action: PayloadAction<APIResponse>) => {
      state.generatorDgLoading = false;
      state.generatorDgError = action.payload.status_code;
    },

    // Silent request used to synchronize configuration updates across other browser tabs/users
    // without triggering the page-level ghost loader.
    getGeneratorDgSilentRequest: (state, _action: PayloadAction<GetGeneratorDg['params']>) => {
      state.generatorDgError = false;
      state.generatorDgSuccess = false;
    },
    getGeneratorDgSilentSuccess: (state, action: PayloadAction<GetGeneratorDg['response']>) => {
      state.generatorDgSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.generatorDgData = action.payload.data;
      }
    },
    getGeneratorDgSilentFailure: (state, action: PayloadAction<APIResponse>) => {
      state.generatorDgError = action.payload.status_code;
      // Keep the existing data intact if the background sync fails.
    },

    // ======================================
    // generator DG fuel curve data
    // ======================================

    generatorDgFuelCurveRequest: (state, action: PayloadAction<GeneratorDgFuelCurve['payload']>) => {
      state.generatorDgLoading = true;
      state.generatorDgError = false;
    },
    generatorDgFuelCurveSuccess: (state, action: PayloadAction<GeneratorDgFuelCurve['response']>) => {
      state.generatorDgLoading = false;
      // Do not update generatorDgSuccess here — fuel curve uses S-20021 and would overwrite
      // S-20019 (saved) / S-20020→S-20019 (fetched), breaking the System Setup tab green tick.
      if (action.payload.data) {
        state.generatorFuelCurveData = action.payload.data;
      }
    },
    generatorDgFuelCurveFailure: (state, action: PayloadAction<APIResponse>) => {
      state.generatorDgLoading = false;
      state.generatorDgError = action.payload.status_code;
    },

    // ======================================
    // dispatch rule data
    // ======================================

    dispatchRuleRequest: (state, action: PayloadAction<DispatchRule['payload']>) => {
      state.dispatchRuleLoading = true;
      state.dispatchRuleError = false;
      state.dispatchRuleSuccess = false;
    },
    dispatchRuleSuccess: (state, action: PayloadAction<DispatchRule['response']>) => {
      state.dispatchRuleLoading = false;
      state.dispatchRuleSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.dispatchRuleData = {
          ...action.payload.data,
          is_generator_included: state.generatorDgData?.is_included,
          is_generator_binary: state.generatorDgData?.is_binary,
        };
      } else if (state.dispatchRuleData) {
        state.dispatchRuleData.is_generator_included = state.generatorDgData?.is_included;
        state.dispatchRuleData.is_generator_binary = state.generatorDgData?.is_binary;
      }
    },
    dispatchRuleFailure: (state, action: PayloadAction<APIResponse>) => {
      state.dispatchRuleLoading = false;
      state.dispatchRuleError = action.payload.status_code;
    },

    // ======================================
    // get dispatch rule data
    // ======================================
    getDispatchRuleRequest: (state, _action: PayloadAction<GetDispatchRule['params']>) => {
      state.getDispatchRuleLoading = true;
      state.getDispatchRuleError = false;
      state.getDispatchRuleSuccess = false;
    },
    getDispatchRuleSuccess: (state, action: PayloadAction<GetDispatchRule['response']>) => {
      state.getDispatchRuleLoading = false;
      state.getDispatchRuleSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.dispatchRuleData = {
          ...action.payload.data,
          is_generator_included: state.generatorDgData?.is_included,
          is_generator_binary: state.generatorDgData?.is_binary,
        };
      }
    },
    getDispatchRuleFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getDispatchRuleLoading = false;
      state.getDispatchRuleError = action.payload.status_code;
      state.dispatchRuleData = null;
    },

    // ======================================
    // DG Sizing
    // ======================================

    dgSizingRequest: (state, action: PayloadAction<DGSizing['payload']>) => {
      state.dgSizingLoading = true;
      state.dgSizingError = false;
      state.dgSizingSuccess = false;
    },
    dgSizingSuccess: (state, action: PayloadAction<DGSizing['response']>) => {
      state.dgSizingLoading = false;
      state.dgSizingSuccess = action.payload.status_code;
    },
    dgSizingFailure: (state, action: PayloadAction<APIResponse>) => {
      state.dgSizingLoading = false;
      state.dgSizingError = action.payload.status_code;
    },

    // ======================================
    // get DG Sizing data
    // ======================================
    getDGSizingRequest: (state, _action: PayloadAction<GetDGSizing['params']>) => {
      state.getDgSizingLoading = true;
      state.getDgSizingError = false;
      state.getDgSizingSuccess = false;
    },
    getDGSizingSuccess: (state, action: PayloadAction<GetDGSizing['response']>) => {
      state.getDgSizingLoading = false;
      state.getDgSizingSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.dgSizingData = action.payload.data;
      }
    },
    getDGSizingFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getDgSizingLoading = false;
      state.getDgSizingError = action.payload.status_code;
      state.dgSizingData = null;
    },

    // Silent request used to synchronize configuration updates across other browser tabs/users
    // without triggering the page-level ghost loader.
    getDGSizingSilentRequest: (state, _action: PayloadAction<GetDGSizing['params']>) => {
      state.getDgSizingError = false;
      state.getDgSizingSuccess = false;
    },
    getDGSizingSilentSuccess: (state, action: PayloadAction<GetDGSizing['response']>) => {
      state.getDgSizingSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.dgSizingData = action.payload.data;
      }
    },
    getDGSizingSilentFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getDgSizingError = action.payload.status_code;
      // Keep the existing data intact if the background sync fails.
    },

    // ======================================
    // get SimulationList data
    // ======================================
    getSimulationListRequest: (state, _action: PayloadAction<SimulationListRequest['params']>) => {
      state.simulationListLoading = true;
      state.simulationListError = false;
      state.simulationListSuccess = false;
    },
    getSimulationListSuccess: (state, action: PayloadAction<SimulationListRequest['response']>) => {
      state.simulationListLoading = false;
      state.simulationListSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.simulationListData = action.payload.data;
      }
    },
    getSimulationListFailure: (state, action: PayloadAction<APIResponse>) => {
      state.simulationListLoading = false;
      state.simulationListError = action.payload.status_code;
      state.simulationListData = null;
    },

    updateProjectSimulationRequest: (state, action: PayloadAction<UpdateSimulationRequest['payload']>) => {
      state.updateSimulationLoading = true;
      state.updateSimulationError = false;
      state.updateSimulationSuccess = false;
    },

    updateProjectSimulationSuccess: (state, action: PayloadAction<UpdateSimulationRequest['response']>) => {
      state.updateSimulationLoading = false;
      state.updateSimulationSuccess = action.payload.status_code;
    },
    updateProjectSimulationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.updateSimulationLoading = false;
      state.updateSimulationError = action.payload.status_code;
    },

    deleteProjectSimulationRequest: (state, _action: PayloadAction<UpdateSimulationRequest['payload']>) => {
      state.deleteSimulationLoading = true;
      state.deleteSimulationError = false;
      state.deleteSimulationSuccess = false;
    },

    deleteProjectSimulationSuccess: (state, action: PayloadAction<UpdateSimulationRequest['response']>) => {
      state.deleteSimulationLoading = false;
      state.deleteSimulationSuccess = action.payload.status_code;
    },
    deleteProjectSimulationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.deleteSimulationLoading = false;
      state.deleteSimulationError = action.payload.status_code;
    },

    initiateProjectSimulationRequest: (state, _action: PayloadAction<InitiateSimulation['payload']>) => {
      state.simulationLoading = true;
      state.simulationError = false;
      state.simulationSuccess = false;

      // Reset all tab completion states when selecting a new simulation
      state.loadProfileSaved = false;
      state.saveSolarProfileSuccess = false;
      state.solarProfileSuccess = false;
      state.solarProfileFetchSuccess = false;
      state.bessContainerConfigSuccess = false;
      state.generatorDgSuccess = false;
      state.dispatchRuleSuccess = false;
      state.dgSizingSuccess = false;
      state.uploadSolarCSVSuccess = false;
      state.simulationResultsSuccess = false;
      state.runSimulationSuccess = false;
      state.customSimulationResultSuccess = false;
      state.hourlySimulationResultsSuccess = false;
      state.simulationProgressSuccess = false;
      state.multiYearProjectionSuccess = false;
      state.multiYearProjectionResultsSuccess = false;
      state.runMultiYearProjectionSuccess = false;
      state.greenAnalysisSuccess = false;
      state.detailedGreenAnalysisResultSuccess = false;
      state.detailedGreenAnalysisDataSuccess = false;
      state.greenAnalysisDataSuccess = false;
      state.runGreenAnalysisSuccess = false;
      state.runDetailedGreenAnalysisSuccess = false;

      // Clear all wizard data when selecting a new simulation to prevent stale data
      state.loadProfileData = null;
      state.savedLoadProfileData = null;
      state.solarProfileData = null;
      state.uploadSolarCSVData = null;
      state.savedSolarProfileData = null;
      state.solarProfileSourceList = [];
      state.bessContainerConfigData = null;
      state.generatorDgData = null;
      state.dispatchRuleData = null;
      state.dgSizingData = null;
      state.simulationResultsData = null;
      state.runSimulationData = null;
      state.customSimulationResultData = null;
      state.hourlySimulationResultsData = null;
      state.simulationProgressData = null;
      state.multiYearProjectionResultData = null;
      state.multiYearProjectionResultsData = null;
      state.greenAnalysisData = null;
      state.detailedGreenAnalysisResultData = null;
      state.detailedGreenAnalysisData = null;
    },

    initiateProjectSimulationSuccess: (state, action: PayloadAction<InitiateSimulation['response']>) => {
      state.simulationLoading = false;
      state.simulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.initiateSimulationData = action.payload.data;
      }
    },
    initiateProjectSimulationFailure: (state, action: PayloadAction<APIResponse>) => {
      state.simulationLoading = false;
      state.simulationError = action.payload.status_code;
      state.initiateSimulationData = null;
    },

    getProjectSimulationRequest(state, _action: PayloadAction<any>) {
      state.projectSimulationLoading = true;
      state.projectSimulationError = false;
      state.projectSimulationSuccess = false;

      // Reset all tab completion states when selecting a new project
      state.loadProfileSaved = false;
      state.saveSolarProfileSuccess = false;
      state.solarProfileFetchSuccess = false;
      state.bessContainerConfigSuccess = false;
      state.generatorDgSuccess = false;
      state.dispatchRuleSuccess = false;
      state.dgSizingSuccess = false;
      state.runSimulationSuccess = false;
      state.simulationResultsSuccess = false;
      state.customSimulationResultSuccess = false;
      state.hourlySimulationResultsSuccess = false;
      state.multiYearProjectionSuccess = false;
      state.multiYearProjectionResultsSuccess = false;
      state.runMultiYearProjectionSuccess = false;
      state.greenAnalysisSuccess = false;
      state.detailedGreenAnalysisResultSuccess = false;
      state.detailedGreenAnalysisDataSuccess = false;
      state.greenAnalysisDataSuccess = false;

      // Clear all wizard data when selecting a new project to prevent stale data
      state.loadProfileData = null;
      state.savedLoadProfileData = null;
      state.solarProfileData = null;
      state.savedSolarProfileData = null;
      state.bessContainerConfigData = null;
      state.generatorDgData = null;
      state.dispatchRuleData = null;
      state.dgSizingData = null;
      state.runSimulationData = null;
      state.simulationResultsData = null;
      state.customSimulationResultData = null;
      state.hourlySimulationResultsData = null;
      state.multiYearProjectionResultData = null;
      state.multiYearProjectionResultsData = null;
      state.greenAnalysisData = null;
      state.detailedGreenAnalysisResultData = null;
      state.detailedGreenAnalysisData = null;
    },
    getProjectSimulationSuccess(state, action: PayloadAction<UpdateSimulationRequest['response']>) {
      state.projectSimulationLoading = false;
      state.projectSimulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.projectSimulationData = action.payload.data;
      }
    },
    getProjectSimulationFailure(state, action: PayloadAction<APIResponse>) {
      state.projectSimulationLoading = false;
      state.projectSimulationError = action.payload.status_code;
      state.projectSimulationData = null;
    },

    // Silent request used to synchronize configuration updates across other browser tabs/users
    // without triggering the page-level ghost loader.
    getProjectSimulationSilentRequest: (state, _action: PayloadAction<any>) => {
      state.projectSimulationError = false;
      state.projectSimulationSuccess = false;
    },
    getProjectSimulationSilentSuccess: (state, action: PayloadAction<UpdateSimulationRequest['response']>) => {
      state.projectSimulationSuccess = action.payload.status_code;

      if (action.payload.data) {
        state.projectSimulationData = action.payload.data;
      }
    },
    getProjectSimulationSilentFailure: (state, action: PayloadAction<APIResponse>) => {
      state.projectSimulationError = action.payload.status_code;
      // Keep the existing data intact if the background sync fails.
    },

    resetInitiateSimulation: state => {
      state.initiateSimulationData = null;
    },
    resetUpdateSimulation: state => {
      state.projectSimulationData = null;
      state.updateSimulationSuccess = false;
    },
    resetDeleteSimulation: state => {
      state.projectSimulationData = null;
      state.deleteSimulationSuccess = false;
    },
    resetProjectSimulation: state => {
      state.projectSimulationData = null;
      state.projectSimulationSuccess = false;
    },
    resetUpdateSimulationFailure: state => {
      state.updateSimulationError = false;
    },

    // ======================================
    // run Simulation
    // ======================================

    runSimulationRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.runSimulationLoading = true;
      state.runSimulationError = false;
      state.runSimulationSuccess = false;
      state.runSimulationData = null;
    },
    runSimulationSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.runSimulationLoading = false;
      state.runSimulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.runSimulationData = action.payload.data;
      }
    },
    runSimulationFailure(state, action: PayloadAction<APIResponse>) {
      state.runSimulationLoading = false;
      state.runSimulationError = action.payload.status_code;
      state.runSimulationData = null;
    },

    stopSimulationRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.stopSimulationLoading = true;
      state.stopSimulationError = false;
      state.stopSimulationSuccess = false;
    },
    stopSimulationSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.stopSimulationLoading = false;
      state.stopSimulationSuccess = action.payload.status_code;
    },
    stopSimulationFailure(state, action: PayloadAction<APIResponse>) {
      state.stopSimulationLoading = false;
      state.stopSimulationError = action.payload.status_code;
    },

    simulationProgressRequest(state, _action: PayloadAction<GetSimulationProgress['payload']>) {
      state.simulationProgressLoading = true;
      state.simulationProgressError = false;
      state.simulationProgressSuccess = false;
    },
    simulationProgressSuccess(state, action: PayloadAction<GetSimulationProgress['response']>) {
      state.simulationProgressLoading = false;
      state.simulationProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.simulationProgressData = action.payload.data;
      }
    },
    simulationProgressFailure(state, action: PayloadAction<APIResponse>) {
      state.simulationProgressLoading = false;
      state.simulationProgressError = action.payload.status_code;
      state.simulationProgressData = null;
    },

    simulationProgressSilentRequest(state, _action: PayloadAction<GetSimulationProgress['payload']>) {
      state.simulationProgressError = false;
      state.simulationProgressSuccess = false;
    },
    simulationProgressSilentSuccess(state, action: PayloadAction<GetSimulationProgress['response']>) {
      state.simulationProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.simulationProgressData = action.payload.data;
      }
    },
    simulationProgressSilentFailure(state, action: PayloadAction<APIResponse>) {
      state.simulationProgressError = action.payload.status_code;
      state.simulationProgressData = null;
    },

    simulationResultsRequest(state, _action: PayloadAction<SimulationResultRequest['params']>) {
      state.simulationResultsLoading = true;
      state.simulationResultsError = false;
      state.simulationResultsSuccess = false;
    },
    simulationResultsSuccess(state, action: PayloadAction<SimulationResultRequest['response']>) {
      state.simulationResultsLoading = false;
      state.simulationResultsSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.simulationResultsData = action.payload.data;
      }
    },
    simulationResultsFailure(state, action: PayloadAction<APIResponse>) {
      state.simulationResultsLoading = false;
      state.simulationResultsError = action.payload.status_code;
      state.simulationResultsData = null;
    },

    // ======================================
    // Refresh Project Simulation (without clearing wizard data)
    // Used after saving configurations to update projectSimulationData
    // ======================================
    refreshProjectSimulationRequest(state, _action: PayloadAction<{simulation_id: number}>) {
      // state.projectSimulationLoading = true;
      state.projectSimulationError = false;
    },
    refreshProjectSimulationSuccess(state, action: PayloadAction<UpdateSimulationRequest['response']>) {
      state.projectSimulationLoading = false;
      state.projectSimulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.projectSimulationData = action.payload.data;
      }
    },
    refreshProjectSimulationFailure(state, action: PayloadAction<APIResponse>) {
      state.projectSimulationLoading = false;
      state.projectSimulationError = action.payload.status_code;
    },

    // Custom Configuration - View Detailed Analysis
    setShowDetailedAnalysis(state, action: PayloadAction<boolean>) {
      state.showDetailedAnalysis = action.payload;
    },

    customConfigRequest: (state, action: PayloadAction<CustomConfig['payload']>) => {
      state.customConfigLoading = true;
      state.customConfigError = false;
      state.customConfigSuccess = false;
    },
    customConfigSuccess: (state, action: PayloadAction<CustomConfig['response']>) => {
      state.customConfigLoading = false;
      state.customConfigSuccess = action.payload.status_code;
    },
    customConfigFailure: (state, action: PayloadAction<APIResponse>) => {
      state.customConfigLoading = false;
      state.customConfigError = action.payload.status_code;
    },

    getCustomConfigRequest: (state, _action: PayloadAction<GetCustomConfig['params']>) => {
      state.getCustomConfigLoading = true;
      state.getCustomConfigError = false;
      state.getCustomConfigSuccess = false;
    },
    getCustomConfigSuccess: (state, action: PayloadAction<GetCustomConfig['response']>) => {
      state.getCustomConfigLoading = false;
      state.getCustomConfigSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.customConfigData = action.payload.data;
      }
    },
    getCustomConfigFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getCustomConfigLoading = false;
      state.getCustomConfigError = action.payload.status_code;
      state.customConfigData = null;
    },

    // Silent request used to synchronize configuration updates across other browser tabs/users
    // without triggering the page-level ghost loader.
    getCustomConfigSilentRequest: (state, _action: PayloadAction<GetCustomConfig['params']>) => {
      state.getCustomConfigError = false;
      state.getCustomConfigSuccess = false;
    },

    getCustomConfigSilentSuccess: (state, action: PayloadAction<GetCustomConfig['response']>) => {
      state.getCustomConfigSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.customConfigData = action.payload.data;
      }
    },
    getCustomConfigSilentFailure: (state, action: PayloadAction<APIResponse>) => {
      state.getCustomConfigError = action.payload.status_code;
    },

    runCustomSimulationRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.runCustomSimulationLoading = true;
      state.runCustomSimulationError = false;
      state.runCustomSimulationSuccess = false;
    },
    runCustomSimulationSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.runCustomSimulationLoading = false;
      state.runCustomSimulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.runCustomSimulationData = action.payload.data;
      }
    },
    runCustomSimulationFailure(state, action: PayloadAction<APIResponse>) {
      state.runCustomSimulationLoading = false;
      state.runCustomSimulationError = action.payload.status_code;
      state.runCustomSimulationData = null;
    },

    customSimulationResultRequest(state, _action: PayloadAction<GetCustomSimulationResult['params']>) {
      state.customSimulationResultLoading = true;
      state.customSimulationResultError = false;
      state.customSimulationResultSuccess = false;
    },
    customSimulationResultSuccess(state, action: PayloadAction<GetCustomSimulationResult['response']>) {
      state.customSimulationResultLoading = false;
      state.customSimulationResultSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.customSimulationResultData = action.payload;
      }
    },
    customSimulationResultFailure(state, action: PayloadAction<APIResponse>) {
      state.customSimulationResultLoading = false;
      state.customSimulationResultError = action.payload.status_code;
      state.customSimulationResultData = null;
    },

    customHourlySimulationResultsRequest(state, _action: PayloadAction<CustomHourlyResult['params']>) {
      state.hourlySimulationResultsLoading = true;
      state.hourlySimulationResultsError = false;
      state.hourlySimulationResultsSuccess = false;
    },
    customHourlySimulationResultsSuccess(state, action: PayloadAction<CustomHourlyResult['response']>) {
      state.hourlySimulationResultsLoading = false;
      state.hourlySimulationResultsSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.hourlySimulationResultsData = action.payload.data;
      }
    },
    customHourlySimulationResultsFailure(state, action: PayloadAction<APIResponse>) {
      state.hourlySimulationResultsLoading = false;
      state.hourlySimulationResultsError = action.payload.status_code;
      state.hourlySimulationResultsData = null;
    },

    customMonthlySimulationResultsRequest(state, _action: PayloadAction<CustomMonthlyResult['params']>) {
      state.monthlySimulationResultsLoading = true;
      state.monthlySimulationResultsError = false;
      state.monthlySimulationResultsSuccess = false;
    },
    customMonthlySimulationResultsSuccess(state, action: PayloadAction<CustomMonthlyResult['response']>) {
      state.monthlySimulationResultsLoading = false;
      state.monthlySimulationResultsSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.monthlySimulationResultsData = action.payload.data;
      }
    },
    customMonthlySimulationResultsFailure(state, action: PayloadAction<APIResponse>) {
      state.monthlySimulationResultsLoading = false;
      state.monthlySimulationResultsError = action.payload.status_code;
      state.monthlySimulationResultsData = null;
    },

    customHourlyChartRequest(state, _action: PayloadAction<CustomHourlyChartResult['params']>) {
      state.hourlyChartLoading = true;
      state.hourlyChartError = false;
      state.hourlyChartSuccess = false;
    },
    customHourlyChartSuccess(state, action: PayloadAction<CustomHourlyChartResult['response']>) {
      state.hourlyChartLoading = false;
      state.hourlyChartSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.hourlyChartData = action.payload.data;
      }
    },
    customHourlyChartFailure(state, action: PayloadAction<APIResponse>) {
      state.hourlyChartLoading = false;
      state.hourlyChartError = action.payload.status_code;
      state.hourlyChartData = null;
    },

    // Multi Year Projection - View Detailed Analysis
    setShowDetailedMultiYearProjectionAnalysis(state, action: PayloadAction<boolean>) {
      state.showDetailedMultiYearProjectionAnalysis = action.payload;
    },

    multiYearProjectionRequest: (state, action: PayloadAction<MultiYearProjection['payload']>) => {
      state.multiYearProjectionLoading = true;
      state.multiYearProjectionError = false;
      state.multiYearProjectionSuccess = false;
    },
    multiYearProjectionSuccess: (state, action: PayloadAction<MultiYearProjection['response']>) => {
      state.multiYearProjectionLoading = false;
      state.multiYearProjectionSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionData = action.payload.data;
      }
    },
    multiYearProjectionFailure: (state, action: PayloadAction<APIResponse>) => {
      state.multiYearProjectionLoading = false;
      state.multiYearProjectionError = action.payload.status_code;
    },

    multiYearProjectionComputeRequest: (state, action: PayloadAction<MultiYearProjection['payload']>) => {
      state.multiYearProjectionComputeLoading = true;
      state.multiYearProjectionComputeError = false;
      state.multiYearProjectionComputeSuccess = false;
    },
    multiYearProjectionComputeSuccess: (state, action: PayloadAction<MultiYearProjection['response']>) => {
      state.multiYearProjectionComputeLoading = false;
      state.multiYearProjectionComputeSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionComputeData = action.payload.data;
      }
    },
    multiYearProjectionComputeFailure: (state, action: PayloadAction<APIResponse>) => {
      state.multiYearProjectionComputeLoading = false;
      state.multiYearProjectionComputeError = action.payload.status_code;
    },
    multiYearProjectionResultRequest(state, _action: PayloadAction<GetMultiYearProjection['params']>) {
      state.multiYearProjectionResultLoading = true;
      state.multiYearProjectionResultError = false;
      state.multiYearProjectionResultSuccess = false;
    },
    multiYearProjectionResultSuccess(state, action: PayloadAction<GetMultiYearProjection['response']>) {
      state.multiYearProjectionResultLoading = false;
      state.multiYearProjectionResultSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionResultData = action.payload.data;
      }
    },
    multiYearProjectionResultFailure(state, action: PayloadAction<APIResponse>) {
      state.multiYearProjectionResultLoading = false;
      state.multiYearProjectionResultError = action.payload.status_code;
      state.multiYearProjectionResultData = null;
    },
    getMultiYearSilentRequest(state, _action: PayloadAction<GetMultiYearProjection['params']>) {
      state.multiYearProjectionResultError = false;
      state.multiYearProjectionResultSuccess = false;
    },
    getMultiYearSilentSuccess(state, action: PayloadAction<GetMultiYearProjection['response']>) {
      state.multiYearProjectionResultSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionResultData = action.payload.data;
      }
    },
    getMultiYearSilentFailure(state, action: PayloadAction<APIResponse>) {
      state.multiYearProjectionResultError = action.payload.status_code;
    },

    runMultiYearProjectionRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.runMultiYearProjectionLoading = true;
      state.runMultiYearProjectionError = false;
      state.runMultiYearProjectionSuccess = false;
      state.runMultiYearProjectionData = null;
    },
    runMultiYearProjectionSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.runMultiYearProjectionLoading = false;
      state.runMultiYearProjectionSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.runMultiYearProjectionData = action.payload.data;
      }
    },
    runMultiYearProjectionFailure(state, action: PayloadAction<APIResponse>) {
      state.runMultiYearProjectionLoading = false;
      state.runMultiYearProjectionError = action.payload.status_code;
      state.runMultiYearProjectionData = null;
    },

    stopMultiYearProjectionRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.stopMultiYearProjectionLoading = true;
      state.stopMultiYearProjectionError = false;
      state.stopMultiYearProjectionSuccess = false;
    },
    stopMultiYearProjectionSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.stopMultiYearProjectionLoading = false;
      state.stopMultiYearProjectionSuccess = action.payload.status_code;
    },
    stopMultiYearProjectionFailure(state, action: PayloadAction<APIResponse>) {
      state.stopMultiYearProjectionLoading = false;
      state.stopMultiYearProjectionError = action.payload.status_code;
    },

    multiYearProjectionResultsRequest(state, _action: PayloadAction<MultiYearProjectionRequest['params']>) {
      state.multiYearProjectionResultsLoading = true;
      state.multiYearProjectionResultsError = false;
      state.multiYearProjectionResultsSuccess = false;
    },
    multiYearProjectionResultsSuccess(state, action: PayloadAction<MultiYearProjectionRequest['response']>) {
      state.multiYearProjectionResultsLoading = false;
      state.multiYearProjectionResultsSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionResultsData = action.payload.data;
      }
    },
    multiYearProjectionResultsFailure(state, action: PayloadAction<APIResponse>) {
      state.multiYearProjectionResultsLoading = false;
      state.multiYearProjectionResultsError = action.payload.status_code;
      state.multiYearProjectionResultsData = null;
    },

    multiYearProjectionProgressRequest(state, _action: PayloadAction<GetMultiYearProgress['payload']>) {
      state.multiYearProjectionProgressLoading = true;
      state.multiYearProjectionProgressError = false;
      state.multiYearProjectionProgressSuccess = false;
    },
    multiYearProjectionProgressSuccess(state, action: PayloadAction<GetMultiYearProgress['response']>) {
      state.multiYearProjectionProgressLoading = false;
      state.multiYearProjectionProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionProgressData = action.payload.data;
      }
    },
    multiYearProjectionProgressFailure(state, action: PayloadAction<APIResponse>) {
      state.multiYearProjectionProgressLoading = false;
      state.multiYearProjectionProgressError = action.payload.status_code;
      state.multiYearProjectionProgressData = null;
    },
    getMultiYearProgressSilentRequest(state, _action: PayloadAction<GetMultiYearProgress['payload']>) {
      state.multiYearProjectionProgressError = false;
      state.multiYearProjectionProgressSuccess = false;
    },
    getMultiYearProgressSilentSuccess(state, action: PayloadAction<GetMultiYearProgress['response']>) {
      state.multiYearProjectionProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.multiYearProjectionProgressData = action.payload.data;
      }
    },
    getMultiYearProgressSilentFailure(state, action: PayloadAction<APIResponse>) {
      state.multiYearProjectionProgressError = action.payload.status_code;
    },
    clearMultiYearProjectionProgressData(state) {
      state.multiYearProjectionProgressData = null;
      state.multiYearProjectionProgressSuccess = false;
      state.multiYearProjectionProgressError = false;
    },

    greenAnalysisRequest: (state, action: PayloadAction<GreenAnalysis['payload']>) => {
      state.greenAnalysisLoading = true;
      state.greenAnalysisError = false;
      state.greenAnalysisSuccess = false;
    },
    greenAnalysisSuccess: (state, action: PayloadAction<GreenAnalysis['response']>) => {
      state.greenAnalysisLoading = false;
      state.greenAnalysisSuccess = action.payload.status_code;
    },
    greenAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.greenAnalysisLoading = false;
      state.greenAnalysisError = action.payload.status_code;
    },

    greenAnalysisDataRequest: (state, action: PayloadAction<GetGreenAnalysis['payload']>) => {
      state.greenAnalysisDataLoading = true;
      state.greenAnalysisDataError = false;
      state.greenAnalysisDataSuccess = false;
    },
    greenAnalysisDataSuccess: (state, action: PayloadAction<GetGreenAnalysis['response']>) => {
      state.greenAnalysisDataLoading = false;
      state.greenAnalysisDataSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.greenAnalysisData = action.payload.data;
      }
    },
    greenAnalysisDataFailure: (state, action: PayloadAction<APIResponse>) => {
      state.greenAnalysisDataLoading = false;
      state.greenAnalysisDataError = action.payload.status_code;
      state.greenAnalysisData = null;
    },
    getGreenAnalysisSilentRequest: (state, _action: PayloadAction<GetGreenAnalysis['payload']>) => {
      state.greenAnalysisDataError = false;
      state.greenAnalysisDataSuccess = false;
    },
    getGreenAnalysisSilentSuccess: (state, action: PayloadAction<GetGreenAnalysis['response']>) => {
      state.greenAnalysisDataSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.greenAnalysisData = action.payload.data;
      }
    },
    getGreenAnalysisSilentFailure: (state, action: PayloadAction<APIResponse>) => {
      state.greenAnalysisDataError = action.payload.status_code;
    },

    // Green Analysis - Simulation results
    setShowGreenAnalysisResults(state, action: PayloadAction<boolean>) {
      state.showGreenAnalysisResults = action.payload;
    },

    runGreenAnalysisRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.runGreenAnalysisLoading = true;
      state.runGreenAnalysisError = false;
      state.runGreenAnalysisSuccess = false;
    },
    runGreenAnalysisSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.runGreenAnalysisLoading = false;
      state.runGreenAnalysisSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.runGreenAnalysisData = action.payload.data;
      }
    },
    runGreenAnalysisFailure(state, action: PayloadAction<APIResponse>) {
      state.runGreenAnalysisLoading = false;
      state.runGreenAnalysisError = action.payload.status_code;
      state.runGreenAnalysisData = null;
    },

    stopGreenAnalysisRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.stopGreenAnalysisLoading = true;
      state.stopGreenAnalysisError = false;
      state.stopGreenAnalysisSuccess = false;
    },
    stopGreenAnalysisSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.stopGreenAnalysisLoading = false;
      state.stopGreenAnalysisSuccess = action.payload.status_code;
    },
    stopGreenAnalysisFailure(state, action: PayloadAction<APIResponse>) {
      state.stopGreenAnalysisLoading = false;
      state.stopGreenAnalysisError = action.payload.status_code;
    },

    greenAnalysisResultsRequest(state, _action: PayloadAction<GreenAnalysisResultRequest['params']>) {
      state.greenAnalysisResultsLoading = true;
      state.greenAnalysisResultsError = false;
      state.greenAnalysisResultsSuccess = false;
    },
    greenAnalysisResultsSuccess(state, action: PayloadAction<GreenAnalysisResultRequest['response']>) {
      state.greenAnalysisResultsLoading = false;
      state.greenAnalysisResultsSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.greenAnalysisResultsData = action.payload.data;
      }
    },
    greenAnalysisResultsFailure(state, action: PayloadAction<APIResponse>) {
      state.greenAnalysisResultsLoading = false;
      state.greenAnalysisResultsError = action.payload.status_code;
      state.greenAnalysisResultsData = null;
    },
    greenAnalysisProgressRequest(state, _action: PayloadAction<GetSimulationProgress['payload']>) {
      state.greenAnalysisProgressLoading = true;
      state.greenAnalysisProgressError = false;
      state.greenAnalysisProgressSuccess = false;
      state.greenAnalysisProgressData = null;
    },
    greenAnalysisProgressSuccess(state, action: PayloadAction<GetSimulationProgress['response']>) {
      state.greenAnalysisProgressLoading = false;
      state.greenAnalysisProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.greenAnalysisProgressData = action.payload.data;
      }
    },
    greenAnalysisProgressFailure(state, action: PayloadAction<APIResponse>) {
      state.greenAnalysisProgressLoading = false;
      state.greenAnalysisProgressError = action.payload.status_code;
      state.greenAnalysisProgressData = null;
    },
    getGreenAnalysisProgressSilentRequest(state, _action: PayloadAction<GetSimulationProgress['payload']>) {
      state.greenAnalysisProgressError = false;
      state.greenAnalysisProgressSuccess = false;
    },
    getGreenAnalysisProgressSilentSuccess(state, action: PayloadAction<GetSimulationProgress['response']>) {
      state.greenAnalysisProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.greenAnalysisProgressData = action.payload.data;
      }
    },
    getGreenAnalysisProgressSilentFailure(state, action: PayloadAction<APIResponse>) {
      state.greenAnalysisProgressError = action.payload.status_code;
    },
    clearGreenAnalysisProgressData(state) {
      state.greenAnalysisProgressData = null;
      state.greenAnalysisProgressSuccess = false;
      state.greenAnalysisProgressError = false;
    },
    // Green Analysis - Detailed Results
    setShowDetailedGreenAnalysis(state, action: PayloadAction<boolean>) {
      state.showDetailedGreenAnalysis = action.payload;
    },

    detailedGreenAnalysisRequest: (state, action: PayloadAction<DetailedGreenAnalysis['payload']>) => {
      state.detailedGreenAnalysisLoading = true;
      state.detailedGreenAnalysisError = false;
      state.detailedGreenAnalysisSuccess = false;
    },
    detailedGreenAnalysisSuccess: (state, action: PayloadAction<DetailedGreenAnalysis['response']>) => {
      state.detailedGreenAnalysisLoading = false;
      state.detailedGreenAnalysisSuccess = action.payload.status_code;
    },
    detailedGreenAnalysisFailure: (state, action: PayloadAction<APIResponse>) => {
      state.detailedGreenAnalysisLoading = false;
      state.detailedGreenAnalysisError = action.payload.status_code;
    },

    detailedGreenAnalysisDataRequest: (state, action: PayloadAction<GetDetailedGreenAnalysis['payload']>) => {
      state.detailedGreenAnalysisDataLoading = true;
      state.detailedGreenAnalysisDataError = false;
      state.detailedGreenAnalysisDataSuccess = false;
    },
    detailedGreenAnalysisDataSuccess: (state, action: PayloadAction<GetDetailedGreenAnalysis['response']>) => {
      state.detailedGreenAnalysisDataLoading = false;
      state.detailedGreenAnalysisDataSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.detailedGreenAnalysisData = action.payload.data;
      }
    },
    detailedGreenAnalysisDataFailure: (state, action: PayloadAction<APIResponse>) => {
      state.detailedGreenAnalysisDataLoading = false;
      state.detailedGreenAnalysisDataError = action.payload.status_code;
      state.detailedGreenAnalysisData = null;
    },
    runDetailedGreenAnalysisRequest(state, _action: PayloadAction<RunSimulationRequest['payload']>) {
      state.runDetailedGreenAnalysisLoading = true;
      state.runDetailedGreenAnalysisError = false;
      state.runDetailedGreenAnalysisSuccess = false;
    },
    runDetailedGreenAnalysisSuccess(state, action: PayloadAction<RunSimulationRequest['response']>) {
      state.runDetailedGreenAnalysisLoading = false;
      state.runDetailedGreenAnalysisSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.runDetailedGreenAnalysisData = action.payload.data;
      }
    },
    runDetailedGreenAnalysisFailure(state, action: PayloadAction<APIResponse>) {
      state.runDetailedGreenAnalysisLoading = false;
      state.runDetailedGreenAnalysisError = action.payload.status_code;
      state.runDetailedGreenAnalysisData = null;
    },
    detailedGreenAnalysisProgressRequest(state, _action: PayloadAction<GetMultiYearProgress['payload']>) {
      state.detailedGreenAnalysisProgressLoading = true;
      state.detailedGreenAnalysisProgressError = false;
      state.detailedGreenAnalysisProgressSuccess = false;
    },
    detailedGreenAnalysisProgressSuccess(state, action: PayloadAction<GetMultiYearProgress['response']>) {
      state.detailedGreenAnalysisProgressLoading = false;
      state.detailedGreenAnalysisProgressSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.detailedGreenAnalysisProgressData = action.payload.data;
      }
    },
    detailedGreenAnalysisProgressFailure(state, action: PayloadAction<APIResponse>) {
      state.detailedGreenAnalysisProgressLoading = false;
      state.detailedGreenAnalysisProgressError = action.payload.status_code;
      state.detailedGreenAnalysisProgressData = null;
    },

    detailedGreenAnalysisResultRequest(state, _action: PayloadAction<GetDetailedGreenAnalysisSimulationResult['params']>) {
      state.detailedGreenAnalysisResultLoading = true;
      state.detailedGreenAnalysisResultError = false;
      state.detailedGreenAnalysisResultSuccess = false;
    },
    detailedGreenAnalysisResultSuccess(state, action: PayloadAction<GetDetailedGreenAnalysisSimulationResult['response']>) {
      state.detailedGreenAnalysisResultLoading = false;
      state.detailedGreenAnalysisResultSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.detailedGreenAnalysisResultData = action.payload.data;
      }
    },
    detailedGreenAnalysisResultFailure(state, action: PayloadAction<APIResponse>) {
      state.detailedGreenAnalysisResultLoading = false;
      state.detailedGreenAnalysisResultError = action.payload.status_code;
      state.detailedGreenAnalysisResultData = null;
    },

    editedStepSimulationDataRequest: (state, action: PayloadAction<GetEditedStepSimulation['params']>) => {
      state.editedStepSimulationLoading = true;
      state.editedStepSimulationError = false;
      state.editedStepSimulationSuccess = false;
    },
    editedStepSimulationDataSuccess: (state, action: PayloadAction<GetEditedStepSimulation['response']>) => {
      state.editedStepSimulationLoading = false;
      state.editedStepSimulationSuccess = action.payload.status_code;
      if (action.payload.data) {
        state.editedStepSimulationData = action.payload.data;
      }
    },
    editedStepSimulationDataFailure: (state, action: PayloadAction<APIResponse>) => {
      state.editedStepSimulationLoading = false;
      state.editedStepSimulationError = action.payload.status_code;
      state.editedStepSimulationData = null;
    },

    clearDetailedGreenErrors(state) {
      state.detailedGreenAnalysisError = false;
      state.runDetailedGreenAnalysisError = false;
    },
    clearMultiYearErrors(state) {
      state.multiYearProjectionError = false;
      state.runMultiYearProjectionError = false;
    },
    clearCustomConfigErrors(state) {
      state.customConfigError = false;
      state.runCustomSimulationError = false;
    },
    clearAllSimulationErrors(state) {
      state.projectSimulationError = false;
      state.editedStepSimulationError = false;
      state.loadProfileError = false;
      state.saveSolarProfileError = false;
      state.bessContainerConfigError = false;
      state.generatorDgError = false;
      state.dispatchRuleError = false;
      state.dgSizingError = false;
      state.runSimulationError = false;
      state.simulationResultsError = false;
      state.customConfigError = false;
      state.runCustomSimulationError = false;
      state.monthlySimulationResultsError = false;
      state.hourlyChartError = false;
      state.hourlySimulationResultsError = false;
      state.multiYearProjectionError = false;
      state.runMultiYearProjectionError = false;
      state.multiYearProjectionResultsError = false;
      state.greenAnalysisError = false;
      state.runGreenAnalysisError = false;
      state.greenAnalysisResultsError = false;
      state.detailedGreenAnalysisError = false;
      state.runDetailedGreenAnalysisError = false;
      state.detailedGreenAnalysisResultError = false;
    },
  },
});

// ==============================
// EXPORTS
// ==============================

export const {
  // BESS Container Config
  bessContainerConfigRequest,
  bessContainerConfigSuccess,
  bessContainerConfigFailure,
  resetBessContainerConfigMessage,
  clearBessContainerConfigData,
  loadProfileRequest,
  loadProfileSuccess,
  loadProfileFailure,
  resetLoadProfileMessage,
  clearLoadProfileData,
  cancelLoadProfileRequest,

  saveLoadProfileRequest,
  saveLoadProfileSuccess,
  saveLoadProfileFailure,

  getLoadProfileRequest,
  getLoadProfileSuccess,
  getLoadProfileFailure,
  clearLoadProfileSaved,

  // simulation
  initiateSimulationRequest,
  initiateSimulationSuccess,
  initiateSimulationFailure,
  resetSimulationMessage,

  // solar profile
  solarProfileRequest,
  solarProfileSuccess,
  solarProfileFailure,
  resetSolarProfileMessage,
  clearSolarProfileData,

  // upload solar CSV
  uploadSolarCSVRequest,
  uploadSolarCSVSuccess,
  uploadSolarCSVFailure,
  resetUploadSolarCSVMessage,
  clearUploadSolarCSVData,

  // save solar profile
  saveSolarProfileRequest,
  saveSolarProfileSuccess,
  saveSolarProfileFailure,
  resetSaveSolarProfileMessage,

  // get solar profile
  getSolarProfileRequest,
  getSolarProfileSuccess,
  getSolarProfileFailure,
  resetGetSolarProfileMessage,
  clearSavedSolarProfileData,
  clearSolarProfileSaved,

  getBessConfigRequest,
  getBessConfigSuccess,
  getBessConfigFailure,
  clearBessConfigSaved,

  resetCurrentSelectedProject,

  // solar profile source
  getSolarProfileSourceRequest,
  getSolarProfileSourceSuccess,
  getSolarProfileSourceFailure,

  resetSimulation,

  generatorDgRequest,
  generatorDgSuccess,
  generatorDgFailure,

  getGeneratorDgRequest,
  getGeneratorDgSuccess,
  getGeneratorDgFailure,

  generatorDgFuelCurveRequest,
  generatorDgFuelCurveSuccess,
  generatorDgFuelCurveFailure,

  dispatchRuleRequest,
  dispatchRuleSuccess,
  dispatchRuleFailure,

  getDispatchRuleRequest,
  getDispatchRuleSuccess,
  getDispatchRuleFailure,

  dgSizingRequest,
  dgSizingSuccess,
  dgSizingFailure,

  getDGSizingRequest,
  getDGSizingSuccess,
  getDGSizingFailure,

  getDGSizingSilentRequest,
  getDGSizingSilentSuccess,
  getDGSizingSilentFailure,

  getSimulationListRequest,
  getSimulationListSuccess,
  getSimulationListFailure,

  updateProjectSimulationRequest,
  updateProjectSimulationSuccess,
  updateProjectSimulationFailure,

  deleteProjectSimulationRequest,
  deleteProjectSimulationSuccess,
  deleteProjectSimulationFailure,

  initiateProjectSimulationRequest,
  initiateProjectSimulationSuccess,
  initiateProjectSimulationFailure,

  getProjectSimulationRequest,
  getProjectSimulationSuccess,
  getProjectSimulationFailure,
  refreshProjectSimulationRequest,
  refreshProjectSimulationSuccess,
  refreshProjectSimulationFailure,
  resetInitiateSimulation,
  resetUpdateSimulation,
  resetDeleteSimulation,
  resetProjectSimulation,
  resetUpdateSimulationFailure,

  runSimulationRequest,
  runSimulationSuccess,
  runSimulationFailure,

  stopSimulationRequest,
  stopSimulationSuccess,
  stopSimulationFailure,

  simulationProgressRequest,
  simulationProgressSuccess,
  simulationProgressFailure,

  simulationResultsRequest,
  simulationResultsSuccess,
  simulationResultsFailure,

  setShowDetailedAnalysis,

  customConfigRequest,
  customConfigSuccess,
  customConfigFailure,

  getCustomConfigRequest,
  getCustomConfigSuccess,
  getCustomConfigFailure,

  getCustomConfigSilentRequest,
  getCustomConfigSilentSuccess,
  getCustomConfigSilentFailure,

  runCustomSimulationRequest,
  runCustomSimulationSuccess,
  runCustomSimulationFailure,

  customSimulationResultRequest,
  customSimulationResultSuccess,
  customSimulationResultFailure,

  customHourlySimulationResultsRequest,
  customHourlySimulationResultsSuccess,
  customHourlySimulationResultsFailure,

  customMonthlySimulationResultsRequest,
  customMonthlySimulationResultsSuccess,
  customMonthlySimulationResultsFailure,

  customHourlyChartRequest,
  customHourlyChartSuccess,
  customHourlyChartFailure,

  setShowDetailedMultiYearProjectionAnalysis,

  multiYearProjectionRequest,
  multiYearProjectionSuccess,
  multiYearProjectionFailure,

  multiYearProjectionComputeRequest,
  multiYearProjectionComputeSuccess,
  multiYearProjectionComputeFailure,

  multiYearProjectionResultRequest,
  multiYearProjectionResultSuccess,
  multiYearProjectionResultFailure,
  getMultiYearSilentRequest,
  getMultiYearSilentSuccess,
  getMultiYearSilentFailure,

  runMultiYearProjectionRequest,
  runMultiYearProjectionSuccess,
  runMultiYearProjectionFailure,

  stopMultiYearProjectionRequest,
  stopMultiYearProjectionSuccess,
  stopMultiYearProjectionFailure,

  multiYearProjectionResultsRequest,
  multiYearProjectionResultsSuccess,
  multiYearProjectionResultsFailure,

  multiYearProjectionProgressRequest,
  multiYearProjectionProgressSuccess,
  multiYearProjectionProgressFailure,
  getMultiYearProgressSilentRequest,
  getMultiYearProgressSilentSuccess,
  getMultiYearProgressSilentFailure,
  clearMultiYearProjectionProgressData,

  greenAnalysisRequest,
  greenAnalysisSuccess,
  greenAnalysisFailure,

  greenAnalysisDataRequest,
  greenAnalysisDataSuccess,
  greenAnalysisDataFailure,
  getGreenAnalysisSilentRequest,
  getGreenAnalysisSilentSuccess,
  getGreenAnalysisSilentFailure,

  setShowGreenAnalysisResults,

  runGreenAnalysisRequest,
  runGreenAnalysisSuccess,
  runGreenAnalysisFailure,

  stopGreenAnalysisRequest,
  stopGreenAnalysisSuccess,
  stopGreenAnalysisFailure,

  greenAnalysisResultsRequest,
  greenAnalysisResultsSuccess,
  greenAnalysisResultsFailure,

  greenAnalysisProgressRequest,
  greenAnalysisProgressSuccess,
  greenAnalysisProgressFailure,
  getGreenAnalysisProgressSilentRequest,
  getGreenAnalysisProgressSilentSuccess,
  getGreenAnalysisProgressSilentFailure,
  clearGreenAnalysisProgressData,

  setShowDetailedGreenAnalysis,

  detailedGreenAnalysisRequest,
  detailedGreenAnalysisSuccess,
  detailedGreenAnalysisFailure,

  detailedGreenAnalysisDataRequest,
  detailedGreenAnalysisDataSuccess,
  detailedGreenAnalysisDataFailure,

  runDetailedGreenAnalysisRequest,
  runDetailedGreenAnalysisSuccess,
  runDetailedGreenAnalysisFailure,

  detailedGreenAnalysisProgressRequest,
  detailedGreenAnalysisProgressSuccess,
  detailedGreenAnalysisProgressFailure,

  detailedGreenAnalysisResultRequest,
  detailedGreenAnalysisResultSuccess,
  detailedGreenAnalysisResultFailure,

  editedStepSimulationDataRequest,
  editedStepSimulationDataSuccess,
  editedStepSimulationDataFailure,

  clearDetailedGreenErrors,
  clearMultiYearErrors,
  clearCustomConfigErrors,
  getGeneratorDgSilentRequest,
  getGeneratorDgSilentSuccess,
  getGeneratorDgSilentFailure,
  getProjectSimulationSilentRequest,
  getProjectSimulationSilentSuccess,
  getProjectSimulationSilentFailure,
  simulationProgressSilentRequest,
  simulationProgressSilentSuccess,
  simulationProgressSilentFailure,
  clearAllSimulationErrors,
} = simulationWizardSlice.actions;

export default simulationWizardSlice.reducer;
