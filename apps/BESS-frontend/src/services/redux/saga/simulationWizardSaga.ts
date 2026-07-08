import {call, put, takeLatest, select} from 'redux-saga/effects';
import {SUCCESS_KEY} from '@/constants';
import {
  bessContainerConfig,
  calculateLoadProfile,
  calculateSolarProfile,
  getBessConfigData,
  getLoadProfileData,
  getSolarProfileData,
  initiateProjectSimulation,
  loadProfileSave,
  saveSolarProfileData,
  uploadSolarProfileCSV,
  getSolarProfileSource,
  generatorDg,
  getGeneratorDgData,
  generatorDgFuelCurve,
  dispatchRule,
  getDispatchRuleData,
  dgSizing,
  getDgSizingData,
  getSimulationList,
  updateSimulation,
  deleteSimulation,
  initiateSimulation,
  getProjectSimulation,
  runSimulation,
  stopSimulation,
  getSimulationProgress,
  getSimulationResults,
  getCustomConfig,
  customConfig,
  getCustomSimulationResults,
  runCustomSimulation,
  getHourlySimulationResults,
  getMonthlySimulationResults,
  getHourlyChart,
  multiYearProjection,
  multiYearProjectionCompute,
  multiYearProjectionData,
  runMultiYearProjection,
  stopMultiYearProjection,
  getMultiYearSimulationResult,
  getMultiYearProjectionProgress,
  greenAnalysis,
  greenAnalysisData,
  runGreenAnalysis,
  stopGreenAnalysis,
  getGreenAnalysisResults,
  getGreenAnalysisProgress,
  detailedGreenAnalysis,
  detailedGreenAnalysisData,
  runDetailedGreenAnalysis,
  getDetailedGreenAnalysisProgress,
  getDetailedGreenAnalysisResult,
} from '@/services/api';

import {
  loadProfileRequest,
  loadProfileSuccess,
  loadProfileFailure,
  initiateSimulationSuccess,
  initiateSimulationRequest,
  initiateSimulationFailure,
  saveLoadProfileSuccess,
  saveLoadProfileFailure,
  saveLoadProfileRequest,
  getLoadProfileSuccess,
  getLoadProfileFailure,
  getLoadProfileRequest,
  solarProfileRequest,
  solarProfileSuccess,
  solarProfileFailure,
  uploadSolarCSVRequest,
  uploadSolarCSVSuccess,
  uploadSolarCSVFailure,
  saveSolarProfileRequest,
  saveSolarProfileSuccess,
  saveSolarProfileFailure,
  getSolarProfileRequest,
  getSolarProfileSuccess,
  getSolarProfileFailure,
  bessContainerConfigRequest,
  bessContainerConfigSuccess,
  bessContainerConfigFailure,
  getBessConfigRequest,
  getBessConfigSuccess,
  getBessConfigFailure,
  resetCurrentSelectedProject,

  // solar profile source
  getSolarProfileSourceRequest,
  getSolarProfileSourceSuccess,
  getSolarProfileSourceFailure,
  generatorDgSuccess,
  generatorDgFailure,
  generatorDgRequest,
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
  getSimulationListRequest,
  getSimulationListSuccess,
  getSimulationListFailure,
  updateProjectSimulationRequest,
  updateProjectSimulationSuccess,
  updateProjectSimulationFailure,
  deleteProjectSimulationRequest,
  deleteProjectSimulationSuccess,
  deleteProjectSimulationFailure,
  initiateProjectSimulationSuccess,
  initiateProjectSimulationFailure,
  initiateProjectSimulationRequest,
  getProjectSimulationRequest,
  getProjectSimulationSuccess,
  getProjectSimulationFailure,
  refreshProjectSimulationRequest,
  refreshProjectSimulationSuccess,
  refreshProjectSimulationFailure,
  runSimulationRequest,
  runSimulationSuccess,
  runSimulationFailure,
  stopSimulationSuccess,
  stopSimulationRequest,
  stopSimulationFailure,
  simulationProgressRequest,
  simulationProgressSuccess,
  simulationProgressFailure,
  simulationResultsRequest,
  simulationResultsSuccess,
  simulationResultsFailure,
  getCustomConfigRequest,
  getCustomConfigFailure,
  getCustomConfigSuccess,
  customConfigRequest,
  customConfigSuccess,
  customConfigFailure,
  customSimulationResultRequest,
  customSimulationResultFailure,
  customSimulationResultSuccess,
  runCustomSimulationRequest,
  runCustomSimulationSuccess,
  runCustomSimulationFailure,
  customHourlySimulationResultsFailure,
  customHourlySimulationResultsSuccess,
  customHourlySimulationResultsRequest,
  customMonthlySimulationResultsRequest,
  customMonthlySimulationResultsSuccess,
  customMonthlySimulationResultsFailure,
  customHourlyChartRequest,
  customHourlyChartSuccess,
  customHourlyChartFailure,
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
  multiYearProjectionProgressFailure,
  multiYearProjectionProgressSuccess,
  multiYearProjectionProgressRequest,
  getMultiYearProgressSilentRequest,
  getMultiYearProgressSilentSuccess,
  getMultiYearProgressSilentFailure,
  greenAnalysisRequest,
  greenAnalysisSuccess,
  greenAnalysisFailure,
  greenAnalysisDataRequest,
  greenAnalysisDataSuccess,
  greenAnalysisDataFailure,
  getGreenAnalysisSilentRequest,
  getGreenAnalysisSilentSuccess,
  getGreenAnalysisSilentFailure,
  runGreenAnalysisRequest,
  stopGreenAnalysisRequest,
  runGreenAnalysisSuccess,
  runGreenAnalysisFailure,
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
  getCustomConfigSilentRequest,
  getCustomConfigSilentSuccess,
  getCustomConfigSilentFailure,
  getDGSizingSilentRequest,
  getDGSizingSilentSuccess,
  getDGSizingSilentFailure,
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
} from '../slice/simulationWizardSlice';

