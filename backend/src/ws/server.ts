import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { URL } from 'url';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom } from './rooms.js';
import type {
  WsMessage,
  AuthPayload,
  GameCreatePayload,
  GameJoinPayload,
  MovePayload,
  LobbyPlayer,
  LobbyStatePayload,
  LobbyEntry,
} from './types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';
const LOBBY_KEY = 'chess:lobby';
const LOBBY_BROADCAST = 'chess:lobby:broadcast';
const PLAYER_ROOM_KEY = 'chess:player_rooms';

type PlayerColor = 'white' | 'black';

interface RedisLobbyEntry extends Omit<LobbyEntry, 'ws'> {
  podId: string;
  createdAt: number;
}

interface PlayerRoomRef {
  gameId: string;
  ownerPodId: string;
}

type PodMessage =
  | { type: 'send'; userId: string; data: string }
  | { type: 'set_player_room'; userId: string; room: PlayerRoomRef }
  | { type: 'clear_player_room'; userId: string }
  | { type: 'remote_move'; userId: string; gameId: string; uci: string }
  | { type: 'remote_resign'; userId: string; gameId: string }
  | { type: 'remote_draw_offer'; userId: string; gameId: string }
  | { type: 'remote_draw_accept'; userId: string; gameId: string }
  | { type: 'remote_draw_decline'; userId: string; gameId: string };

interface LocalClient {
  ws: WebSocket;
  username: string;
}

export class WsGameServer {
  private wss: WebSocketServer;
  private redis: Redis;
  private subscriber: Redis;
  private podId = process.env.HOSTNAME || uuidv4();
  private podChannel = `chess:pod:${this.podId}`;
  private rooms: Map<string, GameRoom> = new Map();
  private localClients: Map<string, LocalClient> = new Map();
  private playerRooms: Map<string, PlayerRoomRef> = new Map();

  constructor(server: ReturnType<typeof import('http').createServer>) {
    this.redis = new Redis(REDIS_URL, { lazyConnect: false });
    this.subscriber = new Redis(REDIS_URL, { lazyConnect: false });
    this.setupRedisSubscriptions();

    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    console.log(`[WS] WebSocket server initialized on /ws, pod=${this.podId}`);
  }

  private setupRedisSubscriptions(): void {
    this.subscriber.subscribe(this.podChannel, LOBBY_BROADCAST).catch((err: Error) => {
      console.error('[WS] Redis subscribe failed:', err);
    });

    this.subscriber.on('message', (channel: string, data: string) => {
      try {
        if (channel === LOBBY_BROADCAST) {
          void this.broadcastLobbyLocal();
          return;
        }
        if (channel === this.podChannel) {
          void this.handlePodMessage(JSON.parse(data) as PodMessage);
        }
      } catch (err) {
        console.error('[WS] Failed to process Redis message:', err);
      }
    });
  }

  private handleConnection(ws: WebSocket, req: IncomingMessage): void {
    const url = new URL(req.url || '/ws', `http://localhost`);
    const token = url.searchParams.get('token');
    const send = (message: WsMessage) => this.sendToSocket(ws, message);

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

    this.handleAuth(ws, token, send);
  }

