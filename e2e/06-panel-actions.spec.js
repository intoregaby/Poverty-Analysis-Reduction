import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

async function expectNoPageErrors(page, action) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await action();
  const fatal = errors.filter((message) => !message.includes('ResizeObserver') && !message.includes('Non-passive event listener'));
  expect(fatal, `Unhandled page errors: ${fatal.join('; ')}`).toEqual([]);
}

test.describe('Panel user journeys', () => {
  test('admin can open every admin panel without a crash', async ({ page }) => {
    await loginAs(page, 'admin', '/');
    const routes = [
      ['/', /Poverty Analysis Dashboard/],
      ['/datasets', /Data & Methodology/],
      ['/programmes', /Programme Management/],
      ['/government', /Government/],
      ['/cooperative', /Cooperative/],
      ['/agent', /Agent Dashboard/],
      ['/jobs', /Find a Job/],
      ['/cooperatives', /Cooperatives/],
      ['/map', /District Map/],
      ['/evidence', /Programme Results/],
      ['/ussd-control', /USSD Control/],
      ['/settings', /Settings/],
    ];
    for (const [route, heading] of routes) {
      await expectNoPageErrors(page, async () => {
        await page.goto(route, { waitUntil: 'domcontentloaded' });
        await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 10_000 });
      });
    }
  });

  test('programme owner can open registration and programme operation tabs', async ({ page }) => {
    await loginAs(page, 'vup', '/programmes?tab=agents');
    await expect(page.getByTestId('agents-tab')).toBeVisible();
    await page.getByRole('button', { name: /add agent/i }).click();
    await expect(page.getByRole('heading', { name: 'Add new agent' })).toBeVisible();
    await page.getByPlaceholder('Full name').fill('Playwright Test Agent');
    await page.getByPlaceholder('Phone number').fill('0780000000');
    await page.locator('select').last().selectOption({ label: 'Nyaruguru' });
    await page.getByRole('button', { name: 'Create agent', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add new agent' })).toHaveCount(0);

    for (const tab of ['requests', 'cooperatives', 'beneficiaries', 'jobs', 'payments', 'skills']) {
      await page.goto(`/programmes?tab=${tab}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main, body').first()).toContainText(/Programme|Agents|Members|Jobs|Payments|Skills|request/i);
    }
  });

  test('demo mode clearly gates backend-only writes', async ({ page }) => {
    await loginAs(page, 'vup', '/programmes?tab=jobs');
    const postJob = page.getByRole('button', { name: /post a job/i });
    await expect(postJob).toBeDisabled();
    await expect(page.getByText(/Supabase is not configured/i)).toBeVisible();

    await page.goto('/programmes?tab=payments', { waitUntil: 'domcontentloaded' });
    const obligation = page.getByRole('button', { name: /record obligation/i });
    await expect(obligation).toBeDisabled();
    await expect(page.getByText(/Connect a Supabase programme account/i)).toBeVisible();
  });

  test('government and member panels expose their workflow tabs', async ({ page }) => {
    await loginAs(page, 'district', '/government');
    for (const tab of ['beneficiaries', 'problems', 'reports', 'requests', 'cooperatives']) {
      await page.goto(`/government?tab=${tab}`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('[data-tour="gov-content"]')).toBeVisible();
    }

    await loginAs(page, 'beneficiary', '/beneficiary');
    const memberTabTitles = {
      profile: 'Me and my family',
      cooperatives: 'My cooperatives',
      space: 'Cooperative Space',
      agent: 'My agent and visits',
      insurance: 'Health insurance',
    };
    for (const tab of Object.keys(memberTabTitles)) {
      await page.goto(`/beneficiary?tab=${tab}`, { waitUntil: 'domcontentloaded' });
      await expect(page.getByRole('heading', { name: memberTabTitles[tab], exact: true })).toBeVisible({ timeout: 10_000 });
    }
  });
});
