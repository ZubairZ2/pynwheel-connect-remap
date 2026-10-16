/**
 * Launch Board demo fixture (Back Office design, Oct 13, 2026).
 *
 * ISOLATED DEMO DATA. Nothing here is read from the CMS: the board, its team,
 * stages, checklists, assignees, due dates and hand-offs are the design's
 * seed values plus the demo properties. Swap this file for a repository read
 * when the CMS gains a launch pipeline; the generator and the screen take the
 * same shapes from `launchBoard.data.ts` either way.
 */
import type {
  LaunchActionKind,
  LaunchCard,
  LaunchStage,
  LaunchStageKey,
  LaunchTeamMember
} from '~/core/models/data/connect/launchBoard.data';
import type { ProductKey } from '~/core/models/data/connect/common.data';
import { propRoute } from '~/config/app/connectRoutes';

/** The board's "today"; the demo dates are relative to it. */
export const LB_TODAY = '2026-10-17';

export const LB_TEAM: LaunchTeamMember[] = [
  { id: 'alex', name: 'Alex Cypres', role: 'Account manager', color: '#0077AE' },
  { id: 'john', name: 'John Hall', role: 'Finance', color: '#4A7212' },
  { id: 'kellie', name: 'Kellie Ferrell', role: 'Production lead', color: '#EC4E8C' },
  { id: 'jennifer', name: 'Jennifer Cyphers', role: 'Content & QA', color: '#7B3A87' },
  { id: 'awais', name: 'Awais Zafar', role: 'Engineering', color: '#C25E1F' },
  { id: 'salahudin', name: 'Salahudin Sallu', role: 'Engineering', color: '#2A8C8C' },
  { id: 'zubair', name: 'Zubair Zulfiqar', role: 'Engineering', color: '#6B4FBB' },
  { id: 'umair', name: 'Umair', role: 'Installation', color: '#B98900' }
];

export const LB_STAGES: LaunchStage[] = [
  {
    key: 'order',
    num: 1,
    label: 'Order Received',
    short: 'Order',
    desc: 'Contract signed, products picked',
    slaDays: 3,
    owner: 'alex',
    checks: ['Contract countersigned', 'Products and rate card confirmed', 'Property contact named']
  },
  {
    key: 'payment',
    num: 2,
    label: 'Payment Received',
    short: 'Payment',
    desc: 'Invoice paid or PO on file',
    slaDays: 7,
    owner: 'john',
    checks: ['Invoice sent', 'Payment or PO received', 'Billing month set']
  },
  {
    key: 'preprod',
    num: 3,
    label: 'Pre-Production',
    short: 'Pre-prod',
    desc: 'Floor plans, branding and data collected',
    slaDays: 10,
    owner: 'kellie',
    checks: ['Floor plans received', 'Brand kit received', 'PMS feed credentials received', 'Kickoff call held']
  },
  {
    key: 'production',
    num: 4,
    label: 'In Production',
    short: 'Production',
    desc: 'Maps plotted, content built, tour routed',
    slaDays: 5,
    owner: 'kellie',
    checks: ['Floorplates uploaded', 'Units and amenities plotted', 'Wayfinding routed', 'Branding applied', 'QA pass']
  },
  {
    key: 'release',
    num: 5,
    label: 'Released',
    short: 'Release',
    desc: 'Client sign-off on the build',
    slaDays: 7,
    owner: 'alex',
    checks: ['Preview link sent', 'Client feedback resolved', 'Sign-off received']
  },
  {
    key: 'installation',
    num: 6,
    label: 'Installed',
    short: 'Installation',
    desc: 'Hardware on site, apps live',
    slaDays: 7,
    owner: 'umair',
    checks: ['Hardware shipped', 'Kiosk installed', 'Apps verified on site']
  },
  {
    key: 'orientation',
    num: 7,
    label: 'Orientation',
    short: 'Orientation',
    desc: 'Staff trained, hand-over complete',
    slaDays: 14,
    owner: 'jennifer',
    checks: ['Training session held', 'Help articles shared', 'Hand-over to support']
  }
];

export const LB_STAGE_KEYS: LaunchStageKey[] = LB_STAGES.map((stage) => stage.key);