import {deleteProjectSuccess} from '../slice/projectsSlice';
import {initiateSimulationData, projectSimulationData, simulationData, simulationProject} from '../selectors/simulationWizardSelector';

// ======================================
// Load Profile Saga
// ======================================
function* loadProfileSaga(action: ReturnType<typeof loadProfileRequest>): Generator {
  try {
    const {simulation_id, params, payload} = action.payload;

    const response: any = yield call(calculateLoadProfile, simulation_id, params, payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(loadProfileSuccess(response.data));
    } else {
      yield put(loadProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(loadProfileFailure(error.response?.data || error.response));
  }
}

function* initiateSimulationSaga(action: ReturnType<typeof initiateSimulationRequest>): Generator {
  try {
    const {project_id, project_name} = action.payload;

    const response: any = yield call(initiateProjectSimulation, project_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(initiateSimulationSuccess({data: response.data, project_name}));
    } else {
      yield put(initiateSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(initiateSimulationFailure(error.response?.data || error.response));
  }
}

function* saveLoadProfileSaga(action: ReturnType<typeof saveLoadProfileRequest>): Generator {
  try {
    const {simulation_id, params, payload} = action.payload;

    const response: any = yield call(loadProfileSave, simulation_id, params, payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(saveLoadProfileSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(saveLoadProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(saveLoadProfileFailure(error.response?.data || error.response));
  }
}

function* getLoadProfileSaga(action: ReturnType<typeof getLoadProfileRequest>): Generator {
  try {
    const {simulation_id, params} = action.payload;

    const response: any = yield call(getLoadProfileData, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getLoadProfileSuccess(response.data));
    } else {
      yield put(getLoadProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(getLoadProfileFailure(error.response?.data || error.response));
  }
}

// ======================================
// Solar Profile Saga
// ======================================
function* solarProfileSaga(action: ReturnType<typeof solarProfileRequest>): Generator {
  try {
    const {simulation_id, params, payload} = action.payload;

    const response: any = yield call(calculateSolarProfile, simulation_id, params, payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(solarProfileSuccess(response.data));
    } else {
      yield put(solarProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(solarProfileFailure(error.response?.data || error.response));
  }
}

// ======================================
// Upload Solar Profile CSV Saga
// ======================================
function* uploadSolarCSVSaga(action: ReturnType<typeof uploadSolarCSVRequest>): Generator {
  try {
    const {simulation_id, file} = action.payload;

    const formData = new FormData();
    formData.append('file', file);

    const response: any = yield call(uploadSolarProfileCSV, simulation_id, formData);

    if (response.data.status === SUCCESS_KEY) {
      yield put(uploadSolarCSVSuccess(response.data));
    } else {
      yield put(uploadSolarCSVFailure(response.data));
    }
  } catch (error: any) {
    yield put(uploadSolarCSVFailure(error.response?.data || error.response));
  }
}

// ======================================
// Save Solar Profile Saga
// ======================================
function* saveSolarProfileSaga(action: ReturnType<typeof saveSolarProfileRequest>): Generator {
  try {
    const {simulation_id, payload} = action.payload;

    const response: any = yield call(saveSolarProfileData, simulation_id, payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(saveSolarProfileSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(saveSolarProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(saveSolarProfileFailure(error.response?.data || error.response));
  }
}

// ======================================
// Get Solar Profile Saga
// ======================================
function* getSolarProfileSaga(action: ReturnType<typeof getSolarProfileRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getSolarProfileData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getSolarProfileSuccess(response.data));
    } else {
      yield put(getSolarProfileFailure(response.data));
    }
  } catch (error: any) {
    yield put(getSolarProfileFailure(error.response?.data || error.response));
  }
}

// ======================================
// BESS Container Config Saga
// ======================================
function* bessContainerConfigSaga(action: ReturnType<typeof bessContainerConfigRequest>): Generator {
  try {
    const {simulation_id, params, payload} = action.payload;

    const response: any = yield call(bessContainerConfig, simulation_id, params, payload);
    if (response.data.status === SUCCESS_KEY) {
      yield put(bessContainerConfigSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(bessContainerConfigFailure(response.data));
    }
  } catch (error: any) {
    yield put(bessContainerConfigFailure(error.response?.data || error.response));
  }
}

function* getBessConfigDataSaga(action: ReturnType<typeof getBessConfigRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getBessConfigData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getBessConfigSuccess(response.data));
    } else {
      yield put(getBessConfigFailure(response.data));
    }
  } catch (error: any) {
    yield put(getBessConfigFailure(error.response?.data || error.response));
  }
}

function* GetSolarProfileSourceSaga(action: ReturnType<typeof getSolarProfileSourceRequest>): Generator {
  const data1 = yield select(initiateSimulationData);
  const data2 = yield select(projectSimulationData);
  const simulation_data = data1 ?? data2;
  try {
    if (!simulation_data?.id) {
      return;
    }

    const response: any = yield call(getSolarProfileSource, {simulation_id: simulation_data?.id});

    if (response.data.status === SUCCESS_KEY) {
      yield put(getSolarProfileSourceSuccess(response.data));
    } else {
      yield put(getSolarProfileSourceFailure(response.data));
    }
  } catch (error: any) {
    yield put(getSolarProfileSourceFailure(error.response?.data || error.response));
  }
}

function* deleteProjectSuccessSaga(action: ReturnType<typeof deleteProjectSuccess>): Generator {
  try {
    const projectId = action.payload.data?.id;
    const currentSimProject = yield select(simulationProject);
    // Optionally, you can dispatch an action to clear related simulation data from the state
    if (currentSimProject?.id === projectId) {
      yield put(resetCurrentSelectedProject());
    }
  } catch (error: any) {
    // Handle any errors that occur during cleanup, if necessary
    console.error('Error during deleteProjectSuccessSaga:', error);
  }
}

function* generatorDgSaga(action: ReturnType<typeof generatorDgRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(generatorDg, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(generatorDgSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(generatorDgFailure(response.data));
    }
  } catch (error: any) {
    yield put(generatorDgFailure(error.response?.data || error.response));
  }
}

function* getGeneratorDgSaga(action: ReturnType<typeof getGeneratorDgRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getGeneratorDgData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getGeneratorDgSuccess(response.data));
    } else {
      yield put(getGeneratorDgFailure(response.data));
    }
  } catch (error: any) {
    yield put(getGeneratorDgFailure(error.response?.data || error.response));
  }
}

function* generatorDgFuelCurveSaga(action: ReturnType<typeof generatorDgFuelCurveRequest>): Generator {
  try {
    const response: any = yield call(generatorDgFuelCurve, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(generatorDgFuelCurveSuccess(response.data));
    } else {
      yield put(generatorDgFuelCurveFailure(response.data));
    }
  } catch (error: any) {
    yield put(generatorDgFuelCurveFailure(error.response?.data || error.response));
  }
}

function* dispatchRuleSaga(action: ReturnType<typeof dispatchRuleRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(dispatchRule, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(dispatchRuleSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(dispatchRuleFailure(response.data));
    }
  } catch (error: any) {
    yield put(dispatchRuleFailure(error.response?.data || error.response));
  }
}

function* getDispatchRuleSaga(action: ReturnType<typeof getDispatchRuleRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getDispatchRuleData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      // Dispatch success action with response data
      yield put(getDispatchRuleSuccess(response.data));
    } else {
      yield put(getDispatchRuleFailure(response.data));
    }
  } catch (error: any) {
    yield put(getDispatchRuleFailure(error.response?.data || error.response));
  }
}

function* DGSizingSaga(action: ReturnType<typeof dgSizingRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(dgSizing, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(dgSizingSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
      yield put(simulationProgressRequest({simulation_id}));
    } else {
      yield put(dgSizingFailure(response.data));
    }
  } catch (error: any) {
    yield put(dgSizingFailure(error.response?.data || error.response));
  }
}

function* getDGSizingSaga(action: ReturnType<typeof getDGSizingRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getDgSizingData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getDGSizingSuccess(response.data));
    } else {
      yield put(getDGSizingFailure(response.data));
    }
  } catch (error: any) {
    yield put(getDGSizingFailure(error.response?.data || error.response));
  }
}

