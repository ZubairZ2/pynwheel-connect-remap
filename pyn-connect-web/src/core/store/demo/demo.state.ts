import type {
  AppUser,
  Level,
  Org,
  Prop
} from '~/core/models/data/connect/account.data';
import type { PropertyTheme } from '~/core/models/data/connect/branding.data';
import type {
  BrochureLink,
  ContentPage,
  HomeTile,
  Neighborhood
} from '~/core/models/data/connect/content.data';
import type { BrochureConfig, ChatStaff, Convo, ReportRun } from '~/core/models/data/connect/engagement.data';
import type { FeeSet, PcSet } from '~/core/models/data/connect/fee.data';
import type {
  Inventory,
  PropertyIntegrations,
  Tour
} from '~/core/models/data/connect/inventory.data';
import type { Resident } from '~/core/models/data/connect/resident.data';
import type {
  AbandonedTour,
  Booking,
  TourType,
  Visitor
} from '~/core/models/data/connect/scheduling.data';
import type { ProductSettings, SvgOptRecord } from '~/data/mock/core.mock';

import { SEED_BROCHURE_CFG } from '~/data/mock/favorites.mock';
import { SEED_CHAT_STAFF, SEED_CONVOS } from '~/data/mock/liveChat.mock';
import { SEED_REPORT_RUNS } from '~/data/mock/analytics.mock';
import { SEED_BROCHURE_LINKS, SEED_HOOD, SEED_PAGES, SEED_TILES } from '~/data/mock/content.mock';
import { SEED_FEES, SEED_PCALC } from '~/data/mock/fees.mock';
import { SEED_RESIDENTS } from '~/data/mock/residents.mock';
import { SEED_THEME } from '~/data/mock/branding.mock';
import { ABANDONED, SEED_BOOKINGS, SEED_VISITORS, TOUR_TYPES } from '~/data/mock/scheduling.mock';
import {
  INVENTORY,
  PROD_ENABLED_SEED,
  PROD_SETTINGS_SEED,
  SEED_BUILDS,
  SEED_INTEG,
  SEED_ORGS,
  SEED_THREADS,
  SEED_PROPS,
  SEED_TOURS,
  SEED_USERS,
  SVG_OPT_SEED
} from '~/data/mock/core.mock';

/* ------------------------------------------------------------------ *
 * Small shapes the demo state needs but no screen owns on its own.
 * ------------------------------------------------------------------ */

export interface PinRef {
  kind: 'unit' | 'amenity';
  id: string;
}

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SvgOptResult {
  beforeKb: number;
  afterKb: number;
  nodesBefore: number;
  nodesAfter: number;
  valid: boolean;
  pathsAfter: number;
}

export interface AutoPlotReport {
  placed: number;
  skipped: Array<{ name: string; reason: string }>;
  when: string;
}

/** A confirm dialog resolves into a plain action, so state stays serialisable. */
export interface PendingAction {
  type: string;
  payload?: unknown;
}

export type ModalKind =
  | 'org'
  | 'prop'
  | 'user'
  | 'page'
  | 'tile'
  | 'link'
  | 'fee'
  | 'bcc'
  | 'rates'
  | 'region'
  | 'group'
  | 'booking'
  | 'stop'
  | 'floorplate'
  | 'floorplan'
  | 'pcfee'
  | 'pumass'
  | 'unit'
  | 'amenity'
  | 'elevator'
  | 'orgPms';

export type FormValue = string | boolean | string[] | undefined;
export type FormState = Record<string, FormValue>;

export interface ThreadLine {
  who: string;
  name: string;
  text: string;
  when: string;
}

export interface BuildEntry {
  version: string;
  platform: string;
  status: string;
  variant: string;
  by: string;
  when: string;
}

/* ------------------------------------------------------------------ *
 * The state itself — a direct port of the design's component state.
 * ------------------------------------------------------------------ */

export interface DemoState {
  /* selection */
  orgId: string;
  propId: string;
  unitId: string | null;

  /* search */
  orgQuery: string;
  propQuery: string;
  globalQuery: string;

  /* records */
  orgs: Org[];
  props: Prop[];
  users: AppUser[];
  tours: Record<string, Tour>;
  integ: Record<string, PropertyIntegrations>;
  inv: Record<string, Inventory>;
  builds: Record<string, BuildEntry[]>;

