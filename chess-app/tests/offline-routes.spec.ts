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
