import { test, expect } from '@playwright/test';

test.describe('Wallet Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/wallet', { waitUntil: 'domcontentloaded' });
    // Wait for key text instead of the flaky loading pulse
    await page.waitForSelector('text=General Wallet', { timeout: 20000 });
  });

  test('should display wallet balances and transaction history', async ({ page }) => {
    await expect(page.getByText(/General Wallet/i).first()).toBeVisible();
    await expect(page.locator('button:has-text("Top Up")').first()).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('should open top-up modal', async ({ page }) => {
    // Use evaluate for the click
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Top Up'));
      if (btn) btn.click();
    });
    
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Add Funds/i)).toBeVisible();
  });

  test('should open withdrawal modal', async ({ page }) => {
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Withdraw'));
      if (btn) btn.click();
    });
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
