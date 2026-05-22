// ===================== WebSocket Message Types (frontend) =====================

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
  | 'lobby_chat'
  | 'pong';

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
  | 'draw_offer'
  | 'draw_decline'
  | 'lobby_chat';

export interface WsMessage<T = unknown> {
  type: ClientMessageType | ServerMessageType;
  payload: T;
  gameId?: string;
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
  moveNumber: number;
  status: 'playing' | 'finished' | 'waiting';
  whitePlayer: { id: string; username: string; displayName: string } | null;
  blackPlayer: { id: string; username: string; displayName: string } | null;
  lastMove?: string;
  capturedByWhite?: number[];
  capturedByBlack?: number[];
}

export interface GameOverPayload {
  result: string;
  reason: string;
  fen: string;
}

export interface ErrorPayload {
  message: string;
  code?: string;
}

export interface LobbyChatMessage {
  from: string;
  displayName: string;
  message: string;
  timestamp: number;
}
