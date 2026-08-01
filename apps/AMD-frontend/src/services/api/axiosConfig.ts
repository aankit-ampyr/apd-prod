import axios from 'axios';
import {API, ENCRYPTION, UserSessionEndReason} from '@/constants';
import {autoLogoutErrorCodes} from '@/constants/defaults';
import {store} from '../redux/store';
import {resetAuthWithReason, logoutRequest} from '../redux/slice';
import {encryptPayload, decryptPayload, encryptFormData} from '@/utils/encryption.utils';
import {type HTTPMethod} from '@/interface';
import qs from 'qs';

export const createAxiosInstance = async (info: {
  url: string;
  method: HTTPMethod;
  headers?: any;
  data?: any;
  params?: any;
  cancelToken?: any;
  signal?: AbortSignal;
}) => {
  try {
    const {url, method = 'GET', headers = {}, data = {}, params = {}, cancelToken, signal} = info;
    const baseUrl = API.currentEnv ? API.baseUrls[API.currentEnv as keyof typeof API.baseUrls] : API.baseUrls.dev;

    const axiosInstance = axios.create({
      baseURL: baseUrl,
      headers: {...headers, 'ngrok-skip-browser-warning': 'true'},
      withCredentials: true,
      paramsSerializer: params => qs.stringify(params, {arrayFormat: 'repeat'}),
    });

    axiosInstance.interceptors.response.use(
      response => response, // Directly return successful responses.
      async error => {
        const originalRequest = error.config;

        if (error.response.data.status_code === 'E-10011' && !originalRequest._retry) {
          originalRequest._retry = true; // Mark the request as retried to avoid infinite loops.

          try {
            // Request to server for new token pair
            await axios({
              method: 'post',
              url: baseUrl + API.noAuthUrls.refresh,
              withCredentials: true,
            });

            // Retry the original request with the new access token.
            return axiosInstance(originalRequest);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            store.dispatch(resetAuthWithReason({reason: UserSessionEndReason.ForceLogout}));
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error); // For all other errors, return the error as is.
      },
    );

    // Prepare encrypted data based on type
    let processedData = data;

    if (method !== 'GET' && data) {
      processedData = encryptRequestPayload(data);
    }

    const response = await axiosInstance({url, method, headers, data: processedData, params, cancelToken, signal});

    // decrypt the response data
    if (ENCRYPTION.encryptionFlag) {
      response.data = decryptPayload(response.data?.payload, response.data?.iv);
    }
    return response;
  } catch (error: any) {
    // Check if request was cancelled
    if (axios.isCancel(error) || error?.code === 'ERR_CANCELED') {
      return {data: {status: 'error', status_code: 'E-10001', cancelled: true}};
    }

    // decrypt the error response data
    if (ENCRYPTION.encryptionFlag) {
      error.response.data = decryptPayload(error.response.data?.payload, error.response.data?.iv);
    }

    // payload error
    // if (error?.response?.status === 422) {
    //   return {data: {status: 'error', status_code: 'E-10061'}};
    // }
    // if (error?.response?.status === 404) {
    //   return {data: {status: 'error', status_code: 'E-10001'}};
    // }
    if (error?.response) {
      if (autoLogoutErrorCodes.includes(error.response.data?.status_code)) {
        if (error.response.data?.status_code === 'E-10110') {
          store.dispatch(resetAuthWithReason({
            reason: UserSessionEndReason.ForceLogout,
            errorCode: error.response.data.status_code
          }));
        } else {
          store.dispatch(logoutRequest());
        }
        // Halt the promise chain so sagas don't resume and pollute the fresh Redux store
        return new Promise(() => {});
      }
      return error?.response;
    }
    return {data: {status: 'error', status_code: 'E-10001'}};
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
