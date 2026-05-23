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
export interface RecordStockfishGameInput {
    stockfishElo: number;
    playerColor: 'w' | 'b';
    result: 'win' | 'loss' | 'draw';
    moveCount: number;
    gameDuration: number;
}
/**
 * Record a game result and update ELO rating.
 * Returns updated ELO stats.
 */
export declare function recordGameResult(userId: string, gameId: string, opponent: string, opponentElo: number, playerColor: 'w' | 'b', result: 'win' | 'loss' | 'draw', moveCount: number, gameDuration: number): Promise<ELOStats>;
/**
 * Get ELO stats for a user.
 */
export declare function getELOStats(userId: string): Promise<ELOStats>;
/**
 * Get game history for a user.
 */
export declare function getGameHistory(userId: string, limit?: number): Promise<GameHistoryEntry[]>;
export declare function recordStockfishGameResult(userId: string, input: RecordStockfishGameInput): Promise<ELOStats>;
//# sourceMappingURL=gameHistoryService.d.ts.map