import { describe, expect, it } from 'vitest';

import type { LockInventory, LockProvider } from '~/core/models/data/tourModules.data';
import { accessLabel, accountDraftOf, accountPayload, accountProblems, generateAccountForm, healthLabel, importSummary, instructionText, stripHtml } from './lockAccounts.generator';
import { failedRecently, filterIssuedRows, generateConnectCards, generateIssuedFilters, generateIssuedRows, generateProviderCards, purgeTargets } from './tourLocks.generator';

/** A provider as the CMS answers it (Locks::Inventory#providers), with overrides. */
const provider = (vendor: string, over: Partial<LockProvider> = {}): LockProvider => ({
  vendor,
  label: vendor,
  enabled: true,
  configured: false,
  status: 'not_configured',
  mode: null,
  account: null,
  details: null,
  options: vendor === 'Zerv' ? { cardFormats: ['HID Prox 26-bit H10301', 'HID Prox 48-bit'], facilityRange: [0, 255], badgeRange: [0, 65535] } : vendor === 'Igloohome' ? { versions: ['v1', 'igloohome', 'iglooworks'] } : {},
  access: null,
  lockCount: 0,
  mappedCount: 0,
  lastChangedAt: null,
  supports: { sync: false, test: false, purge: true, autoMatch: true, csv: false, asyncSync: false, account: true, instructions: true, addDevice: false, removeAuthorization: false },
  healthSource: null,
  instructions: null,
  ...over
});

const details = (over: Record<string, unknown>) => ({ id: 1, instructions: { unit: null, amenity: null }, images: { unit: null, amenity: null }, ...over });

const fieldKeys = (vendor: string, draft: Record<string, string> = {}, over: Partial<LockProvider> = {}) =>
  generateAccountForm(provider(vendor, over), { ...accountDraftOf(provider(vendor, over)), ...draft }).sections.flatMap((s) => s.fields.map((f) => f.key));

describe('the provider account forms carry the legacy fields', () => {
  it('Zerv: username, password, facility, badge and the card formats the CMS lists', () => {
    const zerv = provider('Zerv');
    const form = generateAccountForm(zerv, accountDraftOf(zerv));
    expect(fieldKeys('Zerv')).toEqual(['username', 'password', 'facility_id', 'badge_id', 'card_format']);
    const card = form.sections[1].fields.find((f) => f.key === 'card_format')!;
    expect(card.options?.map((o) => o.value)).toEqual(['', 'HID Prox 26-bit H10301', 'HID Prox 48-bit']);
    expect(form.sections[1].fields.find((f) => f.key === 'facility_id')).toMatchObject({ kind: 'number', min: 0, max: 255 });
    expect(form.sections[1].fields.find((f) => f.key === 'badge_id')).toMatchObject({ kind: 'number', min: 0, max: 65535 });
  });

  it('Dwelo: api url, Dwelo community id, client id and secret', () => {
    expect(fieldKeys('Dwelo')).toEqual(['api_url', 'default_community_id', 'client_id', 'client_secret']);
  });

  it('EdgeState: client credentials, and the code-grant status when a token is attached', () => {
    expect(fieldKeys('EdgeState')).toEqual(['client_id', 'client_secret']);
    const authorized = provider('EdgeState', { configured: true, status: 'connected', details: details({ authorized: true, authorizedWithPynwheel: false, clientId: null, clientSecretPresent: false }) });
    const form = generateAccountForm(authorized, accountDraftOf(authorized));
    expect(form.authorization).toMatchObject({ authorized: true, removable: true });
    expect(form.sections[0].note).toBeTruthy();
  });

  it('Latch: the building name only; the API credentials are not the property\'s', () => {
    expect(fieldKeys('Latch')).toEqual(['latch_property_name']);
  });

  it('Igloohome: the version decides the sections', () => {
    expect(fieldKeys('Igloohome')).toEqual(['version']);
    expect(fieldKeys('Igloohome', { version: 'igloohome', auth_mode: 'client_credentials' })).toEqual(['version', 'home_name', 'auth_mode', 'client_id', 'client_secret']);
    expect(fieldKeys('Igloohome', { version: 'igloohome', auth_mode: 'code_grant' })).toEqual(['version', 'home_name', 'auth_mode']);
    expect(fieldKeys('Igloohome', { version: 'iglooworks' })).toEqual(['version', 'iglooworks_api_key', 'iglooworks_department_id']);
    const igloo = provider('Igloohome', { details: details({ version: 'igloohome', authMode: 'code_grant', homeName: 'home', authorized: false, refreshTokenPresent: false, authorizeUrl: 'https://auth.igloohome.co/login?x' }) });
    const form = generateAccountForm(igloo, accountDraftOf(igloo));
    expect(form.authorization).toMatchObject({ authorized: false, removable: false, authorizeUrl: 'https://auth.igloohome.co/login?x' });
  });
});

