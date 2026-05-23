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
  await page.goto('/');
  await page.evaluate(({ user, token }) => {
    localStorage.setItem('chess_access_token', token);
    localStorage.setItem('chess_user', JSON.stringify(user));
  }, { user: storedUser(), token: accessToken });
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
