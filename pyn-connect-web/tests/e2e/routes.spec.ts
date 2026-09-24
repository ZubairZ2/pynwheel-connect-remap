import { expect, test } from '@playwright/test';

/** Every URL the sidebar and the ported screens link to. */
const CONNECT_ROUTES = [
  '/dashboard',
  '/companies',
  '/companies/alliance',
  '/companies/alliance/regions',
  '/companies/alliance/groups',
  '/properties',
  '/properties/luxe',
  '/properties/luxe/pricing',
  '/properties/luxe/units',
  '/properties/luxe/units/u-1204',
  '/properties/luxe/map',
  '/properties/luxe/inventory',
  '/properties/luxe/tour-setup',
  '/properties/luxe/branding',
  '/properties/luxe/content',
  '/scheduling',
  '/integrations',
  '/svg-maps-optimizer',
  '/partner-configuration',
  '/white-label-builds',
  '/pricing-calculator',
  '/favorites',
  '/resident-access',
  '/live-chat',
  '/analytics',
  '/reports',
  '/users',
  '/ai-services',
  '/billing',
  '/audit-log',
  '/help'
];

test.describe('routing', () => {
  for (const route of CONNECT_ROUTES) {
    test(`${route} exists and is behind the session guard`, async ({ page }) => {
      const response = await page.goto(route);

      // No Rails session in the test browser, so the layout redirects to Sign In.
      // What matters is that the route resolved rather than 404ing.
      expect(response?.status()).toBeLessThan(400);
      await expect(page).toHaveURL(/\/sign-in$/);
    });
  }

  test('the root redirects to Sign In when signed out', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/sign-in$/);
  });

  test('Sign In still renders the existing Devise form', async ({ page }) => {
    await page.goto('/sign-in');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByLabel('Work email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('the health endpoint answers', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
  });
});
