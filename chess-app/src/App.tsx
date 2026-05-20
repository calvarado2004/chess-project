import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GameWebSocketProvider } from './context/GameWebSocketContext';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Lobby from './components/Lobby';
import OnlineGame from './components/OnlineGame';
import LocalGame from './components/LocalGame';
import PGNLoader from './components/PGNLoader';
import Profile from './components/Profile';
import Home from './components/Home';
import './index.css';

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : (
            <Login onSwitchToRegister={() => window.location.href = '/register'} />
          )
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : (
            <Register onSwitchToLogin={() => window.location.href = '/login'} />
          )
        }
      />
      <Route
        path="*"
        element={
          <ProtectedRoute>
            <MainApp />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function MainApp() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(async () => {
    await logout();
    window.location.href = '/login';
  }, [logout]);

  if (!user) return null;

  return (
    <GameWebSocketProvider>
      <div style={{ minHeight: '100vh', background: '#181825' }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px', background: '#1e1e2e', borderBottom: '1px solid #313244',
        }}>
          {/* Knight icon — clickable, goes home */}
          <button
            onClick={() => { navigate('/'); window.location.href = '/'; }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
            title="Home"
          >
            <svg width="32" height="32" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Avatar in top bar */}
            <img
              src={`/avatars/${user.avatar || 'king.svg'}`}
              alt="Avatar"
              style={{
                width: '36px', height: '36px', borderRadius: '50%',
                border: '2px solid #45475a',
              }}
            />
            <span style={{ color: '#cdd6f4', fontSize: '14px' }}>
              {user.display_name || user.username}
            </span>
            <button
              onClick={() => { window.location.href = '/profile'; }}
              style={{
                padding: '6px 14px', background: '#45475a', color: '#cdd6f4',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '6px 14px', background: '#45475a', color: '#cdd6f4',
                border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px' }}>
          <Routes>
            <Route path="" element={<Home onOnline={() => window.location.href = '/online'} />} />
            <Route path="local" element={<LocalGame />} />
            <Route path="online" element={<OnlineGame onBackToLobby={() => window.location.href = '/'} />} />
            <Route path="pgn" element={<PGNLoader />} />
            <Route path="profile" element={<Profile />} />
          </Routes>
        </div>
      </div>
    </GameWebSocketProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
