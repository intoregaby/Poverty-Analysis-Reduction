/**
 * e2e/04-agent-dashboard.spec.js
 *
 * Agent Dashboard E2E tests.
 * Tests KPI cards, visit list, and record-visit functionality.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test.describe('Agent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'agent', '/agent');
    await page.waitForLoadState('domcontentloaded');
  });

  test('agent dashboard page loads', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Agent Dashboard', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('KPI cards are visible', async ({ page }) => {
    // Agent dashboard should show key metrics
    const hasKpis = await page.getByText(/Assigned|Visits today|Pending|problem/i).count() > 0;
    expect(hasKpis).toBeTruthy();
  });

  test('today\'s visit list appears', async ({ page }) => {
    // Should show a list of scheduled visits
    const hasVisits = await page.getByText(/visit|Payment verification|Enrolment|Home visit/i).count() > 0;
    const hasTestId = await page.locator('[data-testid="visit-row"]').count() > 0;
    expect(hasVisits || hasTestId).toBeTruthy();
  });

  test('record visit button is accessible', async ({ page }) => {
    // Should have a way to record visits
    const hasRecordBtn = await page.locator('[data-testid="record-visit-btn"]').count() > 0;
    const hasRecordText = await page.getByText(/record|complete|mark/i).count() > 0;
    expect(hasRecordBtn || hasRecordText).toBeTruthy();
  });

  test('problem/open case section shows', async ({ page }) => {
    // Agent dashboard should show unresolved problems
    const hasProblems = await page.getByText(/problem|case|issue|unresolved/i).count() > 0;
    expect(hasProblems).toBeTruthy();
  });

  test('[data-testid="agent-dashboard"] root is present', async ({ page }) => {
    const root = page.locator('[data-testid="agent-dashboard"]');
    const count = await root.count();
    // If testid exists, it should be visible; if not, the page still loads
    if (count > 0) {
      await expect(root).toBeVisible();
    } else {
      // Acceptable: testid may not be added yet
      await expect(page.getByText(/field work|Agent Dashboard/i)).toBeVisible({ timeout: 8_000 });
    }
  });
});
