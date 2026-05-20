import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AVAILABLE_AVATARS = [
  { name: 'king.svg', label: '♔ King', color: '#FFD700' },
  { name: 'queen.svg', label: '♕ Queen', color: '#C0C0C0' },
  { name: 'rook.svg', label: '♖ Rook', color: '#CD7F32' },
  { name: 'bishop.svg', label: '♗ Bishop', color: '#4169E1' },
  { name: 'knight.svg', label: '♘ Knight', color: '#228B22' },
  { name: 'pawn.svg', label: '♙ Pawn', color: '#DC143C' },
  { name: 'king-black.svg', label: '♚ Black King', color: '#4B0082' },
  { name: 'queen-black.svg', label: '♛ Black Queen', color: '#8B0000' },
  { name: 'rook-black.svg', label: '♜ Black Rook', color: '#006400' },
  { name: 'bishop-black.svg', label: '♝ Black Bishop', color: '#2F4F4F' },
  { name: 'knight-black.svg', label: '♞ Black Knight', color: '#8B4513' },
  { name: 'pawn-black.svg', label: '♟ Black Pawn', color: '#556B2F' },
];

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'king.svg');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = useCallback(async () => {
    setError('');
    setSaved(false);
    setSaving(true);

    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        avatar: selectedAvatar,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [displayName, selectedAvatar, updateProfile]);

  if (!user) return null;

  return (
    <div style={{
      maxWidth: '600px', margin: '40px auto', padding: '32px',
      background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
    }}>
      <h2 style={{ color: '#89b4fa', marginBottom: '24px' }}>👤 Profile</h2>

      {error && (
        <div style={{
          padding: '12px', marginBottom: '16px', background: '#f38ba822',
          border: '1px solid #f38ba8', borderRadius: '8px', color: '#f38ba8',
        }}>
          {error}
        </div>
      )}

      {saved && (
        <div style={{
          padding: '12px', marginBottom: '16px', background: '#a6e3a122',
          border: '1px solid #a6e3a1', borderRadius: '8px', color: '#a6e3a1',
        }}>
          Profile saved successfully!
        </div>
      )}

      {/* Avatar selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '12px', fontSize: '14px', color: '#a6adc8', fontWeight: 600 }}>
          Profile Picture
        </label>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '12px',
          marginBottom: '16px',
        }}>
          {AVAILABLE_AVATARS.map((avatar) => (
            <button
              key={avatar.name}
              onClick={() => setSelectedAvatar(avatar.name)}
              title={avatar.label}
              style={{
                width: '64px', height: '64px', padding: 0,
                background: selectedAvatar === avatar.name ? avatar.color : 'transparent',
                border: selectedAvatar === avatar.name ? `3px solid #fff` : '2px solid #45475a',
                borderRadius: '50%', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              <img
                src={`/avatars/${avatar.name}`}
                alt={avatar.label}
                style={{ width: '48px', height: '48px', pointerEvents: 'none' }}
              />
              {selectedAvatar === avatar.name && (
                <div style={{
                  position: 'absolute', bottom: '-2px', right: '-2px',
                  width: '20px', height: '20px', background: '#a6e3a1',
                  borderRadius: '50%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '12px', color: '#1e1e2e',
                  fontWeight: 'bold',
                }}>
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Display name */}
      <div style={{ marginBottom: '24px' }}>
        <label htmlFor="displayName" style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a6adc8', fontWeight: 600 }}>
          Display Name
        </label>
        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          style={{
            width: '100%', padding: '10px 12px', fontSize: '14px',
            background: '#313244', border: '1px solid #45475a', borderRadius: '6px',
            color: '#cdd6f4', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Username (read-only) */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a6adc8', fontWeight: 600 }}>
          Username
        </label>
        <div style={{
          padding: '10px 12px', fontSize: '14px',
          background: '#313244', border: '1px solid #45475a', borderRadius: '6px',
          color: '#a6adc8',
        }}>
          @{user.username}
        </div>
      </div>

      {/* Rating */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px',
        marginBottom: '24px',
      }}>
        {[
          ['ELO', user.elo_rating],
          ['Games', user.elo_games],
          ['Wins', user.elo_wins],
          ['Draws', user.elo_draws],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: '10px', background: '#313244', border: '1px solid #45475a',
              borderRadius: '6px', textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: '#a6adc8', marginBottom: '4px' }}>{label}</div>
            <div style={{ fontSize: '18px', color: '#cdd6f4', fontWeight: 700 }}>{value}</div>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate('/history')}
        style={{
          width: '100%', padding: '10px', fontSize: '14px', fontWeight: 600,
          background: '#45475a', color: '#cdd6f4', border: 'none',
          borderRadius: '8px', cursor: 'pointer', marginBottom: '12px',
        }}
      >
        View Game History
      </button>

      {/* Member since */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a6adc8', fontWeight: 600 }}>
          Member Since
        </label>
        <div style={{
          padding: '10px 12px', fontSize: '14px',
          background: '#313244', border: '1px solid #45475a', borderRadius: '6px',
          color: '#a6adc8',
        }}>
          {new Date(user.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          })}
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600,
          background: saving ? '#6c7086' : '#89b4fa', color: '#1e1e2e',
          border: 'none', borderRadius: '8px', cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}
