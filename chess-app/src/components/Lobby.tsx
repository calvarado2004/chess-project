import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGameWebSocket } from '../context/GameWebSocketContext';
import type { LobbyChatMessage } from '../lib/ws-types';

interface LobbyProps {
  onJoinGame?: () => void;
}

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  { label: '😀 Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '😎', '🤓', '🧐', '😏'] },
  { label: '😺 Cats', emojis: ['🐱', '🐈', '🐈‍⬛', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'] },
  { label: '👋 Hands', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏'] },
  { label: '❤️ Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'] },
  { label: '⚡ Objects', emojis: ['⚡', '🔥', '💯', '✨', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🎯', '🚀', '💡', '⭐', '🌟', '💫', '🎵', '🎶', '♟️', '♔', '♚', '♛', '♜', '♝'] },
];

export default function Lobby({ onJoinGame }: LobbyProps) {
  const { user, accessToken } = useAuth();
  const navigate = useNavigate();
  const {
    lobbyPlayers,
    lobbyChatMessages,
    isConnected,
    connect,
    joinLobby,
    leaveLobby,
    createGame,
    joinGame,
    sendLobbyChat,
    onlineGame,
  } = useGameWebSocket();

  const [timeControl, setTimeControl] = useState(600);
  const [increment, setIncrement] = useState(0);
  const [colorPref, setColorPref] = useState<'white' | 'black' | 'any'>('any');
  const [isInLobby, setIsInLobby] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const autoConnectAttemptedRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);

  const handleConnect = useCallback(async () => {
    if (!accessToken) {
      navigate('/login');
      return;
    }

    setConnectionError('');
    setIsConnecting(true);
    try {
      const connected = await connect();
      if (!connected) {
        setConnectionError('Could not connect to the online game server.');
      }
    } catch {
      setConnectionError('Could not connect to the online game server.');
    } finally {
      setIsConnecting(false);
    }
  }, [accessToken, connect, navigate]);

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

  const handleSendChat = useCallback(() => {
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    sendLobbyChat(trimmed);
    setChatInput('');
    setShowEmojiPicker(false);
  }, [chatInput, sendLobbyChat]);

  const insertEmoji = useCallback((emoji: string) => {
    const input = chatInputRef.current;
    if (input) {
      const start = input.selectionStart ?? chatInput.length;
      const end = input.selectionEnd ?? chatInput.length;
      const newValue = chatInput.slice(0, start) + emoji + chatInput.slice(end);
      setChatInput(newValue);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      });
    } else {
      setChatInput((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
  }, [chatInput]);

  const handleChatKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendChat();
    }
  }, [handleSendChat]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyChatMessages]);

  useEffect(() => {
    if (!isConnected && !isConnecting && !autoConnectAttemptedRef.current) {
      autoConnectAttemptedRef.current = true;
      handleConnect().catch(() => {});
    }
  }, [handleConnect, isConnected, isConnecting]);

  // Navigate to game when onlineGame is created
  useEffect(() => {
    if (onlineGame) {
      navigate('/online');
    }
  }, [onlineGame, navigate]);

  if (!isConnected) {
    return (
      <div style={{
        maxWidth: '600px', margin: '40px auto', padding: '32px',
        background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
        <h2 style={{ color: isConnecting ? '#f9e2af' : '#f38ba8' }}>
          {isConnecting ? 'Connecting...' : 'Disconnected'}
        </h2>
        <p style={{ color: '#a6adc8', marginBottom: '16px' }}>
          {connectionError || 'Connecting to the online game server.'}
        </p>
        <div style={{
          display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            style={{
              padding: '10px 16px', background: '#89b4fa', color: '#1e1e2e',
              border: 'none', borderRadius: '6px', cursor: isConnecting ? 'not-allowed' : 'pointer',
              fontWeight: 600,
            }}
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '10px 16px', background: '#45475a', color: '#cdd6f4',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '10px 16px', background: '#313244', color: '#cdd6f4',
              border: '1px solid #45475a', borderRadius: '6px', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Back
          </button>
        </div>
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

      {/* Chat Panel */}
      <div style={{
        marginTop: '20px',
        background: '#313244',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '10px 16px',
          borderBottom: '1px solid #45475a',
          fontSize: '13px',
          fontWeight: 600,
          color: '#a6adc8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
        }}>
          💬 Lobby Chat
        </div>

        {/* Messages */}
        <div style={{
          height: '250px',
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {lobbyChatMessages.length === 0 && (
            <div style={{
              color: '#6c7086',
              fontSize: '13px',
              textAlign: 'center',
              marginTop: '40px',
            }}>
              No messages yet. Say hello!
            </div>
          )}
          {lobbyChatMessages.map((msg, i) => {
            const isMeMsg = isMe(msg.from);
            const showTimestamp = i === 0 || (msg.timestamp - lobbyChatMessages[i - 1].timestamp) > 5 * 60 * 1000;
            return (
              <div key={i}>
                {showTimestamp && (
                  <div style={{
                    color: '#6c7086',
                    fontSize: '11px',
                    textAlign: 'center',
                    margin: '6px 0 4px',
                  }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{
                    fontWeight: 600,
                    color: isMeMsg ? '#89b4fa' : '#fab387',
                    fontSize: '13px',
                    whiteSpace: 'nowrap',
                  }}>
                    {msg.displayName}
                  </span>
                  <span style={{
                    color: '#cdd6f4',
                    fontSize: '13px',
                    wordBreak: 'break-word',
                  }}>
                    {msg.message}
                  </span>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid #45475a',
          display: 'flex',
          gap: '8px',
          position: 'relative',
        }}>
          <input
            ref={chatInputRef}
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleChatKeyDown}
            placeholder="Type a message..."
            maxLength={500}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#45475a',
              border: 'none',
              borderRadius: '6px',
              color: '#cdd6f4',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{
              padding: '8px 10px',
              background: showEmojiPicker ? '#89b4fa' : '#45475a',
              color: showEmojiPicker ? '#1e1e2e' : '#cdd6f4',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
            }}
            title="Add emoji"
          >
            😀
          </button>
          <button
            onClick={handleSendChat}
            disabled={!chatInput.trim()}
            style={{
              padding: '8px 18px',
              background: chatInput.trim() ? '#89b4fa' : '#45475a',
              color: chatInput.trim() ? '#1e1e2e' : '#6c7086',
              border: 'none',
              borderRadius: '6px',
              cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Send
          </button>

          {/* Emoji Picker Popup */}
          {showEmojiPicker && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: '0',
              marginBottom: '8px',
              background: '#1e1e2e',
              border: '1px solid #45475a',
              borderRadius: '10px',
              padding: '12px',
              width: '320px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              zIndex: 1000,
            }}>
              {EMOJI_CATEGORIES.map((cat) => (
                <div key={cat.label}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#a6adc8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '6px',
                  }}>
                    {cat.label}
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(10, 1fr)',
                    gap: '2px',
                    marginBottom: '10px',
                  }}>
                    {cat.emojis.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmoji(emoji)}
                        style={{
                          background: 'none',
                          border: 'none',
                          fontSize: '20px',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.background = '#45475a'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'none'; }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
