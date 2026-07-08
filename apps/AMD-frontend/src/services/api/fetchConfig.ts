/**
 * This config is used for HTTP streaming requests only
 *
 *
 * - This config is used for document anaylysis API as well as Additional
 *   Document Upload API which is a streaming API that sends updates over
 *   time to the client.
 *
 * - The client should listen to the event: progress and event: complete
 *   to get the updates.
 * */
import {ACCESS_KEY, API} from '@/constants';
import {downloadBlob} from '@/utils';
import qs from 'qs';

/**
 * Fetch blob/file from API endpoint (for binary responses like PDFs)
 * Uses same authentication headers as regular API calls
 */
export async function fetchBlobFromApi(url: string, params?: any): Promise<Blob> {
  const token = localStorage.getItem(ACCESS_KEY);
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const baseURL = API.currentEnv ? API.baseUrls[API.currentEnv as keyof typeof API.baseUrls] : API.baseUrls.dev;
  const fullUrl = `${baseURL}${url}`;

  // Build query string if params exist
  let queryString = '';
  if (params) {
    const query = qs.stringify(params, {arrayFormat: 'repeat'});
    queryString = query ? `?${query}` : '';
  }

  const response = await fetch(`${fullUrl}${queryString}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errorData;

    try {
      errorData = await response.json(); // if API returns JSON error
    } catch {
      errorData = await response.text(); // fallback
    }

    throw {
      status: response.status,
      statusText: response.statusText,
      data: errorData,
    };
  }

  const blob = await response.blob();
  return blob;
}

/**
 * Fetches a blob from API and downloads it to local machine
 * Combines fetchBlobFromApi + downloadBlob for convenience
 */

type FetchAndDownloadBlobParams = {
  url: string;
  filename: string;
  params?: Record<string, unknown>;
};
export async function fetchAndDownloadBlob(args: FetchAndDownloadBlobParams): Promise<void> {
  const {url, filename, params} = args;
  const blob = await fetchBlobFromApi(url, params);
  downloadBlob(blob, filename);
}
