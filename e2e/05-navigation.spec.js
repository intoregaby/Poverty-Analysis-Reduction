/**
 * e2e/05-navigation.spec.js
 *
 * Navigation and routing tests.
 * Verifies sidebar navigation works and routes load without errors.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test.describe('Analyst dashboard', () => {
  test('loads dashboard content for an analyst session', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await loginAs(page, 'admin', '/');
    await expect(page.getByRole('heading', { name: 'Poverty Analysis Dashboard' })).toBeVisible();
    await expect(page.getByText('Latest data: 2023/24')).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

test.describe('Navigation — Admin', () => {
  test.describe.configure({ timeout: 60_000 });
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin', '/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('sidebar renders for admin', async ({ page }) => {
    // Should see a nav sidebar with links
    const hasSidebar = await page.getByRole('navigation').count() > 0;
    const hasNavLinks = await page.getByRole('link').count() > 0;
    expect(hasSidebar || hasNavLinks).toBeTruthy();
  });

  test('poverty analysis page loads', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    // Main analysis page
    const hasContent = await page.getByText(/poverty|analysis|district|Rwanda/i).count() > 0;
    expect(hasContent).toBeTruthy();
  });

  test('programme management page loads', async ({ page }) => {
    await page.goto('/programmes');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Programme Management', exact: true })).toBeVisible({ timeout: 8_000 });
  });

  test('government panel page loads', async ({ page }) => {
    await page.goto('/government');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasGov = await page.getByText(/government|district|sector/i).count() > 0;
    expect(hasGov).toBeTruthy();
  });

  test('agent dashboard page loads', async ({ page }) => {
    await page.goto('/agent');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasAgent = await page.getByText(/field work|Agent Dashboard|visit/i).count() > 0;
    expect(hasAgent).toBeTruthy();
  });

  test('cooperatives page loads', async ({ page }) => {
    await page.goto('/cooperatives');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasCoop = await page.getByText(/cooperative|savings|members/i).count() > 0;
    expect(hasCoop).toBeTruthy();
  });

  test('job board page loads', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasJobs = await page.getByText(/job|position|applicant/i).count() > 0;
    expect(hasJobs).toBeTruthy();
  });

  test('district map page loads', async ({ page }) => {
    await page.goto('/map');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasMap = await page.getByText(/map|district|Rwanda/i).count() > 0;
    expect(hasMap).toBeTruthy();
  });

  test('programme evidence page loads', async ({ page }) => {
    await page.goto('/evidence');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasEv = await page.getByText(/programme|results|payment|evidence/i).count() > 0;
    expect(hasEv).toBeTruthy();
  });

  test('no page results in an unhandled crash', async ({ page }) => {
    const routes = ['/', '/programmes', '/government', '/agent', '/jobs', '/cooperatives', '/map', '/evidence'];
    for (const route of routes) {
      const errors = [];
      page.on('pageerror', (err) => errors.push(err.message));
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);
      // Filter out known non-critical warnings
      const fatalErrors = errors.filter(
        (msg) => !msg.includes('ResizeObserver') && !msg.includes('Non-passive event listener')
      );
      expect(fatalErrors, `Fatal errors on ${route}: ${fatalErrors.join(', ')}`).toHaveLength(0);
    }
  });
});

test.describe('Navigation — Role-based access', () => {
  test('programme owner only sees programme-related nav', async ({ page }) => {
    await loginAs(page, 'vup', '/programmes');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: 'Programme Management', exact: true })).toBeVisible({ timeout: 8_000 });
    // Programme owner should NOT see NISR analyst items
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('link', { name: 'District Investigation', exact: true })).toHaveCount(0);
  });

  test('government officer sees government panel', async ({ page }) => {
    await loginAs(page, 'district', '/government');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/login/);
    const hasGov = await page.getByText(/government|Nyaruguru|district/i).count() > 0;
    expect(hasGov).toBeTruthy();
  });
});
