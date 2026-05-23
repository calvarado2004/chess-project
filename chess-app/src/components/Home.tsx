import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface HomeProps {
  onOnline: () => void;
}

export default function Home({ onOnline }: HomeProps) {
  const navigate = useNavigate();
  const [showStockfishPicker, setShowStockfishPicker] = useState(false);

  const cards = [
    {
      icon: '♟',
      title: 'Single Player',
      description: 'Play White vs Stockfish',
      color: '#89b4fa',
      action: () => navigate('/local', { state: { gameMode: 'hwe' } }),
    },
    {
      icon: '🤖',
      title: 'vs Stockfish',
      description: 'Challenge the engine — pick your color',
      color: '#a6e3a1',
      action: () => setShowStockfishPicker(true),
    },
    {
      icon: '🌐',
      title: 'Online Multiplayer',
      description: 'Find an opponent and play over the network',
      color: '#f9e2af',
      action: () => onOnline(),
    },
    {
      icon: '📄',
      title: 'Study PGN',
      description: 'Load a game from PGN to study positions',
      color: '#cba6f7',
      action: () => navigate('/pgn'),
    },
  ];

  return (
    <div style={{
      maxWidth: '800px',
      margin: 'clamp(16px, 8vw, 40px) auto',
      padding: 'clamp(8px, 5vw, 24px)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <svg width="80" height="80" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0 auto 8px' }}>
          <path
            d="M22 10C32.5 11 38.5 18 38 39H15C15 30 25 32.5 23 18"
            fill="#89b4fa"
          />
          <path
            d="M24 18C24.38 20.91 18.45 25.37 16 27C13 29 13.18 31.34 11 31C9.958 30.06 12.41 27.96 11 28C10 28 11.19 29.23 10 30C9 30 5.997 31 6 26C6 24 12 14 12 14C12 14 13.89 12.1 14 10.5C13.27 9.506 13.5 8.5 13.5 7.5C14.5 6.5 16.5 10 16.5 10L18.5 10C18.5 10 19.28 8.008 21 7C22 7 22 10 22 10"
            fill="#89b4fa"
          />
          <circle cx="9.5" cy="25.5" r="1" fill="#1e1e2e" />
          <ellipse cx="15" cy="15.5" rx="0.5" ry="1.5" fill="#1e1e2e"
            transform="matrix(0.866 0.5 -0.5 0.866 9.693 -5.173)"
          />
        </svg>
        <h1 style={{
          color: '#89b4fa', fontSize: '36px', fontWeight: 700, margin: 0,
          letterSpacing: '-0.5px',
        }}>
          Qwen's 3.6 — Chess!
        </h1>
      </div>
      <p style={{
        textAlign: 'center', color: '#a6adc8', marginBottom: '40px', fontSize: '16px',
      }}>
        Choose how you want to play
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
        gap: '16px',
      }}>
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={card.action}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              padding: '20px 24px', background: '#1e1e2e',
              border: `2px solid ${card.color}33`,
              borderRadius: '12px', cursor: 'pointer',
              textAlign: 'left', transition: 'border-color 0.2s, transform 0.1s',
              color: '#cdd6f4',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = card.color;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = `${card.color}33`;
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '36px' }}>{card.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '13px', color: '#a6adc8' }}>
                {card.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Stockfish color picker modal trigger */}
      <StockfishColorPicker show={showStockfishPicker} onShowChange={setShowStockfishPicker} />
    </div>
  );
}

/**
 * Inline color picker for Stockfish mode.
 * Shown after clicking "vs Stockfish" card.
 */
function StockfishColorPicker({ show, onShowChange }: { show: boolean; onShowChange: (show: boolean) => void }) {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 999,
    }}
      onClick={() => onShowChange(false)}
    >
      <div style={{
        background: '#1e1e2e', padding: '32px', borderRadius: '12px',
        textAlign: 'center', color: '#cdd6f4', width: 'min(320px, calc(100vw - 32px))',
      }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '20px' }}>Play as</h3>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => {
              // Navigate to local with White vs Stockfish
              navigate('/local', { state: { gameMode: 'hwe' } });
              onShowChange(false);
            }}
            style={{
              padding: '12px 28px', background: '#ffffff22', color: '#fff',
              border: '2px solid #ffffff', borderRadius: '8px', cursor: 'pointer',
              fontSize: '16px', fontWeight: 600,
            }}
          >
            ♔ White
          </button>
          <button
            onClick={() => {
              // Navigate to local with Black vs Stockfish
              navigate('/local', { state: { gameMode: 'hbe' } });
              onShowChange(false);
            }}
            style={{
              padding: '12px 28px', background: '#00000044', color: '#cdd6f4',
              border: '2px solid #6c7086', borderRadius: '8px', cursor: 'pointer',
              fontSize: '16px', fontWeight: 600,
            }}
          >
            ♚ Black
          </button>
        </div>
        <button
          onClick={() => onShowChange(false)}
          style={{
            marginTop: '16px', background: 'none', border: 'none',
            color: '#a6adc8', cursor: 'pointer', fontSize: '14px',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
