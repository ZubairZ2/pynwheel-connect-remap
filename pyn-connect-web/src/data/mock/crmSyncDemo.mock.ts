/**
 * Demo fixtures of the Settings › CRM & sync page (Back Office design,
 * October 20, 2026). UI only in this phase: nothing here is read from or
 * written to the CMS, no sync runs, and every value shown from these
 * fixtures carries the `*` placeholder marker. The real CRM configuration the
 * property stores is shown separately from `BookingSettings.crm`.
 * Replace this module with the integration data when CRM sync is built.
 */
export type CrmSyncMode = 'sync' | 'ingest' | 'redirect';

export interface CrmSyncOption {
  id: CrmSyncMode;
  title: string;
  tag: string;
  when: string;
  flow: string[];
}

export const CRM_SYNC_OPTIONS: CrmSyncOption[] = [
  {
    id: 'sync',
    title: 'Pynwheel-first sync',
    tag: 'Option C · recommended',
    when: 'the operator adopts Pynwheel across website, kiosk, ILS SDK and app.',
    flow: ['Pynwheel widget on every channel', 'Connect calendar is the source of truth', 'Two-way sync blocks agent slots and marks tours self-guided', 'CRM keeps the lead; Connect keeps the tour']
  },
  {
    id: 'ingest',
    title: 'CRM-first ingest',
    tag: 'Option B · integration layer',
    when: 'the operator insists on the CRM as the front door (Zillow, Knock, Funnel).',
    flow: ['Prospect books in the CRM as today', 'Appointment arrives via CRM API or webhook', 'Connect creates the tour, sends verification and the app link', 'Status and outcome written back to the CRM']
  },
  {
    id: 'redirect',
    title: 'Redirect handoff',
    tag: 'Option A · pilot path',
    when: 'there is no API access to the CRM, or for a quick pilot.',
    flow: ['Existing scheduler keeps its CTA', 'Adds a “Self-guided tour” choice', 'Deep link to the Pynwheel widget with lead id and source', 'Booking lands in Connect; guest card pushed back to the CRM']
  }
];

export const CRM_FLOW_ACTORS = ['Prospect', 'Booking', 'Connect', 'CRM'];

/** The CRMs of the design's select, in its order. */
export const CRM_NAMES = ['Knock', 'Funnel', 'PSI / Entrata', 'Yardi RentCafe', 'RealPage', 'Salesforce'];

/** CRMs with a certified appointment feed in the design's demo. */
export const CRM_INGEST_OK = ['Knock', 'Funnel', 'PSI / Entrata', 'Yardi RentCafe', 'RealPage'];

/** [key, label, secret?] per CRM. */
export const CRM_CREDENTIAL_FIELDS: Record<string, [string, string, boolean?][]> = {
  Knock: [
    ['apiKey', 'API key', true],
    ['community', 'Community ID']
  ],
  Funnel: [
    ['apiKey', 'API key', true],
    ['group', 'Group ID']
  ],
  'PSI / Entrata': [
    ['subdomain', 'Entrata subdomain'],
    ['user', 'API username'],
    ['pass', 'API password', true],
    ['propId', 'Property ID']
  ],
  'Yardi RentCafe': [
    ['server', 'Server URL'],
    ['db', 'Database name'],
    ['user', 'Interface username'],
    ['pass', 'Interface password', true],
    ['propCode', 'Property code']
  ],
  RealPage: [
    ['pmc', 'PMC ID'],
    ['site', 'Site ID'],
    ['user', 'Username'],
    ['pass', 'Password', true]
  ],
  Salesforce: [
    ['instance', 'Instance URL'],
    ['clientId', 'Connected app client ID'],
    ['secret', 'Client secret', true]
  ]
};

/** The stored CMS provider keys, mapped to the design's CRM names. */
export const CRM_PROVIDER_NAMES: Record<string, string> = {
  knock: 'Knock',
  funnel: 'Funnel',
  entrata: 'PSI / Entrata',
  yardi: 'Yardi RentCafe',
  yardirentcafe: 'Yardi RentCafe',
  rentcafe: 'Yardi RentCafe',
  realpage: 'RealPage',
  realpagesvc: 'RealPage',
  salesforce: 'Salesforce'
};

export const crmNameOf = (provider: string | null | undefined): string | null => {
  if (!provider) return null;
  return CRM_PROVIDER_NAMES[provider.toLowerCase()] ?? provider;
};

/** Bookings by source over the last 30 days, per mode (demo numbers). */
export const CRM_DEMO_STATS = (mode: CrmSyncMode, crm: string): [string, number][] => {
  switch (mode) {
    case 'ingest':
      return [
        [crm, 41],
        ['Pynwheel Tour app', 7],
        ['Staff', 3]
      ];
    case 'redirect':
      return [
        [`Redirect from ${crm}`, 22],
        ['Pynwheel widget', 9],
        ['Staff', 5]
      ];
    default:
      return [
        ['Pynwheel widget', 38],
        ['Pynwheel Tour app', 11],
        ['Staff', 4]
      ];
  }
};

export const CRM_DEMO_WEBHOOK = (propertyId: number): string => `https://hooks.pynwheel.com/crm/property-${propertyId}/demo7f2a`;
export const CRM_DEMO_DEEP_LINK = (propertyId: number): string => `https://tours.pynwheel.com/book/property-${propertyId}?lead={lead_id}&src={source}`;
