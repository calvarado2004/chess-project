import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

interface LoginProps {
  onSwitchToRegister?: () => void;
  onContinueOffline?: () => void;
}

export default function Login({ onSwitchToRegister, onContinueOffline }: LoginProps) {
  const { login, isLoading: apiLoading } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(username, password);
    } catch (err: unknown) {
      const message = err instanceof Error && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : 'Login failed';
      setError(message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      maxWidth: '400px', margin: '80px auto', padding: '32px',
      background: '#1e1e2e', borderRadius: '12px', color: '#cdd6f4',
    }}>
      {/* Knight icon + title */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <svg width="64" height="64" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0 auto 8px' }}>
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
          color: '#89b4fa', fontSize: '24px', fontWeight: 700, margin: 0,
          letterSpacing: '-0.5px',
        }}>
          Qwen's 3.6 — Chess!
        </h1>
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: '24px', color: '#a6adc8', fontSize: '18px' }}>Login</h2>

      {error && (
        <div style={{
          padding: '12px', marginBottom: '16px', background: '#f38ba822',
          border: '1px solid #f38ba8', borderRadius: '8px', color: '#f38ba8',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="username" style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a6adc8' }}>
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            autoFocus
            style={{
              width: '100%', padding: '10px 12px', fontSize: '14px',
              background: '#313244', border: '1px solid #45475a', borderRadius: '6px',
              color: '#cdd6f4', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label htmlFor="password" style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#a6adc8' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            style={{
              width: '100%', padding: '10px 12px', fontSize: '14px',
              background: '#313244', border: '1px solid #45475a', borderRadius: '6px',
              color: '#cdd6f4', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || apiLoading}
          style={{
            width: '100%', padding: '12px', fontSize: '15px', fontWeight: 600,
            background: '#89b4fa', color: '#1e1e2e', border: 'none',
            borderRadius: '8px', cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting || apiLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {onContinueOffline && (
        <button
          onClick={onContinueOffline}
          style={{
            width: '100%', marginTop: '12px', padding: '12px', fontSize: '15px', fontWeight: 600,
            background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
            borderRadius: '8px', cursor: 'pointer',
          }}
        >
          Continue offline
        </button>
      )}

      {onSwitchToRegister && (
        <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: '#a6adc8' }}>
          Don't have an account?{' '}
          <button
            onClick={onSwitchToRegister}
            style={{
              background: 'none', border: 'none', color: '#89b4fa',
              cursor: 'pointer', fontWeight: 600, textDecoration: 'underline',
            }}
          >
            Register
          </button>
        </p>
      )}
    </div>
  );
}
