import { API, ACCESS_KEY, SUCCESS_KEY } from '@/constants';
import { createAxiosInstance } from './axiosConfig';
import { CustomConfig, DGSizing, DispatchRule, GeneratorDg, GeneratorDgFuelCurve, MultiYearProjection, SolarProfileSourceListRequest } from '@/interface';
import { fetchAndDownloadBlob } from './fetchConfig';
import qs from 'qs';

const defaultHeaders = {
  'Content-Type': 'application/json',
};
const authHeaders: { Authorization: string } = { Authorization: '' };

export function setAuthHeader(token: string) {
  authHeaders.Authorization = `Bearer ${token}`;
}

// this function is used to update the token for the authheader object in memory
function setAuthHeaderFromResponse(response: any) {
  if (response.data?.status === SUCCESS_KEY) {
    const token = response.data.data.access_token;

    // store the token in local storage for persistence across sessions
    localStorage.setItem(ACCESS_KEY, token);

    // update the auth header in memory for subsequent API calls
    setAuthHeader(token);
  }
  return response;
}

setAuthHeader(localStorage.getItem(ACCESS_KEY) as string);

// This is for example
export async function demo() {
  return await createAxiosInstance({
    url: API.noAuthUrls.demo,
    method: 'GET',
    headers: { ...defaultHeaders },
  });
}

export async function getUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function login(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls?.login as any,
    method: 'POST',
    headers: { ...defaultHeaders },
    data,
  });
}

export async function verifyOtp(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.verifyOtp,
    method: 'POST',
    headers: { ...defaultHeaders },
    data,
  }).then(setAuthHeaderFromResponse).catch(res => res);
}

export async function getProjects(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.projects,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function reassignProjectOwner(projectId: number, data: { user_id: number }) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}/reassign`,
    method: 'PATCH',
    headers: { ...defaultHeaders, ...authHeaders },
    data,
  });
}

export async function calculateLoadProfile(simulation_id: number, params: any, data: any) {
  return await createAxiosInstance({
    url: API.authUrls.loadProfile.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    data,
  });
}

export async function initiateProjectSimulation(projectId: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}/simulation`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function loadProfileSave(simulation_id: number, params: any, data: any) {
  return await createAxiosInstance({
    url: API.authUrls.loadProfileSave.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    data,
  });
}

export async function getLoadProfileData(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: API.authUrls.loadProfileSave.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function calculateSolarProfile(simulation_id: number, params: any, data: any) {
  return await createAxiosInstance({
    url: API.authUrls.solarProfile.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    data,
  });
}

export function uploadSolarProfileCSV(simulation_id: number, data: any) {
  return createAxiosInstance({
    url: API.authUrls.solarUploadCSV.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'multipart/form-data',
    }, data,
  });
}

export function saveSolarProfileData(simulation_id: number, data: any) {
  return createAxiosInstance({
    url: API.authUrls.solarProfileSave.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data,
  });
}

export function getSolarProfileData(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.solarProfileSave.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function bessContainerConfig(simulation_id: number, params: any, data: any) {
  return await createAxiosInstance({
    url: API.authUrls.bessConfig.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    data,
  });
}

export function getBessConfigData(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.bessConfig.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function createProject(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.projects,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data,
  });
}

