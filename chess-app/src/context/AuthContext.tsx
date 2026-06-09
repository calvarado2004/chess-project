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
// While a game is in progress we never yank the player to the login screen.
let inActiveGame = false;
let deferredLogout = false;

// Game screens (local vs Stockfish, online multiplayer) call this on mount and
// unmount so an expiring/invalid session can never interrupt play. Any logout
// that comes due mid-game is held until the player leaves the game — or until
// they relaunch the app, which re-validates the session on load.
export function setInActiveGame(active: boolean) {
  inActiveGame = active;
  if (!active && deferredLogout) {
    deferredLogout = false;
    // Now that the player has left the game, apply the held logout: clear the
    // React session state (so ProtectedRoute lets go) and send them to login.
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    forceRedirectToLogin();
  }
}

function forceRedirectToLogin() {
  if (inActiveGame) {
    deferredLogout = true;
    return;
  }
  if (redirectingToLogin) return;
  redirectingToLogin = true;
  clearTokens();
  window.location.replace(isNativeApp() ? '/#/login' : '/login');
}

// True when the only reason a request failed is lack of connectivity on a
// native device that already has a stored account — i.e. genuine offline, not
// an auth rejection. Such sessions can be trusted for offline-only features.
function canTrustNativeOfflineSession(error: unknown): boolean {
  return isNativeApp() && !!getUser() && axios.isAxiosError(error) && !error.response;
}

function handleAuthValidationError(error: unknown) {
  // Only a definitive 401 means the session is truly invalid: the api response
  // interceptor has, by this point, already tried and failed to refresh the
  // access token. Every other failure is transient — a server error (5xx), a
  // timeout, or no connectivity (e.g. during a backend redeploy, or while
  // offline on a native device) — and must NOT log the user out. Doing so was
  // kicking players to the login screen mid-game on a momentary blip.
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    forceRedirectToLogin();
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getUser());
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleSessionExpired = () => {
      // Never tear down the session in the middle of a game — that would make
      // ProtectedRoute bounce an online player to login. Hold it until they
      // leave the game (setInActiveGame(false) re-dispatches this event).
      if (inActiveGame) {
        deferredLogout = true;
        return;
      }
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