function* getDGSizingSilentSaga(action: ReturnType<typeof getDGSizingSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getDgSizingData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getDGSizingSilentSuccess(response.data));
    } else {
      yield put(getDGSizingSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getDGSizingSilentFailure(error.response?.data || error.response));
  }
}

function* getSimulationListSaga(action: ReturnType<typeof getSimulationListRequest>): Generator {
  try {
    const {project_id, ...params} = action.payload;

    const response: any = yield call(getSimulationList, project_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getSimulationListSuccess(response.data));
    } else {
      yield put(getSimulationListFailure(response.data));
    }
  } catch (error: any) {
    yield put(getSimulationListFailure(error.response?.data || error.response));
  }
}

function* updateSimulationSaga(action: ReturnType<typeof updateProjectSimulationRequest>): Generator {
  try {
    const {simulation_id, ...data} = action.payload;
    const response: any = yield call(updateSimulation, simulation_id, data);

    if (response.data.status === SUCCESS_KEY) {
      yield put(updateProjectSimulationSuccess(response.data));
    } else {
      yield put(updateProjectSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(updateProjectSimulationFailure(error.response?.data || error.response));
  }
}

function* deleteSimulationSaga(action: ReturnType<typeof deleteProjectSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(deleteSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(deleteProjectSimulationSuccess(response.data));
    } else {
      yield put(deleteProjectSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(deleteProjectSimulationFailure(error.response?.data || error.response));
  }
}

function* initiateProjectSimulationSaga(action: ReturnType<typeof initiateProjectSimulationRequest>): Generator {
  try {
    const {project_id} = action.payload;
    const response: any = yield call(initiateSimulation, project_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(initiateProjectSimulationSuccess(response.data));
    } else {
      yield put(initiateProjectSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(initiateProjectSimulationFailure(error.response?.data || error.response));
  }
}

function* getProjectSimulationSaga(action: ReturnType<typeof getProjectSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getProjectSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getProjectSimulationSuccess(response.data));
    } else {
      yield put(getProjectSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(getProjectSimulationFailure(error.response?.data || error.response));
  }
}

// ======================================
// Refresh Project Simulation Saga (without clearing wizard data)
// ======================================
function* refreshProjectSimulationSaga(action: ReturnType<typeof refreshProjectSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getProjectSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(refreshProjectSimulationSuccess(response.data));
    } else {
      yield put(refreshProjectSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(refreshProjectSimulationFailure(error.response?.data || error.response));
  }
}

function* runSimulationSaga(action: ReturnType<typeof runSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(runSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(runSimulationSuccess(response.data));
    } else {
      yield put(runSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(runSimulationFailure(error.response?.data || error.response));
  }
}

function* stopSimulationSaga(action: ReturnType<typeof stopSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(stopSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(stopSimulationSuccess(response.data));
    } else {
      yield put(stopSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(stopSimulationFailure(error.response?.data || error.response));
  }
}

function* simulationProgressSaga(action: ReturnType<typeof simulationProgressRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getSimulationProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(simulationProgressSuccess(response.data));
    } else {
      yield put(simulationProgressFailure(response.data));
    }
  } catch (error: any) {
    yield put(simulationProgressFailure(error.response?.data || error.response));
  }
}

function* simulationResultsSaga(action: ReturnType<typeof simulationResultsRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getSimulationResults, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(simulationResultsSuccess(response.data));
    } else {
      yield put(simulationResultsFailure(response.data));
    }
  } catch (error: any) {
    yield put(simulationResultsFailure(error.response?.data || error.response));
  }
}

function* customConfigSaga(action: ReturnType<typeof customConfigRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(customConfig, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(customConfigSuccess(response.data));
      yield put(refreshProjectSimulationRequest({simulation_id}));
    } else {
      yield put(customConfigFailure(response.data));
    }
  } catch (error: any) {
    yield put(customConfigFailure(error.response?.data || error.response));
  }
}

function* getCustomConfigSaga(action: ReturnType<typeof getCustomConfigRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getCustomConfig, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getCustomConfigSuccess(response.data));
    } else {
      yield put(getCustomConfigFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCustomConfigFailure(error.response?.data || error.response));
  }
}

