import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { LobbyManager, buildLobbyStatePayload } from './lobby.js';
import { GameRoom } from './rooms.js';
import type {
  WsMessage,
  ClientMessageType,
  AuthPayload,
  GameCreatePayload,
  GameJoinPayload,
  MovePayload,
  LobbyEntry,
} from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export class WsGameServer {
  private wss: WebSocketServer;
  private lobby = new LobbyManager();
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map(); // playerId -> gameId

  constructor(server: ReturnType<typeof import('http').createServer>) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
    });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log('[WS] WebSocket server initialized on /ws');
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url || '/ws', `http://localhost`);
    const token = url.searchParams.get('token');

    // Auth callback
    const send = (message: WsMessage) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify(message));
      }
    };

    // If no token provided, wait for auth message
    if (!token) {
      ws.once('message', (data) => {
        try {
          const msg = JSON.parse(data.toString()) as WsMessage<AuthPayload>;
          if (msg.type === 'auth') {
            this.handleAuth(ws, msg.payload.token, send);
          } else {
            send({ type: 'auth_error', payload: { message: 'Please authenticate first' } });
          }
        } catch {
          send({ type: 'auth_error', payload: { message: 'Invalid message format' } });
        }
      });
      return;
    }

    // Token in URL
    this.handleAuth(ws, token, send);
  }

  private handleAuth(ws: WebSocket, token: string, send: (msg: WsMessage) => void): void {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };

      // Store user info on the WebSocket connection
      (ws as unknown as { userId: string; username: string }).userId = decoded.userId;
      (ws as unknown as { userId: string; username: string }).username = decoded.username;

      send({ type: 'auth_ok', payload: { message: 'Authenticated' } });

      // Set up message handler
      this.setupMessageHandler(ws, send);
    } catch {
      send({ type: 'auth_error', payload: { message: 'Invalid or expired token' } });
      ws.close(4001, 'Invalid token');
    }
  }

  private setupMessageHandler(ws: WebSocket, send: (msg: WsMessage) => void): void {
    const userId = (ws as unknown as { userId: string }).userId;
    const username = (ws as unknown as { username: string }).username;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WsMessage;
        console.log('[WS] Received message:', JSON.stringify(msg));
        this.handleMessage(ws, userId, username, msg, send);
      } catch (err) {
        console.error('[WS] Error processing message:', err);
        send({ type: 'error', payload: { message: 'Invalid message format' } });
      }
    });

    ws.on('pong', () => {
      // Client responded to heartbeat
    });

    ws.on('close', () => {
      this.handleDisconnect(userId, ws);
    });
  }

  private handleMessage(
    ws: WebSocket,
    userId: string,
    username: string,
    msg: WsMessage,
    send: (msg: WsMessage) => void
  ): void {
    console.log('[WS] handleMessage: type=', msg.type, 'keys=', Object.keys(msg));
    switch (msg.type) {
      case 'pong':
        break; // Heartbeat response, ignored

      case 'lobby_join': {
        const timeControl = (msg.payload as any)?.timeControl || 600;
        const increment = (msg.payload as any)?.increment || 0;
        const color = (msg.payload as any)?.color || 'any';

        // Leave current room if in one
        this.leaveRoom(userId, send);

        // Join lobby
        this.lobby.join({
          playerId: userId,
          username,
          displayName: username,
          color,
          timeControl,
          increment,
          ws,
        });

        // Broadcast updated lobby to all
        this.broadcastLobby();
        break;
      }

      case 'lobby_leave': {
        this.lobby.leave(userId);
        this.broadcastLobby();
        break;
      }

      case 'game_create': {
        const payload = msg.payload as GameCreatePayload;
        const timeControl = payload.timeControl || 600;
        const increment = payload.increment || 0;
        const color = payload.color || 'any';

        // Try to find a matching player in lobby
        const matchColor = color === 'white' ? 'black' : color === 'black' ? 'white' : null;
        let match: { entry: LobbyEntry; theirColor: 'white' | 'black' } | null = null;

        if (matchColor) {
          const entry = this.lobby.findMatchingPlayer(userId, matchColor, timeControl);
          if (entry) {
            match = { entry, theirColor: matchColor };
          }
        }

        if (match) {
          // Match found — create game
          this.createMatchedGame(userId, username, match.entry, match.theirColor, timeControl, increment, send);
        } else {
          // No match — create room and wait (requester is always white when waiting)
          const gameId = this.createWaitingRoom(userId, username, 'white', timeControl, increment, send);
          if (gameId) {
            send({ type: 'game_created', payload: { gameId, waiting: true, timeControl, color: 'white' }, gameId });
          }
        }
        break;
      }

      case 'game_join': {
        const payload = msg.payload as GameJoinPayload;
        const { gameId, color } = payload;

        const entry = this.lobby.findByGameId(gameId);
        if (!entry || entry.playerId === userId) {
          send({ type: 'error', payload: { message: 'Game not found or you are not in the lobby' } });
          return;
        }

        // Create matched game
        this.createMatchedGame(userId, username, entry, color, entry.timeControl, entry.increment, send);
        break;
      }

      case 'move': {
        console.log('[WS] move case: userId=', userId, 'payload=', JSON.stringify(msg.payload));
        const payload = msg.payload as MovePayload;
        const { uci } = payload;
        console.log('[WS] move: uci=', uci);

        const gameId = this.playerRooms.get(userId);
        console.log('[WS] move: gameId from playerRooms=', gameId);
        if (!gameId) {
          send({ type: 'error', payload: { message: 'Not in a game' } });
          return;
        }

        const room = this.rooms.get(gameId);
        console.log('[WS] move: room=', room ? 'found' : 'NOT FOUND');
        if (!room) {
          send({ type: 'error', payload: { message: 'Game not found' } });
          return;
        }

        // Determine player color
        const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
        console.log('[WS] move: playerColor=', playerColor);
        if (!playerColor) {
          send({ type: 'error', payload: { message: 'You are not a player in this game' } });
          return;
        }

        console.log('[WS] move: calling makeMove');
        const result = room.makeMove(playerColor, uci);
        if (!result.success) {
          send({ type: 'error', payload: { message: result.message } });
        }
        break;
      }

      case 'resign': {
        const gameId = this.playerRooms.get(userId);
        if (!gameId) {
          send({ type: 'error', payload: { message: 'Not in a game' } });
          return;
        }

        const room = this.rooms.get(gameId);
        if (!room) return;

        const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
        if (!playerColor) {
          send({ type: 'error', payload: { message: 'You are not a player in this game' } });
          return;
        }

        room.resign(playerColor);
        break;
      }

      case 'draw_offer': {
        const gameId = this.playerRooms.get(userId);
        if (!gameId) return;

        const room = this.rooms.get(gameId);
        if (!room) return;

        const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
        if (!playerColor) return;

        if (room.state.drawOfferFrom) {
          send({ type: 'error', payload: { message: 'Draw already offered' } });
          return;
        }

        room.state.drawOfferFrom = playerColor;
        const opponentColor = playerColor === 'white' ? 'black' : 'white';
        const opponent = room.getPlayer(opponentColor);
        if (opponent?.ws.readyState === 1) {
          opponent.ws.send(JSON.stringify({
            type: 'draw_offer',
            payload: { from: playerColor },
            gameId,
          } as WsMessage));
        }
        break;
      }

      case 'draw_accept': {
        const gameId = this.playerRooms.get(userId);
        if (!gameId) return;

        const room = this.rooms.get(gameId);
        if (!room || !room.state.drawOfferFrom) return;

        const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
        if (!playerColor || room.state.drawOfferFrom === playerColor) return;

        room.acceptDraw();
        break;
      }

      case 'draw_decline': {
        const gameId = this.playerRooms.get(userId);
        if (!gameId) return;

        const room = this.rooms.get(gameId);
        if (!room) return;

        room.state.drawOfferFrom = null;
        break;
      }

      default:
        send({ type: 'error', payload: { message: `Unknown message type: ${msg.type}` } });
    }
  }

  private createMatchedGame(
    requesterId: string,
    requesterName: string,
    entry: LobbyEntry,
    matchColor: 'white' | 'black',
    timeControl: number,
    increment: number,
    send: (msg: WsMessage) => void
  ): void {
    const gameId = entry.gameId;
    const requesterColor = matchColor === 'white' ? 'black' : 'white';

    // Remove both from lobby
    this.lobby.leave(requesterId);
    this.lobby.leave(entry.playerId);

    // Create room
    const room = new GameRoom(gameId, timeControl, timeControl, increment);

    const whitePlayer: import('./types.js').RoomPlayer = {
      id: requesterColor === 'white' ? requesterId : entry.playerId,
      username: requesterColor === 'white' ? requesterName : entry.username,
      displayName: requesterColor === 'white' ? requesterName : entry.displayName,
      color: requesterColor,
      ws: requesterColor === 'white' ? (this.wss.clients.values().next().value as any) : entry.ws,
      timeLeft: timeControl,
      connected: true,
      disconnectTimer: null,
    };

    // Actually set up players properly
    const requesterWs = this.findWsForPlayer(requesterId);
    const entryWs = this.findWsForPlayer(entry.playerId);

    if (!requesterWs || !entryWs) {
      send({ type: 'error', payload: { message: 'Could not find player connections' } });
      return;
    }

    if (requesterColor === 'white') {
      room.setPlayer('white', {
        id: requesterId, username: requesterName, displayName: requesterName,
        color: 'white', ws: requesterWs, timeLeft: timeControl, connected: true, disconnectTimer: null,
      });
      room.setPlayer('black', {
        id: entry.playerId, username: entry.username, displayName: entry.displayName,
        color: 'black', ws: entryWs, timeLeft: timeControl, connected: true, disconnectTimer: null,
      });
    } else {
      room.setPlayer('white', {
        id: entry.playerId, username: entry.username, displayName: entry.displayName,
        color: 'white', ws: entryWs, timeLeft: timeControl, connected: true, disconnectTimer: null,
      });
      room.setPlayer('black', {
        id: requesterId, username: requesterName, displayName: requesterName,
        color: 'black', ws: requesterWs, timeLeft: timeControl, connected: true, disconnectTimer: null,
      });
    }

    this.rooms.set(gameId, room);
    this.playerRooms.set(requesterId, gameId);
    this.playerRooms.set(entry.playerId, gameId);

    // Send game joined to each player with their own color
    const requesterMsg: WsMessage = {
      type: 'game_joined',
      payload: { gameId, timeControl, increment, requesterColor, matchColor, playerColor: requesterColor },
      gameId,
    };
    const entryMsg: WsMessage = {
      type: 'game_joined',
      payload: { gameId, timeControl, increment, requesterColor, matchColor, playerColor: matchColor },
      gameId,
    };
    requesterWs.send(JSON.stringify(requesterMsg));
    entryWs.send(JSON.stringify(entryMsg));

    this.broadcastLobby();
  }

  private createWaitingRoom(
    playerId: string,
    username: string,
    color: 'white' | 'black' | 'any',
    timeControl: number,
    increment: number,
    send: (msg: WsMessage) => void
  ): string | null {
    const gameId = this.lobby.findWaitingGame(color, timeControl);
    if (gameId) {
      // There's a waiting game — join it
      const entry = this.lobby.findByGameId(gameId);
      if (entry && entry.playerId !== playerId) {
        const matchColor = color === 'white' ? 'black' : 'white';
        this.createMatchedGame(playerId, username, entry, matchColor, timeControl, increment, send);
        return null;
      }
    }

    // Create new waiting entry
    const newGameId = this.lobby.join({
      playerId,
      username,
      displayName: username,
      color,
      timeControl,
      increment,
      ws: this.findWsForPlayer(playerId)!,
    });

    return newGameId;
  }

  private leaveRoom(playerId: string, send: (msg: WsMessage) => void): void {
    const gameId = this.playerRooms.get(playerId);
    if (!gameId) return;

    const room = this.rooms.get(gameId);
    if (room) {
      const playerColor = room.state.white?.id === playerId ? 'white' : room.state.black?.id === playerId ? 'black' : null;
      if (playerColor && room.state.status === 'playing') {
        room.resign(playerColor);
      }
      room.cleanup();
      this.rooms.delete(gameId);
    }

    this.playerRooms.delete(playerId);
    this.lobby.leave(playerId);
  }

  private handleDisconnect(playerId: string, ws: WebSocket): void {
    // Check if player is in a room
    const gameId = this.playerRooms.get(playerId);
    if (gameId) {
      const room = this.rooms.get(gameId);
      if (room) {
        const playerColor = room.state.white?.id === playerId ? 'white' : room.state.black?.id === playerId ? 'black' : null;
        if (playerColor) {
          room.handleDisconnect(playerColor);
        }
      }
    }

    // Remove from lobby
    this.lobby.leave(playerId);
    this.broadcastLobby();
  }

  private findWsForPlayer(playerId: string): WebSocket | null {
    for (const client of this.wss.clients) {
      if ((client as unknown as { userId: string }).userId === playerId) {
        return client;
      }
    }
    return null;
  }

  private broadcastLobby(): void {
    const state = buildLobbyStatePayload(this.lobby.getState());
    const message = { type: 'lobby_state', payload: state } as WsMessage;
    const data = JSON.stringify(message);

    for (const client of this.wss.clients) {
      if (client.readyState === 1) {
        client.send(data);
      }
    }
  }

  // Heartbeat
  startHeartbeat(intervalMs: number = 30_000): void {
    setInterval(() => {
      for (const client of this.wss.clients) {
        if (client.readyState === 1) {
          client.ping();
        }
      }
    }, intervalMs);
  }

  cleanup(): void {
    for (const room of this.rooms.values()) {
      room.cleanup();
    }
    this.rooms.clear();
    this.playerRooms.clear();
    this.lobby.clear();
    this.wss.close();
  }
}

// Extend LobbyManager to support finding waiting games
declare module './lobby.js' {
  interface LobbyManager {
    findWaitingGame(color: 'white' | 'black' | 'any', timeControl: number): string | null;
  }
}

LobbyManager.prototype.findWaitingGame = function (color: 'white' | 'black' | 'any', timeControl: number): string | null {
  for (const entry of this.entries.values()) {
    if (entry.color === color || entry.color === 'any') {
      if (entry.timeControl === timeControl) {
        return entry.gameId;
      }
    }
  }
  return null;
};
