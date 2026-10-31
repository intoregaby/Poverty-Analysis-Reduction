import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/demo-auth.js';

test('the shared shell switches between English and Kinyarwanda', async ({ page }) => {
  await loginAs(page, 'admin', '/');
  const language = page.getByRole('combobox', { name: 'Language' });
  await expect(language).toHaveValue('en');
  await language.selectOption('rw');
  await expect(page.getByText('Isesengura', { exact: true })).toBeVisible();
  await expect(page.getByText('Igenamiterere', { exact: true })).toBeVisible();
  await language.selectOption('en');
  await expect(page.getByText('Analysis', { exact: true })).toBeVisible();

  await page.goto('/programmes', { waitUntil: 'domcontentloaded' });
  await language.selectOption('rw');
  await expect(page.getByText('Abakozi', { exact: true })).toBeVisible();
  await expect(page.getByText("Akazi no gushaka abakozi", { exact: true })).toBeVisible();

  await page.goto('/government', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText("Ibibazo by'ishyirwa mu bikorwa", { exact: true })).toBeVisible();
});
