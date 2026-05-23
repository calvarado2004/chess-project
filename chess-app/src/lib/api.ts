import axios from 'axios';
import { getAccessToken, getApiUrl, getRefreshToken, setTokens, setUser, clearTokens, expireAuthSession, getUser, StoredUser } from './auth';

const api = axios.create({
  baseURL: '/',
  timeout: 10000,
});

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }[] = [];

function processQueue(error: unknown | null, token: string | null = null): void {
  for (const callback of failedQueue) {
    if (error) {
      callback.reject(error);
    } else {
      callback.resolve(token);
    }
  }
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        expireAuthSession();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(getApiUrl('/auth/refresh'), {
          refreshToken,
        });

        const { accessToken } = response.data as { accessToken: string };
        const currentUser = getUser();

        if (currentUser) {
          setTokens(accessToken, refreshToken);
        }

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        expireAuthSession();
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ===================== Auth API =====================
export interface LoginResponse {
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResponse {
  user: StoredUser;
  accessToken: string;
  refreshToken: string;
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(getApiUrl('/auth/login'), { username, password });
  const { user, accessToken, refreshToken } = response.data;
  setTokens(accessToken, refreshToken);
  setUser(user);
  return response.data;
}

export async function register(username: string, email: string, password: string, displayName?: string): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>(getApiUrl('/auth/register'), {
    username, email, password, displayName,
  });
  const { user, accessToken, refreshToken } = response.data;
  setTokens(accessToken, refreshToken);
  setUser(user);
  return response.data;
}

export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await api.post(getApiUrl('/auth/logout'), { refreshToken });
    } catch {
      // Ignore logout errors
    }
  }
  clearTokens();
}

export async function getCurrentUser(): Promise<StoredUser> {
  const response = await api.get(getApiUrl('/users/me'));
  return response.data;
}

export async function updateProfile(data: { displayName?: string; avatar?: string }): Promise<StoredUser> {
  const response = await api.patch(getApiUrl('/users/me'), data);
  setUser(response.data);
  return response.data;
}

export async function updateDisplayName(displayName: string): Promise<StoredUser> {
  return updateProfile({ displayName });
}

export async function updateAvatar(avatar: string): Promise<StoredUser> {
  return updateProfile({ avatar });
}

export async function getPublicUser(userId: string): Promise<StoredUser> {
  const response = await api.get(getApiUrl(`/users/${userId}`));
  return response.data;
}

export interface ELOStats {
  rating: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  performanceRating: number | null;
  recentGames: Array<{
    result: string;
    opponent: string;
    opponentRating: number;
    eloChange: number;
    date: string;
  }>;
}

export interface GameHistoryEntry {
  id: string;
  game_id: string;
  opponent: string;
  opponent_elo: number;
  player_color: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  player_elo_before: number;
  player_elo_after: number;
  elo_change: number;
  performance_elo: number | null;
  move_count: number;
  game_duration_s: number;
  created_at: string;
}

export async function getELOStats(): Promise<ELOStats> {
  const response = await api.get(getApiUrl('/users/me/elo'));
  return response.data;
}

export async function getGameHistory(limit = 50): Promise<GameHistoryEntry[]> {
  const response = await api.get(getApiUrl(`/users/me/history?limit=${limit}`));
  return response.data;
}

export async function recordStockfishGame(data: {
  stockfishElo: number;
  playerColor: 'w' | 'b';
  result: 'win' | 'loss' | 'draw';
  moveCount: number;
  gameDuration: number;
}): Promise<ELOStats> {
  const response = await api.post(getApiUrl('/users/me/history/stockfish'), data);
  return response.data;
}

export default api;
