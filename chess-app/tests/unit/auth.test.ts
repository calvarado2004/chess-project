import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage and sessionStorage
function createMockStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    get store() { return store; },
  };
}

let mockLocalStorage: any;
let mockSessionStorage: any;
let mockLocation: any;
let mockDispatchEvent: any;

beforeEach(() => {
  mockLocalStorage = createMockStorage();
  mockSessionStorage = createMockStorage();
  mockLocation = { protocol: 'http:', hostname: 'localhost', port: '5173', pathname: '/', hash: '' };
  mockDispatchEvent = vi.fn();

  Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });
  Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, writable: true });
  Object.defineProperty(window, 'location', { value: mockLocation, writable: true });
  window.dispatchEvent = mockDispatchEvent;
  window.Event = class Event {
    constructor(public type: string) {}
  };

  // Clear the module cache to re-import with fresh mocks
  vi.resetModules();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('auth token management', () => {
  it('should get/set access token', async () => {
    const { getAccessToken, setTokens, clearTokens } = await import('../../src/lib/auth');
    setTokens('test-access', 'test-refresh');
    expect(getAccessToken()).toBe('test-access');
  });

  it('should get/set refresh token', async () => {
    const { getRefreshToken, setTokens, clearTokens } = await import('../../src/lib/auth');
    setTokens('access', 'refresh');
    expect(mockSessionStorage.getItem('chess_refresh_token')).toBe('refresh');
  });

  it('should clear all tokens', async () => {
    const { setTokens, clearTokens, getAccessToken, getRefreshToken, getUser } = await import('../../src/lib/auth');
    setTokens('access', 'refresh');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getUser()).toBeNull();
  });
});

describe('auth user management', () => {
  it('should get/set user', async () => {
    const { setUser, getUser } = await import('../../src/lib/auth');
    const user = {
      id: '1', username: 'test', display_name: 'Test',
      avatar: 'king.svg', elo_rating: 1200,
      elo_games: 0, elo_wins: 0, elo_losses: 0, elo_draws: 0,
      created_at: new Date().toISOString(),
    };
    setUser(user);
    const retrieved = getUser();
    expect(retrieved).toEqual(user);
  });

  it('should return null for non-existent user', async () => {
    const { getUser } = await import('../../src/lib/auth');
    expect(getUser()).toBeNull();
  });

  it('should check authentication status', async () => {
    const { setTokens, isAuthenticated, clearTokens } = await import('../../src/lib/auth');
    expect(isAuthenticated()).toBe(false);
    setTokens('token', 'refresh');
    expect(isAuthenticated()).toBe(true);
    clearTokens();
    expect(isAuthenticated()).toBe(false);
  });
});

describe('isNativeApp', () => {
  it('should detect native app protocols', async () => {
    const { isNativeApp } = await import('../../src/lib/auth');
    Object.defineProperty(window, 'location', {
      value: { ...mockLocation, protocol: 'capacitor:' },
      writable: true,
    });
    vi.resetModules();
    const { isNativeApp: isNativeApp2 } = await import('../../src/lib/auth');
    expect(isNativeApp2()).toBe(true);
  });

  it('should return false for http protocol', async () => {
    const { isNativeApp } = await import('../../src/lib/auth');
    expect(isNativeApp()).toBe(false);
  });
});

describe('getWsUrl', () => {
  it('should return correct WebSocket URL for localhost dev', async () => {
    // Set up location mock with host property before importing
    Object.defineProperty(window, 'location', {
      value: {
        protocol: 'http:',
        hostname: 'localhost',
        port: '5173',
        host: 'localhost:5173',
        pathname: '/',
        hash: '',
      },
      writable: true,
      configurable: true,
    });
    vi.resetModules();
    const { getWsUrl } = await import('../../src/lib/auth');
    const url = getWsUrl();
    expect(url).toBe('ws://localhost:5173/ws');
  });
});

describe('getApiUrl', () => {
  it('should return relative API URL for localhost dev', async () => {
    const { getApiUrl } = await import('../../src/lib/auth');
    const url = getApiUrl('/users/me');
    expect(url).toBe('/api/users/me');
  });
});
