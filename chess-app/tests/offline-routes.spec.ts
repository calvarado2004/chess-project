import { expect, test } from '@playwright/test';

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
  await page.getByRole('button', { name: /Online Multiplayer/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

  await page.goto('/lobby');
  await expect(page).toHaveURL(/\/login$/);
});
