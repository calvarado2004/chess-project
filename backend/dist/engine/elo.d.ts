export interface ELOResult {
    newRating: number;
    eloChange: number;
    performanceRating: number | null;
}
export interface GameRecord {
    result: 'win' | 'loss' | 'draw';
    opponentRating: number;
    playerRating: number;
    moveCount: number;
    gameDuration: number;
    playerColor: 'w' | 'b';
}
/**
 * Calculate expected score against an opponent of given rating.
 * ELO formula: E = 1 / (1 + 10^((R_opponent - R_player) / 400))
 */
export declare function expectedScore(playerRating: number, opponentRating: number): number;
/**
 * Calculate K-factor based on rating and number of games played.
 */
export declare function getKFactor(rating: number, gamesPlayed: number): number;
/**
 * Calculate performance rating for a single game.
 * Performance rating = R_opponent + K * (S - E) * 400 / ln(10)
 * Simplified: Performance = Opponent + (Actual - Expected) * 400 / K
 *
 * For a single game:
 * - Win: performance = opponent + (1 - expected) * 400
 * - Loss: performance = opponent + (0 - expected) * 400
 * - Draw: performance = opponent + (0.5 - expected) * 400
 */
export declare function calculatePerformanceRating(opponentRating: number, result: 'win' | 'loss' | 'draw'): number;
/**
 * Calculate ELO rating change and new rating.
 * ΔR = K * (S - E) where S = actual score, E = expected score
 */
export declare function calculateRatingChange(playerRating: number, opponentRating: number, result: 'win' | 'loss' | 'draw', gamesPlayed: number): ELOResult;
/**
 * Calculate average performance rating over multiple games.
 */
export declare function calculateAveragePerformance(games: {
    result: 'win' | 'loss' | 'draw';
    opponentRating: number;
}[]): number | null;
/**
 * Calculate overall ELO stats from game history.
 */
export declare function calculateELOStats(currentRating: number, gamesPlayed: number, wins: number, losses: number, draws: number, gameHistory: Array<{
    result: 'win' | 'loss' | 'draw';
    opponentRating: number;
    performance_elo?: number | null;
}>): {
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
};
//# sourceMappingURL=elo.d.ts.map