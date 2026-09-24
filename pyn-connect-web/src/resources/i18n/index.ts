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
  [CORE_STRINGS.companies.columns.status]: 'Status',
  [CORE_STRINGS.companies.columns.pmsProvider]: 'PMS Provider',
  [CORE_STRINGS.companies.columns.properties]: 'Properties',
  [CORE_STRINGS.companies.status.active]: 'Active',
  [CORE_STRINGS.companies.status.inactive]: 'Inactive',
  [CORE_STRINGS.companies.summary.companyOne]: 'Company',
  [CORE_STRINGS.companies.summary.companyMany]: 'Companies',
  [CORE_STRINGS.companies.summary.propertyOne]: 'property',
  [CORE_STRINGS.companies.summary.propertyMany]: 'properties',
  [CORE_STRINGS.companies.summary.total]: 'total',
  [CORE_STRINGS.companies.notConfigured]: 'Not configured',

  [CORE_STRINGS.properties.title]: 'Properties',
  [CORE_STRINGS.properties.search]: 'Search properties',
  [CORE_STRINGS.properties.empty]: 'No properties match these filters.',
  [CORE_STRINGS.properties.units]: 'units',
  [CORE_STRINGS.properties.noProducts]: 'None',
  [CORE_STRINGS.properties.notConnected]: 'Not connected',
  [CORE_STRINGS.properties.filters.status]: 'Status',
  [CORE_STRINGS.properties.filters.allStatuses]: 'All Statuses',
  [CORE_STRINGS.properties.filters.companies]: 'Companies',
  [CORE_STRINGS.properties.filters.allCompanies]: 'All Companies',
  [CORE_STRINGS.properties.filters.products]: 'Products',
  [CORE_STRINGS.properties.filters.allProducts]: 'All Products',
  [CORE_STRINGS.properties.filters.dataProviders]: 'Data Providers',
  [CORE_STRINGS.properties.filters.allDataProviders]: 'All Data Providers',
  [CORE_STRINGS.properties.columns.property]: 'Property',
  [CORE_STRINGS.properties.columns.company]: 'Company',
  [CORE_STRINGS.properties.columns.goTo]: 'Go To',
  [CORE_STRINGS.properties.columns.products]: 'Products',
  [CORE_STRINGS.properties.columns.dataProvider]: 'Data Provider',
  [CORE_STRINGS.properties.columns.status]: 'Status',
  [CORE_STRINGS.properties.goTo.inventory]: 'Inventory',
  [CORE_STRINGS.properties.goTo.inventoryShort]: 'Inv',
  [CORE_STRINGS.properties.goTo.map]: 'Map & Plotting',
  [CORE_STRINGS.properties.goTo.mapShort]: 'Map',
  [CORE_STRINGS.properties.goTo.integrations]: 'Integrations',
  [CORE_STRINGS.properties.goTo.integrationsShort]: 'Integ',
  [CORE_STRINGS.properties.goTo.branding]: 'Branding',
  [CORE_STRINGS.properties.goTo.brandingShort]: 'Brand',
  [CORE_STRINGS.properties.summary.propertyOne]: 'Property',
  [CORE_STRINGS.properties.summary.propertyMany]: 'Properties',
  [CORE_STRINGS.properties.summary.companyOne]: 'company',
  [CORE_STRINGS.properties.summary.companyMany]: 'companies',
  [CORE_STRINGS.properties.summary.across]: 'Across',
  [CORE_STRINGS.properties.summary.showing]: 'Showing',
  [CORE_STRINGS.properties.summary.of]: 'of',

  [CORE_STRINGS.filter.clear]: 'Clear',
  [CORE_STRINGS.filter.done]: 'Done',
  [CORE_STRINGS.filter.showingEverything]: 'Showing everything',
  [CORE_STRINGS.filter.selected]: 'selected',

  [CORE_STRINGS.shared.signOut]: 'Sign out',
  [CORE_STRINGS.shared.searchPlaceholder]: 'Search companies, properties, users…',
  [CORE_STRINGS.shared.loadFailed]: 'We could not load this list. Please try again.'
};

export const i18n = {
  t: (key: string): string => ENGLISH[key] ?? key
};