function* getCustomConfigSilentSaga(action: ReturnType<typeof getCustomConfigSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;

    const response: any = yield call(getCustomConfig, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getCustomConfigSilentSuccess(response.data));
    } else {
      yield put(getCustomConfigSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getCustomConfigSilentFailure(error.response?.data || error.response));
  }
}

function* runCustomSimulationSaga(action: ReturnType<typeof runCustomSimulationRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(runCustomSimulation, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(runCustomSimulationSuccess(response.data));
    } else {
      yield put(runCustomSimulationFailure(response.data));
    }
  } catch (error: any) {
    yield put(runCustomSimulationFailure(error.response?.data || error.response));
  }
}

function* customSimulationResultSaga(action: ReturnType<typeof customSimulationResultRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getCustomSimulationResults, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(customSimulationResultSuccess(response.data));
    } else {
      yield put(customSimulationResultFailure(response.data));
    }
  } catch (error: any) {
    yield put(customSimulationResultFailure(error.response?.data || error.response));
  }
}

function* customHourlySimulationResultsSaga(action: ReturnType<typeof customHourlySimulationResultsRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getHourlySimulationResults, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(customHourlySimulationResultsSuccess(response.data));
    } else {
      yield put(customHourlySimulationResultsFailure(response.data));
    }
  } catch (error: any) {
    yield put(customHourlySimulationResultsFailure(error.response?.data || error.response));
  }
}

