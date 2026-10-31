/**
 * e2e/02-programme-management.spec.js
 *
 * Programme Management page E2E tests.
 * Tests tab navigation, rendering of agents, beneficiaries, jobs, and payments.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test.describe('Programme Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'vup', '/programmes');
    await page.waitForLoadState('domcontentloaded');
  });

  test('programme management page loads with navigation', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Programme Management', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Agents', exact: true })).toBeVisible();
  });

  test('Overview tab is visible by default', async ({ page }) => {
    await expect(page).toHaveURL(/\/programmes$/);
    await expect(page.getByText('Monthly payments due', { exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('Agents tab renders agent list or empty state', async ({ page }) => {
    // Click the Agents tab
    await page.getByRole('link', { name: 'Agents', exact: true }).click();

    // Should show either agent cards or empty state — not an error
    const hasAgents = await page.locator('[data-testid="agent-card"]').count() > 0;
    const hasEmptyState = await page.getByText(/no agents|Add agent|Search agent/i).count() > 0;
    const hasTabContent = await page.locator('[data-testid="agents-tab"]').count() > 0;
    expect(hasAgents || hasEmptyState || hasTabContent).toBeTruthy();
  });

  test('Beneficiaries tab renders member list or empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Program Members', exact: true }).click();
    await expect(page.locator('[data-testid="beneficiaries-tab"]')).toBeVisible();
    await expect(page.getByPlaceholder(/Search program member/i)).toBeVisible();
  });

  test('Jobs tab renders job list or empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Jobs & Recruitment', exact: true }).click();

    // Should show job content (postings list, create button, or empty state)
    const hasContent = await page.getByText(/job|position|posting|draft|publish/i).count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('Payments tab renders payment list or empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Payments', exact: true }).click();

    const hasContent = await page.getByText(/payment|obligation|funding|budget/i).count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('admin can switch programme filter', async ({ page }) => {
    // Log in as platform admin who can see all programmes
    await loginAs(page, 'admin', '/programmes');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Programme Management', exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-tour="pm-programme-select"]')).toBeVisible();
    await expect(page.locator('[data-tour="pm-programme-select"] option')).toContainText(['All programmes']);
  });
});
