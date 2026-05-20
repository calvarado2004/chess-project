import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';

interface LobbyProps {
  onJoinGame?: () => void;
}

export default function Lobby({ onJoinGame }: LobbyProps) {
  const { user } = useAuth();
  const {
    lobbyPlayers,
    isConnected,
    joinLobby,
    leaveLobby,
    createGame,
    joinGame,
  } = useGameWebSocket();

  const [timeControl, setTimeControl] = useState(600);
  const [increment, setIncrement] = useState(0);
  const [colorPref, setColorPref] = useState<'white' | 'black' | 'any'>('any');
  const [isInLobby, setIsInLobby] = useState(false);

  const handleJoinLobby = useCallback(() => {
    joinLobby({ timeControl, increment, color: colorPref });
    setIsInLobby(true);
  }, [joinLobby, timeControl, increment, colorPref]);

  const handleLeaveLobby = useCallback(() => {
    leaveLobby();
    setIsInLobby(false);
  }, [leaveLobby]);

  const handleCreateGame = useCallback(() => {
    createGame({ timeControl, increment, color: colorPref });
  }, [createGame, timeControl, increment, colorPref]);

  const handleJoinPlayer = useCallback((playerId: string, gameId: string, playerColor: 'white' | 'black') => {
    joinGame(gameId, playerColor);
  }, [joinGame]);

  // Navigate to game when onlineGame is created
  const { onlineGame } = useGameWebSocket();
  useEffect(() => {
    if (onlineGame && onJoinGame) {
      onJoinGame();
    }
  }, [onlineGame, onJoinGame]);

  if (!isConnected) {
    return (
      <div style={{
        maxWidth: '600px', margin: '40px auto', padding: '32px',
        background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
        <h2 style={{ color: '#f38ba8' }}>Disconnected</h2>
        <p style={{ color: '#a6adc8' }}>You are not connected to the game server.</p>
      </div>
    );
  }

  const isMe = (id: string) => user?.id === id;

  return (
    <div style={{
      maxWidth: '700px', margin: '20px auto', padding: '24px',
      background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: '#89b4fa', margin: 0 }}>
          {isInLobby ? 'In Lobby' : 'Lobby'}
          <span style={{ fontSize: '14px', color: '#a6adc8', marginLeft: '8px' }}>
            ({lobbyPlayers.length} waiting)
          </span>
        </h2>
        {isInLobby && (
          <button
            onClick={handleLeaveLobby}
            style={{
              padding: '8px 16px', background: '#f38ba8', color: '#1e1e2e',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Leave Lobby
          </button>
        )}
      </div>

      {/* Settings */}
      <div style={{
        display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap',
        padding: '16px', background: '#313244', borderRadius: '8px',
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#a6adc8', marginBottom: '4px' }}>
            Time Control
          </label>
          <select
            value={timeControl}
            onChange={(e) => setTimeControl(Number(e.target.value))}
            style={{
              padding: '8px 12px', background: '#45475a', border: 'none',
              borderRadius: '6px', color: '#cdd6f4', fontSize: '14px',
            }}
          >
            <option value={30}>30s (Bullet)</option>
            <option value={60}>1 min (Bullet)</option>
            <option value={180}>3 min (Bullet)</option>
            <option value={300}>5 min (Blitz)</option>
            <option value={600}>10 min (Blitz)</option>
            <option value={900}>15 min (Blitz)</option>
            <option value={1800}>30 min (Rapid)</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#a6adc8', marginBottom: '4px' }}>
            Increment (sec)
          </label>
          <select
            value={increment}
            onChange={(e) => setIncrement(Number(e.target.value))}
            style={{
              padding: '8px 12px', background: '#45475a', border: 'none',
              borderRadius: '6px', color: '#cdd6f4', fontSize: '14px',
            }}
          >
            <option value={0}>None</option>
            <option value={1}>+1</option>
            <option value={2}>+2</option>
            <option value={3}>+3</option>
            <option value={5}>+5</option>
            <option value={10}>+10</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#a6adc8', marginBottom: '4px' }}>
            Color Preference
          </label>
          <select
            value={colorPref}
            onChange={(e) => setColorPref(e.target.value as 'white' | 'black' | 'any')}
            style={{
              padding: '8px 12px', background: '#45475a', border: 'none',
              borderRadius: '6px', color: '#cdd6f4', fontSize: '14px',
            }}
          >
            <option value="any">Any</option>
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
      </div>

      {!isInLobby ? (
        <button
          onClick={handleJoinLobby}
          style={{
            width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600,
            background: '#89b4fa', color: '#1e1e2e', border: 'none',
            borderRadius: '8px', cursor: 'pointer', marginBottom: '20px',
          }}
        >
          Join Lobby
        </button>
      ) : (
        <button
          onClick={handleCreateGame}
          style={{
            width: '100%', padding: '14px', fontSize: '16px', fontWeight: 600,
            background: '#a6e3a1', color: '#1e1e2e', border: 'none',
            borderRadius: '8px', cursor: 'pointer', marginBottom: '20px',
          }}
        >
          Create Game
        </button>
      )}

      {/* Waiting players */}
      {lobbyPlayers.length > 0 && (
        <div>
          <h3 style={{ fontSize: '14px', color: '#a6adc8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Waiting Players
          </h3>
          {lobbyPlayers.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', marginBottom: '8px',
                background: isMe(player.id) ? '#45475a' : '#313244',
                borderRadius: '8px',
              }}
            >
              <div>
                <span style={{ fontWeight: 600, color: isMe(player.id) ? '#89b4fa' : '#cdd6f4' }}>
                  {player.displayName || player.username}
                </span>
                {isMe(player.id) && (
                  <span style={{ fontSize: '11px', color: '#89b4fa', marginLeft: '8px' }}>(You)</span>
                )}
                <span style={{
                  marginLeft: '12px', padding: '2px 8px', fontSize: '11px',
                  background: '#45475a', borderRadius: '4px', color: '#a6adc8',
                }}>
                  {player.color === 'any' ? 'Any' : player.color === 'white' ? '♔ White' : '♚ Black'}
                </span>
                <span style={{
                  marginLeft: '6px', padding: '2px 8px', fontSize: '11px',
                  background: '#45475a', borderRadius: '4px', color: '#a6adc8',
                }}>
                  {Math.floor(player.timeControl / 60)}min
                </span>
              </div>
              {!isMe(player.id) && (
                <button
                  onClick={() => handleJoinPlayer(player.id, player.gameId, colorPref === 'white' ? 'white' : colorPref === 'black' ? 'black' : 'white')}
                  style={{
                    padding: '6px 14px', background: '#89b4fa', color: '#1e1e2e',
                    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                  }}
                >
                  Play
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
