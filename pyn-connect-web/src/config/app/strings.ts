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
  propertyDetail: {
    title: 'propertyDetail.title',
    breadcrumb: 'propertyDetail.breadcrumb',
    loading: 'propertyDetail.loading',
    loadFailed: 'propertyDetail.loadFailed',
    notFound: {
      title: 'propertyDetail.notFound.title',
      body: 'propertyDetail.notFound.body',
      back: 'propertyDetail.notFound.back'
    },
    manage: {
      title: 'propertyDetail.manage.title',
      subtitle: 'propertyDetail.manage.subtitle'
    },
    lifecycle: {
      title: 'propertyDetail.lifecycle.title',
      current: 'propertyDetail.lifecycle.current',
      installed: 'propertyDetail.lifecycle.installed',
      activated: 'propertyDetail.lifecycle.activated',
      production: 'propertyDetail.lifecycle.production',
      approval: 'propertyDetail.lifecycle.approval',
      released: 'propertyDetail.lifecycle.released',
      installedDesc: 'propertyDetail.lifecycle.installedDesc',
      activatedDesc: 'propertyDetail.lifecycle.activatedDesc',
      productionDesc: 'propertyDetail.lifecycle.productionDesc',
      approvalDesc: 'propertyDetail.lifecycle.approvalDesc',
      releasedDesc: 'propertyDetail.lifecycle.releasedDesc'
    },
    profile: {
      title: 'propertyDetail.profile.title',
      subtitle: 'propertyDetail.profile.subtitle',
      edit: 'propertyDetail.profile.edit',
      location: 'propertyDetail.profile.location',
      leasing: 'propertyDetail.profile.leasing',
      onsite: 'propertyDetail.profile.onsite',
      configuration: 'propertyDetail.profile.configuration',
      name: 'propertyDetail.profile.name',
      street: 'propertyDetail.profile.street',
      cityStateZip: 'propertyDetail.profile.cityStateZip',
      coordinates: 'propertyDetail.profile.coordinates',
      notSet: 'propertyDetail.profile.notSet',
      autoGeocoded: 'propertyDetail.profile.autoGeocoded',
      manualOverride: 'propertyDetail.profile.manualOverride',
      phone: 'propertyDetail.profile.phone',
      email: 'propertyDetail.profile.email',
      website: 'propertyDetail.profile.website',
      manager: 'propertyDetail.profile.manager',
      unassigned: 'propertyDetail.profile.unassigned',
      managerPhone: 'propertyDetail.profile.managerPhone',
      managerEmail: 'propertyDetail.profile.managerEmail',
      units: 'propertyDetail.profile.units',
      mapMode: 'propertyDetail.profile.mapMode',
      propertyMap: 'propertyDetail.profile.propertyMap',
      floorplates: 'propertyDetail.profile.floorplates',
      notes: 'propertyDetail.profile.notes',
      noNotes: 'propertyDetail.profile.noNotes'
    },
    edit: {
      cancel: 'propertyDetail.edit.cancel',
      save: 'propertyDetail.edit.save',
      units: 'propertyDetail.edit.units',
      city: 'propertyDetail.edit.city',
      state: 'propertyDetail.edit.state',
      zip: 'propertyDetail.edit.zip',
      overrideGeo: 'propertyDetail.edit.overrideGeo',
      manual: 'propertyDetail.edit.manual',
      auto: 'propertyDetail.edit.auto',
      latitude: 'propertyDetail.edit.latitude',
      longitude: 'propertyDetail.edit.longitude',
      leasingPhone: 'propertyDetail.edit.leasingPhone',
      leasingEmail: 'propertyDetail.edit.leasingEmail',
      pmName: 'propertyDetail.edit.pmName',
      pmPhone: 'propertyDetail.edit.pmPhone',
      pmEmail: 'propertyDetail.edit.pmEmail',
      readOnly: 'propertyDetail.edit.readOnly',
      openInCms: 'propertyDetail.edit.openInCms',
      dismiss: 'propertyDetail.edit.dismiss'
    },
    products: {
      title: 'propertyDetail.products.title',
      touch: 'propertyDetail.products.touch',
      tour: 'propertyDetail.products.tour',
      maps: 'propertyDetail.products.maps',
      enabled: 'propertyDetail.products.enabled',
      notEnabled: 'propertyDetail.products.notEnabled'
    },
    count: {
      unit: 'propertyDetail.count.unit',
      units: 'propertyDetail.count.units',
      floorplate: 'propertyDetail.count.floorplate',
      floorplates: 'propertyDetail.count.floorplates',
      tourStop: 'propertyDetail.count.tourStop',
      tourStops: 'propertyDetail.count.tourStops',
      subCommunity: 'propertyDetail.count.subCommunity',
      subCommunities: 'propertyDetail.count.subCommunities'
    },
    inventory: {
      title: 'propertyDetail.inventory.title',
      manage: 'propertyDetail.inventory.manage',
      units: 'propertyDetail.inventory.units',
      floorplans: 'propertyDetail.inventory.floorplans',
      floorplates: 'propertyDetail.inventory.floorplates',
      amenities: 'propertyDetail.inventory.amenities',
      subSupported: 'propertyDetail.inventory.subSupported',
      singleProperty: 'propertyDetail.inventory.singleProperty',
      subHeading: 'propertyDetail.inventory.subHeading'
    },
    ils: {
      title: 'propertyDetail.ils.title',
      subtitle: 'propertyDetail.ils.subtitle',
      syndicating: 'propertyDetail.ils.syndicating',
      paused: 'propertyDetail.ils.paused'
    },
    settings: {
      title: 'propertyDetail.settings.title',
      subtitle: 'propertyDetail.settings.subtitle',
      pricing: 'propertyDetail.settings.pricing',
      unitDisplay: 'propertyDetail.settings.unitDisplay',
      property: 'propertyDetail.settings.property',
      displayRent: 'propertyDetail.settings.displayRent',
      displayPricingOptions: 'propertyDetail.settings.displayPricingOptions',
      displayAdditionalFee: 'propertyDetail.settings.displayAdditionalFee',
      pynwheelCalculator: 'propertyDetail.settings.pynwheelCalculator',
      engrainCalculator: 'propertyDetail.settings.engrainCalculator',
      defaultAvailability: 'propertyDetail.settings.defaultAvailability',
      all: 'propertyDetail.settings.all',
      now: 'propertyDetail.settings.now',
      displayAvailableDate: 'propertyDetail.settings.displayAvailableDate',
      over120Days: 'propertyDetail.settings.over120Days',
      displayBuilding: 'propertyDetail.settings.displayBuilding',
      showAllAvailable: 'propertyDetail.settings.showAllAvailable',
      hideBedBath: 'propertyDetail.settings.hideBedBath',
      hideSqft: 'propertyDetail.settings.hideSqft',
      hideAvailability: 'propertyDetail.settings.hideAvailability',
      communityLogo: 'propertyDetail.settings.communityLogo',
      studentHousing: 'propertyDetail.settings.studentHousing',
      inactivate: 'propertyDetail.settings.inactivate',
      pricingCalculator: 'propertyDetail.settings.pricingCalculator'
    },
    config: {
      touchSubtitle: 'propertyDetail.config.touchSubtitle',
      tourSubtitle: 'propertyDetail.config.tourSubtitle',
      mapsSubtitle: 'propertyDetail.config.mapsSubtitle',
      enablePrefix: 'propertyDetail.config.enablePrefix',
      enableSuffix: 'propertyDetail.config.enableSuffix',
      touchCode: 'propertyDetail.config.touchCode',
      displayType: 'propertyDetail.config.displayType',
      vertical: 'propertyDetail.config.vertical',
      horizontal: 'propertyDetail.config.horizontal',
      billingRate: 'propertyDetail.config.billingRate',
      startDate: 'propertyDetail.config.startDate',
      mdu: 'propertyDetail.config.mdu',
      gestureIcons: 'propertyDetail.config.gestureIcons',
      poweredBy: 'propertyDetail.config.poweredBy',
      homeScreen: 'propertyDetail.config.homeScreen',
      idVerification: 'propertyDetail.config.idVerification',
      enableLocks: 'propertyDetail.config.enableLocks',
      autoWayfinding: 'propertyDetail.config.autoWayfinding',
      tourSetup: 'propertyDetail.config.tourSetup',
      tourScheduling: 'propertyDetail.config.tourScheduling',
      mapDisplay: 'propertyDetail.config.mapDisplay',
      map2d: 'propertyDetail.config.map2d',
      map3d: 'propertyDetail.config.map3d',
      satellite: 'propertyDetail.config.satellite',
      defaultFloor: 'propertyDetail.config.defaultFloor',
      beans3d: 'propertyDetail.config.beans3d',
      beansSvg: 'propertyDetail.config.beansSvg',
      svgMode: 'propertyDetail.config.svgMode',
      sdkMap: 'propertyDetail.config.sdkMap',
      floorPlanColors: 'propertyDetail.config.floorPlanColors',
      hoverHighlight: 'propertyDetail.config.hoverHighlight',
      readOnly: 'propertyDetail.config.readOnly'
    },
    billing: {
      title: 'propertyDetail.billing.title',
      perProperty: 'propertyDetail.billing.perProperty',
      editRates: 'propertyDetail.billing.editRates',
      touch: 'propertyDetail.billing.touch',
      tour: 'propertyDetail.billing.tour',
      maps: 'propertyDetail.billing.maps',
      combined: 'propertyDetail.billing.combined',
      notSet: 'propertyDetail.billing.notSet',
      month: 'propertyDetail.billing.month'
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
