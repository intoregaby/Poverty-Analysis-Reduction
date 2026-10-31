import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test('the shared shell switches between English and Kinyarwanda', async ({ page }) => {
  // This test checks the language control, not the first-visit guided tour.
  // Persist its dismissed state before the app mounts so its delayed modal
  // cannot cover the control halfway through the test.
  await page.addInitScript(() => localStorage.setItem('ireme-tour-v4:demo:platform_admin:platform_admin:/', '1'));
  await loginAs(page, 'admin', '/');
  const language = () => page.getByRole('combobox', { name: 'Language' });
  await expect(language()).toHaveValue('en');
  await language().selectOption('rw');
  await expect(page.getByText('Isesengura', { exact: true })).toBeVisible();
  await expect(page.getByText('Igenamiterere', { exact: true })).toBeVisible();
  await language().selectOption('en');
  await expect(page.getByText('Analysis', { exact: true })).toBeVisible();

  await page.goto('/programmes', { waitUntil: 'domcontentloaded' });
  await language().selectOption('rw');
  await expect(page.getByText('Abakozi', { exact: true })).toBeVisible();
  await expect(page.getByText("Akazi no gushaka abakozi", { exact: true })).toBeVisible();

  await page.goto('/government', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText("Ibibazo by'ishyirwa mu bikorwa", { exact: true })).toBeVisible();
});

test('benefits and cooperative content switches language with the shell', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ireme-tour-v4:demo:beneficiary:beneficiary:/', '1'));
  await loginAs(page, 'beneficiary', '/beneficiary');
  const language = () => page.getByRole('combobox', { name: 'Language' });
  await language().selectOption('rw');
  await expect(page.getByText('Inyungu zawe', { exact: true })).toBeVisible();
  await expect(page.getByText('Ubwishyu butaha', { exact: true })).toBeVisible();
  await expect(page.getByText('Your Benefits', { exact: true })).toHaveCount(0);

  await page.goto('/cooperatives', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Amakoperative yose', { exact: true })).toBeVisible();
  await expect(page.getByText('Biragenda neza', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('All cooperatives', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Urimo kureba amakoperative yose nka/)).toBeVisible();
});
