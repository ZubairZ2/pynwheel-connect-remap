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
 */
export type ScreenId =
  | 'dashboard'
  | 'orgs'
  | 'orgDetail'
  | 'orgRegions'
  | 'orgGroups'
  | 'properties'
  | 'propertyDetail'
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

/**
 * The Integrations Hub is not property-scoped (it has its own property picker),
 * so a jump from one property's row names the property as a query parameter
 * the Hub starts on.
 */
export const propIntegrationsRoute = (propId: string): string =>
  `${CONNECT_ROUTES.integrations}?property=${encodeURIComponent(propId)}`;

/**
 * Which sidebar entry lights up for a screen (`NAV_GROUP` in the design).
 * Property- and company-scoped screens stay under their parent listing.
 */
export const NAV_GROUP: Record<ScreenId, string> = {
  dashboard: 'dashboard',
  orgs: 'orgs',
  orgDetail: 'orgs',
  orgRegions: 'orgs',
  orgGroups: 'orgs',
  properties: 'properties',
  propertyDetail: 'properties',
  propPricing: 'properties',
  propUnitsFp: 'properties',
  unitDetail: 'properties',
  mapEditor: 'properties',
  tourContent: 'properties',
  tourSetup: 'properties',
  branding: 'properties',
  content: 'properties',
  scheduling: 'scheduling',
  integrations: 'integrations',
  svgOptimizer: 'svgOptimizer',
  partnerConfig: 'partnerConfig',
  builds: 'builds',
  pricingCalc: 'pricingCalc',
  favorites: 'favorites',
  residentAccess: 'residentAccess',
  liveChat: 'liveChat',
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
  orgs: 'Companies',
  orgDetail: 'Company',
  orgRegions: 'Regions',
  orgGroups: 'Portfolio Groups',
  properties: 'Properties',
  propertyDetail: 'Property',
  propPricing: 'Pricing & Availability',
  propUnitsFp: 'Units & Floor Plans',
  unitDetail: 'Unit',
  mapEditor: 'Map & Plotting',
  tourContent: 'Property Inventory',
  tourSetup: 'Tour Setup',
  branding: 'Design System & Branding',
  content: 'Property Content',
  scheduling: 'Tour Scheduling',
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
