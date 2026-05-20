// ===================== WebSocket Message Protocol =====================

// Client → Server message types
export type ClientMessageType =
  | 'auth'
  | 'lobby_join'
  | 'lobby_leave'
  | 'game_create'
  | 'game_join'
  | 'move'
  | 'resign'
  | 'draw_offer'
  | 'draw_accept'
  | 'draw_decline'
  | 'pong';

// Server → Client message types
export type ServerMessageType =
  | 'auth_ok'
  | 'auth_error'
  | 'lobby_state'
  | 'game_joined'
  | 'game_state'
  | 'opponent_move'
  | 'game_over'
  | 'error'
  | 'ping'
  | 'opponent_disconnected'
  | 'opponent_reconnected'
  | 'lobby_player_joined'
  | 'lobby_player_left'
  | 'game_created'
  | 'game_joined_by_other'
  | 'draw_decline';

// ===================== Message Structure =====================
export interface WsMessage<T = unknown> {
  type: ClientMessageType | ServerMessageType;
  payload: T;
  gameId?: string;
}

// ===================== Client Message Payloads =====================
export interface AuthPayload {
  token: string;
}

export interface GameCreatePayload {
  timeControl: number; // seconds
  increment: number; // seconds per move
  color?: 'white' | 'black' | 'any';
}

export interface GameJoinPayload {
  gameId: string;
  color: 'white' | 'black';
}

export interface MovePayload {
  uci: string;
}

export interface DrawOfferPayload {
  reason?: string;
}

// ===================== Server Message Payloads =====================
export interface LobbyStatePayload {
  players: LobbyPlayer[];
}

export interface LobbyPlayer {
  id: string;
  username: string;
  displayName: string;
  color: 'white' | 'black' | 'any';
  timeControl: number;
  increment: number;
  gameId: string;
}

export interface GameStatePayload {
  gameId: string;
  fen: string;
  turn: 'w' | 'b';
  whiteTime: number;
  blackTime: number;
  whiteIncrement: number;
  blackIncrement: number;
  moveNumber: number;
  status: 'playing' | 'finished' | 'paused' | 'waiting';
  whitePlayer: { id: string; username: string; displayName: string } | null;
  blackPlayer: { id: string; username: string; displayName: string } | null;
  lastMove?: string;
  capturedByWhite?: number[];
  capturedByBlack?: number[];
  moveHistory?: string[];
}

export interface GameOverPayload {
  result: string; // '1-0', '0-1', '1/2-1/2'
  reason: 'checkmate' | 'resign' | 'timeout' | 'draw' | 'stalemate';
  fen: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export interface PingPayload {
  timestamp: number;
}

export interface PongPayload {
  timestamp: number;
}

// ===================== Game Room State =====================
export interface RoomPlayer {
  id: string;
  username: string;
  displayName: string;
  color: 'white' | 'black';
  ws: import('ws').WebSocket;
  timeLeft: number;
  connected: boolean;
  disconnectTimer: ReturnType<typeof setTimeout> | null;
}

export interface GameRoomState {
  gameId: string;
  white: RoomPlayer | null;
  black: RoomPlayer | null;
  fen: string;
  turn: 'w' | 'b';
  status: 'waiting' | 'playing' | 'finished';
  timeControl: number;
  increment: number;
  moveNumber: number;
  whiteTime: number;
  blackTime: number;
  lastMove: string | null;
  clockInterval: ReturnType<typeof setInterval> | null;
  drawOfferFrom: 'white' | 'black' | null;
  createdAt: number;
  capturedByWhite: number[];
  capturedByBlack: number[];
  moveHistory: string[];
}

// ===================== Lobby State =====================
export interface LobbyEntry {
  playerId: string;
  username: string;
  displayName: string;
  color: 'white' | 'black' | 'any';
  timeControl: number;
  increment: number;
  gameId: string;
  ws: import('ws').WebSocket;
}
