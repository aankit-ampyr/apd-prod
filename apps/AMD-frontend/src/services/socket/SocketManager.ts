import {SocketEvent} from '@/interface';
import {ToastType} from '@/ui-kits';

export class SocketManager {
  public socket: WebSocket | null = null;
  public reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay: number = 3000;
  private readonly BASE_DELAY: number = 3000;
  private readonly MAX_DELAY: number = 30000;


  private messageListeners: Set<(event: SocketEvent) => void> = new Set();

  public readonly dispatch: any;
  public readonly onStatusChange: (open: boolean) => void;
  public readonly showGlobalToast: (message: string, type: ToastType) => void;

  constructor(dispatch: any, showGlobalToast: (message: string, type: ToastType) => void, onStatusChange: (open: boolean) => void) {
    this.dispatch = dispatch;
    this.onStatusChange = onStatusChange;
    this.showGlobalToast = showGlobalToast;
  }

  public addMessageListener(listener: (event: SocketEvent) => void) {
    this.messageListeners.add(listener);
  }

  public removeMessageListener(listener: (event: SocketEvent) => void) {
    this.messageListeners.delete(listener);
  }

  connect(url: string) {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.warn('[SocketManager] Socket connected');
      this.onStatusChange(true);
      this.reconnectDelay = this.BASE_DELAY; // Reset backoff delay on successful connection
    };

    this.socket.onclose = () => {
      console.warn('[SocketManager] Socket disconnected');
      this.onStatusChange(false);
      this.socket = null;

      // Exponential backoff strategy for reconnection
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.reconnectTimer = null;
          this.connect(url);
        }, this.reconnectDelay);

        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.MAX_DELAY);
      }
    };

    this.socket.onerror = err => {
      console.error('[SocketManager] Socket error:', err);
    };

    this.socket.onmessage = event => {
      try {
        const parsed: SocketEvent = JSON.parse(event.data);
        this.handleSocketEvent(parsed);
      } catch (e) {
        console.error('[SocketManager] Invalid socket message', e);
      }
    };
  }

  send(data: SocketEvent | Record<string, unknown>) {
    if (this.isOpen()) {
      this.socket!.send(JSON.stringify(data));
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onclose = null;
      this.socket.close();
      this.socket = null;
    }
  }

  hasSocket(): boolean {
    return this.socket !== null;
  }

  isConnecting(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.CONNECTING;
  }

  isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private handleSocketEvent(event: SocketEvent) {
    // Notify all registered listeners
    this.messageListeners.forEach(listener => listener(event));
  }
}