export const LB_PRODUCT_STYLE: Record<ProductKey, { label: string; color: string; bg: string }> = {
  touch: { label: 'Touch', color: '#EC4E8C', bg: '#FDEAF2' },
  tour: { label: 'Tour', color: '#0077AE', bg: '#E6F2F9' },
  maps: { label: 'Maps', color: '#4A7212', bg: '#EEF5E1' }
};

export const LB_ACTION_STYLE: Record<LaunchActionKind, { label: string; color: string; bg: string; icon: string }> = {
  request: { label: 'Product request', color: '#6B4FBB', bg: '#F0EBFA', icon: 'star' },
  bug: { label: 'Bug', color: '#C62534', bg: '#FDEDEF', icon: 'alert' },
  qa: { label: 'QA', color: '#2A8C8C', bg: '#E6F4F4', icon: 'shield' }
};

const card = (
  id: string,
  name: string,
  org: string,
  orgId: string,
  city: string,
  units: number,
  products: ProductKey[],
  stage: LaunchStageKey,
  rest: Partial<LaunchCard>
): LaunchCard => ({
  id,
  name,
  org,
  orgId,
  city,
  units,
  products,
  stage,
  assignee: LB_STAGES.find((s) => s.key === stage)?.owner ?? null,
  priority: 'normal',
  due: '2026-10-24',
  createdAt: '2026-09-20',
  checksDone: 0,
  action: null,
  notes: '',
  history: [],
  propertyHref: null,
  ...rest
});