function* customMonthlySimulationResultsSaga(action: ReturnType<typeof customMonthlySimulationResultsRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getMonthlySimulationResults, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(customMonthlySimulationResultsSuccess(response.data));
    } else {
      yield put(customMonthlySimulationResultsFailure(response.data));
    }
  } catch (error: any) {
    yield put(customMonthlySimulationResultsFailure(error.response?.data || error.response));
  }
}

function* customHourlyChartSaga(action: ReturnType<typeof customHourlyChartRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getHourlyChart, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(customHourlyChartSuccess(response.data));
    } else {
      yield put(customHourlyChartFailure(response.data));
    }
  } catch (error: any) {
    yield put(customHourlyChartFailure(error.response?.data || error.response));
  }
}

function* multiYearProjectionSaga(action: ReturnType<typeof multiYearProjectionRequest>): Generator {
  try {
    const response: any = yield call(multiYearProjection, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(multiYearProjectionSuccess(response.data));
    } else {
      yield put(multiYearProjectionFailure(response.data));
    }
  } catch (error: any) {
    yield put(multiYearProjectionFailure(error.response?.data || error.response));
  }
}

function* multiYearProjectionComputeSaga(action: ReturnType<typeof multiYearProjectionComputeRequest>): Generator {
  try {
    const response: any = yield call(multiYearProjectionCompute, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(multiYearProjectionComputeSuccess(response.data));
    } else {
      yield put(multiYearProjectionComputeFailure(response.data));
    }
  } catch (error: any) {
    yield put(multiYearProjectionComputeFailure(error.response?.data || error.response));
  }
}

function* multiYearProjectionResultSaga(action: ReturnType<typeof multiYearProjectionResultRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(multiYearProjectionData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(multiYearProjectionResultSuccess(response.data));
    } else {
      yield put(multiYearProjectionResultFailure(response.data));
    }
  } catch (error: any) {
    yield put(multiYearProjectionResultFailure(error.response?.data || error.response));
  }
}

