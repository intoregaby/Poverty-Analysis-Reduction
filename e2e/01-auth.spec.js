/**
 * e2e/01-auth.spec.js
 *
 * Authentication flow tests.
 * Tests the login page, demo account login, and session state.
 */
import { test, expect } from '@playwright/test';
import { loginAs, logout, DEMO_PASSWORD } from './helpers/demo-auth.js';

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();
  });

  test('demo accounts list is shown on login page', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    // The login page shows demo account buttons
    await expect(page.getByText('Demo accounts')).toBeVisible();
    await expect(page.getByRole('button', { name: /Platform Admin/ })).toBeVisible();
  });

  test('registration asks for a name and does not show unconfigured OAuth providers', async ({ page }) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('button', { name: /continue with google|continue with github/i })).toHaveCount(0);
  });

  test('admin can log in via form credentials and reach dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('admin@platform.demo');
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /log in/i }).click();
    // Should redirect to the admin home (/)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 });
    // The page should show some dashboard content (not an error)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('wrong password shows error message', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('admin@platform.demo');
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.getByRole('button', { name: /log in/i }).click();
    // Should show an error
    await expect(page.getByRole('alert')).toContainText(/sign-in|password|invalid/i, { timeout: 8_000 });
  });

  test('injected demo session lands on correct dashboard', async ({ page }) => {
    await loginAs(page, 'admin', '/');
    // Should show the main dashboard, not the login page
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('programme owner session lands on programme management', async ({ page }) => {
    await loginAs(page, 'vup', '/programmes');
    await expect(page).not.toHaveURL(/\/login/);
    // Should see programme management content
    await expect(page.getByRole('heading', { name: 'Programme Management', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('field agent session lands on agent dashboard', async ({ page }) => {
    await loginAs(page, 'agent', '/agent');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Agent Dashboard', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('job applicant session lands on job board', async ({ page }) => {
    await loginAs(page, 'applicant', '/jobs');
    await expect(page).not.toHaveURL(/\/login/);
    // Should see some job-related content
    await expect(page.getByRole('heading', { name: 'Find a Job', exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('unauthenticated user is redirected away from protected routes', async ({ page }) => {
    // Clear any existing session first
    await page.addInitScript(() => {
      localStorage.removeItem('ireme_demo_user');
    });
    await page.goto('/programmes', { waitUntil: 'domcontentloaded' });
    await page.waitForURL(/\/login(?:\?|$)/, { timeout: 10_000 });
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
