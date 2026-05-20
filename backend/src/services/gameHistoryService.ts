import { query } from '../db/index.js';
import { calculateRatingChange, calculateELOStats, type GameRecord } from '../engine/elo.js';

export interface GameHistoryEntry {
  id: string;
  game_id: string;
  opponent: string;
  opponent_elo: number;
  player_color: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  player_elo_before: number;
  player_elo_after: number;
  elo_change: number;
  performance_elo: number | null;
  move_count: number;
  game_duration_s: number;
  created_at: string;
}

export interface ELOStats {
  rating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  performanceRating: number | null;
  recentGames: Array<{
    result: string;
    opponent: string;
    opponentRating: number;
    eloChange: number;
    date: string;
  }>;
}

/**
 * Record a game result and update ELO rating.
 * Returns updated ELO stats.
 */
export async function recordGameResult(
  userId: string,
  gameId: string,
  opponent: string,
  opponentElo: number,
  playerColor: 'w' | 'b',
  result: 'win' | 'loss' | 'draw',
  moveCount: number,
  gameDuration: number
): Promise<ELOStats> {
  // Get current user ELO stats
  const userResult = await query(
    'SELECT elo_rating, elo_games, elo_wins, elo_losses, elo_draws FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResult.rows[0];
  const currentRating = user.elo_rating;
  const gamesPlayed = user.elo_games;
  
  // Calculate ELO change
  const eloResult = calculateRatingChange(currentRating, opponentElo, result, gamesPlayed);
  const newRating = eloResult.newRating;
  const eloChange = eloResult.eloChange;
  
  // Update user ELO stats
  const newWins = result === 'win' ? user.elo_wins + 1 : user.elo_wins;
  const newLosses = result === 'loss' ? user.elo_losses + 1 : user.elo_losses;
  const newDraws = result === 'draw' ? user.elo_draws + 1 : user.elo_draws;
  const newGames = gamesPlayed + 1;
  
  await query(
    `UPDATE users SET 
       elo_rating = $1, elo_games = $2, elo_wins = $3, elo_losses = $4, elo_draws = $5, updated_at = now()
     WHERE id = $6`,
    [newRating, newGames, newWins, newLosses, newDraws, userId]
  );
  
  // Record game history
  await query(
    `INSERT INTO game_history 
     (user_id, game_id, opponent, opponent_elo, player_color, result, 
      player_elo_before, player_elo_after, elo_change, performance_elo, 
      move_count, game_duration_s)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      userId, gameId, opponent, opponentElo, playerColor, result,
      currentRating, newRating, eloChange, eloResult.performanceRating,
      moveCount, gameDuration,
    ]
  );
  
  // Get updated game history for stats
  const historyResult = await query(
    `SELECT result, opponent_elo, performance_elo, opponent, created_at 
     FROM game_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 100`,
    [userId]
  );
  
  const history = historyResult.rows.map((row: any) => ({
    result: row.result,
    opponentRating: row.opponent_elo,
    performance_elo: row.performance_elo,
    opponent: row.opponent,
    created_at: row.created_at,
  }));
  
  return calculateELOStats(newRating, newGames, newWins, newLosses, newDraws, history);
}

/**
 * Get ELO stats for a user.
 */
export async function getELOStats(userId: string): Promise<ELOStats> {
  const userResult = await query(
    'SELECT elo_rating, elo_games, elo_wins, elo_losses, elo_draws FROM users WHERE id = $1',
    [userId]
  );
  
  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }
  
  const user = userResult.rows[0];
  
  const historyResult = await query(
    `SELECT result, opponent_elo, performance_elo, opponent, created_at 
     FROM game_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 100`,
    [userId]
  );
  
  const history = historyResult.rows.map((row: any) => ({
    result: row.result,
    opponentRating: row.opponent_elo,
    performance_elo: row.performance_elo,
    opponent: row.opponent,
    created_at: row.created_at,
  }));
  
  return calculateELOStats(
    user.elo_rating,
    user.elo_games,
    user.elo_wins,
    user.elo_losses,
    user.elo_draws,
    history
  );
}

/**
 * Get game history for a user.
 */
export async function getGameHistory(userId: string, limit: number = 20): Promise<GameHistoryEntry[]> {
  const result = await query(
    `SELECT id, game_id, opponent, opponent_elo, player_color, result, 
            player_elo_before, player_elo_after, elo_change, performance_elo,
            move_count, game_duration_s, created_at
     FROM game_history 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );
  
  return result.rows.map((row: any) => ({
    id: row.id,
    game_id: row.game_id,
    opponent: row.opponent,
    opponent_elo: row.opponent_elo,
    player_color: row.player_color,
    result: row.result,
    player_elo_before: row.player_elo_before,
    player_elo_after: row.player_elo_after,
    elo_change: row.elo_change,
    performance_elo: row.performance_elo,
    move_count: row.move_count,
    game_duration_s: row.game_duration_s,
    created_at: row.created_at.toISOString(),
  }));
}