function* getMultiYearSilentSaga(action: ReturnType<typeof getMultiYearSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(multiYearProjectionData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getMultiYearSilentSuccess(response.data));
    } else {
      yield put(getMultiYearSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getMultiYearSilentFailure(error.response?.data || error.response));
  }
}

function* runMultiYearProjectionSaga(action: ReturnType<typeof runMultiYearProjectionRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(runMultiYearProjection, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(runMultiYearProjectionSuccess(response.data));
    } else {
      yield put(runMultiYearProjectionFailure(response.data));
    }
  } catch (error: any) {
    yield put(runMultiYearProjectionFailure(error.response?.data || error.response));
  }
}

function* stopMultiYearProjectionSaga(action: ReturnType<typeof stopMultiYearProjectionRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(stopMultiYearProjection, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(stopMultiYearProjectionSuccess(response.data));
    } else {
      yield put(stopMultiYearProjectionFailure(response.data));
    }
  } catch (error: any) {
    yield put(stopMultiYearProjectionFailure(error.response?.data || error.response));
  }
}

function* multiYearProjectionResultsSaga(action: ReturnType<typeof multiYearProjectionResultsRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getMultiYearSimulationResult, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(multiYearProjectionResultsSuccess(response.data));
    } else {
      yield put(multiYearProjectionResultsFailure(response.data));
    }
  } catch (error: any) {
    yield put(multiYearProjectionResultsFailure(error.response?.data || error.response));
  }
}

function* multiYearProjectionProgressSaga(action: ReturnType<typeof multiYearProjectionProgressRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getMultiYearProjectionProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(multiYearProjectionProgressSuccess(response.data));
    } else {
      yield put(multiYearProjectionProgressFailure(response.data));
    }
  } catch (error: any) {
    yield put(multiYearProjectionProgressFailure(error.response?.data || error.response));
  }
}

function* getMultiYearProgressSilentSaga(action: ReturnType<typeof getMultiYearProgressSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getMultiYearProjectionProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getMultiYearProgressSilentSuccess(response.data));
    } else {
      yield put(getMultiYearProgressSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getMultiYearProgressSilentFailure(error.response?.data || error.response));
  }
}

function* greenAnalysisSaga(action: ReturnType<typeof greenAnalysisRequest>): Generator {
  try {
    const response: any = yield call(greenAnalysis, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(greenAnalysisSuccess(response.data));
    } else {
      yield put(greenAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(greenAnalysisFailure(error.response?.data || error.response));
  }
}

function* getGreenAnalysisSaga(action: ReturnType<typeof greenAnalysisDataRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(greenAnalysisData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(greenAnalysisDataSuccess(response.data));
    } else {
      yield put(greenAnalysisDataFailure(response.data));
    }
  } catch (error: any) {
    yield put(greenAnalysisDataFailure(error.response?.data || error.response));
  }
}

function* getGreenAnalysisSilentSaga(action: ReturnType<typeof getGreenAnalysisSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(greenAnalysisData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getGreenAnalysisSilentSuccess(response.data));
    } else {
      yield put(getGreenAnalysisSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getGreenAnalysisSilentFailure(error.response?.data || error.response));
  }
}

function* runGreenAnalysisSaga(action: ReturnType<typeof runGreenAnalysisRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(runGreenAnalysis, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(runGreenAnalysisSuccess(response.data));
    } else {
      yield put(runGreenAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(runGreenAnalysisFailure(error.response?.data || error.response));
  }
}

function* stopGreenAnalysisSaga(action: ReturnType<typeof stopGreenAnalysisRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(stopGreenAnalysis, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(stopGreenAnalysisSuccess(response.data));
    } else {
      yield put(stopGreenAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(stopGreenAnalysisFailure(error.response?.data || error.response));
  }
}

function* greenAnalysisResultsSaga(action: ReturnType<typeof greenAnalysisResultsRequest>): Generator {
  try {
    const {simulation_id, ...params} = action.payload;
    const response: any = yield call(getGreenAnalysisResults, simulation_id, params);

    if (response.data.status === SUCCESS_KEY) {
      yield put(greenAnalysisResultsSuccess(response.data));
    } else {
      yield put(greenAnalysisResultsFailure(response.data));
    }
  } catch (error: any) {
    yield put(greenAnalysisResultsFailure(error.response?.data || error.response));
  }
}

function* greenAnalysisProgressSaga(action: ReturnType<typeof greenAnalysisProgressRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getGreenAnalysisProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(greenAnalysisProgressSuccess(response.data));
    } else {
      yield put(greenAnalysisProgressFailure(response.data));
    }
  } catch (error: any) {
    yield put(greenAnalysisProgressFailure(error.response?.data || error.response));
  }
}

