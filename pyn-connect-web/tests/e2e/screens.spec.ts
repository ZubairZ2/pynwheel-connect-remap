import { expect, test, type Page } from '@playwright/test';

/**
 * Every screen ported from `pyn-connect-new.html`, with the marker text that
 * proves it rendered its own content rather than a neighbour's.
 */
const SCREENS: Array<[string, string]> = [
  ['dashboard', 'Sessions Right Now'],
  ['companyDetail', 'Portfolio Groups'],
  ['companyRegions', 'Add Region'],
  ['companyGroups', 'Portfolio Groups'],
  ['propertyDetail', 'Deployment'],
  ['propertyPricing', 'fees in 3 categories'],
  ['propertyUnits', 'Units & Floor Plans'],
  ['unitDetail', 'Lease-Term Pricing'],
  ['mapEditor', 'Place Pin'],
  ['propertyInventory', 'Floorplates'],
  ['tourSetup', 'Elevators & Locks'],
  ['branding', 'Starter Theme'],
  ['propertyContent', 'Neighborhood Guide'],
  ['scheduling', 'Booking Calendar'],
  ['integrations', 'Access Log'],
  ['svgOptimizer', 'SVG Maps Optimizer'],
  ['partnerConfig', 'Apartments.com'],
  ['builds', 'Trigger New Build'],
  ['pricingCalculator', 'Application Fee'],
  ['favorites', 'open rate'],
  ['residentAccess', 'Fitness Center'],
  ['liveChat', 'Active conversations'],
  ['analytics', 'Completion rate'],
  ['reports', 'Exportable Reports'],
  ['users', 'Platform Admin'],
  ['aiServices', 'Fair-Housing'],
  ['billing', 'Combined'],
  ['audit', 'Willow Bridge'],
  ['help', 'Plotting Units & Amenities on the Map']
];

/** Fails the test on any console error or page exception. */
const guardConsole = (page: Page) => {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  page.on('requestfailed', (request) => problems.push(`request failed: ${request.url()}`));
  page.on('pageerror', (error) => problems.push(String(error)));
  return problems;
};

const openScreen = async (page: Page, screen: string) => {
  const problems = guardConsole(page);
  await page.goto(`/screen-harness/${screen}`);
  await page.waitForLoadState('networkidle');
  return problems;
};

test.describe('every ported screen renders', () => {
  for (const [screen, marker] of SCREENS) {
    test(`${screen} renders its own content with no console errors`, async ({ page }) => {
      const problems = await openScreen(page, screen);

      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
      expect(problems, `console errors on ${screen}`).toEqual([]);
    });
  }
});

test.describe('no dialog opens on its own', () => {
  test('dialogs stay closed until something opens them', async ({ page }) => {
    await openScreen(page, 'dashboard');

    for (const title of ['Flagged Transcript', 'Design Direction', 'Add Fee', 'Crop Logo']) {
      await expect(page.getByText(title, { exact: false })).toHaveCount(0);
    }
  });
});
