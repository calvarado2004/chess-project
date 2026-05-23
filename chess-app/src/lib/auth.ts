const ACCESS_TOKEN_KEY = 'chess_access_token';
const REFRESH_TOKEN_KEY = 'chess_refresh_token';
const USER_KEY = 'chess_user';
export const AUTH_SESSION_EXPIRED_EVENT = 'chess_auth_session_expired';

export interface StoredUser {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  elo_rating: number;
  elo_games: number;
  elo_wins: number;
  elo_losses: number;
  elo_draws: number;
  created_at: string;
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getUser(): StoredUser | null {
  const data = localStorage.getItem(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function setUser(user: StoredUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function expireAuthSession(): void {
  clearTokens();
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  if (window.location.pathname !== '/login') {
    window.location.replace('/login');
  }
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export function getApiUrl(path: string): string {
  return `/api${path}`;
}
