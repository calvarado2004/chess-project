import assert from 'node:assert/strict';
import test from 'node:test';
import {
  expectedScore,
  getKFactor,
  calculatePerformanceRating,
  calculateRatingChange,
  calculateAveragePerformance,
  calculateELOStats,
} from '../src/engine/elo.js';

// ---------- expectedScore ----------

test('expectedScore returns 0.5 when ratings are equal', () => {
  assert.equal(expectedScore(1500, 1500), 0.5);
});

test('expectedScore favors higher rated player', () => {
  const exp = expectedScore(2000, 1500);
  assert.ok(exp > 0.5, 'Higher rated player should have expected score > 0.5');
});

test('expectedScore favors lower rated player as underdog', () => {
  const exp = expectedScore(1500, 2000);
  assert.ok(exp < 0.5, 'Lower rated player should have expected score < 0.5');
});

test('expectedScore is extremely high for huge rating gap', () => {
  const exp = expectedScore(3000, 800);
  assert.ok(exp > 0.99, '3000 vs 800 should have expected score > 0.99');
});

// ---------- getKFactor ----------

test('getKFactor returns 32 for new players (under 30 games)', () => {
  assert.equal(getKFactor(1500, 0), 32);
  assert.equal(getKFactor(1500, 29), 32);
});

test('getKFactor returns 24 for established players under 2000', () => {
  assert.equal(getKFactor(1200, 30), 24);
  assert.equal(getKFactor(1999, 50), 24);
});

test('getKFactor returns 16 for high rated players (2000+)', () => {
  assert.equal(getKFactor(2000, 30), 16);
  assert.equal(getKFactor(2500, 100), 16);
});

// ---------- calculatePerformanceRating ----------

test('calculatePerformanceRating adds 400 for win', () => {
  assert.equal(calculatePerformanceRating(1500, 'win'), 1900);
});

test('calculatePerformanceRating subtracts 400 for loss', () => {
  assert.equal(calculatePerformanceRating(1500, 'loss'), 1100);
});

test('calculatePerformanceRating equals opponent rating for draw', () => {
  assert.equal(calculatePerformanceRating(1500, 'draw'), 1500);
});

// ---------- calculateRatingChange ----------

test('calculateRatingChange win against equal opponent increases rating', () => {
  const result = calculateRatingChange(1500, 1500, 'win', 50);
  assert.ok(result.eloChange > 0, 'Win should increase rating');
  assert.equal(result.newRating, 1500 + result.eloChange);
});

test('calculateRatingChange loss against equal opponent decreases rating', () => {
  const result = calculateRatingChange(1500, 1500, 'loss', 50);
  assert.ok(result.eloChange < 0, 'Loss should decrease rating');
  assert.equal(result.newRating, 1500 + result.eloChange);
});

test('calculateRatingChange draw against equal opponent is near zero', () => {
  const result = calculateRatingChange(1500, 1500, 'draw', 50);
  assert.equal(result.eloChange, 0, 'Draw against equal opponent should be 0 change');
});

test('calculateRatingChange caps new rating to MIN_RATING (800)', () => {
  const result = calculateRatingChange(800, 2500, 'loss', 50);
  assert.ok(result.newRating >= 800, 'Rating should not drop below 800');
});

test('calculateRatingChange caps new rating to MAX_RATING (3000)', () => {
  const result = calculateRatingChange(3000, 800, 'win', 50);
  assert.ok(result.newRating <= 3000, 'Rating should not exceed 3000');
});

test('calculateRatingChange uses higher K-factor for new players', () => {
  const newPlayer = calculateRatingChange(1500, 1500, 'win', 10);
  const established = calculateRatingChange(1500, 1500, 'win', 50);
  assert.ok(
    Math.abs(newPlayer.eloChange) > Math.abs(established.eloChange),
    'New players should have larger ELO swings'
  );
});

test('calculateRatingChange returns performance rating for win/loss', () => {
  const winResult = calculateRatingChange(1500, 1600, 'win', 50);
  assert.equal(winResult.performanceRating, 2000);

  const lossResult = calculateRatingChange(1500, 1600, 'loss', 50);
  assert.equal(lossResult.performanceRating, 1200);
});

test('calculateRatingChange returns averaged performance rating for draw', () => {
  const result = calculateRatingChange(1500, 1700, 'draw', 50);
  assert.equal(result.performanceRating, 1600);
});

// ---------- calculateAveragePerformance ----------

test('calculateAveragePerformance returns null for empty array', () => {
  assert.strictEqual(calculateAveragePerformance([]), null);
});

test('calculateAveragePerformance all wins returns opponent avg + 400', () => {
  const games = [
    { result: 'win' as const, opponentRating: 1500 },
    { result: 'win' as const, opponentRating: 1500 },
  ];
  assert.equal(calculateAveragePerformance(games), 1900);
});

test('calculateAveragePerformance all losses returns opponent avg - 400', () => {
  const games = [
    { result: 'loss' as const, opponentRating: 1500 },
    { result: 'loss' as const, opponentRating: 1500 },
  ];
  assert.equal(calculateAveragePerformance(games), 1100);
});

test('calculateAveragePerformance mixed results returns reasonable value', () => {
  const games = [
    { result: 'win' as const, opponentRating: 1500 },
    { result: 'loss' as const, opponentRating: 1500 },
  ];
  const avg = calculateAveragePerformance(games);
  assert.ok(avg !== null, 'Should return a value for mixed results');
  assert.ok(avg >= 1000 && avg <= 2000, 'Should be in reasonable range');
});

// ---------- calculateELOStats ----------

test('calculateELOStats returns correct win rate', () => {
  const stats = calculateELOStats(1500, 10, 6, 3, 1, []);
  assert.equal(stats.winRate, 60);
});

test('calculateELOStats returns 0 win rate with no games', () => {
  const stats = calculateELOStats(1500, 0, 0, 0, 0, []);
  assert.equal(stats.winRate, 0);
});

test('calculateELOStats includes recent games', () => {
  const history = [
    { result: 'win' as const, opponentRating: 1400, opponent: 'player1', eloChange: 10, created_at: new Date().toISOString() },
    { result: 'loss' as const, opponentRating: 1600, opponent: 'player2', eloChange: -12, created_at: new Date().toISOString() },
  ];
  const stats = calculateELOStats(1500, 2, 1, 1, 0, history);
  assert.equal(stats.recentGames.length, 2);
  assert.equal(stats.recentGames[0].opponent, 'player1');
  assert.equal(stats.recentGames[1].opponent, 'player2');
});

test('calculateELOStats defaults opponent to Stockfish when missing', () => {
  const history = [
    { result: 'win' as const, opponentRating: 1400, eloChange: 10 },
  ];
  const stats = calculateELOStats(1500, 1, 1, 0, 0, history);
  assert.equal(stats.recentGames[0].opponent, 'Stockfish');
});
