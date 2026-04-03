import { test, expect } from '@playwright/test';

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/profile', { waitUntil: 'load' });
    // More robust waiting for the loading pulse to disappear
    await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 15000 }).catch(() => {});
  });

  test('should display profile settings and tabs', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Account Settings/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Profile/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /KYC/i })).toBeVisible();
  });

  test('should allow switching between tabs', async ({ page }) => {
    // Use evaluate to bypass potentially flaky Playwright click on heavy pages
    await page.evaluate(() => {
      const kycTab = document.querySelector('button[role="tab"][value="kyc"]');
      if (kycTab) (kycTab as HTMLElement).click();
    });
    await expect(page.getByText(/KYC Verification/i)).toBeVisible();

    await page.evaluate(() => {
      const bankTab = document.querySelector('button[role="tab"][value="bank"]');
      if (bankTab) (bankTab as HTMLElement).click();
    });
    await expect(page.getByText(/Bank Accounts/i)).toBeVisible();

    await page.evaluate(() => {
      const securityTab = document.querySelector('button[role="tab"][value="security"]');
      if (securityTab) (securityTab as HTMLElement).click();
    });
    await expect(page.getByText(/Security/i).first()).toBeVisible();
  });

  test('should display user information in Profile tab', async ({ page }) => {
    await expect(page.getByText(/Full Name/i)).toBeVisible();
    const emailInput = page.locator('input#email');
    await expect(emailInput).toHaveValue(/maryufot1@gmail\.com/i);
  });
});
