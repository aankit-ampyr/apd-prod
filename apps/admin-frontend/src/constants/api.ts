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
  },
  authUrls: {
    users: 'api/v1/users/',
    user_id: (id: number) => `api/v1/users/${id}`,
    user_organization: (userId: number) => `/api/v1/users/${userId}/organization`,

    organization: 'api/v1/organizations/',
    organization_id: (id: number) => `api/v1/organizations/${id}`,

    audit_logs: 'api/v1/audit-logs/',
  },
};
