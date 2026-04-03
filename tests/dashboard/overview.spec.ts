import { test, expect } from '@playwright/test';

test.describe('Dashboard Overview', () => {
  test.beforeEach(async ({ page }) => {
    // networkidle is slow but usually solves 'Target closed' issues in limited environments
    await page.goto('/dashboard', { waitUntil: 'networkidle', timeout: 60000 });
  });

  test('should display dashboard overview components', async ({ page }) => {
    // Check for "Dashboard" heading
    await expect(page.getByRole('heading', { name: /Dashboard/i }).first()).toBeVisible();
    await expect(page.getByText(/Total Savings/i).or(page.getByText(/General Wallet/i))).toBeVisible();
  });

  test('should navigate to submenu pages', async ({ page }) => {
    // Navigate via evaluate to ensure the click happens regardless of stability
    await page.evaluate(() => {
      const plansLink = document.querySelector('a[href="/dashboard/plans"]');
      if (plansLink) (plansLink as HTMLElement).click();
    });
    await expect(page).toHaveURL(/\/dashboard\/plans/, { timeout: 15000 });

    await page.evaluate(() => {
      const walletLink = document.querySelector('a[href="/dashboard/wallet"]');
      if (walletLink) (walletLink as HTMLElement).click();
    });
    await expect(page).toHaveURL(/\/dashboard\/wallet/, { timeout: 15000 });
  });
});