function* getGreenAnalysisProgressSilentSaga(action: ReturnType<typeof getGreenAnalysisProgressSilentRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getGreenAnalysisProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(getGreenAnalysisProgressSilentSuccess(response.data));
    } else {
      yield put(getGreenAnalysisProgressSilentFailure(response.data));
    }
  } catch (error: any) {
    yield put(getGreenAnalysisProgressSilentFailure(error.response?.data || error.response));
  }
}

function* detailedGreenAnalysisSaga(action: ReturnType<typeof detailedGreenAnalysisRequest>): Generator {
  try {
    const response: any = yield call(detailedGreenAnalysis, action.payload);

    if (response.data.status === SUCCESS_KEY) {
      yield put(detailedGreenAnalysisSuccess(response.data));
    } else {
      yield put(detailedGreenAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(detailedGreenAnalysisFailure(error.response?.data || error.response));
  }
}

function* getDetailedGreenAnalysisSaga(action: ReturnType<typeof detailedGreenAnalysisDataRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(detailedGreenAnalysisData, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(detailedGreenAnalysisDataSuccess(response.data));
    } else {
      yield put(detailedGreenAnalysisDataFailure(response.data));
    }
  } catch (error: any) {
    yield put(detailedGreenAnalysisDataFailure(error.response?.data || error.response));
  }
}

function* runDetailedGreenAnalysisSaga(action: ReturnType<typeof runDetailedGreenAnalysisRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(runDetailedGreenAnalysis, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(runDetailedGreenAnalysisSuccess(response.data));
    } else {
      yield put(runDetailedGreenAnalysisFailure(response.data));
    }
  } catch (error: any) {
    yield put(runDetailedGreenAnalysisFailure(error.response?.data || error.response));
  }
}

function* detailedGreenAnalysisProgressSaga(action: ReturnType<typeof detailedGreenAnalysisProgressRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getDetailedGreenAnalysisProgress, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(detailedGreenAnalysisProgressSuccess(response.data));
    } else {
      yield put(detailedGreenAnalysisProgressFailure(response.data));
    }
  } catch (error: any) {
    yield put(detailedGreenAnalysisProgressFailure(error.response?.data || error.response));
  }
}

function* detailedGreenAnalysisResultSaga(action: ReturnType<typeof detailedGreenAnalysisResultRequest>): Generator {
  try {
    const {simulation_id} = action.payload;
    const response: any = yield call(getDetailedGreenAnalysisResult, simulation_id);

    if (response.data.status === SUCCESS_KEY) {
      yield put(detailedGreenAnalysisResultSuccess(response.data));
    } else {
      yield put(detailedGreenAnalysisResultFailure(response.data));
    }
  } catch (error: any) {
    yield put(detailedGreenAnalysisResultFailure(error.response?.data || error.response));
  }
}