describe('the draft starts from what the CMS stores, secrets blank', () => {
  it('reads the stored values and marks stored secrets', () => {
    const zerv = provider('Zerv', { details: details({ username: 'ops', passwordPresent: true, facilityId: '12', badgeId: '4321', cardFormat: 'HID Prox 48-bit' }) });
    expect(accountDraftOf(zerv)).toEqual({ username: 'ops', password: '', facility_id: '12', badge_id: '4321', card_format: 'HID Prox 48-bit' });
    const form = generateAccountForm(zerv, accountDraftOf(zerv));
    const password = form.sections[0].fields.find((f) => f.key === 'password')!;
    expect(password).toMatchObject({ stored: true, required: false });
    expect(accountProblems(form, accountDraftOf(zerv))).toEqual({});
    expect(accountPayload(form, accountDraftOf(zerv))).toEqual({ username: 'ops', facility_id: '12', badge_id: '4321', card_format: 'HID Prox 48-bit' });
  });

  it('a new account needs its secrets', () => {
    const zerv = provider('Zerv');
    const form = generateAccountForm(zerv, accountDraftOf(zerv));
    expect(Object.keys(accountProblems(form, { username: '', password: '' }))).toEqual(['username', 'password']);
  });
});

describe('field validation follows Locks::Accounts', () => {
  it('refuses a facility or badge out of range, a card format off the list, a bad api url', () => {
    const zerv = provider('Zerv');
    const form = generateAccountForm(zerv, accountDraftOf(zerv));
    expect(Object.keys(accountProblems(form, { username: 'u', password: 'p', facility_id: '256', badge_id: '70000', card_format: 'Nope' }))).toEqual(['facility_id', 'badge_id', 'card_format']);
    expect(accountProblems(form, { username: 'u', password: 'p', facility_id: '0', badge_id: '65535', card_format: '' })).toEqual({});
    expect(accountProblems(form, { username: 'u', password: 'p', facility_id: '1.5' })).toHaveProperty('facility_id');
    const dwelo = provider('Dwelo');
    const dweloForm = generateAccountForm(dwelo, accountDraftOf(dwelo));
    expect(accountProblems(dweloForm, { api_url: 'ftp://x', default_community_id: '7', client_id: 'c', client_secret: 's' })).toHaveProperty('api_url');
    expect(accountProblems(dweloForm, { api_url: '', default_community_id: '7', client_id: 'c', client_secret: 's' })).toEqual({});
  });

  it('igloohome client credentials are required only in that mode', () => {
    const igloo = provider('Igloohome');
    const creds = { ...accountDraftOf(igloo), version: 'igloohome', auth_mode: 'client_credentials', home_name: 'home' };
    expect(Object.keys(accountProblems(generateAccountForm(igloo, creds), creds))).toEqual(['client_id', 'client_secret']);
    const grant = { ...creds, auth_mode: 'code_grant' };
    expect(accountProblems(generateAccountForm(igloo, grant), grant)).toEqual({});
    expect(accountPayload(generateAccountForm(igloo, grant), grant)).toEqual({ version: 'igloohome', home_name: 'home', auth_mode: 'code_grant' });
  });
});