export async function updateProject(
  projectId: number,
  data: any
) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}`,
    method: 'PATCH',
    headers: { ...defaultHeaders, ...authHeaders },
    data,
  });
}

export async function deleteProject(
  projectId: number,
) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}`,
    method: 'DELETE',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function restoreProject(
  projectId: number,
) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}/restore`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function archiveProject(
  projectId: number,
) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}/archive`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function unArchiveProject(
  projectId: number,
) {
  return await createAxiosInstance({
    url: `${API.authUrls.projects}${projectId}/unarchive`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getSolarProfileSource(data: SolarProfileSourceListRequest['params']) {
  return await createAxiosInstance({
    url: API.authUrls.solarProfileSource(String(data.simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function generatorDg(data: GeneratorDg['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: API.authUrls.generatorDg.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export function getGeneratorDgData(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.generatorDg.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function generatorDgFuelCurve(data: GeneratorDgFuelCurve['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: `${API.authUrls.generatorDg.replace('{simulation_id}', String(simulation_id))}/fuel-curve`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export async function dispatchRule(data: DispatchRule['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: `${API.authUrls.dispatchRules.replace('{simulation_id}', String(simulation_id))}`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export function getDispatchRuleData(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.dispatchRules.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function dgSizing(data: DGSizing['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: API.authUrls.dgSizing.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export function getDgSizingData(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.dgSizing.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getSimulationList(project_id: number, params: any) {
  return await createAxiosInstance({
    url: API.authUrls.simulationList.replace('{project_id}', String(project_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function updateSimulation(
  simulation_id: number,
  data: any
) {
  return await createAxiosInstance({
    url: API.authUrls.projectSimulation.replace('{simulation_id}', String(simulation_id)),
    method: 'PATCH',
    headers: { ...defaultHeaders, ...authHeaders },
    data,
  });
}

export async function deleteSimulation(
  simulation_id: number,
) {
  return await createAxiosInstance({
    url: API.authUrls.projectSimulation.replace('{simulation_id}', String(simulation_id)),
    method: 'DELETE',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function initiateSimulation(project_id: number) {
  return await createAxiosInstance({
    url: API.authUrls.simulationList.replace('{project_id}', String(project_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getProjectSimulation(simulation_id: number) {
  return await createAxiosInstance({
    url: API.authUrls.projectSimulation.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function runSimulation(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSizingSimulation.replace('{simulation_id}', String(simulation_id))}/run`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function stopSimulation(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSizingSimulation.replace('{simulation_id}', String(simulation_id))}/stop`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getSimulationProgress(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSizingSimulation.replace('{simulation_id}', String(simulation_id))}/progress`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getSimulationResults(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSizingSimulation.replace('{simulation_id}', String(simulation_id))}/results`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })

  });
}

export async function getSimulationResultsExport(simulation_id: number, params: any) {
  const { fileName, ...rest } = params;
  await fetchAndDownloadBlob({
    url: `${API.authUrls.runSizingSimulation.replace('{simulation_id}', String(simulation_id))}/results/export`,
    filename: fileName || `File.csv`,
    params: rest,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })
  });
}

export async function getWsToken() {
  return await createAxiosInstance({
    url: API.authUrls.ws_token,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getAuditLogs(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.audit_logs,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function customConfig(data: CustomConfig['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: API.authUrls.custom_config.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export function getCustomConfig(simulation_id: number) {
  return createAxiosInstance({
    url: API.authUrls.custom_config.replace('{simulation_id}', String(simulation_id)),
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function runCustomSimulation(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/run`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export function getCustomSimulationResults(simulation_id: number) {
  return createAxiosInstance({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/results`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getHourlySimulationResults(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/hourly-results`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })

  });
}

export async function getCustomHourlySimulationResultsExport(simulation_id: number, params: any) {
  const { fileName, ...rest } = params;
  await fetchAndDownloadBlob({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/hourly-results/export`,
    filename: fileName || `File.csv`,
    params: rest,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })
  });
}

export async function getMonthlySimulationResults(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/monthly-results`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })
  });
}

export async function getCustomMonthlySimulationResultsExport(simulation_id: number, params: any) {
  const { fileName, ...rest } = params;
  await fetchAndDownloadBlob({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/monthly-results/export`,
    filename: fileName || `File.csv`,
    params: rest,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })
  });
}

export async function getHourlyChart(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: `${API.authUrls.runSimulation.replace('{simulation_id}', String(simulation_id))}/hourly-chart`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    params,
  });
}

export async function multiYearProjection(data: MultiYearProjection['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: API.authUrls.multiYearProjection.replace('{simulation_id}', String(simulation_id)),
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export async function multiYearProjectionCompute(data: MultiYearProjection['payload']) {
  const { simulation_id, ...payload } = data;
  return await createAxiosInstance({
    url: `${API.authUrls.multiYearProjection.replace('{simulation_id}', String(simulation_id))}/compute`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
    data: payload,
  });
}

export function multiYearProjectionData(simulation_id: number) {
  return createAxiosInstance({
    url: `${API.authUrls.multiYearProjection.replace('{simulation_id}', String(simulation_id))}/`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function runMultiYearProjection(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.multiYearProjectionRun.replace('{simulation_id}', String(simulation_id))}/run`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function stopMultiYearProjection(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.multiYearProjectionRun.replace('{simulation_id}', String(simulation_id))}/stop`,
    method: 'POST',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getMultiYearSimulationResult(simulation_id: number, params: any) {
  return await createAxiosInstance({
    url: `${API.authUrls.multiYearProjectionRun.replace('{simulation_id}', String(simulation_id))}/results`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      }),
    params
  });
}

export async function getMultiYearProjectionProgress(simulation_id: number) {
  return await createAxiosInstance({
    url: `${API.authUrls.multiYearProjectionRun.replace('{simulation_id}', String(simulation_id))}/progress`,
    method: 'GET',
    headers: { ...defaultHeaders, ...authHeaders },
  });
}

export async function getMultiYearResultsExport(simulation_id: number, params: any) {
  const { fileName, ...rest } = params;
  await fetchAndDownloadBlob({
    url: `${API.authUrls.multiYearProjectionRun.replace('{simulation_id}', String(simulation_id))}/results/export`,
    filename: fileName || `File.csv`,
    params: rest,
    paramsSerializer: (params: any) =>
      qs.stringify(params, {
        arrayFormat: 'repeat',
      })
  });
}