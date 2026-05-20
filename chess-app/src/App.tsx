import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
          <h1 style={{ margin: 0, fontSize: '20px', color: '#89b4fa' }}>♔ Chess</h1>
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
            <Route path="" element={<Home onOnline={() => window.location.href = '/'} />} />
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
