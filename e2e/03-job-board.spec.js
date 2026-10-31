/**
 * e2e/03-job-board.spec.js
 *
 * Job Board (JobApplicant page) E2E tests.
 * Tests job listing, empty states, application section.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test.describe('Job Board', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'applicant', '/jobs');
    await page.waitForLoadState('domcontentloaded');
  });

  test('job board page loads', async ({ page }) => {
    await expect(page).not.toHaveURL(/\/login/);
    // Should show something job-related
    await expect(page.getByRole('heading', { name: 'Find a Job', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('available positions section is present', async ({ page }) => {
    // Look for a section about available positions or open jobs
    const hasPositions = await page.getByText(/available position|open position|find.*job|job board/i).count() > 0;
    const hasJobList = await page.getByText(/position|job posting|deadline/i).count() > 0;
    expect(hasPositions || hasJobList).toBeTruthy();
  });

  test('my applications section is present', async ({ page }) => {
    // There should be a section showing the applicant's own applications
    const hasApps = await page.getByText(/my application|your application|applied/i).count() > 0;
    expect(hasApps).toBeTruthy();
  });

  test('job list shows entries or a meaningful empty state', async ({ page }) => {
    await page.waitForTimeout(1500); // Allow React Query to settle

    const hasJobCards = await page.getByText(/Employment type|full.?time|part.?time|deadline/i).count() > 0;
    const hasEmptyState = await page.getByText(/no.*job|no.*position|no.*opening|no.*vacancy/i).count() > 0;
    const hasLoading = await page.getByText(/loading/i).count() > 0;
    // At least one of these must be true — not a blank screen
    expect(hasJobCards || hasEmptyState || hasLoading).toBeTruthy();
  });

  test('admin can also access job board', async ({ page }) => {
    await loginAs(page, 'admin', '/jobs');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Find a Job', exact: true })).toBeVisible({ timeout: 10_000 });
  });
});
