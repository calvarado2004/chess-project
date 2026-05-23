import type {
  WsMessage,
  ClientMessageType,
  ServerMessageType,
  LobbyPlayer,
  GameStatePayload,
  GameOverPayload,
  ErrorPayload,
} from './ws-types.js';

type MessageHandler = (message: WsMessage) => void;

export interface OnlineUser {
  id: string;
  username: string;
  displayName: string;
}

export interface OnlineGame {
  gameId: string;
  white: OnlineUser | null;
  black: OnlineUser | null;
  fen: string;
  turn: 'w' | 'b';
  whiteTime: number;
  blackTime: number;
  status: 'playing' | 'finished' | 'waiting';
  lastMove?: string;
  playerColor?: 'white' | 'black';
  moveHistory?: string[];
  capturedByWhite?: number[];
  capturedByBlack?: number[];
}

export class ChessWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private handlers: Map<ServerMessageType, Set<MessageHandler>> = new Map();
  private connected = false;
  private authPromise: { resolve: (value: boolean) => void; reject: (reason?: unknown) => void } | null = null;
  private onConnectHandler: (() => void) | null = null;
  private accessToken: string | null = null;

  constructor(accessToken: string | null) {
    this.accessToken = accessToken;
    this.url = this.buildUrl();
  }

  private buildUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }

  connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.authPromise = { resolve, reject };

      try {
        this.ws = new WebSocket(this.url);
      } catch (err) {
        this.authPromise?.reject(err);
        this.authPromise = null;
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 1000;

        if (this.accessToken) {
          this.sendAuth(this.accessToken);
        } else {
          this.authPromise?.resolve(false);
          this.authPromise = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data.toString()) as WsMessage;
          this.dispatch(message);
        } catch {
          console.error('[WS] Failed to parse message:', event.data);
        }
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`);

        // If auth was pending, reject it
        if (this.authPromise) {
          this.authPromise.reject(new Error('Connection closed during auth'));
          this.authPromise = null;
        }

        // Reconnect if not explicitly closed
        if (event.code !== 4001) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };
    });
  }

  private sendAuth(token: string): void {
    this.send({ type: 'auth', payload: { token } });
  }

  private dispatch(message: WsMessage): void {
    // Handle auth response
    if (message.type === 'auth_ok' && this.authPromise) {
      this.authPromise.resolve(true);
      this.authPromise = null;
      this.onConnectHandler?.();
      return;
    }

    if (message.type === 'auth_error' && this.authPromise) {
      const payload = message.payload as ErrorPayload;
      this.authPromise.reject(new Error(payload.message));
      this.authPromise = null;
      // Cancel any pending reconnect — the token is invalid, don't keep trying
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connected = false;
      // If the token is invalid/expired, redirect to login
      if (payload.message.includes('Invalid') || payload.message.includes('expired')) {
        window.location.href = '/login';
      }
      return;
    }

    // Dispatch to type handlers
    const handlers = this.handlers.get(message.type as ServerMessageType);
    if (handlers) {
      for (const handler of handlers) {
        handler(message);
      }
    }

    // Also dispatch to 'any' handler if present
    const anyHandlers = this.handlers.get('any' as ServerMessageType);
    if (anyHandlers) {
      for (const handler of anyHandlers) {
        handler(message);
      }
    }
  }

  send<T = unknown>(message: Omit<WsMessage<T>, 'type'> & { type: ClientMessageType }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: ServerMessageType, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.handlers.get(type)?.delete(handler);
  }

  off(type: ServerMessageType, handler: MessageHandler): void {
    this.handlers.get(type)?.delete(handler);
  }

  onConnect(handler: () => void): void {
    this.onConnectHandler = handler;
  }

  // ===================== Lobby Actions =====================
  joinLobby(options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }): void {
    this.send({
      type: 'lobby_join',
      payload: {
        timeControl: options?.timeControl ?? 600,
        increment: options?.increment ?? 0,
        color: options?.color ?? 'any',
      },
    });
  }

  leaveLobby(): void {
    this.send({ type: 'lobby_leave', payload: {} });
  }

  createGame(options?: { timeControl?: number; increment?: number; color?: 'white' | 'black' | 'any' }): void {
    this.send({
      type: 'game_create',
      payload: {
        timeControl: options?.timeControl ?? 600,
        increment: options?.increment ?? 0,
        color: options?.color ?? 'any',
      },
    });
  }

  joinGame(gameId: string, color: 'white' | 'black'): void {
    this.send({
      type: 'game_join',
      payload: { gameId, color },
      gameId,
    });
  }

  // ===================== Chat Actions =====================
  sendLobbyChat(message: string): void {
    this.send({ type: 'lobby_chat', payload: { message } });
  }

  // ===================== Game Actions =====================
  sendMove(uci: string, gameId: string): void {
    // gameId is tracked server-side via playerRooms; don't include it in the message
    this.send({ type: 'move', payload: { uci } });
  }

  resign(gameId: string): void {
    this.send({ type: 'resign', payload: {}, gameId });
  }

  offerDraw(gameId: string): void {
    this.send({ type: 'draw_offer', payload: {}, gameId });
  }

  acceptDraw(gameId: string): void {
    this.send({ type: 'draw_accept', payload: {}, gameId });
  }

  declineDraw(gameId: string): void {
    this.send({ type: 'draw_decline', payload: {}, gameId });
  }

  // ===================== Utility =====================
  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close(4000, 'Client disconnect');
      this.ws = null;
    }
    this.connected = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.url = this.buildUrl();
      console.log(`[WS] Reconnecting in ${this.reconnectDelay}ms...`);
      this.connect().catch(() => {
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      });
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
  }

  updateToken(token: string): void {
    this.accessToken = token;
    if (this.connected) {
      this.sendAuth(token);
    }
  }
}
