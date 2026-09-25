import { expect, test, type Page } from '@playwright/test';

const open = async (page: Page, screen: string) => {
  await page.goto(`/screen-harness/${screen}`);
  await page.waitForLoadState('networkidle');
};

test.describe('tabs', () => {
  test('Tour Scheduling switches between its four tabs', async ({ page }) => {
    await open(page, 'scheduling');
    await expect(page.getByText('Week of Mar 2, 2026', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Tour Types & Capacity' }).click();
    await expect(page.getByText('Self-Guided', { exact: false }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Visitor Directory' }).click();
    await expect(page.getByPlaceholder('Search visitors', { exact: false })).toBeVisible();

    await page.getByRole('button', { name: 'Scheduler Widget' }).click();
    await expect(page.getByText('book.pynwheel.com', { exact: false }).first()).toBeVisible();
  });

  test('Property Inventory switches between its five tabs', async ({ page }) => {
    await open(page, 'propertyInventory');

    for (const [tab, marker] of [
      ['Floorplans', 'The Aspen'],
      ['Units', 'Unit 1204'],
      ['Amenities', 'Rooftop Pool'],
      ['Unplotted', 'not yet on the map']
    ] as const) {
      await page.getByRole('button', { name: new RegExp(`^${tab}`) }).first().click();
      await expect(page.getByText(marker, { exact: false }).first()).toBeVisible();
    }
  });
});

test.describe('search and filters', () => {
  test('the unit search filters the Units table', async ({ page }) => {
    await open(page, 'propertyUnits');
    await expect(page.getByText('Unit 1204')).toBeVisible();
    await expect(page.getByText('Unit 0810')).toBeVisible();

    await page.getByPlaceholder('Search units', { exact: false }).fill('1204');
    await expect(page.getByText('Unit 1204')).toBeVisible();
    await expect(page.getByText('Unit 0810')).toHaveCount(0);

    await page.getByPlaceholder('Search units', { exact: false }).fill('zzz');
    await expect(page.getByText('No units match your search')).toBeVisible();
  });

  test('the Help search filters guides and shows an empty state', async ({ page }) => {
    await open(page, 'help');
    await page.getByPlaceholder('Search', { exact: false }).first().fill('GDPR');
    await expect(page.getByText('Handling GDPR Data-Removal Requests')).toBeVisible();
    await expect(page.getByText('Setting Up a New Property')).toHaveCount(0);

    await page.getByPlaceholder('Search', { exact: false }).first().fill('nothing matches this');
    await expect(page.getByText('No articles match your search.')).toBeVisible();
  });

  test('the Access Log filters by property', async ({ page }) => {
    await open(page, 'integrations');
    await page.getByRole('button', { name: 'Access Log' }).click();
    await expect(page.getByText('10 events')).toBeVisible();

    await page.getByLabel('All properties').or(page.locator('select').last()).selectOption('Cortland Sky');
    await expect(page.getByText('3 events')).toBeVisible();
  });
});

test.describe('dialogs', () => {
  test('Invite User opens, validates and creates a user', async ({ page }) => {
    await open(page, 'users');
    await expect(page.getByText('Ana Ortiz')).toBeVisible();

    await page.getByRole('button', { name: 'Invite User' }).click();
    await expect(page.getByText('Invite User', { exact: true }).last()).toBeVisible();

    // Empty name is rejected with a toast, and the dialog stays open.
    await page.getByRole('button', { name: 'Send Invite' }).click();
    await expect(page.getByRole('status')).toContainText('Enter a name.');

    await page.getByPlaceholder('Full name').fill('Robin Vega');
    await page.getByPlaceholder('name@company.com').fill('robin@pynwheel.com');
    await page.getByRole('button', { name: 'Send Invite' }).click();

    await expect(page.getByRole('status')).toContainText('Invite sent to robin@pynwheel.com');
    await expect(page.getByText('Robin Vega')).toBeVisible();
  });

  test('a dialog closes without saving', async ({ page }) => {
    await open(page, 'users');
    await page.getByRole('button', { name: 'Invite User' }).click();
    await page.getByPlaceholder('Full name').fill('Discarded Person');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByPlaceholder('Full name')).toHaveCount(0);
    await expect(page.getByText('Discarded Person')).toHaveCount(0);
  });

  test('the flagged-transcript dialog opens from the AI review queue', async ({ page }) => {
    await open(page, 'aiServices');
    const transcriptLine = page.getByText('Is this a good neighborhood for families with kids?');
    await expect(transcriptLine).toHaveCount(1); // the queue excerpt only

    await page.getByRole('button', { name: 'Review' }).first().click();
    await expect(page.getByText(/^Flagged Transcript\*?$/)).toBeVisible();
    await expect(transcriptLine).toHaveCount(2); // excerpt + the open dialog

    await page.getByRole('button', { name: 'Mark Reviewed' }).click();
    await expect(page.getByText(/^Flagged Transcript\*?$/)).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Transcript marked reviewed');
  });
});

test.describe('destructive actions are confirmed', () => {
  test('removing a user asks first, and Cancel keeps the row', async ({ page }) => {
    await open(page, 'users');
    await expect(page.getByText('Ana Ortiz')).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).last().click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Remove Ana Ortiz?');

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Ana Ortiz')).toBeVisible();

    await page.getByRole('button', { name: 'Remove' }).last().click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Remove User' }).click();
    await expect(page.getByText('Ana Ortiz')).toHaveCount(0);
  });

  test('deleting a company needs its name typed in', async ({ page }) => {
    await open(page, 'companyDetail');
    await page.getByRole('button', { name: 'Delete Company' }).click();

    const dialog = page.getByRole('alertdialog');
    const confirm = dialog.getByRole('button', { name: 'Delete Company' });
    await expect(confirm).toBeDisabled();

    await dialog.getByRole('textbox').fill('Alliance Residential');
    await expect(confirm).toBeEnabled();
  });
});

test.describe('toggles write through to the store', () => {
  test('granting and revoking resident access updates the log', async ({ page }) => {
    await open(page, 'residentAccess');
    await expect(page.getByText('Elena Vasquez').first()).toBeVisible();

    // The design's switches are styled divs, so they are located by structure:
    // the pill sits beside the grant's label inside the same row.
    const toggle = page
      .getByText('Shared amenity door')
      .filter({ has: page.locator('xpath=preceding-sibling::div[text()="Dog Park"]') })
      .locator('xpath=../../div[last()]');

    await toggle.click();
    await expect(page.getByRole('status')).toContainText('Dog Park access granted');

    // Revoking is destructive, so it asks first.
    await toggle.click();
    await expect(page.getByRole('alertdialog')).toContainText('Revoke Dog Park access?');
  });

  test('a lock vendor can be connected and tested', async ({ page }) => {
    await open(page, 'integrations');
    await page.getByRole('button', { name: 'Connect' }).first().click();

    // Latch is already the live provider here, so this is a switch.
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Switch Provider');
    await dialog.getByRole('button', { name: 'Switch Provider' }).click();
    await expect(page.getByRole('status')).toContainText('is now the lock provider');
  });
});

test.describe('the map editor', () => {
  test('plots an unplotted unit onto the site plan', async ({ page }) => {
    await open(page, 'mapEditor');

    await page.getByRole('button', { name: 'Place Pin' }).click();
    await page.getByText('Unit 0810').first().click();
    await expect(page.getByText('click the plan to drop its pin', { exact: false })).toBeVisible();

    await page.getByTestId('plan-surface').click({ position: { x: 200, y: 150 } });
    await expect(page.getByRole('status')).toContainText('placed at');
  });

  test('switches floors', async ({ page }) => {
    await open(page, 'mapEditor');
    await expect(page.getByText(/^Tower A · Lobby\*?$/).first()).toBeVisible();

    await page.getByRole('button', { name: /Floor 12/ }).first().click();
    await expect(page.getByText(/^Tower A · Floor 12\*?$/).first()).toBeVisible();
  });
});

test.describe('the pricing calculator', () => {
  test('hiding a fee changes the estimate and marks the draft dirty', async ({ page }) => {
    await open(page, 'pricingCalculator');
    const estimate = page.getByTestId('pc-estimate');
    const before = await estimate.textContent();

    await page
      .getByText('On', { exact: true })
      .first()
      .locator('xpath=following-sibling::div[1]')
      .click();
    await expect(estimate).not.toHaveText(before ?? '');
    await expect(page.getByText('Unpublished Edits')).toBeVisible();
  });
});

test.describe('layout', () => {
  test('the dashboard has no horizontal overflow at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page, 'dashboard');

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
