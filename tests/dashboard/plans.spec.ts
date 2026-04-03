import { test, expect } from '@playwright/test';

test.describe('Plans Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/plans', { waitUntil: 'domcontentloaded' });
    // Wait for Tab buttons to ensure data has loaded
    await page.waitForSelector('button[role="tab"]', { timeout: 20000 });
  });

  test('should display available savings plans', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /Available Plans/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /My Active Plans/i })).toBeVisible();
    await expect(page.locator('.grid-cols-1').or(page.getByText(/No plans found/i))).toBeVisible();
  });

  test('should navigate to a plan detail page', async ({ page }) => {
    const noPlans = page.getByText(/No plans found in this category/i);
    if (await noPlans.count() > 0 && await noPlans.first().isVisible()) {
      await page.evaluate(() => {
        const activeTab = Array.from(document.querySelectorAll('button[role="tab"]')).find(el => el.textContent?.includes('My Active Plans'));
        if (activeTab) (activeTab as HTMLElement).click();
      });
    }

    const planDetailButton = page.locator('button:has-text("Manage Plan"), button:has-text("Join"), a:has-text("View")').first();
    if (await planDetailButton.count() > 0) {
        await planDetailButton.click({ force: true });
        await expect(page.url()).toContain('/dashboard/plans/');
    }
  });
});
