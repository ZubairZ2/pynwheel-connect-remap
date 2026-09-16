import { CORE_STRINGS } from '~/config/app/strings';

/**
 * Minimal `i18n.t` singleton (react-architecture.md §12): keys come from
 * `CORE_STRINGS`, values from the English table below. No React provider —
 * this is a module singleton, as in the reference implementation.
 */
const ENGLISH: Record<string, string> = {
  [CORE_STRINGS.nav.accounts]: 'Accounts',
  [CORE_STRINGS.nav.companies]: 'Companies',
  [CORE_STRINGS.nav.properties]: 'Properties',

  [CORE_STRINGS.signIn.title]: 'Sign in',
  [CORE_STRINGS.signIn.subtitle]: 'Use your Pynwheel staff account.',
  [CORE_STRINGS.signIn.email]: 'Work email',
  [CORE_STRINGS.signIn.password]: 'Password',
  [CORE_STRINGS.signIn.remember]: 'Remember me',
  [CORE_STRINGS.signIn.forgot]: 'Forgot password?',
  [CORE_STRINGS.signIn.submit]: 'Sign in',
  [CORE_STRINGS.signIn.submitting]: 'Signing in…',
  [CORE_STRINGS.signIn.genericError]: 'Invalid Email or password.',
  [CORE_STRINGS.signIn.marketingTitle]: 'One CMS for every Pynwheel product.',
  [CORE_STRINGS.signIn.marketingBody]:
    'Pynwheel Connect is the back office behind Self-Guided Tour, Pynwheel Map and Pynwheel Touch — configure inventory, maps, tours and branding once, then publish to every surface. Internal use only.',

  [CORE_STRINGS.companies.title]: 'Companies',
  [CORE_STRINGS.companies.search]: 'Search companies',
  [CORE_STRINGS.companies.empty]: 'No companies match this search.',
  [CORE_STRINGS.companies.columns.company]: 'Company',
  [CORE_STRINGS.companies.columns.regions]: 'Regions',
  [CORE_STRINGS.companies.columns.portfolioGroups]: 'Portfolio Groups',
  [CORE_STRINGS.companies.columns.pmsProvider]: 'PMS Provider',
  [CORE_STRINGS.companies.columns.properties]: 'Properties',
  [CORE_STRINGS.companies.columns.users]: 'Users',
  [CORE_STRINGS.companies.notConfigured]: 'Not configured',

  [CORE_STRINGS.properties.title]: 'Properties',
  [CORE_STRINGS.properties.search]: 'Search properties',
  [CORE_STRINGS.properties.empty]: 'No properties match these filters.',
  [CORE_STRINGS.properties.allStatuses]: 'All Statuses',
  [CORE_STRINGS.properties.allCompanies]: 'All Companies',
  [CORE_STRINGS.properties.allProducts]: 'All Products',
  [CORE_STRINGS.properties.units]: 'units',
  [CORE_STRINGS.properties.published]: 'Published',
  [CORE_STRINGS.properties.notPublished]: 'Not Published',
  [CORE_STRINGS.properties.columns.property]: 'Property',
  [CORE_STRINGS.properties.columns.company]: 'Company',
  [CORE_STRINGS.properties.columns.status]: 'Status',
  [CORE_STRINGS.properties.columns.integrations]: 'Integrations',
  [CORE_STRINGS.properties.columns.tourPublished]: 'Tour Published',

  [CORE_STRINGS.shared.signOut]: 'Sign out',
  [CORE_STRINGS.shared.searchPlaceholder]: 'Search companies, properties, users…',
  [CORE_STRINGS.shared.loadFailed]: 'We could not load this list. Please try again.',
  [CORE_STRINGS.shared.recordCount]: 'records'
};

export const i18n = {
  t: (key: string): string => ENGLISH[key] ?? key
};
