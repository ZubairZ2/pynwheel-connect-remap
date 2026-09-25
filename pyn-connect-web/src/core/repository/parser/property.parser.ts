import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type {
  IntegrationState,
  LifecycleStage,
  Property,
  PropertyDetail,
  PropertySettingKey,
  SelfTourRateField
} from '~/core/models/data/property.data';
import { unwrapData } from './envelope.parser';

const STAGES: LifecycleStage[] = ['installed', 'activated', 'production', 'released', 'approval'];
const STATES: IntegrationState[] = ['ok', 'warn', 'crit', 'neutral'];

const asStage = (value: unknown): LifecycleStage =>
  STAGES.includes(value as LifecycleStage) ? (value as LifecycleStage) : 'installed';

const asState = (value: unknown): IntegrationState =>
  STATES.includes(value as IntegrationState) ? (value as IntegrationState) : 'neutral';

export const parseProperties = (payload: unknown): Property[] => unwrapData(payload).map(parsePropertyRow);

const parsePropertyRow = (row: unknown): Property => {
    const source = ModelDataConverter.toCamelCase<Record<string, unknown>>(row);
    const products = (source.products ?? {}) as Record<string, unknown>;
    const integrations = (source.integrations ?? {}) as Record<string, unknown>;

    return {
      id: Number(source.id),
      name: (source.name as string) ?? '',
      city: (source.city as string) ?? null,
      state: (source.state as string) ?? null,
      location: (source.location as string) ?? '',
      unitCount: Number(source.unitCount ?? 0),
      companyId: source.companyId == null ? null : Number(source.companyId),
      companyName: (source.companyName as string) ?? null,
      regionName: (source.regionName as string) ?? null,
      stage: asStage(source.stage),
      products: {
        touch: Boolean(products.touch),
        tour: Boolean(products.tour),
        maps: Boolean(products.maps)
      },
      integrations: {
        lock: asState(integrations.lock),
        identity: asState(integrations.identity),
        pms: asState(integrations.pms)
      },
      tourPublished: Boolean(source.tourPublished),
      dataProvider: (source.dataProvider as string) ?? null,
      dataProviderUpdatedOn: (source.dataProviderUpdatedOn as string) ?? null,
      timeZone: (source.timeZone as string) ?? null,
      moveToProduction: Boolean(source.moveToProduction),
      updatedAt: (source.updatedAt as string) ?? null
    };
};

type Raw = Record<string, unknown>;

const text = (value: unknown): string | null => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === '' ? null : trimmed;
};

const count = (value: unknown): number => Number(value ?? 0) || 0;

const section = (source: Raw, key: string): Raw => (source[key] ?? {}) as Raw;

const SETTING_KEYS: PropertySettingKey[] = [
  'displayRent',
  'displayPricingOptions',
  'displayAdditionalFee',
  'enablePynwheelPricingCalculator',
  'enablePricingCalculator',
  'showCurrentAvailability',
  'displayAvailableDate',
  'unitsAvailabilityOver120Days',
  'displayBuilding',
  'turnAvailabilityOn',
  'hideBedroomsBathrooms',
  'hideSquareFeet',
  'hideAvailability',
  'communityLogo',
  'studentHousingProperty',
  'locked'
];

const RATE_FIELDS: Record<string, SelfTourRateField> = {
  self_tour: 'selfTour',
  lincoln_self_tour: 'lincolnSelfTour',
  dwelo_self_tour: 'dweloSelfTour'
};

