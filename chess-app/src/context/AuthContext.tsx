import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';
import {
  isAuthenticated,
  getAccessToken,
  getUser,
  setUser as persistUser,
  clearTokens,
  type StoredUser,
} from '../lib/auth';
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser as apiGetCurrentUser, updateProfile as apiUpdateProfile } from '../lib/api';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(getUser());
  const [accessToken, setAccessToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount
    if (isAuthenticated() && !user) {
      apiGetCurrentUser()
        .then((u) => {
          setUser(u);
        })
        .catch(() => {
          clearTokens();
          window.location.href = '/login';
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }

    // Periodically verify session is still valid (every 5 minutes)
    const interval = setInterval(() => {
      if (!getAccessToken()) return;
      apiGetCurrentUser()
        .then((u) => {
          setUser(u);
        })
        .catch(() => {
          clearTokens();
          // Force a full page reload to /login to break any React state loops
          window.location.href = '/login';
        });
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const result = await apiLogin(username, password);
    setUser(result.user);
    setAccessToken(result.accessToken);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, displayName?: string) => {
    const result = await apiRegister(username, email, password, displayName);
    setUser(result.user);
    setAccessToken(result.accessToken);
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
    } catch (error) {
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        clearTokens();
        // Force a full page reload to /login to break any React state loops
        window.location.href = '/login';
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