/** The demo properties already on the board, plus the design's extra eight. */
export const LB_CARDS: LaunchCard[] = [
  card('lb-wharf', 'The Wharf at Riverside', 'Greystar', 'greystar', 'Washington, DC', 96, ['touch'], 'order', {
    assignee: 'alex',
    priority: 'high',
    due: '2026-10-16',
    createdAt: '2026-10-13',
    checksDone: 2,
    propertyHref: propRoute('wharf'),
    history: [
      { who: 'alex', text: 'Contract countersigned by Greystar', when: 'Oct 14' },
      { who: 'alex', text: 'Opened the launch', when: 'Oct 13' }
    ]
  }),
  card('lb-harbor', 'Harbor Point Lofts', 'Bell Partners', 'bell', 'Baltimore, MD', 142, ['touch', 'maps'], 'order', {
    assignee: null,
    due: '2026-10-20',
    createdAt: '2026-10-15',
    checksDone: 0,
    history: [{ who: 'alex', text: 'Opened the launch', when: 'Oct 15' }]
  }),
  card('lb-bellvista', 'Bell Vista', 'Bell Partners', 'bell', 'Charlotte, NC', 120, ['touch'], 'payment', {
    assignee: 'john',
    due: '2026-10-21',
    createdAt: '2026-10-06',
    checksDone: 1,
    propertyHref: propRoute('bellvista'),
    history: [
      { who: 'john', text: 'Invoice 2026-1181 sent', when: 'Oct 9' },
      { who: 'alex', text: 'Moved to Payment Received', when: 'Oct 8' }
    ]
  }),
  card('lb-cedar', 'Cedar Row Townhomes', 'Mill Creek Residential', 'millcreek', 'Phoenix, AZ', 88, ['maps'], 'payment', {
    assignee: 'john',
    priority: 'low',
    due: '2026-10-12',
    createdAt: '2026-09-28',
    checksDone: 2,
    action: { kind: 'request', title: 'PO instead of card payment', assignee: 'john', note: 'Client procurement needs a PO number before paying.', opened: 'Oct 10' },
    history: [{ who: 'john', text: 'Raised a product request: PO instead of card payment', when: 'Oct 10' }]
  }),
  card('lb-willow', 'Willow Bridge Commons', 'Willow Bridge', 'willow', 'Columbus, OH', 204, ['touch', 'tour'], 'preprod', {
    assignee: 'kellie',
    priority: 'high',
    due: '2026-10-19',
    createdAt: '2026-09-30',
    checksDone: 2,
    history: [
      { who: 'kellie', text: 'Brand kit received', when: 'Oct 12' },
      { who: 'kellie', text: 'Floor plans received (PDF, 6 floors)', when: 'Oct 8' }
    ]
  }),
  card('lb-summit', 'Summit Ridge', 'Cortland', 'cortland', 'Nashville, TN', 176, ['tour', 'maps'], 'preprod', {
    assignee: 'jennifer',
    due: '2026-10-28',
    createdAt: '2026-10-04',
    checksDone: 1,
    history: [{ who: 'jennifer', text: 'Kickoff scheduled for Oct 21', when: 'Oct 11' }]
  }),
  card('lb-uptown', 'Alliance Uptown Residences', 'Alliance Residential', 'alliance', 'Dallas, TX', 180, ['touch', 'tour'], 'production', {
    assignee: 'awais',
    priority: 'high',
    due: '2026-10-15',
    createdAt: '2026-09-12',
    checksDone: 3,
    propertyHref: propRoute('uptown'),
    action: { kind: 'bug', title: 'Floor 4 units mis-plotted after re-sync', assignee: 'zubair', note: 'Eleven units moved to the wrong floorplate after the Yardi re-sync.', opened: 'Oct 15' },
    history: [
      { who: 'awais', text: 'Raised a bug: Floor 4 units mis-plotted after re-sync', when: 'Oct 15' },
      { who: 'kellie', text: 'Wayfinding routed', when: 'Oct 13' }
    ]
  }),
  card('lb-millpark', 'Mill Creek Parkside', 'Mill Creek Residential', 'millcreek', 'Austin, TX', 158, ['touch', 'tour', 'maps'], 'production', {
    assignee: 'salahudin',
    due: '2026-10-22',
    createdAt: '2026-09-18',
    checksDone: 4,
    propertyHref: propRoute('millpark'),
    action: { kind: 'qa', title: 'QA pass on the 3D map', assignee: 'jennifer', note: 'Check the Building 2 3D model against the floorplates.', opened: 'Oct 16' },
    history: [{ who: 'salahudin', text: 'Branding applied', when: 'Oct 16' }]
  }),
  card('lb-meridian', 'Meridian Heights', 'Greystar', 'greystar', 'Seattle, WA', 240, ['maps'], 'production', {
    assignee: null,
    due: '2026-10-25',
    createdAt: '2026-09-22',
    checksDone: 1,
    history: [{ who: 'kellie', text: 'Floorplates uploaded', when: 'Oct 14' }]
  }),
  card('lb-cortsky', 'Cortland Sky', 'Cortland', 'cortland', 'Atlanta, GA', 301, ['touch', 'tour', 'maps'], 'release', {
    assignee: 'alex',
    due: '2026-10-18',
    createdAt: '2026-08-30',
    checksDone: 2,
    propertyHref: propRoute('cortsky'),
    history: [
      { who: 'alex', text: 'Client feedback resolved (3 items)', when: 'Oct 15' },
      { who: 'alex', text: 'Preview link sent', when: 'Oct 9' }
    ]
  }),
  card('lb-lakeside', 'Lakeside Flats', 'Alliance Residential', 'alliance', 'Denver, CO', 132, ['touch'], 'release', {
    assignee: 'alex',
    priority: 'low',
    due: '2026-10-09',
    createdAt: '2026-08-25',
    checksDone: 1,
    history: [{ who: 'alex', text: 'Preview link sent', when: 'Oct 2' }]
  }),
  card('lb-luxe', 'Luxe Mile High', 'Alliance Residential', 'alliance', 'Denver, CO', 214, ['touch', 'tour', 'maps'], 'installation', {
    assignee: 'umair',
    due: '2026-10-23',
    createdAt: '2026-08-12',
    checksDone: 2,
    propertyHref: propRoute('luxe'),
    history: [
      { who: 'umair', text: 'Kiosk installed in the Tower A lobby', when: 'Oct 16' },
      { who: 'umair', text: 'Hardware shipped (2 kiosks)', when: 'Oct 10' }
    ]
  }),
  card('lb-parkview', 'Parkview Terrace', 'Mill Creek Residential', 'millcreek', 'Portland, OR', 110, ['touch', 'maps'], 'orientation', {
    assignee: 'jennifer',
    due: '2026-10-30',
    createdAt: '2026-07-28',
    checksDone: 1,
    history: [{ who: 'jennifer', text: 'Training session held', when: 'Oct 15' }]
  }),
  card('lb-riverbend', 'Riverbend Station', 'Greystar', 'greystar', 'Richmond, VA', 164, ['tour'], 'orientation', {
    assignee: 'jennifer',
    priority: 'low',
    due: '2026-10-14',
    createdAt: '2026-07-20',
    checksDone: 2,
    history: [{ who: 'jennifer', text: 'Help articles shared', when: 'Oct 12' }]
  })
];
