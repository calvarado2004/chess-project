// ===================== ELO Rating Calculation Engine =====================
// Implements standard ELO with K-factor and performance rating
const K_FACTOR_NEW = 32; // For first 30 games
const K_FACTOR_ESTABLISHED = 24; // For established players
const K_FACTOR_CAP = 16; // For high-rated players (2000+)
const MIN_RATING = 800;
const MAX_RATING = 3000;
/**
 * Calculate expected score against an opponent of given rating.
 * ELO formula: E = 1 / (1 + 10^((R_opponent - R_player) / 400))
 */
export function expectedScore(playerRating, opponentRating) {
    return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}
/**
 * Calculate K-factor based on rating and number of games played.
 */
export function getKFactor(rating, gamesPlayed) {
    if (gamesPlayed < 30)
        return K_FACTOR_NEW;
    if (rating >= 2000)
        return K_FACTOR_CAP;
    return K_FACTOR_ESTABLISHED;
}
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
export function calculatePerformanceRating(opponentRating, result) {
    if (result === 'win')
        return opponentRating + 400;
    if (result === 'loss')
        return opponentRating - 400;
    return opponentRating;
}
/**
 * Calculate ELO rating change and new rating.
 * ΔR = K * (S - E) where S = actual score, E = expected score
 */
export function calculateRatingChange(playerRating, opponentRating, result, gamesPlayed) {
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    const expected = expectedScore(playerRating, opponentRating);
    const kFactor = getKFactor(playerRating, gamesPlayed);
    let eloChange = Math.round(kFactor * (actualScore - expected));
    // Cap ELO change to prevent extreme swings
    eloChange = Math.max(-50, Math.min(50, eloChange));
    let newRating = playerRating + eloChange;
    newRating = Math.max(MIN_RATING, Math.min(MAX_RATING, newRating));
    // Calculate performance rating
    let performanceRating = null;
    if (result === 'win' || result === 'loss') {
        performanceRating = calculatePerformanceRating(opponentRating, result);
    }
    else {
        // For draws, performance is closer to average
        performanceRating = Math.round((playerRating + opponentRating) / 2);
    }
    return {
        newRating,
        eloChange,
        performanceRating,
    };
}
/**
 * Calculate average performance rating over multiple games.
 */
export function calculateAveragePerformance(games) {
    if (games.length === 0)
        return null;
    const averageOpponent = games.reduce((sum, game) => sum + game.opponentRating, 0) / games.length;
    const score = games.reduce((sum, game) => {
        if (game.result === 'win')
            return sum + 1;
        if (game.result === 'draw')
            return sum + 0.5;
        return sum;
    }, 0);
    if (score === 0)
        return Math.round(averageOpponent - 400);
    if (score === games.length)
        return Math.round(averageOpponent + 400);
    return Math.round(averageOpponent + 400 * Math.log10(score / (games.length - score)));
}
/**
 * Calculate overall ELO stats from game history.
 */
export function calculateELOStats(currentRating, gamesPlayed, wins, losses, draws, gameHistory) {
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    // Calculate average performance rating
    const recentRatedGames = gameHistory.slice(0, 10);
    const avgPerformance = calculateAveragePerformance(recentRatedGames);
    // Get recent games (last 10)
    const recentGames = gameHistory.slice(0, 10).map(g => ({
        result: g.result,
        opponent: g.opponent ?? 'Stockfish',
        opponentRating: g.opponentRating,
        eloChange: g.eloChange ?? 0,
        date: g.created_at ? new Date(g.created_at).toISOString() : '',
    }));
    return {
        rating: currentRating,
        games: gamesPlayed,
        wins,
        losses,
        draws,
        winRate,
        performanceRating: avgPerformance,
        recentGames,
    };
}
//# sourceMappingURL=elo.js.map