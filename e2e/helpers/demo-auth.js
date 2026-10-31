/**
 * e2e/helpers/demo-auth.js
 *
 * Playwright helpers for setting up demo sessions.
 *
 * The Ireme Insight app uses localStorage (key: "ireme_demo_user") for demo auth.
 * We inject the session before navigating so tests don't depend on the login UI.
 *
 * Demo credentials (from src/lib/roles.js):
 *   DEMO_PASSWORD = "Demo@2026"
 *   admin@platform.demo    → platform_admin
 *   vup@programmes.demo    → programme_owner (VUP Direct Support)
 *   agent@field.demo       → field_agent
 *   applicant@people.demo  → job_applicant
 *   district@gov.demo      → gov_district
 */

export const DEMO_PASSWORD = 'Demo@2026';

export const DEMO_ACCOUNTS = {
  admin: {
    email: 'admin@platform.demo',
    role: 'platform_admin',
    name: 'Aline Keza',
    title: 'Platform Administrator',
    scope: 'All Rwanda, all programmes',
  },
  vup: {
    email: 'vup@programmes.demo',
    role: 'programme_owner',
    programme: 'VUP Direct Support',
    name: 'VUP Secretariat',
    title: 'VUP Direct Support, MINALOC',
    scope: 'VUP Direct Support only',
  },
  agent: {
    email: 'agent@field.demo',
    role: 'field_agent',
    name: 'Nshuti Patrick',
    title: 'Field Agent',
    scope: 'VUP · Nyaruguru',
  },
  applicant: {
    email: 'applicant@people.demo',
    role: 'job_applicant',
    name: 'Iradukunda Alex',
    title: 'Job Applicant',
    scope: 'Open positions',
  },
  district: {
    email: 'district@gov.demo',
    role: 'gov_district',
    name: 'Mukamana Claire',
    title: 'District Officer',
    scope: 'Nyaruguru District',
  },
};

/**
 * Inject a demo session directly into localStorage and navigate.
 * This is faster and more reliable than automating the login form.
 */
export async function loginAs(page, accountKey, destination = null) {
  const account = DEMO_ACCOUNTS[accountKey];
  if (!account) throw new Error(`Unknown demo account: ${accountKey}`);

  // Inject auth state before any navigation
  await page.addInitScript((acct) => {
    localStorage.setItem('ireme_demo_user', JSON.stringify(acct));
  }, account);

  const dest = destination ?? roleHome(account.role);
  await page.goto(dest, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('domcontentloaded');
}

function roleHome(role) {
  const homes = {
    platform_admin: '/',
    nisr_analyst: '/',
    programme_owner: '/programmes',
    cooperative: '/cooperative',
    gov_district: '/government',
    gov_sector: '/government',
    gov_cell: '/government',
    field_agent: '/agent',
    beneficiary: '/beneficiary',
    job_applicant: '/jobs',
  };
  return homes[role] ?? '/';
}

/** Clear the demo session */
export async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('ireme_demo_user');
  });
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
}
