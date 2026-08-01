import {API, ACCESS_KEY, SUCCESS_KEY} from '@/constants';
import {createAxiosInstance} from './axiosConfig';

const defaultHeaders = {
  'Content-Type': 'application/json',
};

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
    headers: {...defaultHeaders},
    data,
  });
}

export async function editUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

export async function getUsers(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.users,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function deleteUser(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_id(data.id),
    method: 'DELETE',
    headers: {...defaultHeaders},
    data,
  });
}

export async function organizationList(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function addOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function editOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.organization_id(data.id),
    method: 'PATCH',
    headers: {...defaultHeaders},
    data,
  });
}

export async function login(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.login,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  });
}

export async function assignOrganization(data: any) {
  return await createAxiosInstance({
    url: API.authUrls.user_organization(data.id),
    method: 'PUT',
    headers: {...defaultHeaders},
    data,
  });
}

export async function getAuditLogs(params: any) {
  return await createAxiosInstance({
    url: API.authUrls.audit_logs,
    method: 'GET',
    headers: {...defaultHeaders},
    params,
  });
}

export async function verifyOtp(data: any) {
  return await createAxiosInstance({
    url: API.noAuthUrls.verifyOtp,
    method: 'POST',
    headers: {...defaultHeaders},
    data,
  }).catch(res => res);
}

export async function logout() {
  return await createAxiosInstance({
    url: API.authUrls.logout,
    method: 'POST',
  });
}

export async function getWsToken() {
  return await createAxiosInstance({
    url: API.authUrls.ws_token,
    method: 'POST',
    headers: {...defaultHeaders},
  });
}
