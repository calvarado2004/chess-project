import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const WS_URL_A = process.env.WS_URL_A || 'ws://localhost:3001/ws';
const WS_URL_B = process.env.WS_URL_B || 'ws://localhost:3001/ws';

type WsEnvelope = {
  type: string;
  payload?: Record<string, unknown>;
  gameId?: string;
};

type TestSocket = {
  ws: WebSocket;
  events: WsEnvelope[];
  userId: string;
};

function tokenFor(userId: string, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '15m' });
}

function connectClient(url: string, username: string): Promise<TestSocket> {
  const userId = randomUUID();
  const token = tokenFor(userId, username);
  const ws = new WebSocket(`${url}?token=${encodeURIComponent(token)}`);
  const events: WsEnvelope[] = [];

  ws.on('message', (raw) => {
    events.push(JSON.parse(raw.toString()) as WsEnvelope);
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out connecting ${username}`)), 5000);
    ws.once('open', () => {
      clearTimeout(timeout);
      resolve({ ws, events, userId });
    });
    ws.once('error', reject);
  });
}

function send(ws: WebSocket, message: WsEnvelope): void {
  ws.send(JSON.stringify(message));
}

function waitFor(
  client: TestSocket,
  type: string,
  predicate: (message: WsEnvelope) => boolean = () => true,
  timeoutMs = 8000
): Promise<WsEnvelope> {
  const existing = client.events.find((message) => message.type === type && predicate(message));
  if (existing) {
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.ws.off('message', onMessage);
      reject(new Error(`Timed out waiting for ${type}. Seen: ${client.events.map((event) => event.type).join(', ')}`));
    }, timeoutMs);

    const onMessage = (raw: WebSocket.RawData) => {
      const message = JSON.parse(raw.toString()) as WsEnvelope;
      if (message.type === type && predicate(message)) {
        clearTimeout(timeout);
        client.ws.off('message', onMessage);
        resolve(message);
      }
    };

    client.ws.on('message', onMessage);
  });
}

function closeClient(client: TestSocket): Promise<void> {
  return new Promise((resolve) => {
    if (client.ws.readyState === WebSocket.CLOSED) {
      resolve();
      return;
    }
    client.ws.once('close', () => resolve());
    client.ws.close();
    setTimeout(resolve, 1000);
  });
}

test('scaled lobby matches players and fans out moves across websocket endpoints', async () => {
  const suffix = randomUUID().slice(0, 8);
  const alice = await connectClient(WS_URL_A, `alice-${suffix}`);
  const bob = await connectClient(WS_URL_B, `bob-${suffix}`);

  try {
    send(alice.ws, {
      type: 'game_create',
      payload: { color: 'white', timeControl: 600, increment: 0 },
    });

    const created = await waitFor(alice, 'game_created');
    const gameId = created.gameId || (created.payload?.gameId as string | undefined);
    assert.ok(gameId, 'game_create should return a game id');

    await waitFor(bob, 'lobby_state', (message) => {
      const players = message.payload?.players as Array<Record<string, unknown>> | undefined;
      return Boolean(players?.some((player) => player.id === alice.userId && player.gameId === gameId));
    });

    send(bob.ws, {
      type: 'game_join',
      gameId,
      payload: { gameId, color: 'white' },
    });

    const aliceJoined = await waitFor(alice, 'game_joined', (message) => message.gameId === gameId);
    const bobJoined = await waitFor(bob, 'game_joined', (message) => message.gameId === gameId);
    assert.equal(aliceJoined.payload?.playerColor, 'white');
    assert.equal(bobJoined.payload?.playerColor, 'black');

    send(alice.ws, {
      type: 'move',
      gameId,
      payload: { uci: 'e2e4' },
    });

    await waitFor(bob, 'opponent_move', (message) => message.gameId === gameId && message.payload?.uci === 'e2e4');
    await waitFor(alice, 'game_state', (message) => message.gameId === gameId && message.payload?.lastMove === 'e2e4');
    await waitFor(bob, 'game_state', (message) => message.gameId === gameId && message.payload?.lastMove === 'e2e4');
  } finally {
    await Promise.all([closeClient(alice), closeClient(bob)]);
  }
});
