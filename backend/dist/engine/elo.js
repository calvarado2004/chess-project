// ===================== ELO Rating Calculation Engine =====================
// Implements standard ELO with K-factor and performance rating
const K_FACTOR_NEW = 32; // For first 30 games
const K_FACTOR_ESTABLISHED = 24; // For established players
const K_FACTOR_CAP = 16; // For high-rated players (2000+)
const BASE_RATING = 1200;
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
    const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0;
    // Performance rating formula: R_perf = R_opponent + 400 * log10(actual / (1 - actual))
    // But for single game, we use a simplified approach
    const expected = expectedScore(BASE_RATING, opponentRating); // Simplified
    // Better approach: Performance = Opponent + (Actual - Expected) * 400
    // This gives us the rating that would make the expected score equal to actual
    const performance = opponentRating + (actualScore - 0.5) * 400;
    return Math.round(performance);
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
    const performances = games.map(g => calculatePerformanceRating(g.opponentRating, g.result));
    const sum = performances.reduce((a, b) => a + b, 0);
    return Math.round(sum / performances.length);
}
/**
 * Calculate overall ELO stats from game history.
 */
export function calculateELOStats(currentRating, gamesPlayed, wins, losses, draws, gameHistory) {
    const total = wins + losses + draws;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    // Calculate average performance rating
    const perfGames = gameHistory.filter(g => g.performance_elo !== null);
    const avgPerformance = calculateAveragePerformance(perfGames.map(g => ({ result: g.result, opponentRating: g.opponentRating })));
    // Get recent games (last 10)
    const recentGames = gameHistory.slice(-10).map(g => ({
        result: g.result,
        opponent: 'Stockfish',
        opponentRating: g.opponentRating,
        eloChange: 0, // Not stored per-game in this simplified version
        date: '',
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