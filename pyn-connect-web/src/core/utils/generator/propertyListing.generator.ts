import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { LifecycleStage, ProductKey, Property } from '~/core/models/data/property.data';
import type { CompanyFilterOption } from '~/core/models/data/session.data';
import type { ColumnDescriptor, FilterOption, PillVariant, RowDescriptor } from './listing.types';

export const PROPERTY_COLUMN_IDS = {
  property: 'property',
  company: 'company',
  status: 'status',
  integrations: 'integrations',
  tourPublished: 'tourPublished'
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

export const generatePropertyColumns = (): ColumnDescriptor[] => [
  { id: PROPERTY_COLUMN_IDS.property, title: i18n.t(CORE_STRINGS.properties.columns.property), align: 'left' },
  { id: PROPERTY_COLUMN_IDS.company, title: i18n.t(CORE_STRINGS.properties.columns.company), align: 'left' },
  { id: PROPERTY_COLUMN_IDS.status, title: i18n.t(CORE_STRINGS.properties.columns.status), align: 'left' },
  {
    id: PROPERTY_COLUMN_IDS.integrations,
    title: i18n.t(CORE_STRINGS.properties.columns.integrations),
    align: 'center'
  },
  {
    id: PROPERTY_COLUMN_IDS.tourPublished,
    title: i18n.t(CORE_STRINGS.properties.columns.tourPublished),
    align: 'left'
  }
];

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
        [PROPERTY_COLUMN_IDS.status]: { type: 'pill', label: stage.label, variant: stage.variant },
        [PROPERTY_COLUMN_IDS.integrations]: {
          type: 'integrations',
          products,
          dots: [
            { id: 'lock', title: 'Lock / Access', state: property.integrations.lock },
            { id: 'identity', title: 'Identity', state: property.integrations.identity },
            { id: 'pms', title: 'PMS / CRM', state: property.integrations.pms }
          ]
        },
        [PROPERTY_COLUMN_IDS.tourPublished]: {
          type: 'pill',
          label: property.tourPublished
            ? i18n.t(CORE_STRINGS.properties.published)
            : i18n.t(CORE_STRINGS.properties.notPublished),
          variant: property.tourPublished ? 'ok' : 'neutral'
        }
      }
    };
  });

export interface PropertyFilters {
  query: string;
  stage: string;
  companyId: string;
  product: string;
}

export const generateStageFilterOptions = (): FilterOption[] => [
  { id: 'all', label: i18n.t(CORE_STRINGS.properties.allStatuses) },
  ...(Object.keys(STAGE_PILL) as LifecycleStage[]).map((stage) => ({
    id: stage,
    label: STAGE_PILL[stage].label
  }))
];

/**
 * The options come from the backend (`meta.filters.companies`): the listing
 * only ever holds one page of rows, so it cannot derive the full list itself.
 */
export const generateCompanyFilterOptions = (companies: CompanyFilterOption[]): FilterOption[] => [
  { id: 'all', label: i18n.t(CORE_STRINGS.properties.allCompanies) },
  ...companies.map((company) => ({ id: String(company.id), label: company.name }))
];

export const generateProductFilterOptions = (): FilterOption[] => [
  { id: 'all', label: i18n.t(CORE_STRINGS.properties.allProducts) },
  { id: 'touch', label: 'Pynwheel Touch' },
  { id: 'tour', label: 'Self-Guided Tour' },
  { id: 'maps', label: 'Pynwheel Maps' }
];
