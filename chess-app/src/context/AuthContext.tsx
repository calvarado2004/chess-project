import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import {
  isAuthenticated,
  getAccessToken,
  getUser,
  isNativeApp,
  setUser as persistUser,
  clearTokens,
  AUTH_SESSION_EXPIRED_EVENT,
  type StoredUser,
} from '../lib/auth';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser as apiGetCurrentUser, updateProfile as apiUpdateProfile } from '../lib/api';
import { syncLocalStockfishGames } from '../lib/localHistory';

interface AuthContextType {
  user: StoredUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { displayName?: string; avatar?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Global flag to prevent multiple simultaneous redirect attempts
let redirectingToLogin = false;

function forceRedirectToLogin() {
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  clearTokens();
  window.location.replace('/login');
}

function canTrustNativeOfflineSession(error: unknown): boolean {
  return isNativeApp() && !!getUser() && axios.isAxiosError(error) && !error.response;
}

function handleAuthValidationError(error: unknown) {
  if (canTrustNativeOfflineSession(error)) {
    return;
  }
  forceRedirectToLogin();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getUser());
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
      setAccessToken(null);
      redirectingToLogin = false;
    };
    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    // Browser sessions must validate on load. Native apps may keep the last
    // account for offline-only features when the server is unreachable.
    if (isAuthenticated()) {
      apiGetCurrentUser()
        .then((u) => {
          setUser(u);
          persistUser(u);
          syncLocalStockfishGames().catch((error: unknown) => {
            console.error('Failed to sync local Stockfish history', error);
          });
        })
        .catch(handleAuthValidationError)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Periodically verify session is still valid (every 2 minutes)
    const interval = setInterval(() => {
      if (!getAccessToken()) return;
      apiGetCurrentUser()
        .then((u) => {
          setUser(u);
          persistUser(u);
          syncLocalStockfishGames().catch((error: unknown) => {
            console.error('Failed to sync local Stockfish history', error);
          });
        })
        .catch(handleAuthValidationError);
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(interval);
      window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    redirectingToLogin = false;
    setUser(result.user);
    setAccessToken(result.accessToken);
    syncLocalStockfishGames().catch((error: unknown) => {
      console.error('Failed to sync local Stockfish history', error);
    });
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, displayName?: string) => {
    const result = await apiRegister(username, email, password, displayName);
    redirectingToLogin = false;
    setUser(result.user);
    setAccessToken(result.accessToken);
    syncLocalStockfishGames().catch((error: unknown) => {
      console.error('Failed to sync local Stockfish history', error);
    });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await apiGetCurrentUser();
      persistUser(u);
      setUser(u);
      setAccessToken(getAccessToken());
      syncLocalStockfishGames().catch((error: unknown) => {
        console.error('Failed to sync local Stockfish history', error);
      });
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        forceRedirectToLogin();
      } else if (canTrustNativeOfflineSession(error)) {
        setUser(getUser());
        setAccessToken(getAccessToken());
      } else {
        console.error('Failed to refresh user profile', error);
      }
    }
  }, []);

  const updateProfile = useCallback(async (data: { displayName?: string; avatar?: string }) => {
    const u = await apiUpdateProfile(data);
    setUser(u);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
