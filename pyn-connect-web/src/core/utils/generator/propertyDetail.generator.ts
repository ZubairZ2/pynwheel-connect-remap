import { CORE_STRINGS } from '~/config/app/strings';
import {
  CONNECT_ROUTES,
  brandingRoute,
  contentRoute,
  mapEditorRoute,
  propIntegrationsRoute,
  propPricingRoute,
  tourContentRoute,
  tourSetupRoute
} from '~/config/app/connectRoutes';
import { legacyCmsURLs } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type {
  LifecycleStage,
  ProductKey,
  PropertyDetail,
  PropertySettingKey
} from '~/core/models/data/property.data';
import { formatCount } from './companyListing.generator';
import { STAGE_PILL } from './propertyListing.generator';
import type { PillVariant } from './listing.types';

/**
 * Descriptors for the Property Detail screen (the 22-Sep design's
 * `isPropertyDetail`), built from communities#edit.json: the property's
 * existing record, as the legacy Property Details, Settings and Floorplates
 * pages show it.
 *
 * Read-only: the edit forms start from these values but never save. What the
 * record does not hold (QR codes, a tour subscription date, pins and paths) is
 * left out; see gaps_properties_detail_feature.md.
 */

const t = (key: string): string => i18n.t(key);
const S = CORE_STRINGS.propertyDetail;

export interface DetailHeader {
  name: string;
  statusLabel: string;
  statusVariant: PillVariant;
  subtitle: string;
}

export interface DetailLink {
  id: string;
  label: string;
  href: string;
}

export interface LifecycleStep {
  key: LifecycleStage;
  num: number;
  label: string;
  description: string;
  state: 'done' | 'current' | 'upcoming';
}

export interface DetailField {
  label: string;
  value: string;
  /** A second, quieter line under the value ("Auto-geocoded"). */
  note?: string;
}

export interface DetailFieldGroup {
  id: string;
  title: string;
  fields: DetailField[];
}

export interface ProductCard {
  id: ProductKey;
  name: string;
  icon: string;
  metric: string;
  enabled: boolean;
  stateLabel: string;
}

export interface InventoryCard {
  id: string;
  label: string;
  value: string;
  icon: string;
  href: string;
}

/** A row in a configuration card: an on/off flag, or a stored value. */
export type ConfigRow =
  | { kind: 'toggle'; label: string; on: boolean }
  | { kind: 'value'; label: string; value: string };

export interface ConfigGroup {
  id: string;
  title: string;
  rows: ConfigRow[];
}

export interface ConfigCard {
  id: 'settings' | ProductKey;
  title: string;
  subtitle: string;
  icon: string;
  /** False when the card's product is off: the design dims it and says so. */
  active: boolean;
  offNote: string | null;
  groups: ConfigGroup[];
  links: DetailLink[];
}

export interface RateCard {
  id: 'touch' | 'tour' | 'maps' | 'combined';
  label: string;
  value: string;
  accent: boolean;
}

export interface PartnerRow {
  key: string;
  name: string;
  on: boolean;
  statusLabel: string;
}

export interface ProfileDraft {
  name: string;
  units: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  overrideGeo: boolean;
  lat: string;
  lng: string;
  phone: string;
  email: string;
  website: string;
  pmName: string;
  pmPhone: string;
  pmEmail: string;
  mapMode: 'map' | 'floorplates';
  notes: string;
}

export type RatesDraft = Record<RateCard['id'], string> & { month: string };

const EMPTY = '—';

const clean = (value: string | null | undefined): string => (value ?? '').trim();

const orDash = (value: string | null | undefined): string => clean(value) || EMPTY;

const cityState = (property: PropertyDetail): string =>
  [clean(property.city), clean(property.state)].filter(Boolean).join(', ');

const plural = (n: number, one: string, many: string): string => `${formatCount(n)} ${n === 1 ? one : many}`;

/** "2024-05-06" → "May 6, 2024". UTC, so server and browser render the same text. */
export const formatDate = (value: string | null): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

/**
 * Rates are free text in the CMS ("$2,028", "2388", "0"). A bare number gets
 * the currency sign the legacy form's defaults use; anything else is shown as
 * stored. A blank rate is "Not set" (the legacy form would pre-fill a default).
 */
