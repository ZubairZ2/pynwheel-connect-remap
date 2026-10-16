/**
 * Route table for the Pynwheel Connect back office.
 *
 * The design drives navigation from a single `screen` string in component
 * state. The App Router port keeps the same screen ids — they are what the
 * sidebar, the page titles and the active-state rules are keyed by — but each
 * one resolves to a real URL, so deep links and the back button work.
 *
 * `/companies` and `/properties` are the Rails-backed listings shipped in the
 * first phase and are deliberately untouched here.
 *
 * October 17, 2026 (Back Office design, Oct 13 version): the Launch Board and
 * the Product Setup pages are new; Tours (scheduling), Integrations, the
 * Pricing Calculator, Favorites, Resident Access and Live Chat are
 * property-scoped pages under `/properties/:id/…`. Their old top-level URLs
 * still resolve (bookmarks), but the sidebar no longer lists them.
 */
export type ScreenId =
  | 'dashboard'
  | 'launchBoard'
  | 'orgs'
  | 'orgDetail'
  | 'orgRegions'
  | 'orgGroups'
  | 'properties'
  | 'propertyDetail'
  | 'prodSetup'
  | 'propPricing'
  | 'propUnitsFp'
  | 'unitDetail'
  | 'mapEditor'
  | 'tourContent'
  | 'tourSetup'
  | 'branding'
  | 'content'
  | 'scheduling'
  | 'integrations'
  | 'svgOptimizer'
  | 'partnerConfig'
  | 'builds'
  | 'pricingCalc'
  | 'favorites'
  | 'residentAccess'
  | 'liveChat'
  | 'analytics'
  | 'reports'
  | 'users'
  | 'aiServices'
  | 'billing'
  | 'audit'
  | 'help';

export const CONNECT_ROUTES = {
  dashboard: '/dashboard',
  launchBoard: '/launch-board',
  orgs: '/companies',
  properties: '/properties',
  scheduling: '/scheduling',
  integrations: '/integrations',
  svgOptimizer: '/svg-maps-optimizer',
  partnerConfig: '/partner-configuration',
  builds: '/white-label-builds',
  pricingCalc: '/pricing-calculator',
  favorites: '/favorites',
  residentAccess: '/resident-access',
  liveChat: '/live-chat',
  analytics: '/analytics',
  reports: '/reports',
  users: '/users',
  aiServices: '/ai-services',
  billing: '/billing',
  audit: '/audit-log',
  help: '/help'
} as const;

export const orgRoute = (orgId: string): string => `/companies/${orgId}`;
export const orgRegionsRoute = (orgId: string): string => `/companies/${orgId}/regions`;
export const orgGroupsRoute = (orgId: string): string => `/companies/${orgId}/groups`;

export const propRoute = (propId: string): string => `/properties/${propId}`;
export const propPricingRoute = (propId: string): string => `/properties/${propId}/pricing`;
export const propUnitsRoute = (propId: string): string => `/properties/${propId}/units`;
export const unitRoute = (propId: string, unitId: string): string =>
  `/properties/${propId}/units/${unitId}`;
export const mapEditorRoute = (propId: string): string => `/properties/${propId}/map`;
export const tourContentRoute = (propId: string): string => `/properties/${propId}/inventory`;
export const tourSetupRoute = (propId: string): string => `/properties/${propId}/tour-setup`;
export const brandingRoute = (propId: string): string => `/properties/${propId}/branding`;
export const contentRoute = (propId: string): string => `/properties/${propId}/content`;

/** The Tours page opened on one of its tabs (`overview`, `stops`, `elevators`, `routing`, `visitors`, `chat`, `settings`). */
export const propToursRoute = (propId: string, tab?: string): string =>
  tab ? `${tourSetupRoute(propId)}?tab=${encodeURIComponent(tab)}` : tourSetupRoute(propId);

/** The products a Product Setup page exists for. Tour's setup page is the Tours page itself. */
export type SetupProduct = 'touch' | 'maps';
export const SETUP_PRODUCTS: SetupProduct[] = ['touch', 'maps'];

/** Touch Setup / Map Setup (`prodSetup`); `tour` goes to the Tours page. */
export const productSetupRoute = (propId: string, product: 'touch' | 'tour' | 'maps'): string =>
  product === 'tour' ? tourSetupRoute(propId) : `/properties/${propId}/setup/${product}`;

/* Property-scoped pages (the design's NAV_GROUP → 'properties'). */
export const propIntegrationsRoute = (propId: string): string => `/properties/${propId}/integrations`;
export const propPricingCalcRoute = (propId: string): string => `/properties/${propId}/pricing-calculator`;
export const propFavoritesRoute = (propId: string): string => `/properties/${propId}/favorites`;
export const propResidentAccessRoute = (propId: string): string => `/properties/${propId}/resident-access`;
export const propLiveChatRoute = (propId: string): string => `/properties/${propId}/live-chat`;

/**
 * Which sidebar entry lights up for a screen (`NAV_GROUP` in the design).
 * Property- and company-scoped screens stay under their parent listing.
 */
export const NAV_GROUP: Record<ScreenId, string> = {
  dashboard: 'dashboard',
  launchBoard: 'launchBoard',
  orgs: 'orgs',
  orgDetail: 'orgs',
  orgRegions: 'orgs',
  orgGroups: 'orgs',
  properties: 'properties',
  propertyDetail: 'properties',
  prodSetup: 'properties',
  propPricing: 'properties',
  propUnitsFp: 'properties',
  unitDetail: 'properties',
  mapEditor: 'properties',
  tourContent: 'properties',
  tourSetup: 'properties',
  branding: 'properties',
  content: 'properties',
  scheduling: 'properties',
  integrations: 'properties',
  svgOptimizer: 'svgOptimizer',
  partnerConfig: 'partnerConfig',
  builds: 'builds',
  pricingCalc: 'properties',
  favorites: 'properties',
  residentAccess: 'properties',
  liveChat: 'properties',
  analytics: 'analytics',
  reports: 'reports',
  users: 'users',
  aiServices: 'aiServices',
  billing: 'billing',
  audit: 'audit',
  help: 'help'
};

/** Page titles, as the design's `TITLES` map has them. */
export const TITLES: Record<ScreenId, string> = {
  dashboard: 'Dashboard',
  launchBoard: 'Launch Board',
  orgs: 'Companies',
  orgDetail: 'Company',
  orgRegions: 'Regions',
  orgGroups: 'Portfolio Groups',
  properties: 'Properties',
  propertyDetail: 'Property',
  prodSetup: 'Product Setup',
  propPricing: 'Pricing & Availability',
  propUnitsFp: 'Units & Floor Plans',
  unitDetail: 'Unit',
  mapEditor: 'Map & Plotting',
  tourContent: 'Property Inventory',
  tourSetup: 'Tour Setup',
  branding: 'Design System & Branding',
  content: 'Property Content',
  scheduling: 'Tours',
  integrations: 'Integrations Hub',
  svgOptimizer: 'SVG Maps Optimizer',
  partnerConfig: 'Partner Configuration',
  builds: 'White-Label Build Pipeline',
  pricingCalc: 'Pricing Calculator',
  favorites: 'Favorites & eBrochure',
  residentAccess: 'Resident Access',
  liveChat: 'Live Chat',
  analytics: 'Analytics',
  reports: 'Reports',
  users: 'Users & Roles',
  aiServices: 'AI Services',
  billing: 'Billing',
  audit: 'Audit Log',
  help: 'Help & Tutorials'
};
