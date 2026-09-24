import { CORE_STRINGS } from '~/config/app/strings';
import {
  brandingRoute,
  mapEditorRoute,
  propIntegrationsRoute,
  tourContentRoute
} from '~/config/app/connectRoutes';
import { i18n } from '~/resources/i18n';
import type { LifecycleStage, ProductKey, Property } from '~/core/models/data/property.data';
import type { CompanyFilterOption } from '~/core/models/data/session.data';
import { countOf, formatCount, providerLabel } from './companyListing.generator';
import type {
  ColumnDescriptor,
  FilterOption,
  LinkDescriptor,
  ListingSummary,
  PillVariant,
  RowDescriptor
} from './listing.types';

export const PROPERTY_COLUMN_IDS = {
  property: 'property',
  company: 'company',
  goTo: 'goTo',
  products: 'products',
  dataProvider: 'dataProvider',
  status: 'status'
} as const;

/** The lifecycle pill map from the design (STAGE_PILL). */
export const STAGE_PILL: Record<LifecycleStage, { label: string; variant: PillVariant }> = {
  installed: { label: 'Installed', variant: 'neutral' },
  activated: { label: 'Activated', variant: 'info' },
  production: { label: 'In Production', variant: 'ok' },
  released: { label: 'Released', variant: 'ok' },
  approval: { label: 'Final Approval', variant: 'warn' }
};

export const PRODUCT_LABELS: Record<ProductKey, string> = {
  touch: 'Touch',
  tour: 'Tour',
  maps: 'Maps'
};

/** The Data Providers filter's value for "no provider set" (mirrors Rails). */
export const NO_DATA_PROVIDER = 'none';

export const generatePropertyColumns = (): ColumnDescriptor[] => [
  { id: PROPERTY_COLUMN_IDS.property, title: i18n.t(CORE_STRINGS.properties.columns.property), align: 'left' },
  { id: PROPERTY_COLUMN_IDS.company, title: i18n.t(CORE_STRINGS.properties.columns.company), align: 'left' },
  {
    id: PROPERTY_COLUMN_IDS.goTo,
    title: i18n.t(CORE_STRINGS.properties.columns.goTo),
    align: 'left',
    kind: 'actions'
  },
  { id: PROPERTY_COLUMN_IDS.products, title: i18n.t(CORE_STRINGS.properties.columns.products), align: 'center' },
  {
    id: PROPERTY_COLUMN_IDS.dataProvider,
    title: i18n.t(CORE_STRINGS.properties.columns.dataProvider),
    align: 'left'
  },
  { id: PROPERTY_COLUMN_IDS.status, title: i18n.t(CORE_STRINGS.properties.columns.status), align: 'left' }
];

/**
 * The Go To buttons: the property's Inventory, Map & Plotting, Integrations and
 * Branding screens, as the design's `jumpTo` has them.
 */
const goToLinks = (property: Property): LinkDescriptor[] => {
  const id = String(property.id);
  const link = (
    key: LinkDescriptor['icon'],
    short: string,
    full: string,
    href: string
  ): LinkDescriptor => ({
    id: key,
    icon: key,
    label: i18n.t(short),
    title: i18n.t(full),
    ariaLabel: `${i18n.t(full)}: ${property.name.trim()}`,
    href
  });

  return [
    link('inventory', CORE_STRINGS.properties.goTo.inventoryShort, CORE_STRINGS.properties.goTo.inventory, tourContentRoute(id)),
    link('map', CORE_STRINGS.properties.goTo.mapShort, CORE_STRINGS.properties.goTo.map, mapEditorRoute(id)),
    link(
      'integrations',
      CORE_STRINGS.properties.goTo.integrationsShort,
      CORE_STRINGS.properties.goTo.integrations,
      propIntegrationsRoute(id)
    ),
    link('branding', CORE_STRINGS.properties.goTo.brandingShort, CORE_STRINGS.properties.goTo.branding, brandingRoute(id))
  ];
};