/** `{ data: {...} }` from communities#edit.json, or null when there is none. */
export const parsePropertyDetail = (payload: unknown): PropertyDetail | null => {
  const data = ((payload ?? {}) as { data?: unknown }).data;
  if (data == null || typeof data !== 'object' || Array.isArray(data)) return null;

  const source = ModelDataConverter.toCamelCase<Raw>(data);
  const profile = section(source, 'profile');
  const milestones = section(source, 'milestones');
  const settings = section(source, 'settings');
  const billing = section(source, 'billing');
  const touch = section(source, 'touch');
  const tour = section(source, 'tour');
  const maps = section(source, 'maps');
  const inventory = section(source, 'inventory');
  // The rate field is a value, not a key, so the converter leaves it alone.
  const rateField = (data as Raw).billing as Raw | undefined;

  return {
    ...parsePropertyRow(data),
    profile: {
      address: text(profile.address),
      zip: text(profile.zip),
      latitude: text(profile.latitude),
      longitude: text(profile.longitude),
      manualLatLong: Boolean(profile.manualLatLong),
      phone: text(profile.phone),
      email: text(profile.email),
      website: text(profile.website),
      propertyManagerName: text(profile.propertyManagerName),
      propertyManagerPhone: text(profile.propertyManagerPhone),
      propertyManagerEmail: text(profile.propertyManagerEmail),
      numberOfUnits: profile.numberOfUnits == null ? null : count(profile.numberOfUnits),
      isSitemap: Boolean(profile.isSitemap),
      notes: text(profile.notes)
    },
    milestones: {
      dateActivated: text(milestones.dateActivated),
      productionStartedDate: text(milestones.productionStartedDate),
      submittedFinalApprovalDate: text(milestones.submittedFinalApprovalDate),
      releasedDate: text(milestones.releasedDate)
    },
    settings: Object.fromEntries(SETTING_KEYS.map((key) => [key, Boolean(settings[key])])) as Record<
      PropertySettingKey,
      boolean
    >,
    billing: {
      touch: text(billing.touch),
      selfTour: text(billing.selfTour),
      lincolnSelfTour: text(billing.lincolnSelfTour),
      dweloSelfTour: text(billing.dweloSelfTour),
      selfTourRateField: RATE_FIELDS[String(rateField?.self_tour_rate_field)] ?? 'selfTour',
      maps: text(billing.maps),
      combined: text(billing.combined),
      billingType: text(billing.billingType),
      billingMonth: text(billing.billingMonth)
    },
    touch: {
      code: text(touch.code),
      isVerticalApp: Boolean(touch.isVerticalApp),
      subscriptionStartDate: text(touch.subscriptionStartDate),
      mdu: Boolean(touch.mdu),
      showGestureIcons: Boolean(touch.showGestureIcons),
      poweredByBtn: Boolean(touch.poweredByBtn)
    },
    tour: {
      stopCount: count(tour.stopCount),
      visualIdVerification: Boolean(tour.visualIdVerification),
      enableLocks: Boolean(tour.enableLocks),
      autoWayfinding: Boolean(tour.autoWayfinding)
    },
    maps: {
      webMapType: text(maps.webMapType),
      defaultSatelliteView: Boolean(maps.defaultSatelliteView),
      defaultMapFloorLabel: text(maps.defaultMapFloorLabel),
      enableThreeDMaps: Boolean(maps.enableThreeDMaps),
      isBeansSvg: Boolean(maps.isBeansSvg),
      enableSvgMode: Boolean(maps.enableSvgMode),
      enableSdkMap: Boolean(maps.enableSdkMap),
      enableFloorplanLevelColor: Boolean(maps.enableFloorplanLevelColor),
      highlightAllUnitsOnHover: Boolean(maps.highlightAllUnitsOnHover)
    },
    inventory: {
      units: count(inventory.units),
      floorplans: count(inventory.floorplans),
      floorplates: count(inventory.floorplates),
      amenities: count(inventory.amenities),
      buildings: count(inventory.buildings),
      subCommunities: (Array.isArray(inventory.subCommunities) ? (inventory.subCommunities as Raw[]) : []).map(
        (sub) => ({ name: text(sub.name) ?? '', propertyId: text(sub.propertyId) ?? '', unitCount: count(sub.unitCount) })
      )
    },
    partners: (Array.isArray(source.partners) ? (source.partners as Raw[]) : []).map((partner) => ({
      key: String(partner.key ?? ''),
      label: String(partner.label ?? ''),
      enabled: Boolean(partner.enabled)
    }))
  };
};
