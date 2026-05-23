import { useEffect, useMemo, useState } from 'react';
import { getELOStats, getGameHistory, type ELOStats, type GameHistoryEntry } from '../lib/api';
import { getAccessToken } from '../lib/auth';
import { getLocalStockfishGames, localGameToHistoryEntry, syncLocalStockfishGames } from '../lib/localHistory';

function formatResult(result: GameHistoryEntry['result']): string {
  if (result === 'win') return 'Win';
  if (result === 'loss') return 'Loss';
  return 'Draw';
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function GameHistory() {
  const [stats, setStats] = useState<ELOStats | null>(null);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const localHistory = getLocalStockfishGames().map(localGameToHistoryEntry);
    if (!getAccessToken()) {
      setStats(null);
      setHistory(localHistory);
      setError('');
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    syncLocalStockfishGames()
      .catch(() => 0)
      .then(() => Promise.all([getELOStats(), getGameHistory(50)]))
      .then(([nextStats, nextHistory]) => {
        if (cancelled) return;
        setStats(nextStats);
        const nextLocalHistory = getLocalStockfishGames()
          .filter((game) => !game.syncedAt)
          .map(localGameToHistoryEntry);
        setHistory([...nextLocalHistory, ...(Array.isArray(nextHistory) ? nextHistory : [])].slice(0, 50));
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStats(null);
        setHistory(localHistory);
        setError(localHistory.length > 0 ? '' : (err instanceof Error ? err.message : 'Failed to load game history'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stockfishGames = useMemo(
    () => history.filter((game) => (game.opponent ?? '').toLowerCase().includes('stockfish')).slice(0, 10),
    [history]
  );

  return (
    <div className="history-page">
      <div className="history-header">
        <div>
          <h2>Game History</h2>
          <p>Last 50 games, including on-device Stockfish games waiting to sync</p>
        </div>
        {stats && (
          <div className="history-rating">
            <span>{stats.rating}</span>
            <small>ELO</small>
          </div>
        )}
      </div>

      {loading && <div className="panel">Loading history...</div>}
      {error && <div className="history-error">{error}</div>}

      {!loading && (
        <>
          {stats && (
            <div className="history-stats">
              <div><span>{stats.games}</span><small>Rated Games</small></div>
              <div><span>{stats.wins}</span><small>Wins</small></div>
              <div><span>{stats.losses}</span><small>Losses</small></div>
              <div><span>{stats.draws}</span><small>Draws</small></div>
              <div><span>{stats.winRate}%</span><small>Win Rate</small></div>
              <div>
                <span>{stats.performanceRating ?? '-'}</span>
                <small>Last 10 Perf</small>
              </div>
            </div>
          )}

          <div className="history-split">
            <section className="panel history-section">
              <h3>Recent Games</h3>
              <div className="history-table">
                <div className="history-row history-row-head">
                  <span>Result</span>
                  <span>Opponent</span>
                  <span>Color</span>
                  <span>ELO</span>
                  <span>Moves</span>
                  <span>Date</span>
                </div>
                {history.length === 0 ? (
                  <div className="history-empty">No rated games yet.</div>
                ) : history.map((game) => (
                  <div className={`history-row result-${game.result}`} key={game.id}>
                    <span>{formatResult(game.result)}</span>
                    <span>{game.opponent} ({game.opponent_elo})</span>
                    <span>{game.player_color === 'w' ? 'White' : 'Black'}</span>
                    <span>
                      {game.id.startsWith('local-') ? (
                        game.opponent.includes('synced') ? 'Synced' : 'Pending sync'
                      ) : (
                        <>
                          {game.player_elo_before} → {game.player_elo_after}
                          <b>{game.elo_change >= 0 ? `+${game.elo_change}` : game.elo_change}</b>
                        </>
                      )}
                    </span>
                    <span>{game.move_count}</span>
                    <span>{new Date(game.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel history-section">
              <h3>Stockfish Last 10</h3>
              <div className="stockfish-list">
                {stockfishGames.length === 0 ? (
                  <div className="history-empty">No Stockfish games recorded yet.</div>
                ) : stockfishGames.map((game) => (
                  <div className="stockfish-card" key={game.id}>
                    <div>
                      <strong>{formatResult(game.result)}</strong>
                      <span>{game.opponent}</span>
                    </div>
                    <div>
                      <span>{game.performance_elo ?? '-'} perf</span>
                      <small>{formatDuration(game.game_duration_s)} · {game.move_count} moves</small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
