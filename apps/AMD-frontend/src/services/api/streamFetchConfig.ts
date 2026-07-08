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
import {HTTPMethod, SSEEvent} from '@/interface';
import {API, COMPLETE_KEY, ENCRYPTION, ERROR_KEY, PROGRESS_KEY} from '@/constants';
import {autoLogoutErrorCodes} from '@/constants/defaults';
import {logoutRequest} from '../redux/slice';
import {store} from '../redux/store';
import { END, eventChannel } from 'redux-saga';
import {encryptPayload, decryptPayload, encryptFormData} from '@/utils/encryption.utils';

export const createStreamingInstance = async (info: {
  url: string;
  method: HTTPMethod;
  headers?: any;
  data?: any;
  params?: any;
  isMultipart?: boolean;
  onMessage?: (msg: any) => void;
  abortController?: AbortController;
}) => {
  const {
    url,
    method = 'GET',
    headers = {},
    data = {},
    params = {},
    onMessage,
    isMultipart = false,
    abortController: providedController,
  } = info;
  // Construct base URL
  const baseURL = API.currentEnv
    ? API.baseUrls[API.currentEnv as keyof typeof API.baseUrls]
    : API.baseUrls.dev;

  // ==================================
  // build full URL with query params
  // ==================================
  let fullUrl = baseURL + url;
  const paramsString = new URLSearchParams(params).toString();
  if (paramsString) {
    fullUrl += `?${paramsString}`;
  }

  // ==================================
  // create controller
  // ==================================
  const controller = providedController || new AbortController();

  // ==================================
  // prepare body based on content type (with encryption)
  // ==================================
  let body: any;
  const requestHeaders = { ...headers };

  if (method !== 'GET') {
    const processedData = encryptRequestPayload(data);
    if (isMultipart) {
      // For multipart, data should already be FormData (encryptFormData returns FormData)
      body = processedData;
      // Remove Content-Type if it exists, let browser set it
      delete requestHeaders['Content-Type'];
    } else {
      // For JSON - encrypted payload is {iv, payload} or plain object
      body = JSON.stringify(processedData);
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  // ==================================
  // request options
  // ==================================
  const requestOptions = {
    method,
    headers: requestHeaders,
    body,
    signal: controller.signal,
  };

  // ==================================
  // fetch data
  // ==================================
  try {
    const response = await fetch(fullUrl, requestOptions);
    // guard clauses for non-streaming errors
    if (!response.ok) {
      const errData = await safeJson(response);
      const decryptedErrData = safeDecryptResponse(errData);
      handleAutoLogout(decryptedErrData);
      return {data: decryptedErrData, status: response.status};
    }

    if (!response.body) {
      return {data: {status: 'error', status_code: 'E-10001'}};
    }

    // ==================================
    // read data
    // ==================================
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    
    let buffer = '';
    let finalPayload: any = null;

    while (true) {
      // Check if request was aborted
      if (controller.signal.aborted) {
        reader.cancel();
        return {data: {status: 'error', status_code: 'E-10001', cancelled: true}};
      }

      const {done, value} = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, {stream: true});
      
      // Process all complete events in buffer
      const events = buffer.split('\n\n');
      // Keep the last incomplete event in buffer
      buffer = events.pop() || '';

      
      for (const eventText of events) {
        if (!eventText.trim()) continue;
        
        const parsedEvent = parseSSEEvent(eventText);
        if (!parsedEvent) continue;

        const { event, data: payload } = parsedEvent;

        if (event === 'progress') {
          onMessage?.(payload);
        } else if (event === 'success' || event === 'error') {
          finalPayload = payload;
        }
      }
    }
    
    // After loop completes, handle the final payload
    if (finalPayload) {
      if (finalPayload.status === 'error') {
        handleAutoLogout(finalPayload);
      }
      return { data: finalPayload };
    }
    
    // If no final payload was received
    return { data: { status: 'error', status_code: 'E-10001' } };

  } catch (error: any) {
    // Check if error is due to abort
    if (error.name === 'AbortError' || controller.signal.aborted) {
      return {data: {status: 'error', status_code: 'E-10001', cancelled: true}};
    }
    return {data: {status: 'error', status_code: 'E-10001'}};
  }
};

function parseSSEEvent(eventText: string): { event: SSEEvent; data: any } | null {
  const lines = eventText.split('\n');
  
  let event = '';
  const dataLines: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('event:')) {
      event = trimmedLine.substring(6).trim();
    } else if (trimmedLine.startsWith('data:')) {
      dataLines.push(trimmedLine.substring(5).trim());
    }
  }

  if (!event || dataLines.length === 0) return null;

  const dataStr = dataLines.join('\n');

  try {
    const parsed = JSON.parse(dataStr);
    const decrypted = safeDecryptResponse(parsed);
    return {
      event: event as SSEEvent,
      data: decrypted,
    };
  } catch (error) {
    console.error('JSON parse error in SSE:', error);
    return null;
  }
}

/* ---------------- helpers ---------------- */

function encryptRequestPayload(data: any) {
  if (!ENCRYPTION.encryptionFlag) return data;

  if (data instanceof FormData) {
    return encryptFormData(data);
  }
  if (Object.keys(data || {}).length > 0) {
    return encryptPayload(data);
  }
  return data;
}

function safeDecryptResponse(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (data.payload != null && data.iv != null) {
    try {
      return decryptPayload(data.payload, data.iv);
    } catch {
      return data;
    }
  }
  return data;
}

function handleAutoLogout(payload: any) {
  const code = payload?.status_code;
  if (autoLogoutErrorCodes.includes(code)) {
    store.dispatch(logoutRequest());
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {status: 'error', status_code: 'E-10001'};
  }
}


/**
 * this function creates a streaming channel for the given data
 * Returns both the channel and the AbortController for cancellation
 */
export function createStreamingChannel(config: {
  url: string;
  method: HTTPMethod;
  headers: any;
  data?: any;
  isMultipart?: boolean;
  abortController?: AbortController;
}): { channel: ReturnType<typeof eventChannel>; abortController: AbortController } {
  const abortController = config.abortController || new AbortController();
  
  const channel = eventChannel(emitter => {
    createStreamingInstance({
      ...config,
      abortController,
      onMessage: message => {
        emitter({ type: PROGRESS_KEY, payload: message });
      },
    })
      .then(finalResponse => {
        // Don't emit if cancelled
        if (!finalResponse.data?.cancelled) {
          emitter({ type: COMPLETE_KEY, payload: finalResponse });
        } else {
          emitter({ type: ERROR_KEY, payload: finalResponse });
        }
        emitter(END);
      })
      .catch(error => {
        emitter({ type: ERROR_KEY, payload: error });
        emitter(END);
      });

    return () => {
      // Cleanup: abort the request if channel is closed
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    };
  });

  return { channel, abortController };
}