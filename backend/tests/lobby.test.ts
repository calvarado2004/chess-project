import assert from 'node:assert/strict';
import test from 'node:test';
import { LobbyManager, buildLobbyStatePayload } from '../src/ws/lobby.js';
import type { LobbyEntry } from '../src/ws/types.js';

function createMockWs(): import('ws').WebSocket {
  return {
    readyState: 1,
    send: () => {},
    on: () => {},
    off: () => {},
    removeListener: () => {},
    terminate: () => {},
    close: () => {},
  } as unknown as import('ws').WebSocket;
}

function createEntry(overrides = {}): Omit<LobbyEntry, 'gameId'> & { gameId?: string } {
  return {
    playerId: 'player-1',
    username: 'testuser',
    displayName: 'Test User',
    color: 'white',
    timeControl: 300,
    increment: 5,
    ws: createMockWs(),
    ...overrides,
  };
}

// ---------- LobbyManager.join ----------

test('LobbyManager.join adds player and returns gameId', () => {
  const lobby = new LobbyManager();
  const gameId = lobby.join(createEntry());
  assert.ok(gameId, 'should return a gameId');
  assert.equal(lobby.entries.size, 1);
});

test('LobbyManager.join uses provided gameId if given', () => {
  const lobby = new LobbyManager();
  const gameId = lobby.join(createEntry({ gameId: 'custom-game-123' }));
  assert.equal(gameId, 'custom-game-123');
});

test('LobbyManager.join generates new gameId if not provided', () => {
  const lobby = new LobbyManager();
  const gameId = lobby.join(createEntry());
  assert.notEqual(gameId, 'custom-game-123', 'should generate a different ID');
  assert.ok(gameId.length > 10, 'generated gameId should be a UUID-like string');
});

test('LobbyManager.join can add multiple players', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1' }));
  lobby.join(createEntry({ playerId: 'p2' }));
  assert.equal(lobby.entries.size, 2);
});

test('LobbyManager.join overwrites existing entry for same playerId', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', color: 'white' }));
  lobby.join(createEntry({ playerId: 'p1', color: 'black' }));
  assert.equal(lobby.entries.size, 1);
  assert.equal(lobby.getEntry('p1')?.color, 'black');
});

// ---------- LobbyManager.leave ----------

test('LobbyManager.leave removes player', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1' }));
  const removed = lobby.leave('p1');
  assert.ok(removed, 'should return the removed entry');
  assert.equal(removed?.playerId, 'p1');
  assert.equal(lobby.entries.size, 0);
});

test('LobbyManager.leave returns null for unknown player', () => {
  const lobby = new LobbyManager();
  const removed = lobby.leave('unknown');
  assert.equal(removed, null);
});

// ---------- LobbyManager.getEntry ----------

test('LobbyManager.getEntry returns entry for existing player', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', username: 'alice' }));
  const entry = lobby.getEntry('p1');
  assert.ok(entry);
  assert.equal(entry?.username, 'alice');
});

test('LobbyManager.getEntry returns null for unknown player', () => {
  const lobby = new LobbyManager();
  assert.equal(lobby.getEntry('unknown'), null);
});

// ---------- LobbyManager.findByGameId ----------

test('LobbyManager.findByGameId finds entry by gameId', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', gameId: 'game-abc' }));
  const entry = lobby.findByGameId('game-abc');
  assert.ok(entry);
  assert.equal(entry?.playerId, 'p1');
});

test('LobbyManager.findByGameId returns null for unknown gameId', () => {
  const lobby = new LobbyManager();
  assert.equal(lobby.findByGameId('nonexistent'), null);
});

// ---------- LobbyManager.findMatchingPlayer ----------

test('findMatchingPlayer finds player with matching time control and color', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', color: 'black', timeControl: 300 }));
  const match = lobby.findMatchingPlayer('p2', 'black', 300);
  assert.ok(match);
  assert.equal(match?.playerId, 'p1');
});

test('findMatchingPlayer finds player with "any" color preference', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', color: 'any', timeControl: 300 }));
  const match = lobby.findMatchingPlayer('p2', 'black', 300);
  assert.ok(match);
  assert.equal(match?.playerId, 'p1');
});

test('findMatchingPlayer skips requester themselves', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', color: 'black', timeControl: 300 }));
  const match = lobby.findMatchingPlayer('p1', 'black', 300);
  assert.equal(match, null, 'should not match self');
});

test('findMatchingPlayer skips players with different time control', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', color: 'white', timeControl: 600 }));
  const match = lobby.findMatchingPlayer('p2', 'black', 300);
  assert.equal(match, null, 'time control mismatch');
});

test('findMatchingPlayer returns null when no match exists', () => {
  const lobby = new LobbyManager();
  assert.equal(lobby.findMatchingPlayer('p1', 'white', 300), null);
});

// ---------- LobbyManager.getState ----------

test('LobbyManager.getState returns array of lobby players', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1', username: 'alice', displayName: 'Alice' }));
  const state = lobby.getState();
  assert.equal(state.length, 1);
  assert.equal(state[0].id, 'p1');
  assert.equal(state[0].username, 'alice');
  assert.equal(state[0].displayName, 'Alice');
});

test('LobbyManager.getState returns empty array when lobby is empty', () => {
  const lobby = new LobbyManager();
  assert.deepEqual(lobby.getState(), []);
});

// ---------- LobbyManager.clear ----------

test('LobbyManager.clear removes all entries', () => {
  const lobby = new LobbyManager();
  lobby.join(createEntry({ playerId: 'p1' }));
  lobby.join(createEntry({ playerId: 'p2' }));
  lobby.clear();
  assert.equal(lobby.entries.size, 0);
  assert.deepEqual(lobby.getState(), []);
});

// ---------- buildLobbyStatePayload ----------

test('buildLobbyStatePayload wraps players array', () => {
  const players = [{
    id: 'p1',
    username: 'alice',
    displayName: 'Alice',
    color: 'white',
    timeControl: 300,
    increment: 5,
    gameId: 'game-1',
  }];
  const payload = buildLobbyStatePayload(players);
  assert.deepEqual(payload, { players });
});

test('buildLobbyStatePayload handles empty array', () => {
  const payload = buildLobbyStatePayload([]);
  assert.deepEqual(payload, { players: [] });
});
