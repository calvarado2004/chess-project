import { getAccessToken } from './auth';
import { recordStockfishGame, type GameHistoryEntry } from './api';

const LOCAL_STOCKFISH_HISTORY_KEY = 'chess_local_stockfish_history';

export interface LocalStockfishGame {
  id: string;
  stockfishElo: number;
  playerColor: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  moveCount: number;
  gameDuration: number;
  createdAt: string;
  syncedAt: string | null;
}

export type LocalStockfishGameInput = Omit<LocalStockfishGame, 'id' | 'createdAt' | 'syncedAt'>;

function readLocalStockfishGames(): LocalStockfishGame[] {
  try {
    const raw = localStorage.getItem(LOCAL_STOCKFISH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalStockfishGames(games: LocalStockfishGame[]) {
  localStorage.setItem(LOCAL_STOCKFISH_HISTORY_KEY, JSON.stringify(games));
}

export function getLocalStockfishGames(): LocalStockfishGame[] {
  return readLocalStockfishGames().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveLocalStockfishGame(input: LocalStockfishGameInput): LocalStockfishGame {
  const game: LocalStockfishGame = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    syncedAt: null,
  };
  writeLocalStockfishGames([game, ...readLocalStockfishGames()].slice(0, 200));
  return game;
}

export async function syncLocalStockfishGames(): Promise<number> {
  if (!getAccessToken()) return 0;

  const games = readLocalStockfishGames();
  let synced = 0;

  for (const game of games) {
    if (game.syncedAt) continue;

    await recordStockfishGame({
      stockfishElo: game.stockfishElo,
      playerColor: game.playerColor,
      result: game.result,
      moveCount: game.moveCount,
      gameDuration: game.gameDuration,
    });

    game.syncedAt = new Date().toISOString();
    synced++;
    writeLocalStockfishGames(games);
  }

  return synced;
}

export function localGameToHistoryEntry(game: LocalStockfishGame): GameHistoryEntry {
  return {
    id: `local-${game.id}`,
    game_id: game.id,
    opponent: game.syncedAt ? 'Stockfish (synced)' : 'Stockfish (on device)',
    opponent_elo: game.stockfishElo,
    player_color: game.playerColor,
    result: game.result,
    player_elo_before: 0,
    player_elo_after: 0,
    elo_change: 0,
    performance_elo: game.stockfishElo,
    move_count: game.moveCount,
    game_duration_s: game.gameDuration,
    created_at: game.createdAt,
  };
}
