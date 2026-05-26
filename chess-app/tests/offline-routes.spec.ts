import { expect, test } from '@playwright/test';

function storedUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'online-user',
    username: 'online',
    display_name: 'Online Player',
    avatar: 'king.svg',
    elo_rating: 1200,
    elo_games: 0,
    elo_wins: 0,
    elo_losses: 0,
    elo_draws: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

async function seedAuthenticatedUser(page: import('@playwright/test').Page, accessToken = 'test-token') {
  if (process.env.PLAYWRIGHT_BASE_URL) {
    const randomSuffix = `${Date.now().toString(36)}_${Math.floor(Math.random() * 46656).toString(36)}`;
    const username = `rt_${randomSuffix}`.slice(0, 20);
    await page.goto('/register');
    await page.locator('#reg-username').fill(username);
    await page.locator('#reg-email').fill(`${username}@example.com`);
    await page.locator('#reg-password').fill('CodexTest123!');
    await page.getByRole('button', { name: /Create Account/i }).click();
    await expect(page).toHaveURL(/\/$/);
    return;
  }

  const user = storedUser();

  await page.route('**/api/users/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });

  await page.addInitScript(({ user, token }) => {
    localStorage.setItem('chess_access_token', token);
    sessionStorage.setItem('chess_refresh_token', 'test-refresh-token');
    localStorage.setItem('chess_user', JSON.stringify(user));
  }, { user, token: accessToken });
}

test('offline-capable routes render without login', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Continue offline' }).click();
  await expect(page.getByText('Choose how you want to play')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto('/');
  await expect(page.getByText('Choose how you want to play')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto('/local');
  await expect(page.locator('#boardContainer')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto('/pgn');
  await expect(page.getByText('Load PGN Game')).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);

  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Game History' })).toBeVisible();
  await expect(page).not.toHaveURL(/\/login$/);
});

test('online multiplayer requires a live token even with a cached offline user', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('chess_user', JSON.stringify({
      id: 'offline-user',
      username: 'offline',
      display_name: 'Offline Player',
      avatar: 'king.svg',
      elo_rating: 1200,
      elo_games: 0,
      elo_wins: 0,
      elo_losses: 0,
      elo_draws: 0,
      created_at: new Date().toISOString(),
    }));
    localStorage.removeItem('chess_access_token');
    sessionStorage.removeItem('chess_refresh_token');
  });

  await page.reload();
  await page.getByRole('link', { name: /Online Multiplayer/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.goto('/lobby');
  await expect(page).toHaveURL(/\/login$/);
});

test('authenticated lobby route renders lobby instead of home', async ({ page }) => {
  await seedAuthenticatedUser(page);

  await page.goto('/lobby');
  await expect(page.getByRole('heading', { name: /Lobby|Connecting|Disconnected/i })).toBeVisible();
  await expect(page.getByText('Choose how you want to play')).not.toBeVisible();
});

test('online multiplayer home link opens protected lobby for an authenticated user', async ({ page }) => {
  await seedAuthenticatedUser(page);
  await page.goto('/');

  const onlineLink = page.getByRole('link', { name: /Online Multiplayer/i });
  await expect(onlineLink).toHaveAttribute('href', '/lobby');
  await onlineLink.click();

  await expect(page).toHaveURL(/\/lobby$/);
  await expect(page.getByRole('heading', { name: /Lobby|Connecting|Disconnected/i })).toBeVisible();
  await expect(page.getByText('Choose how you want to play')).not.toBeVisible();
});

test('protected app routes remain protected when deep-linked or refreshed', async ({ page }) => {
  await page.goto('/online');
  await expect(page).toHaveURL(/\/login$/);

  await seedAuthenticatedUser(page);
  await page.goto('/lobby');
  await expect(page.getByRole('heading', { name: /Lobby|Connecting|Disconnected/i })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/lobby$/);
  await expect(page.getByRole('heading', { name: /Lobby|Connecting|Disconnected/i })).toBeVisible();
});

test('online game board uses the responsive game layout', async ({ page }) => {
  await seedAuthenticatedUser(page);
  const onlineGame = {
    gameId: 'layout-game',
    white: { id: 'online-user', username: 'online', displayName: 'Online Player' },
    black: { id: 'black-user', username: 'black', displayName: 'Black Player' },
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    whiteTime: 600,
    blackTime: 600,
    status: 'playing',
    playerColor: 'white',
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
  };
  await page.addInitScript((game) => {
    sessionStorage.setItem('chess_online_game', JSON.stringify(game));
  }, onlineGame);

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/online');
  await expect(page.locator('.online-game-layout #boardContainer')).toBeVisible();
  await expect(page.locator('#app #app')).toHaveCount(0);
  await expect(page.locator('#boardContainer img.piece')).toHaveCount(32);

  const desktop = await page.locator('.online-game-layout').evaluate((layout) => {
    const board = document.querySelector('#boardContainer') as HTMLElement;
    const evalPanel = document.querySelector('.online-game-layout .sidebar-left .panel') as HTMLElement;
    const topClock = document.querySelector('.online-game-layout .black-player') as HTMLElement;
    const rect = board.getBoundingClientRect();
    const evalRect = evalPanel.getBoundingClientRect();
    const clockRect = topClock.getBoundingClientRect();
    const pieceImages = Array.from(document.querySelectorAll<HTMLImageElement>('#boardContainer img.piece'));
    const evalBar = document.querySelector('.online-game-layout .eval-bar-container') as HTMLElement;
    const evalBarRect = evalBar.getBoundingClientRect();
    const styles = getComputedStyle(layout as HTMLElement);
    return {
      display: styles.display,
      boardWidth: rect.width,
      boardHeight: rect.height,
      evalGap: rect.left - evalRect.right,
      clockGap: rect.top - clockRect.bottom,
      clockWidth: clockRect.width,
      evalBarHeight: evalBarRect.height,
      loadedPieces: pieceImages.filter((img) => img.complete && img.naturalWidth > 0).length,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(desktop.display).toBe('flex');
  expect(Math.abs(desktop.boardWidth - desktop.boardHeight)).toBeLessThan(1);
  expect(desktop.evalGap).toBeLessThanOrEqual(28);
  expect(desktop.clockGap).toBeLessThanOrEqual(54);
  expect(Math.abs(desktop.clockWidth - desktop.boardWidth)).toBeLessThan(1);
  expect(desktop.evalBarHeight).toBeGreaterThan(400);
  expect(desktop.evalBarHeight).toBeLessThan(430);
  expect(desktop.loadedPieces).toBe(32);
  expect(desktop.overflowX).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 820, height: 1180 });

  const tablet = await page.locator('.online-game-layout').evaluate((layout) => {
    const board = document.querySelector('#boardContainer') as HTMLElement;
    const topClock = document.querySelector('.online-game-layout .black-player') as HTMLElement;
    const rect = board.getBoundingClientRect();
    const clockRect = topClock.getBoundingClientRect();
    const styles = getComputedStyle(layout as HTMLElement);
    return {
      display: styles.display,
      boardWidth: rect.width,
      boardHeight: rect.height,
      clockWidth: clockRect.width,
      viewportWidth: document.documentElement.clientWidth,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(tablet.display).toBe('grid');
  expect(Math.abs(tablet.boardWidth - tablet.boardHeight)).toBeLessThan(1);
  expect(Math.abs(tablet.clockWidth - tablet.boardWidth)).toBeLessThan(1);
  expect(tablet.boardWidth).toBeLessThanOrEqual(tablet.viewportWidth);
  expect(tablet.overflowX).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 390, height: 844 });

  const mobile = await page.locator('.online-game-layout').evaluate((layout) => {
    const board = document.querySelector('#boardContainer') as HTMLElement;
    const rect = board.getBoundingClientRect();
    const styles = getComputedStyle(layout as HTMLElement);
    return {
      display: styles.display,
      boardWidth: rect.width,
      boardHeight: rect.height,
      viewportWidth: document.documentElement.clientWidth,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });

  expect(mobile.display).toBe('grid');
  expect(Math.abs(mobile.boardWidth - mobile.boardHeight)).toBeLessThan(1);
  expect(mobile.boardWidth).toBeLessThanOrEqual(mobile.viewportWidth);
  expect(mobile.overflowX).toBeLessThanOrEqual(1);

  await page.getByRole('button', { name: 'Back to Lobby' }).click();
  await expect(page.getByRole('heading', { name: 'Leave active game?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/online$/);

  await page.getByRole('button', { name: 'Back to Lobby' }).click();
  await page.getByRole('button', { name: 'Resign' }).click();
  await expect(page).toHaveURL(/\/lobby$/);
  await page.waitForTimeout(100);
  await expect(page).toHaveURL(/\/lobby$/);
});
