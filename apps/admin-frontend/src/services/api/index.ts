import {API, ACCESS_KEY, SUCCESS_KEY} from '@/constants';
import {createAxiosInstance} from './axiosConfig';

const defaultHeaders = {
  'Content-Type': 'application/json',
};
const authHeaders: {Authorization: string} = {Authorization: ''};

export function setAuthHeader(token: string) {
  authHeaders.Authorization = `Bearer ${token}`;
}

// this function is used to update the token for the authheader object in memory
function setAuthHeaderFromResponse(response: any) {
  if (response.data?.status === SUCCESS_KEY){
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
    headers: {...defaultHeaders},
  });
}

export async function addUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'POST',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function editUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function getUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'GET',
    headers: {...defaultHeaders, ...authHeaders},
    params,
  });
}

export async function deleteUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'DELETE',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function organizationList(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'GET',
    headers: {...defaultHeaders, ...authHeaders},
    params,
  });
}

export async function addOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'POST',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function editOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function login(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.login,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  }).then(setAuthHeaderFromResponse);
}

export async function assignOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_organization(data.id),
    method: 'PUT',
    headers: {...defaultHeaders, ...authHeaders},
    data,
  });
}

export async function getAuditLogs(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.audit_logs,
    method: 'GET',
    headers: {...defaultHeaders, ...authHeaders},
    params,
  });
}

export async function verifyOtp(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.verifyOtp,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  }).then(setAuthHeaderFromResponse).catch(res => res);
}

