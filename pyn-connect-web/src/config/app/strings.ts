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
      status: 'companies.columns.status',
      pmsProvider: 'companies.columns.pmsProvider',
      properties: 'companies.columns.properties'
    },
    status: {
      active: 'companies.status.active',
      inactive: 'companies.status.inactive'
    },
    summary: {
      companyOne: 'companies.summary.companyOne',
      companyMany: 'companies.summary.companyMany',
      propertyOne: 'companies.summary.propertyOne',
      propertyMany: 'companies.summary.propertyMany',
      total: 'companies.summary.total'
    },
    notConfigured: 'companies.notConfigured'
  },
  properties: {
    title: 'properties.title',
    search: 'properties.search',
    empty: 'properties.empty',
    units: 'properties.units',
    noProducts: 'properties.noProducts',
    notConnected: 'properties.notConnected',
    filters: {
      status: 'properties.filters.status',
      allStatuses: 'properties.filters.allStatuses',
      companies: 'properties.filters.companies',
      allCompanies: 'properties.filters.allCompanies',
      products: 'properties.filters.products',
      allProducts: 'properties.filters.allProducts',
      dataProviders: 'properties.filters.dataProviders',
      allDataProviders: 'properties.filters.allDataProviders'
    },
    columns: {
      property: 'properties.columns.property',
      company: 'properties.columns.company',
      goTo: 'properties.columns.goTo',
      products: 'properties.columns.products',
      dataProvider: 'properties.columns.dataProvider',
      status: 'properties.columns.status'
    },
    goTo: {
      inventory: 'properties.goTo.inventory',
      inventoryShort: 'properties.goTo.inventoryShort',
      map: 'properties.goTo.map',
      mapShort: 'properties.goTo.mapShort',
      integrations: 'properties.goTo.integrations',
      integrationsShort: 'properties.goTo.integrationsShort',
      branding: 'properties.goTo.branding',
      brandingShort: 'properties.goTo.brandingShort'
    },
    summary: {
      propertyOne: 'properties.summary.propertyOne',
      propertyMany: 'properties.summary.propertyMany',
      companyOne: 'properties.summary.companyOne',
      companyMany: 'properties.summary.companyMany',
      across: 'properties.summary.across',
      showing: 'properties.summary.showing',
      of: 'properties.summary.of'
    }
  },
  filter: {
    clear: 'filter.clear',
    done: 'filter.done',
    showingEverything: 'filter.showingEverything',
    selected: 'filter.selected'
  },
  shared: {
    signOut: 'shared.signOut',
    searchPlaceholder: 'shared.searchPlaceholder',
    loadFailed: 'shared.loadFailed'
  }
} as const;
