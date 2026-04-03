import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Fill in credentials
  await page.fill('#email-address', 'maryufot1@gmail.com');
  await page.fill('#password', 'Maryufot1@gmail.com');

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard');

  // Verify successful login by checking for a dashboard element
  await expect(page.getByText(/Welcome/i)).toBeVisible();

  // Save storage state for all tests
  await page.context().storageState({ path: authFile });
});
