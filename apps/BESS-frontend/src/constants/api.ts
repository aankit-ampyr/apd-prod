import {type ApiConfigInterface} from '@/interface';
const {
  VITE_APP_API_URL_LOC,
  VITE_APP_API_URL_DEV,
  VITE_APP_API_URL_QA,
  VITE_APP_API_URL_UAT,
  VITE_APP_API_URL_PROD,
  VITE_APP_WEB_APP_URL_LOC,
  VITE_APP_WEB_APP_URL_DEV,
  VITE_APP_WEB_APP_URL_QA,
  VITE_APP_WEB_APP_URL_UAT,
  VITE_APP_WEB_APP_URL_PROD,
  VITE_APP_ENV,
} = import.meta.env;

export const API: ApiConfigInterface = {
  currentEnv: VITE_APP_ENV, // API server environment: <loc, dev, qa, uat, prod>
  baseUrls: {
    loc: VITE_APP_API_URL_LOC as string,
    dev: VITE_APP_API_URL_DEV as string,
    qa: VITE_APP_API_URL_QA as string,
    uat: VITE_APP_API_URL_UAT as string,
    prod: VITE_APP_API_URL_PROD as string,
  },
  webAppUrls: {
    loc: VITE_APP_WEB_APP_URL_LOC as string,
    dev: VITE_APP_WEB_APP_URL_DEV as string,
    qa: VITE_APP_WEB_APP_URL_QA as string,
    uat: VITE_APP_WEB_APP_URL_UAT as string,
    prod: VITE_APP_WEB_APP_URL_PROD as string,
  },
  noAuthUrls: {
    demo: 'api/v1/demo',
    login: 'api/v1/auth/login/send-otp',
    verifyOtp: 'api/v1/auth/login/verify-otp',
    refresh: 'api/v1/auth/refresh',
  },
  authUrls: {
    // auth related APIs
    logout: 'api/v1/auth/logout',
    users: 'api/v1/users/',
    projects: 'api/v1/projects/',
    loadProfile: 'api/v1/simulation/{simulation_id}/load-profile/compute',
    loadProfileSave: '/api/v1/simulation/{simulation_id}/load-profile',
    solarProfile: 'api/v1/simulation/{simulation_id}/solar-profile/compute',
    solarUploadCSV: 'api/v1/simulation/{simulation_id}/solar-profile/upload',
    solarProfileSave: 'api/v1/simulation/{simulation_id}/solar-profile',
    bessConfig: '/api/v1/simulation/{simulation_id}/container-config',
    solarProfileSource: (simulation_id: string) => `api/v1/simulation/${simulation_id}/solar-profile/files`,
    generatorDg: 'api/v1/simulation/{simulation_id}/dg',
    dispatchRules: 'api/v1/simulation/{simulation_id}/dispatch-rule',
    dgSizing: 'api/v1/simulation/{simulation_id}/bess-dg-sizing',
    simulationList: 'api/v1/projects/{project_id}/simulation',
    projectSimulation: 'api/v1/simulation/{simulation_id}',
    runSizingSimulation: 'api/v1/simulation/{simulation_id}/sizing',
    audit_logs: 'api/v1/audit-logs/',
    custom_config: 'api/v1/simulation/{simulation_id}/custom-config',
    runSimulation: 'api/v1/simulation/{simulation_id}',
    multiYearProjection: 'api/v1/simulation/{simulation_id}/multi-year-projection',
    multiYearProjectionRun: 'api/v1/simulation/{simulation_id}/multi-year',
    greenAnalysis: 'api/v1/simulation/{simulation_id}/green-energy-analysis',
    detailedGreenEnergy: 'api/v1/simulation/{simulation_id}/detailed-green-energy',

    // websocket
    ws_token: 'api/v1/websocket/auth',
    ws: 'api/v1/websocket',
  },
};
