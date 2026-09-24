import { CORE_STRINGS } from '~/config/app/strings';
import {
  brandingRoute,
  mapEditorRoute,
  propIntegrationsRoute,
  tourContentRoute
} from '~/config/app/connectRoutes';
import { legacyCmsURLs } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { LifecycleStage, ProductKey, Property } from '~/core/models/data/property.data';
import { formatCount } from './companyListing.generator';
import { STAGE_PILL } from './propertyListing.generator';
import type { PillVariant } from './listing.types';

/**
 * Descriptors for the Property Detail screen (the 22-Sep design's
 * `isPropertyDetail`), built from the one row of real data Connect can read:
 * the property's row in `GET /communities.json`.
 *
 * Everything the design shows that this row does not carry (street, ZIP,
 * coordinates, contacts, notes, settings, billing, most inventory counts) is
 * left out rather than filled with placeholders. See
 * gaps_properties_detail_feature.md.
 */

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

const EMPTY = '—';

const clean = (value: string | null | undefined): string => (value ?? '').trim();

const cityState = (property: Property): string =>
  [clean(property.city), clean(property.state)].filter(Boolean).join(', ');

export const generatePropertyHeader = (property: Property): DetailHeader => {
  const stage = STAGE_PILL[property.stage];

  return {
    name: clean(property.name) || EMPTY,
    statusLabel: stage.label,
    statusVariant: stage.variant,
    // The design's "{org} · {city} · {units} units".
    subtitle: [
      clean(property.companyName),
      cityState(property),
      `${formatCount(property.unitCount)} ${i18n.t(CORE_STRINGS.properties.units)}`
    ]
      .filter(Boolean)
      .join(' · ')
  };
};

/** "Manage This Property": the same four screens as the listing's Go To buttons. */
export const generateManageLinks = (property: Property): DetailLink[] => {
  const id = String(property.id);

  return [
    { id: 'inventory', label: i18n.t(CORE_STRINGS.properties.goTo.inventory), href: tourContentRoute(id) },
    { id: 'map', label: i18n.t(CORE_STRINGS.properties.goTo.map), href: mapEditorRoute(id) },
    {
      id: 'integrations',
      label: i18n.t(CORE_STRINGS.properties.goTo.integrations),
      href: propIntegrationsRoute(id)
    },
    { id: 'branding', label: i18n.t(CORE_STRINGS.properties.goTo.branding), href: brandingRoute(id) }
  ];
};

/**
 * The lifecycle the CMS records: one milestone date per stage, in the order
 * `Connect::PropertySerializer#stage` ranks them (a later milestone wins).
 * The design's seven-stage lifecycle (Order Received … Orientation) has no
 * columns behind it.
 */
const LIFECYCLE: { key: LifecycleStage; label: string; description: string }[] = [
  {
    key: 'installed',
    label: CORE_STRINGS.propertyDetail.lifecycle.installed,
    description: CORE_STRINGS.propertyDetail.lifecycle.installedDesc
  },
  {
    key: 'activated',
    label: CORE_STRINGS.propertyDetail.lifecycle.activated,
    description: CORE_STRINGS.propertyDetail.lifecycle.activatedDesc
  },
  {
    key: 'production',
    label: CORE_STRINGS.propertyDetail.lifecycle.production,
    description: CORE_STRINGS.propertyDetail.lifecycle.productionDesc
  },
  {
    key: 'approval',
    label: CORE_STRINGS.propertyDetail.lifecycle.approval,
    description: CORE_STRINGS.propertyDetail.lifecycle.approvalDesc
  },
  {
    key: 'released',
    label: CORE_STRINGS.propertyDetail.lifecycle.released,
    description: CORE_STRINGS.propertyDetail.lifecycle.releasedDesc
  }
];

export const generateLifecycle = (
  property: Property
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
      label: i18n.t(stage.label),
      description: i18n.t(stage.description),
      state: index < current ? 'done' : index === current ? 'current' : 'upcoming'
    }))
  };
};

/**
 * Property Profile: only the fields the listing row carries. The design's
 * Leasing Contact and On-Site Team groups have no field Connect can read, so
 * they are not rendered at all.
 */
export const generateProfileGroups = (property: Property): DetailFieldGroup[] => [
  {
    id: 'location',
    title: i18n.t(CORE_STRINGS.propertyDetail.profile.location),
    fields: [
      { label: i18n.t(CORE_STRINGS.propertyDetail.profile.name), value: clean(property.name) || EMPTY },
      { label: i18n.t(CORE_STRINGS.propertyDetail.profile.cityState), value: cityState(property) || EMPTY }
    ]
  },
  {
    id: 'configuration',
    title: i18n.t(CORE_STRINGS.propertyDetail.profile.configuration),
    fields: [
      {
        label: i18n.t(CORE_STRINGS.propertyDetail.profile.units),
        value: formatCount(property.unitCount)
      }
    ]
  }
];

/**
 * "Edit Details" opens the legacy Property Details form: Connect has no write
 * path for these fields. Null when the property has no company (the legacy URL
 * needs one) or the CMS URL is not configured.
 */
export const generateProfileEditURL = (property: Property): string | null =>
  property.companyId == null ? null : legacyCmsURLs.propertyDetails(property.companyId, property.id);

const PRODUCTS: { id: ProductKey; name: string; icon: string }[] = [
  { id: 'touch', name: CORE_STRINGS.propertyDetail.products.touch, icon: 'grid' },
  { id: 'tour', name: CORE_STRINGS.propertyDetail.products.tour, icon: 'pin' },
  { id: 'maps', name: CORE_STRINGS.propertyDetail.products.maps, icon: 'map' }
];

/**
 * Each product's line under its name is whatever the row can say about it:
 * the unit count for Touch, whether the tour has stops for Tour, and for Maps
 * only whether it is on. The design's floorplate, stop, pin and path counts are
 * not in the row.
 */
const productMetric = (id: ProductKey, property: Property): string => {
  switch (id) {
    case 'touch':
      return `${formatCount(property.unitCount)} ${i18n.t(CORE_STRINGS.properties.units)}`;
    case 'tour':
      return i18n.t(
        property.tourPublished
          ? CORE_STRINGS.propertyDetail.products.tourStops
          : CORE_STRINGS.propertyDetail.products.noTourStops
      );
    default:
      return i18n.t(
        property.products[id]
          ? CORE_STRINGS.propertyDetail.products.enabled
          : CORE_STRINGS.propertyDetail.products.notEnabled
      );
  }
};

export const generateProductCards = (property: Property): ProductCard[] =>
  PRODUCTS.map((product) => {
    const enabled = property.products[product.id];

    return {
      id: product.id,
      name: i18n.t(product.name),
      icon: product.icon,
      metric: productMetric(product.id, property),
      enabled,
      stateLabel: i18n.t(
        enabled ? CORE_STRINGS.propertyDetail.products.enabled : CORE_STRINGS.propertyDetail.products.notEnabled
      )
    };
  });

/** Where "Manage Inventory" and the inventory cards lead: the Property Inventory screen. */
export const generateInventoryHref = (property: Property): string => tourContentRoute(String(property.id));

/** Inventory: units is the only count the row carries. */
export const generateInventoryCards = (property: Property): InventoryCard[] => [
  {
    id: 'units',
    label: i18n.t(CORE_STRINGS.propertyDetail.inventory.units),
    value: formatCount(property.unitCount),
    icon: 'bed',
    href: generateInventoryHref(property)
  }
];