  /* property → level plumbing */
  extraLevels: Record<string, Level[]>;
  hiddenLevels: Record<string, string[]>;
  levelEdits: Record<string, Partial<Level> & { range?: string; manualName?: boolean; showFloorName?: boolean }>;
  lvSvg: Record<string, string>;
  lvBg: Record<string, string>;
  levelId: string;

  /* property inventory view */
  tcTab: string;
  tsTab: string;
  puTab: string;
  puQuery: string;
  puSort: string;
  puSortDir: number;

  /* map editor */
  mapTool: string;
  edgeFrom: string | null;
  selectedNode: string | null;
  draggingId: string | null;
  gridOn: boolean;
  svgDrag: boolean;
  dropSlot: string;
  bedColors: Record<string, Record<string, string>>;
  plotTarget: PinRef | null;
  selectedPin: PinRef | null;
  dragPin: PinRef | null;
  autoPlotReport: AutoPlotReport | null;
  svgOpt: Record<string, SvgOptResult>;
  routeFrom: string;
  routeTo: string;
  routeResult: string;
  routeColor: string;

  /* dashboard + integrations */
  dashProduct: string;
  lastSync: string;
  integTab: string;
  accessFilter: string;
  ilsStep: number;
  ilsFile: string;
  ilsMatched: number;
  ilsUnmatched: number;
  prodEnabled: Record<string, Record<string, boolean>>;
  prodExpanded: Record<string, Record<string, boolean>>;
  prodSettings: Record<string, ProductSettings>;
  svgPropOpt: Record<string, SvgOptRecord>;
  propFilterStatus: string;
  propFilterOrg: string;
  propFilterProduct: string;

  /* modals + forms */
  modal: ModalKind | null;
  form: FormState;
  editingId: string | null;

  /* resident access */
  residents: Record<string, Resident[]>;
  residentId: string;

  /* pricing */
  fees: Record<string, FeeSet>;
  calcApplicants: number;
  calcPets: number;
  calcVehicles: number;
  pcalc: Record<string, PcSet>;
  pcDragFrom: { catId: string; feeId: string } | null;

  /* favorites + chat */
  brochureCfg: Record<string, BrochureConfig>;
  chatStaff: ChatStaff[];
  convos: Convo[];
  chatPropFilter: string;
  threads: Record<string, ThreadLine[]>;
  threadId: string | null;
  threadDraft: string;

  /* analytics + reports */
  dateRange: string;
  scope: string;
  scopeId: string;
  reportRuns: Record<string, ReportRun>;
  reportJobs: Record<string, { state: 'idle' | 'generating' | 'ready'; rows: number }>;

  /* branding */
  themes: Record<string, PropertyTheme>;
  brandTab: string;
  kickoffOpen: boolean;
  koPalette: string;
  koDirection: string;
  koMood: boolean;
  cropOpen: boolean;
  cropWhich: string;
  cropRect: CropRect;
  logoCrops: Record<string, Record<string, CropRect>>;

  /* content */
  pages: Record<string, ContentPage[]>;
  tiles: Record<string, HomeTile[]>;
  brochure: Record<string, BrochureLink[]>;
  hood: Record<string, Neighborhood>;
  contentTab: string;

  /* scheduling */
  schedTab: string;
  bookings: Booking[];
  bookingId: string;
  tourTypes: TourType[];
  visitors: Visitor[];
  vdQuery: string;
  widgetSlots: string[];
  widgetCap: number;
  widgetMsg: string;
  abandoned: Array<AbandonedTour & { state: string }>;
  qrStamp: string;

  /* ai services */
  aiOn: Record<string, boolean>;
  transcriptOpen: boolean;
  transcriptIdx: number;

  /* help */
  helpQuery: string;

