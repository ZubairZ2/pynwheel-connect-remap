export type LifecycleStage = 'installed' | 'activated' | 'production' | 'released' | 'approval';
export type IntegrationState = 'ok' | 'warn' | 'crit' | 'neutral';
export type ProductKey = 'touch' | 'tour' | 'maps';

export interface PropertyProducts {
  touch: boolean;
  tour: boolean;
  maps: boolean;
}

export interface PropertyIntegrations {
  lock: IntegrationState;
  identity: IntegrationState;
  pms: IntegrationState;
}

/** A community row on the Properties listing. */
export interface Property {
  id: number;
  name: string;
  city: string | null;
  state: string | null;
  location: string;
  unitCount: number;
  companyId: number | null;
  companyName: string | null;
  regionName: string | null;
  stage: LifecycleStage;
  products: PropertyProducts;
  integrations: PropertyIntegrations;
  tourPublished: boolean;
  dataProvider: string | null;
  dataProviderUpdatedOn: string | null;
  timeZone: string | null;
  moveToProduction: boolean;
  updatedAt: string | null;
}

/** The self-tour rate the legacy Settings page shows for this account. */
export type SelfTourRateField = 'selfTour' | 'lincolnSelfTour' | 'dweloSelfTour';

/** One property on its detail page: communities#edit.json. */
export interface PropertyDetail extends Property {
  profile: {
    address: string | null;
    zip: string | null;
    latitude: string | null;
    longitude: string | null;
    manualLatLong: boolean;
    phone: string | null;
    email: string | null;
    website: string | null;
    propertyManagerName: string | null;
    propertyManagerPhone: string | null;
    propertyManagerEmail: string | null;
    numberOfUnits: number | null;
    isSitemap: boolean;
    notes: string | null;
  };
  milestones: {
    dateActivated: string | null;
    productionStartedDate: string | null;
    submittedFinalApprovalDate: string | null;
    releasedDate: string | null;
  };
  settings: Record<PropertySettingKey, boolean>;
  billing: {
    touch: string | null;
    selfTour: string | null;
    lincolnSelfTour: string | null;
    dweloSelfTour: string | null;
    selfTourRateField: SelfTourRateField;
    maps: string | null;
    combined: string | null;
    billingType: string | null;
    billingMonth: string | null;
  };
  touch: {
    code: string | null;
    isVerticalApp: boolean;
    subscriptionStartDate: string | null;
    mdu: boolean;
    showGestureIcons: boolean;
    poweredByBtn: boolean;
  };
  tour: {
    stopCount: number;
    visualIdVerification: boolean;
    enableLocks: boolean;
    autoWayfinding: boolean;
  };
  maps: {
    webMapType: string | null;
    defaultSatelliteView: boolean;
    defaultMapFloorLabel: string | null;
    enableThreeDMaps: boolean;
    isBeansSvg: boolean;
    enableSvgMode: boolean;
    enableSdkMap: boolean;
    enableFloorplanLevelColor: boolean;
    highlightAllUnitsOnHover: boolean;
  };
  inventory: {
    units: number;
    floorplans: number;
    floorplates: number;
    amenities: number;
    /** Distinct `building` values across the property's units and amenities (the CMS has no buildings table). */
    buildings: number;
    subCommunities: { name: string; propertyId: string; unitCount: number }[];
  };
  partners: { key: string; label: string; enabled: boolean }[];
}

export type PropertySettingKey =
  | 'displayRent'
  | 'displayPricingOptions'
  | 'displayAdditionalFee'
  | 'enablePynwheelPricingCalculator'
  | 'enablePricingCalculator'
  | 'showCurrentAvailability'
  | 'displayAvailableDate'
  | 'unitsAvailabilityOver120Days'
  | 'displayBuilding'
  | 'turnAvailabilityOn'
  | 'hideBedroomsBathrooms'
  | 'hideSquareFeet'
  | 'hideAvailability'
  | 'communityLogo'
  | 'studentHousingProperty'
  | 'locked';