  private handleAuth(ws: WebSocket, token: string, send: (msg: WsMessage) => void): void {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
      (ws as unknown as { userId: string; username: string }).userId = decoded.userId;
      (ws as unknown as { userId: string; username: string }).username = decoded.username;
      this.localClients.set(decoded.userId, { ws, username: decoded.username });

      send({ type: 'auth_ok', payload: { message: 'Authenticated' } });
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
        void this.handleMessage(ws, userId, username, msg, send);
      } catch (err) {
        console.error('[WS] Error processing message:', err);
        send({ type: 'error', payload: { message: 'Invalid message format' } });
      }
    });

    ws.on('close', () => {
      void this.handleDisconnect(userId);
    });
  }

  private async handleMessage(
    ws: WebSocket,
    userId: string,
    username: string,
    msg: WsMessage,
    send: (msg: WsMessage) => void
  ): Promise<void> {
    switch (msg.type) {
      case 'pong':
        break;

      case 'lobby_join':
        await this.leaveRoom(userId, send, false);
        await this.joinLobby(userId, username, ws, msg.payload as Partial<GameCreatePayload>);
        await this.publishLobby();
        break;

      case 'lobby_leave':
        await this.leaveLobby(userId);
        await this.publishLobby();
        break;

      case 'game_create':
        await this.handleGameCreate(userId, username, msg.payload as GameCreatePayload, send);
        break;

      case 'game_join':
        await this.handleGameJoin(userId, username, msg.payload as GameJoinPayload, send);
        break;

      case 'move':
        await this.handleMove(userId, (msg.payload as MovePayload).uci, send);
        break;

      case 'resign':
        await this.handleRoomAction(userId, send, 'remote_resign', (room, color) => room.resign(color));
        break;

      case 'draw_offer':
        await this.handleRoomAction(userId, send, 'remote_draw_offer', (room, color) => {
          if (room.state.drawOfferFrom) {
            send({ type: 'error', payload: { message: 'Draw already offered' } });
            return;
          }
          room.state.drawOfferFrom = color;
          const opponentColor = color === 'white' ? 'black' : 'white';
          const opponent = room.getPlayer(opponentColor);
          opponent?.ws.send(JSON.stringify({ type: 'draw_offer', payload: { from: color }, gameId: room.state.gameId } as WsMessage));
        });
        break;

      case 'draw_accept':
        await this.handleRoomAction(userId, send, 'remote_draw_accept', (room, color) => {
          if (!room.state.drawOfferFrom || room.state.drawOfferFrom === color) return;
          room.acceptDraw();
        });
        break;

      case 'draw_decline':
        await this.handleRoomAction(userId, send, 'remote_draw_decline', (room) => {
          const offerFrom = room.state.drawOfferFrom;
          room.state.drawOfferFrom = null;
          if (!offerFrom) return;
          room.getPlayer(offerFrom)?.ws.send(JSON.stringify({ type: 'draw_decline', payload: {}, gameId: room.state.gameId } as WsMessage));
        });
        break;

      default:
        send({ type: 'error', payload: { message: `Unknown message type: ${msg.type}` } });
    }
  }

  private async joinLobby(
    playerId: string,
    username: string,
    ws: WebSocket,
    payload: Partial<GameCreatePayload>
  ): Promise<string> {
    const gameId = uuidv4();
    const entry: RedisLobbyEntry = {
      playerId,
      username,
      displayName: username,
      color: payload.color || 'any',
      timeControl: payload.timeControl || 600,
      increment: payload.increment || 0,
      gameId,
      podId: this.podId,
      createdAt: Date.now(),
    };

    this.localClients.set(playerId, { ws, username });
    await this.redis.hset(LOBBY_KEY, playerId, JSON.stringify(entry));
    return gameId;
  }

  private async leaveLobby(playerId: string): Promise<void> {
    await this.redis.hdel(LOBBY_KEY, playerId);
  }

  private async handleGameCreate(
    userId: string,
    username: string,
    payload: GameCreatePayload,
    send: (msg: WsMessage) => void
  ): Promise<void> {
    const timeControl = payload.timeControl || 600;
    const increment = payload.increment || 0;
    const requestedColor = payload.color || 'any';
    const matchColor = requestedColor === 'white' ? 'black' : requestedColor === 'black' ? 'white' : null;
    const match = matchColor ? await this.findMatchingLobbyEntry(userId, matchColor, timeControl) : null;

    if (match) {
      await this.createMatchedGame(userId, username, match, matchColor!, timeControl, increment, send);
      return;
    }

    const ws = this.findWsForPlayer(userId);
    if (!ws) {
      send({ type: 'error', payload: { message: 'Could not find player connection' } });
      return;
    }

    const gameId = await this.joinLobby(userId, username, ws, {
      color: requestedColor,
      timeControl,
      increment,
    });
    send({ type: 'game_created', payload: { gameId, waiting: true, timeControl, color: requestedColor }, gameId });
    await this.publishLobby();
  }

  private async handleGameJoin(
    userId: string,
    username: string,
    payload: GameJoinPayload,
    send: (msg: WsMessage) => void
  ): Promise<void> {
    const entry = await this.findLobbyEntryByGameId(payload.gameId);
    if (!entry || entry.playerId === userId) {
      send({ type: 'error', payload: { message: 'Game not found or you are not in the lobby' } });
      return;
    }
    await this.createMatchedGame(userId, username, entry, payload.color, entry.timeControl, entry.increment, send);
  }

  private async createMatchedGame(
    requesterId: string,
    requesterName: string,
    entry: RedisLobbyEntry,
    matchColor: PlayerColor,
    timeControl: number,
    increment: number,
    send: (msg: WsMessage) => void
  ): Promise<void> {
    const gameId = entry.gameId;
    const requesterColor = matchColor === 'white' ? 'black' : 'white';
    const requesterWs = this.findWsForPlayer(requesterId);
    if (!requesterWs) {
      send({ type: 'error', payload: { message: 'Could not find player connection' } });
      return;
    }

    const entryWs = entry.podId === this.podId
      ? this.findWsForPlayer(entry.playerId)
      : this.createRemoteSocket(entry.playerId, entry.podId);

    if (!entryWs) {
      send({ type: 'error', payload: { message: 'Could not find opponent connection' } });
      return;
    }

    await this.redis.hdel(LOBBY_KEY, requesterId, entry.playerId);

    const room = new GameRoom(gameId, timeControl, timeControl, increment);
    if (requesterColor === 'white') {
      room.setPlayer('white', this.createRoomPlayer(requesterId, requesterName, 'white', requesterWs, timeControl));
      room.setPlayer('black', this.createRoomPlayer(entry.playerId, entry.username, 'black', entryWs, timeControl));
    } else {
      room.setPlayer('white', this.createRoomPlayer(entry.playerId, entry.username, 'white', entryWs, timeControl));
      room.setPlayer('black', this.createRoomPlayer(requesterId, requesterName, 'black', requesterWs, timeControl));
    }

    this.rooms.set(gameId, room);
    await this.setPlayerRoom(requesterId, { gameId, ownerPodId: this.podId });
    await this.setPlayerRoom(entry.playerId, { gameId, ownerPodId: this.podId }, entry.podId);

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

    this.sendToSocket(requesterWs, requesterMsg);
    entryWs.send(JSON.stringify(entryMsg));
    await this.publishLobby();
  }

  private createRoomPlayer(
    id: string,
    username: string,
    color: PlayerColor,
    ws: WebSocket,
    timeControl: number
  ): import('./types.js').RoomPlayer {
    return {
      id,
      username,
      displayName: username,
      color,
      ws,
      timeLeft: timeControl,
      connected: true,
      disconnectTimer: null,
    };
  }

  private async handleMove(userId: string, uci: string, send: (msg: WsMessage) => void): Promise<void> {
    const roomRef = await this.getPlayerRoom(userId);
    if (!roomRef) {
      send({ type: 'error', payload: { message: 'Not in a game' } });
      return;
    }
    if (roomRef.ownerPodId !== this.podId) {
      await this.publishToPod(roomRef.ownerPodId, { type: 'remote_move', userId, gameId: roomRef.gameId, uci });
      return;
    }
    this.applyMoveToLocalRoom(userId, roomRef.gameId, uci, send);
  }

  private applyMoveToLocalRoom(userId: string, gameId: string, uci: string, send: (msg: WsMessage) => void): void {
    const room = this.rooms.get(gameId);
    if (!room) {
      send({ type: 'error', payload: { message: 'Game not found' } });
      return;
    }

    const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
    if (!playerColor) {
      send({ type: 'error', payload: { message: 'You are not a player in this game' } });
      return;
    }

    const result = room.makeMove(playerColor, uci);
    if (!result.success) {
      send({ type: 'error', payload: { message: result.message } });
    }
  }

  private async handleRoomAction(
    userId: string,
    send: (msg: WsMessage) => void,
    remoteType: Extract<PodMessage['type'], 'remote_resign' | 'remote_draw_offer' | 'remote_draw_accept' | 'remote_draw_decline'>,
    localAction: (room: GameRoom, color: PlayerColor) => void
  ): Promise<void> {
    const roomRef = await this.getPlayerRoom(userId);
    if (!roomRef) {
      send({ type: 'error', payload: { message: 'Not in a game' } });
      return;
    }
    if (roomRef.ownerPodId !== this.podId) {
      await this.publishToPod(roomRef.ownerPodId, { type: remoteType, userId, gameId: roomRef.gameId });
      return;
    }

    const room = this.rooms.get(roomRef.gameId);
    if (!room) return;
    const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
    if (!playerColor) return;
    localAction(room, playerColor);
  }

  private async handlePodMessage(message: PodMessage): Promise<void> {
    if (message.type === 'send') {
      const client = this.localClients.get(message.userId);
      if (client?.ws.readyState === WebSocket.OPEN) client.ws.send(message.data);
      return;
    }

    if (message.type === 'set_player_room') {
      this.playerRooms.set(message.userId, message.room);
      return;
    }

    if (message.type === 'clear_player_room') {
      this.playerRooms.delete(message.userId);
      return;
    }

    const send = (msg: WsMessage) => {
      const client = this.localClients.get(message.userId);
      if (client) this.sendToSocket(client.ws, msg);
    };

    if (message.type === 'remote_move') {
      this.applyMoveToLocalRoom(message.userId, message.gameId, message.uci, send);
      return;
    }

    const room = this.rooms.get(message.gameId);
    if (!room) return;
    const color = room.state.white?.id === message.userId ? 'white' : room.state.black?.id === message.userId ? 'black' : null;
    if (!color) return;

    if (message.type === 'remote_resign') room.resign(color);
    if (message.type === 'remote_draw_offer') {
      room.state.drawOfferFrom = color;
      room.getPlayer(color === 'white' ? 'black' : 'white')?.ws.send(JSON.stringify({
        type: 'draw_offer',
        payload: { from: color },
        gameId: message.gameId,
      } as WsMessage));
    }
    if (message.type === 'remote_draw_accept' && room.state.drawOfferFrom && room.state.drawOfferFrom !== color) room.acceptDraw();
    if (message.type === 'remote_draw_decline') {
      const offerFrom = room.state.drawOfferFrom;
      room.state.drawOfferFrom = null;
      if (offerFrom) {
        room.getPlayer(offerFrom)?.ws.send(JSON.stringify({ type: 'draw_decline', payload: {}, gameId: message.gameId } as WsMessage));
      }
    }
  }

  private createRemoteSocket(userId: string, podId: string): WebSocket {
    return {
      readyState: WebSocket.OPEN,
      send: (data: string | Buffer) => {
        const payload = typeof data === 'string' ? data : data.toString();
        void this.publishToPod(podId, { type: 'send', userId, data: payload });
      },
    } as unknown as WebSocket;
  }

  private async findMatchingLobbyEntry(
    requesterId: string,
    color: PlayerColor,
    timeControl: number
  ): Promise<RedisLobbyEntry | null> {
    const entries = await this.getLobbyEntries();
    return entries.find((entry: RedisLobbyEntry) =>
      entry.playerId !== requesterId &&
      (entry.color === color || entry.color === 'any') &&
      entry.timeControl === timeControl
    ) || null;
  }

  private async findLobbyEntryByGameId(gameId: string): Promise<RedisLobbyEntry | null> {
    const entries = await this.getLobbyEntries();
    return entries.find((entry) => entry.gameId === gameId) || null;
  }

  private async getLobbyEntries(): Promise<RedisLobbyEntry[]> {
    const rawEntries = await this.redis.hvals(LOBBY_KEY);
    return rawEntries.map((entry) => JSON.parse(entry) as RedisLobbyEntry);
  }

  private async publishLobby(): Promise<void> {
    await this.redis.publish(LOBBY_BROADCAST, String(Date.now()));
    await this.broadcastLobbyLocal();
  }

  private async broadcastLobbyLocal(): Promise<void> {
    const players: LobbyPlayer[] = (await this.getLobbyEntries()).map((entry) => ({
      id: entry.playerId,
      username: entry.username,
      displayName: entry.displayName,
      color: entry.color,
      timeControl: entry.timeControl,
      increment: entry.increment,
      gameId: entry.gameId,
    }));
    const message: WsMessage<LobbyStatePayload> = { type: 'lobby_state', payload: { players } };
    this.broadcastLocal(message);
  }

  private async getPlayerRoom(userId: string): Promise<PlayerRoomRef | null> {
    const local = this.playerRooms.get(userId);
    if (local) return local;

    const raw = await this.redis.hget(PLAYER_ROOM_KEY, userId);
    if (!raw) return null;
    const room = JSON.parse(raw) as PlayerRoomRef;
    this.playerRooms.set(userId, room);
    return room;
  }

  private async setPlayerRoom(userId: string, room: PlayerRoomRef, podId: string = this.podId): Promise<void> {
    await this.redis.hset(PLAYER_ROOM_KEY, userId, JSON.stringify(room));
    if (podId === this.podId) {
      this.playerRooms.set(userId, room);
    } else {
      await this.publishToPod(podId, { type: 'set_player_room', userId, room });
    }
  }

  private async clearPlayerRoom(userId: string, podId: string = this.podId): Promise<void> {
    await this.redis.hdel(PLAYER_ROOM_KEY, userId);
    if (podId === this.podId) {
      this.playerRooms.delete(userId);
    } else {
      await this.publishToPod(podId, { type: 'clear_player_room', userId });
    }
  }

  private async leaveRoom(userId: string, send: (msg: WsMessage) => void, resign = true): Promise<void> {
    const roomRef = await this.getPlayerRoom(userId);
    if (!roomRef) return;

    if (roomRef.ownerPodId !== this.podId) {
      if (resign) {
        await this.publishToPod(roomRef.ownerPodId, { type: 'remote_resign', userId, gameId: roomRef.gameId });
      }
      await this.clearPlayerRoom(userId);
      return;
    }

    const room = this.rooms.get(roomRef.gameId);
    if (room && resign) {
      const playerColor = room.state.white?.id === userId ? 'white' : room.state.black?.id === userId ? 'black' : null;
      if (playerColor && room.state.status === 'playing') room.resign(playerColor);
    }
    await this.clearPlayerRoom(userId);
    send({ type: 'game_over', payload: { result: '0-1', reason: 'resign', fen: room?.state.fen || '' }, gameId: roomRef.gameId });
  }

  private async handleDisconnect(playerId: string): Promise<void> {
    this.localClients.delete(playerId);
    await this.leaveLobby(playerId);
    await this.publishLobby();

    const roomRef = await this.getPlayerRoom(playerId);
    if (!roomRef) return;
    if (roomRef.ownerPodId === this.podId) {
      const room = this.rooms.get(roomRef.gameId);
      const playerColor = room?.state.white?.id === playerId ? 'white' : room?.state.black?.id === playerId ? 'black' : null;
      if (room && playerColor) room.handleDisconnect(playerColor);
    }
  }

  private findWsForPlayer(playerId: string): WebSocket | null {
    return this.localClients.get(playerId)?.ws || null;
  }

  private sendToSocket(ws: WebSocket, message: WsMessage): void {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
  }

  private broadcastLocal(message: WsMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  private async publishToPod(podId: string, message: PodMessage): Promise<void> {
    await this.redis.publish(`chess:pod:${podId}`, JSON.stringify(message));
  }

  startHeartbeat(intervalMs: number = 30_000): void {
    setInterval(() => {
      for (const client of this.wss.clients) {
        if (client.readyState === WebSocket.OPEN) client.ping();
      }
    }, intervalMs);
  }

  cleanup(): void {
    for (const room of this.rooms.values()) room.cleanup();
    this.rooms.clear();
    this.playerRooms.clear();
    this.wss.close();
    this.subscriber.disconnect();
    this.redis.disconnect();
  }
}
