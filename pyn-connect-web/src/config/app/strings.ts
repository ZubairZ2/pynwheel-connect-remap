/**
 * Type-safe key registry for user-facing copy (react-architecture.md §12).
 * Values live in `resources/i18n`; components and generators only ever
 * reference keys from here.
 */
export const CORE_STRINGS = {
  nav: {
    accounts: 'nav.accounts',
    companies: 'nav.companies',
    properties: 'nav.properties'
  },
  signIn: {
    title: 'signIn.title',
    subtitle: 'signIn.subtitle',
    email: 'signIn.email',
    password: 'signIn.password',
    remember: 'signIn.remember',
    forgot: 'signIn.forgot',
    submit: 'signIn.submit',
    submitting: 'signIn.submitting',
    genericError: 'signIn.genericError',
    marketingTitle: 'signIn.marketingTitle',
    marketingBody: 'signIn.marketingBody'
  },
  companies: {
    title: 'companies.title',
    search: 'companies.search',
    empty: 'companies.empty',
    columns: {
      company: 'companies.columns.company',
      regions: 'companies.columns.regions',
      portfolioGroups: 'companies.columns.portfolioGroups',
      pmsProvider: 'companies.columns.pmsProvider',
      properties: 'companies.columns.properties',
      users: 'companies.columns.users'
    },
    notConfigured: 'companies.notConfigured'
  },
  properties: {
    title: 'properties.title',
    search: 'properties.search',
    empty: 'properties.empty',
    allStatuses: 'properties.allStatuses',
    allCompanies: 'properties.allCompanies',
    allProducts: 'properties.allProducts',
    units: 'properties.units',
    published: 'properties.published',
    notPublished: 'properties.notPublished',
    columns: {
      property: 'properties.columns.property',
      company: 'properties.columns.company',
      status: 'properties.columns.status',
      integrations: 'properties.columns.integrations',
      tourPublished: 'properties.columns.tourPublished'
    }
  },
  shared: {
    signOut: 'shared.signOut',
    searchPlaceholder: 'shared.searchPlaceholder',
    loadFailed: 'shared.loadFailed',
    recordCount: 'shared.recordCount'
  }
} as const;