  /* overlays */
  instrOpen: boolean;
  instrVendorId: string;
  confirmOpen: boolean;
  confirmTitle: string;
  confirmMsg: string;
  confirmLabel: string;
  confirmMatch: string;
  confirmInput: string;
  pending: PendingAction | null;
  toast: string;
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const initialDemoState: DemoState = {
  orgId: 'alliance',
  propId: 'luxe',
  unitId: null,

  orgQuery: '',
  propQuery: '',
  globalQuery: '',

  orgs: clone(SEED_ORGS),
  props: clone(SEED_PROPS),
  users: clone(SEED_USERS),
  tours: clone(SEED_TOURS),
  integ: clone(SEED_INTEG),
  inv: clone(INVENTORY),
  builds: clone(SEED_BUILDS) as Record<string, BuildEntry[]>,

  extraLevels: {},
  hiddenLevels: {},
  levelEdits: {},
  lvSvg: {},
  lvBg: {},
  levelId: 'lx-l',

  tcTab: 'floorplates',
  tsTab: 'stops',
  puTab: 'units',
  puQuery: '',
  puSort: 'name',
  puSortDir: 1,

  mapTool: 'select',
  edgeFrom: null,
  selectedNode: null,
  draggingId: null,
  gridOn: false,
  svgDrag: false,
  dropSlot: 'svg',
  bedColors: {},
  plotTarget: null,
  selectedPin: null,
  dragPin: null,
  autoPlotReport: null,
  svgOpt: {},
  routeFrom: '',
  routeTo: '',
  routeResult: 'Pick two stops — routing solves across floors and buildings.',
  routeColor: '#5B6270',

  dashProduct: 'all',
  lastSync: '4m ago',
  integTab: 'integrations',
  accessFilter: 'all',
  ilsStep: 0,
  ilsFile: '',
  ilsMatched: 0,
  ilsUnmatched: 0,
  prodEnabled: clone(PROD_ENABLED_SEED),
  prodExpanded: {},
  prodSettings: clone(PROD_SETTINGS_SEED),
  svgPropOpt: clone(SVG_OPT_SEED),
  propFilterStatus: 'all',
  propFilterOrg: 'all',
  propFilterProduct: 'all',

  modal: null,
  form: {},
  editingId: null,

  residents: clone(SEED_RESIDENTS),
  residentId: 'r1',

  fees: clone(SEED_FEES),
  calcApplicants: 2,
  calcPets: 1,
  calcVehicles: 1,
  pcalc: clone(SEED_PCALC),
  pcDragFrom: null,

  brochureCfg: clone(SEED_BROCHURE_CFG),
  chatStaff: clone(SEED_CHAT_STAFF),
  convos: clone(SEED_CONVOS),
  chatPropFilter: 'all',
  threads: clone(SEED_THREADS),
  threadId: null,
  threadDraft: '',

  dateRange: 'Last 30 days',
  scope: 'platform',
  scopeId: '',
  reportRuns: clone(SEED_REPORT_RUNS),
  reportJobs: {},

  themes: clone(SEED_THEME),
  brandTab: 'theme',
  kickoffOpen: false,
  koPalette: '#0077AE',
  koDirection: '',
  koMood: false,
  cropOpen: false,
  cropWhich: '',
  cropRect: { x: 12, y: 18, w: 76, h: 58 },
  logoCrops: {},

  pages: clone(SEED_PAGES),
  tiles: clone(SEED_TILES),
  brochure: clone(SEED_BROCHURE_LINKS),
  hood: clone(SEED_HOOD),
  contentTab: 'pages',

  schedTab: 'calendar',
  bookings: clone(SEED_BOOKINGS),
  bookingId: 'b1',
  tourTypes: clone(TOUR_TYPES),
  visitors: clone(SEED_VISITORS),
  vdQuery: '',
  widgetSlots: ['9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'],
  widgetCap: 6,
  widgetMsg:
    'Your tour is confirmed! We placed a temporary $50 hold on your card that is released automatically once your tour is complete.',
  abandoned: ABANDONED.map((a) => ({ ...a, state: 'open' })),
  qrStamp: '',

  aiOn: { luxe: true, uptown: true, cortsky: false, millpark: true },
  transcriptOpen: false,
  transcriptIdx: 0,

  helpQuery: '',

  instrOpen: false,
  instrVendorId: '',
  confirmOpen: false,
  confirmTitle: '',
  confirmMsg: '',
  confirmLabel: 'Confirm',
  confirmMatch: '',
  confirmInput: '',
  pending: null,
  toast: ''
};
