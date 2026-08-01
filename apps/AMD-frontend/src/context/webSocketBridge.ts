/**
 * Bridge so non-React code (e.g. axios) can request WebSocket (re)connection
 * without importing React or the WebSocket context.
 */

let ensureConnectionHandler: (() => void) | null = null;

export function setEnsureWebSocketConnectionHandler(handler: (() => void) | null): void {
  ensureConnectionHandler = handler;
}

export function ensureWebSocketConnected(): void {
  ensureConnectionHandler?.();
}
