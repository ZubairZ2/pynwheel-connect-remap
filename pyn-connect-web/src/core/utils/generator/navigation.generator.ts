import { CONNECT_ROUTES, NAV_GROUP, type ScreenId } from '~/config/app/connectRoutes';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface NavGroup {
  header: string;
  items: NavItem[];
}

/**
 * The design's `NAV` list (Back Office, Oct 13, 2026): one entry per top-level
 * destination. Tours, Integrations, the Pricing Calculator, Favorites,
 * Resident Access and Live Chat are property pages now and have no entry.
 */
const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: CONNECT_ROUTES.dashboard, icon: 'dashboard' },
  { id: 'launchBoard', label: 'Launch Board', href: CONNECT_ROUTES.launchBoard, icon: 'rocket' },
  { id: 'orgs', label: 'Companies', href: CONNECT_ROUTES.orgs, icon: 'orgs' },
  { id: 'properties', label: 'Properties', href: CONNECT_ROUTES.properties, icon: 'properties' },
  { id: 'svgOptimizer', label: 'SVG Maps Optimizer', href: CONNECT_ROUTES.svgOptimizer, icon: 'map' },
  { id: 'partnerConfig', label: 'Partner Configuration', href: CONNECT_ROUTES.partnerConfig, icon: 'broadcast' },
  { id: 'builds', label: 'White-Label Builds', href: CONNECT_ROUTES.builds, icon: 'builds' },
  { id: 'analytics', label: 'Analytics', href: CONNECT_ROUTES.analytics, icon: 'analytics' },
  { id: 'reports', label: 'Reports', href: CONNECT_ROUTES.reports, icon: 'report' },
  { id: 'users', label: 'Users & Roles', href: CONNECT_ROUTES.users, icon: 'users' },
  { id: 'aiServices', label: 'AI Services', href: CONNECT_ROUTES.aiServices, icon: 'ai', badge: '3' },
  { id: 'billing', label: 'Billing', href: CONNECT_ROUTES.billing, icon: 'billing' },
  { id: 'audit', label: 'Audit Log', href: CONNECT_ROUTES.audit, icon: 'audit' },
  { id: 'help', label: 'Help & Tutorials', href: CONNECT_ROUTES.help, icon: 'help' }
];

/** The design's `BO_GROUPS`: how those entries are grouped in the sidebar. */
const GROUPS: Array<{ header: string; ids: string[] }> = [
  { header: 'Overview', ids: ['dashboard', 'launchBoard', 'analytics', 'reports'] },
  { header: 'Portfolio', ids: ['orgs', 'properties'] },
  { header: 'Product Tools', ids: ['aiServices', 'svgOptimizer', 'builds', 'partnerConfig'] },
  { header: 'Account', ids: ['users', 'billing', 'audit'] },
  { header: 'Support', ids: ['help'] }
];

export const generateNavigation = (): NavGroup[] =>
  GROUPS.map((group) => ({
    header: group.header,
    items: group.ids
      .map((id) => NAV.find((item) => item.id === id))
      .filter((item): item is NavItem => !!item)
  }));

/**
 * Which nav entry is active for a URL. Property- and company-scoped screens stay
 * under their parent listing, matching the design's `NAV_GROUP` map; the old
 * top-level URLs of the property pages light Properties up too.
 */
export const activeNavId = (pathname: string): string => {
  if (pathname.startsWith('/companies')) return NAV_GROUP.orgs;
  if (pathname.startsWith('/properties')) return NAV_GROUP.properties;
  if (pathname.startsWith(CONNECT_ROUTES.launchBoard)) return NAV_GROUP.launchBoard;

  const match = (Object.keys(CONNECT_ROUTES) as ScreenId[]).find(
    (key) => pathname === CONNECT_ROUTES[key as keyof typeof CONNECT_ROUTES]
  );
  return match ? NAV_GROUP[match] : '';
};