export const formatRate = (value: string | null): string => {
  const raw = clean(value);
  if (!raw) return t(S.billing.notSet);
  if (/^\d[\d,]*(\.\d+)?$/.test(raw)) {
    const amount = Number(raw.replace(/,/g, ''));
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  return raw;
};

export const generatePropertyHeader = (property: PropertyDetail): DetailHeader => {
  const stage = STAGE_PILL[property.stage];

  return {
    name: clean(property.name) || EMPTY,
    statusLabel: stage.label,
    statusVariant: stage.variant,
    // The design's "{org} · {city} · {units} units".
    subtitle: [
      clean(property.companyName),
      cityState(property),
      `${formatCount(property.unitCount)} ${t(CORE_STRINGS.properties.units)}`
    ]
      .filter(Boolean)
      .join(' · ')
  };
};

/** "Manage This Property": the same four screens as the listing's Go To buttons. */
export const generateManageLinks = (property: PropertyDetail): DetailLink[] => {
  const id = String(property.id);

  return [
    { id: 'inventory', label: t(CORE_STRINGS.properties.goTo.inventory), href: tourContentRoute(id) },
    { id: 'map', label: t(CORE_STRINGS.properties.goTo.map), href: mapEditorRoute(id) },
    { id: 'integrations', label: t(CORE_STRINGS.properties.goTo.integrations), href: propIntegrationsRoute(id) },
    { id: 'branding', label: t(CORE_STRINGS.properties.goTo.branding), href: brandingRoute(id) }
  ];
};

/**
 * The lifecycle the CMS records: one milestone date per stage, in the order
 * `Connect::PropertySerializer#stage` ranks them (a later milestone wins).
 * Each step shows its recorded date. The design's seven-stage lifecycle has no
 * columns behind it.
 */
const LIFECYCLE: {
  key: LifecycleStage;
  label: string;
  description: string;
  date: (property: PropertyDetail) => string | null;
}[] = [
  { key: 'installed', label: S.lifecycle.installed, description: S.lifecycle.installedDesc, date: () => null },
  {
    key: 'activated',
    label: S.lifecycle.activated,
    description: S.lifecycle.activatedDesc,
    date: (p) => p.milestones.dateActivated
  },
  {
    key: 'production',
    label: S.lifecycle.production,
    description: S.lifecycle.productionDesc,
    date: (p) => p.milestones.productionStartedDate
  },
  {
    key: 'approval',
    label: S.lifecycle.approval,
    description: S.lifecycle.approvalDesc,
    date: (p) => p.milestones.submittedFinalApprovalDate
  },
  {
    key: 'released',
    label: S.lifecycle.released,
    description: S.lifecycle.releasedDesc,
    date: (p) => p.milestones.releasedDate
  }
];

export const generateLifecycle = (
  property: PropertyDetail
): { currentLabel: string; steps: LifecycleStep[] } => {
  const current = Math.max(
    0,
    LIFECYCLE.findIndex((stage) => stage.key === property.stage)
  );

  return {
    currentLabel: STAGE_PILL[property.stage].label,
    steps: LIFECYCLE.map((stage, index) => ({
      key: stage.key,
      num: index + 1,
      label: t(stage.label),
      description: formatDate(stage.date(property)) ?? t(stage.description),
      state: index < current ? 'done' : index === current ? 'current' : 'upcoming'
    }))
  };
};

/** The four Property Profile groups, from the legacy Property Details form's fields. */
export const generateProfileGroups = (property: PropertyDetail): DetailFieldGroup[] => {
  const p = property.profile;
  const cityLine = [cityState(property), clean(p.zip)].filter(Boolean).join(' ');
  const hasCoords = Boolean(p.latitude && p.longitude);

  return [
    {
      id: 'location',
      title: t(S.profile.location),
      fields: [
        { label: t(S.profile.name), value: orDash(property.name) },
        { label: t(S.profile.street), value: orDash(p.address) },
        { label: t(S.profile.cityStateZip), value: cityLine || EMPTY },
        {
          label: t(S.profile.coordinates),
          value: hasCoords ? `${p.latitude}, ${p.longitude}` : t(S.profile.notSet),
          note: t(p.manualLatLong ? S.profile.manualOverride : S.profile.autoGeocoded)
        }
      ]
    },
    {
      id: 'leasing',
      title: t(S.profile.leasing),
      fields: [
        { label: t(S.profile.phone), value: orDash(p.phone) },
        { label: t(S.profile.email), value: orDash(p.email) },
        { label: t(S.profile.website), value: orDash(p.website) }
      ]
    },
    {
      id: 'onsite',
      title: t(S.profile.onsite),
      fields: [
        { label: t(S.profile.manager), value: clean(p.propertyManagerName) || t(S.profile.unassigned) },
        { label: t(S.profile.managerPhone), value: orDash(p.propertyManagerPhone) },
        { label: t(S.profile.managerEmail), value: orDash(p.propertyManagerEmail) }
      ]
    },
    {
      id: 'configuration',
      title: t(S.profile.configuration),
      fields: [
        // The legacy form shows the property's unit records here (`units.count`).
        { label: t(S.profile.units), value: formatCount(property.inventory.units) },
        { label: t(S.profile.mapMode), value: t(p.isSitemap ? S.profile.propertyMap : S.profile.floorplates) },
        { label: t(S.profile.notes), value: clean(p.notes) || t(S.profile.noNotes) }
      ]
    }
  ];
};

/** The Edit Details form starts from the stored values. It never saves. */
export const generateProfileDraft = (property: PropertyDetail): ProfileDraft => {
  const p = property.profile;

  return {
    name: clean(property.name),
    units: String(property.inventory.units),
    street: clean(p.address),
    city: clean(property.city),
    state: clean(property.state),
    zip: clean(p.zip),
    overrideGeo: p.manualLatLong,
    lat: clean(p.latitude),
    lng: clean(p.longitude),
    phone: clean(p.phone),
    email: clean(p.email),
    website: clean(p.website),
    pmName: clean(p.propertyManagerName),
    pmPhone: clean(p.propertyManagerPhone),
    pmEmail: clean(p.propertyManagerEmail),
    mapMode: p.isSitemap ? 'map' : 'floorplates',
    notes: clean(p.notes)
  };
};

/**
 * The legacy Property Details form, for editing that Connect cannot save yet.
 * Null when the property has no company (the legacy URL needs one) or the CMS
 * URL is not configured.
 */
export const generateProfileEditURL = (property: PropertyDetail): string | null =>
  property.companyId == null ? null : legacyCmsURLs.propertyDetails(property.companyId, property.id);

const PRODUCTS: { id: ProductKey; name: string; icon: string }[] = [
  { id: 'touch', name: S.products.touch, icon: 'grid' },
  { id: 'tour', name: S.products.tour, icon: 'pin' },
  { id: 'maps', name: S.products.maps, icon: 'map' }
];

/**
 * The line under each product's name. Touch and Tour show the design's counts;
 * Maps' pins and paths are not stored as a count, so it shows its state.
 */
const productMetric = (id: ProductKey, property: PropertyDetail): string => {
  switch (id) {
    case 'touch':
      return [
        plural(property.inventory.units, t(S.count.unit), t(S.count.units)),
        plural(property.inventory.floorplates, t(S.count.floorplate), t(S.count.floorplates))
      ].join(' · ');
    case 'tour':
      return plural(property.tour.stopCount, t(S.count.tourStop), t(S.count.tourStops));
    default:
      return t(property.products[id] ? S.products.enabled : S.products.notEnabled);
  }
};

export const generateProductCards = (property: PropertyDetail): ProductCard[] =>
  PRODUCTS.map((product) => {
    const enabled = property.products[product.id];

    return {
      id: product.id,
      name: t(product.name),
      icon: product.icon,
      metric: productMetric(product.id, property),
      enabled,
      stateLabel: t(enabled ? S.products.enabled : S.products.notEnabled)
    };
  });

/** Where "Manage Inventory" and the inventory cards lead: the Property Inventory screen. */
export const generateInventoryHref = (property: PropertyDetail): string => tourContentRoute(String(property.id));

export const generateInventoryCards = (property: PropertyDetail): InventoryCard[] => {
  const href = generateInventoryHref(property);
  const inv = property.inventory;

  return [
    { id: 'units', label: t(S.inventory.units), value: formatCount(inv.units), icon: 'bed', href },
    { id: 'floorplans', label: t(S.inventory.floorplans), value: formatCount(inv.floorplans), icon: 'grid', href },
    { id: 'floorplates', label: t(S.inventory.floorplates), value: formatCount(inv.floorplates), icon: 'properties', href },
    { id: 'amenities', label: t(S.inventory.amenities), value: formatCount(inv.amenities), icon: 'star', href }
  ];
};

/**
 * The design's "{N} buildings · sub-communities supported". The CMS's buildings
 * are its sub-communities (one per PMS property id).
 */
export const generateInventorySummary = (
  property: PropertyDetail
): { subtitle: string; subCommunities: { name: string; units: string }[] } => {
  const subs = property.inventory.subCommunities;

  return {
    subtitle:
      subs.length > 0
        ? `${plural(subs.length, t(S.count.subCommunity), t(S.count.subCommunities))} · ${t(S.inventory.subSupported)}`
        : t(S.inventory.singleProperty),
    // As in the design, the list only appears when there is more than one.
    subCommunities:
      subs.length > 1
        ? subs.map((sub) => ({
            name: sub.name,
            units: plural(sub.unitCount, t(S.count.unit), t(S.count.units))
          }))
        : []
  };
};

export const generatePartners = (property: PropertyDetail): PartnerRow[] =>
  property.partners.map((partner) => ({
    key: partner.key,
    name: partner.label,
    on: partner.enabled,
    statusLabel: t(partner.enabled ? S.ils.syndicating : S.ils.paused)
  }));

const toggle = (label: string, on: boolean): ConfigRow => ({ kind: 'toggle', label: t(label), on });
const value = (label: string, stored: string): ConfigRow => ({ kind: 'value', label: t(label), value: stored });

const SETTING_GROUPS: { id: string; title: string; rows: (PropertySettingKey | 'availability')[] }[] = [
  {
    id: 'pricing',
    title: S.settings.pricing,
    rows: [
      'displayRent',
      'displayPricingOptions',
      'displayAdditionalFee',
      'enablePynwheelPricingCalculator',
      'enablePricingCalculator'
    ]
  },
  {
    id: 'unitDisplay',
    title: S.settings.unitDisplay,
    rows: [
      'availability',
      'displayAvailableDate',
      'unitsAvailabilityOver120Days',
      'displayBuilding',
      'turnAvailabilityOn',
      'hideBedroomsBathrooms',
      'hideSquareFeet',
      'hideAvailability'
    ]
  },
  { id: 'property', title: S.settings.property, rows: ['communityLogo', 'studentHousingProperty', 'locked'] }
];

const SETTING_LABELS: Record<PropertySettingKey, string> = {
  displayRent: S.settings.displayRent,
  displayPricingOptions: S.settings.displayPricingOptions,
  displayAdditionalFee: S.settings.displayAdditionalFee,
  enablePynwheelPricingCalculator: S.settings.pynwheelCalculator,
  enablePricingCalculator: S.settings.engrainCalculator,
  showCurrentAvailability: S.settings.defaultAvailability,
  displayAvailableDate: S.settings.displayAvailableDate,
  unitsAvailabilityOver120Days: S.settings.over120Days,
  displayBuilding: S.settings.displayBuilding,
  turnAvailabilityOn: S.settings.showAllAvailable,
  hideBedroomsBathrooms: S.settings.hideBedBath,
  hideSquareFeet: S.settings.hideSqft,
  hideAvailability: S.settings.hideAvailability,
  communityLogo: S.settings.communityLogo,
  studentHousingProperty: S.settings.studentHousing,
  locked: S.settings.inactivate
};

const offNote = (product: string): string => `${t(S.config.enablePrefix)} ${t(product)} ${t(S.config.enableSuffix)}`;

/** Property Settings plus the Touch, Tour and Maps cards, from the stored flags and values. */
export const generateConfigCards = (property: PropertyDetail): ConfigCard[] => {
  const id = String(property.id);
  const s = property.settings;
  const on = property.products;
  const { touch, tour, maps } = property;

  return [
    {
      id: 'settings',
      title: t(S.settings.title),
      subtitle: t(S.settings.subtitle),
      icon: 'pages',
      active: true,
      offNote: null,
      groups: SETTING_GROUPS.map((group) => ({
        id: group.id,
        title: t(group.title),
        rows: group.rows.map((key) =>
          key === 'availability'
            ? // "Default Availability Settings": the Floorplates page's All / Now switch.
              value(S.settings.defaultAvailability, t(s.showCurrentAvailability ? S.settings.now : S.settings.all))
            : toggle(SETTING_LABELS[key], s[key])
        )
      })),
      links: [{ id: 'pricing', label: t(S.settings.pricingCalculator), href: propPricingRoute(id) }]
    },
    {
      id: 'touch',
      title: t(S.products.touch),
      subtitle: t(S.config.touchSubtitle),
      icon: 'grid',
      active: on.touch,
      offNote: on.touch ? null : offNote(S.products.touch),
      groups: [
        {
          id: 'touch',
          title: '',
          rows: [
            value(S.config.touchCode, touch.code ?? t(S.profile.notSet)),
            value(S.config.displayType, t(touch.isVerticalApp ? S.config.vertical : S.config.horizontal)),
            value(S.config.billingRate, formatRate(property.billing.touch)),
            value(S.config.startDate, formatDate(touch.subscriptionStartDate) ?? t(S.profile.notSet)),
            toggle(S.config.mdu, touch.mdu),
            toggle(S.config.gestureIcons, touch.showGestureIcons),
            toggle(S.config.poweredBy, touch.poweredByBtn)
          ]
        }
      ],
      links: [{ id: 'content', label: t(S.config.homeScreen), href: contentRoute(id) }]
    },
    {
      id: 'tour',
      title: t(S.products.tour),
      subtitle: t(S.config.tourSubtitle),
      icon: 'pin',
      active: on.tour,
      offNote: on.tour ? null : offNote(S.products.tour),
      groups: [
        {
          id: 'tour',
          title: '',
          rows: [
            toggle(S.config.idVerification, tour.visualIdVerification),
            toggle(S.config.enableLocks, tour.enableLocks),
            toggle(S.config.autoWayfinding, tour.autoWayfinding)
          ]
        }
      ],
      links: [
        { id: 'tourSetup', label: t(S.config.tourSetup), href: tourSetupRoute(id) },
        { id: 'scheduling', label: t(S.config.tourScheduling), href: CONNECT_ROUTES.scheduling }
      ]
    },
    {
      id: 'maps',
      title: t(S.products.maps),
      subtitle: t(S.config.mapsSubtitle),
      icon: 'map',
      active: on.maps,
      offNote: on.maps ? null : offNote(S.products.maps),
      groups: [
        {
          id: 'maps',
          title: '',
          rows: [
            value(S.config.mapDisplay, mapDisplayLabel(maps.webMapType, maps.defaultSatelliteView)),
            value(S.config.defaultFloor, maps.defaultMapFloorLabel ?? t(S.profile.notSet)),
            toggle(S.config.beans3d, maps.enableThreeDMaps),
            toggle(S.config.beansSvg, maps.isBeansSvg),
            toggle(S.config.svgMode, maps.enableSvgMode),
            toggle(S.config.sdkMap, maps.enableSdkMap),
            toggle(S.config.floorPlanColors, maps.enableFloorplanLevelColor),
            toggle(S.config.hoverHighlight, maps.highlightAllUnitsOnHover)
          ]
        }
      ],
      links: []
    }
  ];
};

/** `web_map_type` is "2d-map" or "3d-map"; `default_satellite_view` adds the satellite start. */
const mapDisplayLabel = (webMapType: string | null, satellite: boolean): string => {
  const base =
    webMapType === '3d-map' ? t(S.config.map3d) : webMapType === '2d-map' ? t(S.config.map2d) : t(S.profile.notSet);
  return satellite ? `${base} · ${t(S.config.satellite)}` : base;
};

/** The self-tour rate the legacy Settings page shows for this account (Lincoln and Dwelo have their own). */
const selfTourRate = (property: PropertyDetail): string | null => property.billing[property.billing.selfTourRateField];

export const generateBilling = (
  property: PropertyDetail
): { subtitle: string; rates: RateCard[] } => {
  const b = property.billing;
  const cadence = [
    t(S.billing.perProperty),
    b.billingType ? b.billingType.charAt(0).toUpperCase() + b.billingType.slice(1) : null,
    b.billingMonth
  ].filter(Boolean);

  return {
    subtitle: cadence.join(' · '),
    rates: [
      { id: 'touch', label: t(S.billing.touch), value: formatRate(b.touch), accent: false },
      { id: 'tour', label: t(S.billing.tour), value: formatRate(selfTourRate(property)), accent: false },
      { id: 'maps', label: t(S.billing.maps), value: formatRate(b.maps), accent: false },
      { id: 'combined', label: t(S.billing.combined), value: formatRate(b.combined), accent: true }
    ]
  };
};

/** The Edit Rates form starts from the stored values. It never saves. */
export const generateRatesDraft = (property: PropertyDetail): RatesDraft => ({
  touch: clean(property.billing.touch),
  tour: clean(selfTourRate(property)),
  maps: clean(property.billing.maps),
  combined: clean(property.billing.combined),
  month: clean(property.billing.billingMonth)
});
