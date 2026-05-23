import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ReactNode, useCallback } from 'react';
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
import GameHistory from './components/GameHistory';
import Home from './components/Home';
import { isNativeApp } from './lib/auth';
import './index.css';

function AppRoutes() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          accessToken ? <Navigate to="/" replace /> : (
            <Login
              onSwitchToRegister={() => navigate('/register')}
              onContinueOffline={() => navigate('/')}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          accessToken ? <Navigate to="/" replace /> : (
            <Register
              onSwitchToLogin={() => navigate('/login')}
              onContinueOffline={() => navigate('/')}
            />
          )
        }
      />
      <Route path="/" element={<MainApp><Home /></MainApp>} />
      <Route
        path="/lobby"
        element={<MainApp><ProtectedRoute><Lobby onJoinGame={() => navigate('/online')} /></ProtectedRoute></MainApp>}
      />
      <Route path="/local" element={<MainApp><LocalGame /></MainApp>} />
      <Route
        path="/online"
        element={<MainApp><ProtectedRoute><OnlineGame onBackToLobby={() => navigate('/lobby')} /></ProtectedRoute></MainApp>}
      />
      <Route path="/pgn" element={<MainApp><PGNLoader /></MainApp>} />
      <Route path="/profile" element={<MainApp><ProtectedRoute><Profile /></ProtectedRoute></MainApp>} />
      <Route path="/history" element={<MainApp><GameHistory /></MainApp>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function MainApp({ children }: { children: ReactNode }) {
  const { user, accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const nativeApp = isNativeApp();

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <GameWebSocketProvider>
      <div className={`app-shell${nativeApp ? ' app-shell-native' : ''}`}>
        {/* Top bar */}
        <div className="app-topbar">
          {/* Knight icon + title — clickable, goes home */}
          <button
            onClick={() => { navigate('/'); }}
            className="app-brand"
            title="Home"
          >
            <svg className="app-brand-icon" width="64" height="64" viewBox="0 0 45 45" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <span className="app-title">
              Qwen's 3.6 — Chess!
            </span>
          </button>
          <div className="app-user-actions">
            {user && accessToken ? (
              <>
                <img
                  src={`/avatars/${user.avatar || 'king.svg'}`}
                  alt="Avatar"
                  className="app-avatar"
                />
                <span className="app-user-name">
                  {user.display_name || user.username}
                </span>
                <span className="app-elo-pill">
                  {user.elo_rating} ELO
                </span>
                <button
                  onClick={() => { navigate('/profile'); }}
                  className="app-nav-button"
                >
                  Profile
                </button>
                <button
                  onClick={() => { navigate('/history'); }}
                  className="app-nav-button"
                >
                  History
                </button>
                <button
                  onClick={handleLogout}
                  className="app-nav-button"
                >
                  Logout
                </button>
              </>
            ) : user ? (
              <>
                <img
                  src={`/avatars/${user.avatar || 'king.svg'}`}
                  alt="Avatar"
                  className="app-avatar"
                />
                <span className="app-user-name">
                  {user.display_name || user.username}
                </span>
                <span className="app-elo-pill">
                  Offline
                </span>
                <button
                  onClick={() => { navigate('/history'); }}
                  className="app-nav-button"
                >
                  Local History
                </button>
                <button
                  onClick={() => { navigate('/login'); }}
                  className="app-nav-button"
                >
                  Login
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { navigate('/history'); }}
                  className="app-nav-button"
                >
                  Local History
                </button>
                <button
                  onClick={() => { navigate('/login'); }}
                  className="app-nav-button"
                >
                  Login
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="app-content">
          {children}
        </div>
      </div>
    </GameWebSocketProvider>
  );
}

export default function App() {
  const Router = isNativeApp() ? HashRouter : BrowserRouter;

  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
