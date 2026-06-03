import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getLocalStockfishGames,
  saveLocalStockfishGame,
  syncLocalStockfishGames,
  localGameToHistoryEntry,
  type LocalStockfishGame,
} from '../../src/lib/localHistory';
import { getAccessToken } from '../../src/lib/auth';
import { recordStockfishGame } from '../../src/lib/api';

const STORAGE_KEY = 'chess_local_stockfish_history';

vi.mock('../../src/lib/auth', () => ({
  getAccessToken: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  recordStockfishGame: vi.fn(),
}));

// Mock localStorage
function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
}

beforeEach(() => {
  const mock = createMockStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: mock, writable: true });
  vi.mocked(getAccessToken).mockReset();
  vi.mocked(recordStockfishGame).mockReset();
});

describe('getLocalStockfishGames', () => {
  it('should return empty array when no games stored', () => {
    const games = getLocalStockfishGames();
    expect(games).toEqual([]);
  });

  it('should return stored games sorted by date descending', () => {
    const games: LocalStockfishGame[] = [
      { id: '1', stockfishElo: 800, playerColor: 'w', result: 'win', moveCount: 10, gameDuration: 60, createdAt: '2024-01-01T00:00:00Z', syncedAt: null },
      { id: '2', stockfishElo: 1000, playerColor: 'b', result: 'loss', moveCount: 15, gameDuration: 90, createdAt: '2024-01-02T00:00:00Z', syncedAt: null },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(games));

    const result = getLocalStockfishGames();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('2'); // newer first
    expect(result[1].id).toBe('1');
  });

  it('should handle corrupt data gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    expect(getLocalStockfishGames()).toEqual([]);
  });

  it('should handle non-array data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
    expect(getLocalStockfishGames()).toEqual([]);
  });
});

describe('saveLocalStockfishGame', () => {
  it('should save a game with generated id and timestamp', () => {
    const game = saveLocalStockfishGame({
      stockfishElo: 800,
      playerColor: 'w',
      result: 'win',
      moveCount: 10,
      gameDuration: 60,
    });

    expect(game.id).toBeDefined();
    expect(game.createdAt).toBeDefined();
    expect(game.syncedAt).toBeNull();
    expect(game.stockfishElo).toBe(800);
  });

  it('should prepend new game to list', () => {
    const game1 = saveLocalStockfishGame({ stockfishElo: 800, playerColor: 'w', result: 'win', moveCount: 10, gameDuration: 60 });
    const game2 = saveLocalStockfishGame({ stockfishElo: 1000, playerColor: 'b', result: 'loss', moveCount: 15, gameDuration: 90 });

    const games = getLocalStockfishGames();
    expect(games[0].id).toBe(game2.id);
    expect(games[1].id).toBe(game1.id);
  });

  it('should limit to 200 games', () => {
    for (let i = 0; i < 205; i++) {
      saveLocalStockfishGame({ stockfishElo: 800, playerColor: 'w', result: 'win', moveCount: 10, gameDuration: 60 });
    }
    expect(getLocalStockfishGames().length).toBeLessThanOrEqual(200);
  });
});

describe('localGameToHistoryEntry', () => {
  it('should convert local game to history entry', () => {
    const game: LocalStockfishGame = {
      id: 'test-id',
      stockfishElo: 800,
      playerColor: 'w',
      result: 'win',
      moveCount: 10,
      gameDuration: 60,
      createdAt: '2024-01-01T00:00:00Z',
      syncedAt: null,
    };

    const entry = localGameToHistoryEntry(game);

    expect(entry.id).toBe('local-test-id');
    expect(entry.opponent).toBe('Stockfish (on device)');
    expect(entry.opponent_elo).toBe(800);
    expect(entry.player_color).toBe('w');
    expect(entry.result).toBe('win');
    expect(entry.elo_change).toBe(0);
  });

  it('should mark synced games differently', () => {
    const game: LocalStockfishGame = {
      id: 'test-id',
      stockfishElo: 800,
      playerColor: 'b',
      result: 'loss',
      moveCount: 15,
      gameDuration: 90,
      createdAt: '2024-01-01T00:00:00Z',
      syncedAt: '2024-01-02T00:00:00Z',
    };

    const entry = localGameToHistoryEntry(game);
    expect(entry.opponent).toBe('Stockfish (synced)');
  });
});

describe('syncLocalStockfishGames', () => {
  it('should skip syncing when there is no access token', async () => {
    vi.mocked(getAccessToken).mockReturnValue(null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: '1', stockfishElo: 800, playerColor: 'w', result: 'win', moveCount: 10, gameDuration: 60, createdAt: '2024-01-01T00:00:00Z', syncedAt: null },
    ] satisfies LocalStockfishGame[]));

    await expect(syncLocalStockfishGames()).resolves.toBe(0);
    expect(recordStockfishGame).not.toHaveBeenCalled();
  });

  it('should sync only unsynced local games and persist syncedAt timestamps', async () => {
    vi.mocked(getAccessToken).mockReturnValue('access-token');
    vi.mocked(recordStockfishGame).mockResolvedValue({
      rating: 1210,
      games: 1,
      wins: 1,
      losses: 0,
      draws: 0,
      winRate: 100,
      performanceRating: 800,
      recentGames: [],
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { id: 'pending', stockfishElo: 800, playerColor: 'w', result: 'win', moveCount: 10, gameDuration: 60, createdAt: '2024-01-01T00:00:00Z', syncedAt: null },
      { id: 'synced', stockfishElo: 1000, playerColor: 'b', result: 'loss', moveCount: 20, gameDuration: 120, createdAt: '2024-01-02T00:00:00Z', syncedAt: '2024-01-03T00:00:00Z' },
    ] satisfies LocalStockfishGame[]));

    await expect(syncLocalStockfishGames()).resolves.toBe(1);
    expect(recordStockfishGame).toHaveBeenCalledTimes(1);
    expect(recordStockfishGame).toHaveBeenCalledWith({
      stockfishElo: 800,
      playerColor: 'w',
      result: 'win',
      moveCount: 10,
      gameDuration: 60,
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as LocalStockfishGame[];
    expect(stored.find((game) => game.id === 'pending')?.syncedAt).toEqual(expect.any(String));
    expect(stored.find((game) => game.id === 'synced')?.syncedAt).toBe('2024-01-03T00:00:00Z');
  });
});
