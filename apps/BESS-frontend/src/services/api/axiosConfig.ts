import axios from 'axios';
import { API, ENCRYPTION, UserSessionEndReason } from '@/constants';
import { store } from '../redux/store';
import { logoutRequest, resetAuthWithReason } from '../redux/slice';
import { resetCurrentSelectedProject } from '../redux/slice/simulationWizardSlice';
import { encryptPayload, decryptPayload, encryptFormData } from '@/utils/encryption.utils';
import { autoLogoutErrorCodes } from '@/constants/defaults';
import { type HTTPMethod } from '@/interface';

export const createAxiosInstance = async (info: {
  url: string;
  method: HTTPMethod;
  headers?: any;
  data?: any;
  params?: any;
  cancelToken?: any;
  signal?: AbortSignal;
  paramsSerializer?: (params: any) => string;
}) => {
  try {

    const { url, method = 'GET', headers = {}, data = {}, params = {}, cancelToken, signal, paramsSerializer } = info;

    const axiosInstance = axios.create({
      baseURL: API.currentEnv ? API.baseUrls[API.currentEnv as keyof typeof API.baseUrls] : API.baseUrls.dev,
      headers,
      paramsSerializer,
    });

    // Prepare encrypted data based on type
    let processedData = data;

    if (method !== 'GET' && data) {
      processedData = encryptRequestPayload(data);
    }

    const response = await axiosInstance({ url, method, headers, data: processedData, params, cancelToken, signal, paramsSerializer });

    // decrypt the response data
    if (ENCRYPTION.encryptionFlag) {
      response.data = decryptPayload(response.data?.payload, response.data?.iv);
    }
    return response;
  } catch (error: any) {
    // =================== Check if request was cancelled ===================
    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      return { data: { status: 'error', status_code: 'E-10001', cancelled: true } };
    }

    // =============== decrypt the error response data ===================
    if (ENCRYPTION.encryptionFlag) {
      error.response.data = decryptPayload(error.response.data?.payload, error.response.data?.iv);
    }

    //  =============== Payload error ===================
    if (error?.response?.status === 422) {
      return { data: { status: 'error', status_code: 'E-10061' } };
    }

    // ============= Auto logout for specific error codes =============
    if (error?.response) {
      if (autoLogoutErrorCodes.includes(error.response.data?.status_code)) {
        if (error.response.data?.status_code === 'E-20037') {
          store.dispatch(resetAuthWithReason({ reason: UserSessionEndReason.ForceLogout }));
        }
        else {
          store.dispatch(logoutRequest());
        }
      }

      if (error.response.data?.status_code === 'E-20015') {
        store.dispatch(resetCurrentSelectedProject());
      }
      return error?.response;
    }

    // =================== Generic other errors ===================
    return { data: { status: 'error', status_code: 'E-10001' } };
  }
};

function encryptRequestPayload(data: any) {
  if (!ENCRYPTION.encryptionFlag) return data;

  if (data instanceof FormData) {
    // Handle FormData encryption
    return encryptFormData(data);

  } else if (Object.keys(data).length > 0) {
    // Handle regular JSON encryption
    return encryptPayload(data);
  }
  return data;
}