// ======================================
// Watcher Saga
// ======================================
export default function* simulationWizardSaga(): Generator {
  yield takeLatest(loadProfileRequest.type, loadProfileSaga);
  yield takeLatest(initiateSimulationRequest.type, initiateSimulationSaga);
  yield takeLatest(saveLoadProfileRequest.type, saveLoadProfileSaga);
  yield takeLatest(getLoadProfileRequest.type, getLoadProfileSaga);
  yield takeLatest(solarProfileRequest.type, solarProfileSaga);
  yield takeLatest(uploadSolarCSVRequest.type, uploadSolarCSVSaga);
  yield takeLatest(saveSolarProfileRequest.type, saveSolarProfileSaga);
  yield takeLatest(getSolarProfileRequest.type, getSolarProfileSaga);
  yield takeLatest(bessContainerConfigRequest.type, bessContainerConfigSaga);
  yield takeLatest(getBessConfigRequest.type, getBessConfigDataSaga);

  yield takeLatest(deleteProjectSuccess.type, deleteProjectSuccessSaga);
  yield takeLatest(getSolarProfileSourceRequest.type, GetSolarProfileSourceSaga);
  yield takeLatest(generatorDgRequest.type, generatorDgSaga);
  yield takeLatest(getGeneratorDgRequest.type, getGeneratorDgSaga);
  yield takeLatest(generatorDgFuelCurveRequest.type, generatorDgFuelCurveSaga);
  yield takeLatest(dispatchRuleRequest.type, dispatchRuleSaga);
  yield takeLatest(getDispatchRuleRequest.type, getDispatchRuleSaga);
  yield takeLatest(dgSizingRequest.type, DGSizingSaga);
  yield takeLatest(getDGSizingRequest.type, getDGSizingSaga);
  yield takeLatest(getDGSizingSilentRequest.type, getDGSizingSilentSaga);
  yield takeLatest(getSimulationListRequest.type, getSimulationListSaga);
  yield takeLatest(updateProjectSimulationRequest.type, updateSimulationSaga);
  yield takeLatest(deleteProjectSimulationRequest.type, deleteSimulationSaga);
  yield takeLatest(initiateProjectSimulationRequest.type, initiateProjectSimulationSaga);
  yield takeLatest(getProjectSimulationRequest.type, getProjectSimulationSaga);
  yield takeLatest(refreshProjectSimulationRequest.type, refreshProjectSimulationSaga);
  yield takeLatest(runSimulationRequest.type, runSimulationSaga);
  yield takeLatest(stopSimulationRequest.type, stopSimulationSaga);
  yield takeLatest(simulationProgressRequest.type, simulationProgressSaga);
  yield takeLatest(simulationResultsRequest.type, simulationResultsSaga);
  yield takeLatest(customConfigRequest.type, customConfigSaga);
  yield takeLatest(getCustomConfigRequest.type, getCustomConfigSaga);
  yield takeLatest(getCustomConfigSilentRequest.type, getCustomConfigSilentSaga);
  yield takeLatest(runCustomSimulationRequest.type, runCustomSimulationSaga);
  yield takeLatest(customSimulationResultRequest.type, customSimulationResultSaga);
  yield takeLatest(customHourlySimulationResultsRequest.type, customHourlySimulationResultsSaga);
  yield takeLatest(customMonthlySimulationResultsRequest.type, customMonthlySimulationResultsSaga);
  yield takeLatest(customHourlyChartRequest.type, customHourlyChartSaga);
  yield takeLatest(multiYearProjectionRequest.type, multiYearProjectionSaga);
  yield takeLatest(multiYearProjectionComputeRequest.type, multiYearProjectionComputeSaga);
  yield takeLatest(multiYearProjectionResultRequest.type, multiYearProjectionResultSaga);
  yield takeLatest(getMultiYearSilentRequest.type, getMultiYearSilentSaga);
  yield takeLatest(runMultiYearProjectionRequest.type, runMultiYearProjectionSaga);
  yield takeLatest(stopMultiYearProjectionRequest.type, stopMultiYearProjectionSaga);
  yield takeLatest(multiYearProjectionResultsRequest.type, multiYearProjectionResultsSaga);
  yield takeLatest(multiYearProjectionProgressRequest.type, multiYearProjectionProgressSaga);
  yield takeLatest(getMultiYearProgressSilentRequest.type, getMultiYearProgressSilentSaga);
  yield takeLatest(greenAnalysisRequest.type, greenAnalysisSaga);
  yield takeLatest(greenAnalysisDataRequest.type, getGreenAnalysisSaga);
  yield takeLatest(getGreenAnalysisSilentRequest.type, getGreenAnalysisSilentSaga);
  yield takeLatest(runGreenAnalysisRequest.type, runGreenAnalysisSaga);
  yield takeLatest(stopGreenAnalysisRequest.type, stopGreenAnalysisSaga);
  yield takeLatest(greenAnalysisResultsRequest.type, greenAnalysisResultsSaga);
  yield takeLatest(greenAnalysisProgressRequest.type, greenAnalysisProgressSaga);
  yield takeLatest(getGreenAnalysisProgressSilentRequest.type, getGreenAnalysisProgressSilentSaga);
  yield takeLatest(detailedGreenAnalysisRequest.type, detailedGreenAnalysisSaga);
  yield takeLatest(detailedGreenAnalysisDataRequest.type, getDetailedGreenAnalysisSaga);
  yield takeLatest(runDetailedGreenAnalysisRequest.type, runDetailedGreenAnalysisSaga);
  yield takeLatest(detailedGreenAnalysisProgressRequest.type, detailedGreenAnalysisProgressSaga);
  yield takeLatest(detailedGreenAnalysisResultRequest.type, detailedGreenAnalysisResultSaga);
}