describe('the provider card reads the CMS facts, not fixed text', () => {
  const inventory = (providers: LockProvider[]): LockInventory => ({
    enabled: true,
    activeProviders: providers.map((p) => p.vendor),
    providers,
    locks: [],
    manualCodes: [],
    lockedWithoutLock: [],
    targets: [],
    counts: { all: 0, unmapped: 0, mapped: 0, manual: 0, health: 0, withoutLock: 0 },
    issued: []
  });

  it('shows the access method and which app opens the lock, and the health source', () => {
    const igloo = provider('Igloohome', { configured: true, status: 'connected', mode: 'v1', access: { method: 'bluetooth_key', tourApp: true, legacyApp: true }, details: details({ version: 'v1' }) });
    const zerv = provider('Zerv', { configured: true, status: 'connected', access: { method: 'mobile_key', tourApp: false, legacyApp: true }, healthSource: 'device_active', details: details({ username: 'ops', facilityId: '255', badgeId: '1', cardFormat: 'HID Prox 26-bit H10301' }) });
    const latch = provider('Latch', { enabled: false });
    const cards = generateProviderCards(inventory([igloo, zerv, latch]), 'America/Los_Angeles');
    expect(cards.connected.map((c) => c.vendor)).toEqual(['Igloohome', 'Zerv']);
    expect(cards.available.map((c) => c.vendor)).toEqual(['Latch']);
    expect(accessLabel(igloo)).toBe('Bluetooth guest key · Tour App');
    expect(accessLabel(zerv)).toBe('Mobile key · legacy app only');
    expect(healthLabel(zerv)).toBe('Device active flag from the import');
    expect(healthLabel(igloo)).toBe('Not reported by the vendor');
    expect(cards.connected[1].account.map((r) => `${r.label}: ${r.value}`)).toEqual(['Username: ops', 'Facility ID: 255', 'Badge ID: 1', 'Card format: HID Prox 26-bit H10301']);
    expect(JSON.stringify(cards)).not.toContain('password');
  });
});

describe('text helpers', () => {
  it('turns the legacy rich text into editable plain text and back-strips for the card', () => {
    expect(instructionText('<p>Press <b>unlock</b>.&nbsp;</p><p>Then push.</p>')).toBe('Press unlock.\nThen push.');
    expect(stripHtml('<p>A&nbsp;&amp;&nbsp;B</p>')).toBe('A & B');
    expect(importSummary({ created: 2, skippedExisting: 1, skippedBlank: 0, rows: 3 })).toBe('2 locks added, 1 already on file, 0 rows skipped (3 rows read).');
  });
});

describe('the design\'s providers and issued-codes views', () => {
  const inventory = (providers: LockProvider[], issued: LockInventory['issued'] = []): LockInventory => ({
    enabled: true,
    activeProviders: providers.filter((p) => p.enabled).map((p) => p.vendor),
    providers,
    launchOnly: [{ vendor: 'Schlage', label: 'Schlage', present: false }],
    locks: [],
    manualCodes: [],
    lockedWithoutLock: [],
    targets: [],
    counts: { all: 0, unmapped: 0, mapped: 0, manual: 0, health: 0, withoutLock: 0 },
    issued
  });

  it('a disconnected account goes back to the connect grid; a vendor with rows stays connected', () => {
    const zerv = provider('Zerv', { enabled: false, configured: true, status: 'connected', details: details({ username: 'ops' }) });
    const igloo = provider('Igloohome', { enabled: false, configured: true, status: 'connected', mode: 'v1', lockCount: 3, details: details({ version: 'v1' }) });
    const latch = provider('Latch', { enabled: true, configured: true, status: 'needs_authorization' });
    const inv = inventory([zerv, igloo, latch, provider('Dwelo', { enabled: false }), provider('EdgeState', { enabled: false })]);
    const cards = generateProviderCards(inv, null);
    expect(cards.connected.map((c) => c.vendor)).toEqual(['Igloohome', 'Latch']);
    expect(cards.connected[1].needsAuth).toBe(true);
    expect(generateConnectCards(inv).map((c) => c.vendor)).toEqual(['Dormakaba', 'Dwelo', 'Zerv', 'EdgeState']);
    expect(generateConnectCards(inv)[0]).toMatchObject({ isNew: true, available: false });
    expect(purgeTargets(inv)).toEqual([{ vendor: 'Igloohome', label: 'Igloohome', count: 3 }]);
  });

  it('issued codes filter by status bucket and count recent failures', () => {
    const now = Date.parse('2026-10-20T12:00:00Z');
    const code = (status: string, daysAgo: number) => ({ vendor: 'Igloohome', vendorLabel: 'Igloohome', visitor: null, target: null, status, window: null, issuedAt: new Date(now - daysAgo * 86400000).toISOString() });
    const rows = generateIssuedRows([code('issued', 0), code('failed', 1), code('failed', 9), code('deleted', 2), code('expired', 3)], 'UTC');
    expect(generateIssuedFilters(rows, 'failed').map((f) => `${f.id}:${f.count}${f.on ? '*' : ''}`)).toEqual(['all:5', 'issued:1', 'failed:2*', 'expired:1', 'revoked:1']);
    expect(filterIssuedRows(rows, 'revoked').map((r) => r.status)).toEqual(['deleted']);
    expect(failedRecently(rows, now)).toBe(1);
  });
});