export const generatePropertyRows = (properties: Property[]): RowDescriptor[] =>
  properties.map((property) => {
    const stage = STAGE_PILL[property.stage];
    const products = (Object.keys(PRODUCT_LABELS) as ProductKey[])
      .filter((key) => property.products[key])
      .map((key) => PRODUCT_LABELS[key]);

    return {
      id: property.id,
      cells: {
        [PROPERTY_COLUMN_IDS.property]: {
          type: 'title',
          title: property.name,
          subtitle: [property.location, `${property.unitCount} ${i18n.t(CORE_STRINGS.properties.units)}`]
            .filter((part) => part.trim().length > 0)
            .join(' · ')
        },
        [PROPERTY_COLUMN_IDS.company]: {
          type: 'text',
          value: property.companyName ?? '—',
          tone: 'muted'
        },
        [PROPERTY_COLUMN_IDS.goTo]: { type: 'links', links: goToLinks(property) },
        [PROPERTY_COLUMN_IDS.products]: {
          type: 'tags',
          tags: products,
          emptyLabel: i18n.t(CORE_STRINGS.properties.noProducts)
        },
        // The design's feed vendor. `integrations.pms` already grades it: ok
        // with a credential, warn without one.
        [PROPERTY_COLUMN_IDS.dataProvider]: property.dataProvider
          ? { type: 'pill', label: providerLabel(property.dataProvider), variant: property.integrations.pms }
          : { type: 'pill', label: i18n.t(CORE_STRINGS.properties.notConnected), variant: 'neutral' },
        [PROPERTY_COLUMN_IDS.status]: { type: 'pill', label: stage.label, variant: stage.variant }
      }
    };
  });

/** Each filter holds any number of values; an empty list means "no filter". */
export interface PropertyFilters {
  query: string;
  stage: string[];
  companyId: string[];
  product: string[];
  dataProvider: string[];
}

export type PropertyFilterKey = Exclude<keyof PropertyFilters, 'query'>;

export const generateStageFilterOptions = (): FilterOption[] =>
  (Object.keys(STAGE_PILL) as LifecycleStage[]).map((stage) => ({
    id: stage,
    label: STAGE_PILL[stage].label
  }));

/**
 * The options come from the backend (`meta.filters.companies`): the listing
 * only ever holds one page of rows, so it cannot derive the full list itself.
 */
export const generateCompanyFilterOptions = (companies: CompanyFilterOption[]): FilterOption[] =>
  companies.map((company) => ({ id: String(company.id), label: company.name }));

export const generateProductFilterOptions = (): FilterOption[] =>
  (Object.keys(PRODUCT_LABELS) as ProductKey[]).map((key) => ({ id: key, label: PRODUCT_LABELS[key] }));

/** Provider slugs from `meta.filters.data_providers`, by label, "Not connected" last. */
export const generateDataProviderFilterOptions = (slugs: string[]): FilterOption[] =>
  slugs
    .map((slug) => ({
      id: slug,
      label: slug === NO_DATA_PROVIDER ? i18n.t(CORE_STRINGS.properties.notConnected) : providerLabel(slug)
    }))
    .sort((a, b) => {
      if (a.id === NO_DATA_PROVIDER) return 1;
      if (b.id === NO_DATA_PROVIDER) return -1;
      return a.label.localeCompare(b.label);
    });

/**
 * The header above the toolbar: "802 Properties · Across 191 companies", or
 * "Showing 41 of 802" once a search or filter narrows the list. Null when the
 * backend did not send the scope total.
 */
export const generatePropertyListingSummary = (
  scopeTotal: number | null,
  matchingTotal: number,
  companyCount: number
): ListingSummary | null => {
  if (scopeTotal == null) return null;

  const title = countOf(
    scopeTotal,
    i18n.t(CORE_STRINGS.properties.summary.propertyOne),
    i18n.t(CORE_STRINGS.properties.summary.propertyMany)
  );
  const subtitle =
    matchingTotal === scopeTotal
      ? `${i18n.t(CORE_STRINGS.properties.summary.across)} ${countOf(
          companyCount,
          i18n.t(CORE_STRINGS.properties.summary.companyOne),
          i18n.t(CORE_STRINGS.properties.summary.companyMany)
        )}`
      : `${i18n.t(CORE_STRINGS.properties.summary.showing)} ${formatCount(matchingTotal)} ${i18n.t(
          CORE_STRINGS.properties.summary.of
        )} ${formatCount(scopeTotal)}`;

  return { title, subtitle };
};
