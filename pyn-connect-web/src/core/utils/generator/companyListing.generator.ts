import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import type { Company } from '~/core/models/data/company.data';
import type { ColumnDescriptor, FilterOption, ListingSummary, PillVariant, RowDescriptor } from './listing.types';

/**
 * Pure context → descriptor transform for the Companies listing
 * (react-architecture.md §8). No fetching, no state, no JSX.
 */
export const COMPANY_COLUMN_IDS = {
  company: 'company',
  status: 'status',
  pmsProvider: 'pmsProvider',
  properties: 'properties'
} as const;

/**
 * The sortable columns and the CMS's key for each (`AccessibleCompaniesQuery::sorts`):
 * every column sorts on what it shows — the name, Active before Inactive, the
 * providers' labels, the property count.
 */
export const COMPANY_SORT_KEYS = {
  company: 'name',
  status: 'status',
  pmsProvider: 'pms_provider',
  properties: 'properties'
} as const;

export const COMPANY_SORTABLE = Object.values(COMPANY_SORT_KEYS);

export const generateCompanyColumns = (): ColumnDescriptor[] => [
  {
    id: COMPANY_COLUMN_IDS.company,
    title: i18n.t(CORE_STRINGS.companies.columns.company),
    align: 'left',
    sortKey: COMPANY_SORT_KEYS.company
  },
  {
    id: COMPANY_COLUMN_IDS.status,
    title: i18n.t(CORE_STRINGS.companies.columns.status),
    align: 'left',
    sortKey: COMPANY_SORT_KEYS.status
  },
  {
    id: COMPANY_COLUMN_IDS.pmsProvider,
    title: i18n.t(CORE_STRINGS.companies.columns.pmsProvider),
    align: 'left',
    sortKey: COMPANY_SORT_KEYS.pmsProvider
  },
  {
    id: COMPANY_COLUMN_IDS.properties,
    title: i18n.t(CORE_STRINGS.companies.columns.properties),
    align: 'center',
    sortKey: COMPANY_SORT_KEYS.properties
  }
];

export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

/** Legacy `data_provider` values are slugs ("yardirentcafe"); label them. */
const PROVIDER_LABELS: Record<string, string> = {
  yardi: 'Yardi',
  yardirentcafe: 'Yardi RentCafe',
  realpage: 'RealPage',
  realpagesvc: 'RealPage',
  psi: 'Entrata / PSI',
  entrata: 'Entrata',
  resman: 'ResMan',
  appfolio: 'AppFolio',
  mri: 'MRI Living',
  beans: 'Beans',
  onesite: 'OneSite',
  rentmanager: 'Rent Manager',
  zaremba: 'Zaremba',
  spreadsheet: 'Spreadsheet',
  xml: 'XML Feed'
};

export const providerLabel = (provider: string): string =>
  PROVIDER_LABELS[provider.toLowerCase()] ?? provider;

/**
 * The design's Status column. The CMS keeps no billing or onboarding state per
 * company, so the only real status is the `inactivate` flag.
 */
const companyStatus = (company: Company): { label: string; variant: PillVariant } =>
  company.inactivate
    ? { label: i18n.t(CORE_STRINGS.companies.status.inactive), variant: 'neutral' }
    : { label: i18n.t(CORE_STRINGS.companies.status.active), variant: 'ok' };

/** The Properties listing, filtered to one company (its `company_id` filter, read by AccessibleCommunitiesQuery). */
export const companyPropertiesHref = (companyId: number): string => `${APP_ROUTES.properties}?company_id=${companyId}`;

const fill = (key: string, values: Record<string, string | number>): string =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, String(value)), i18n.t(key));

export const generateCompanyRows = (companies: Company[]): RowDescriptor[] =>
  companies.map((company) => {
    const providers = company.pmsProviders.map(providerLabel);
    const count = company.propertyCount;

    return {
      id: company.id,
      cells: {
        [COMPANY_COLUMN_IDS.company]: {
          type: 'identity',
          initials: initialsOf(company.name),
          label: company.name
        },
        [COMPANY_COLUMN_IDS.status]: { type: 'pill', ...companyStatus(company) },
        [COMPANY_COLUMN_IDS.pmsProvider]: {
          type: 'pill',
          label: providers.length > 0 ? providers.join(', ') : i18n.t(CORE_STRINGS.companies.notConfigured),
          variant: providers.length > 0 ? 'ok' : 'neutral'
        },
        // The count opens the Properties listing with this company's filter on; a company with none has nothing to open.
        [COMPANY_COLUMN_IDS.properties]:
          count > 0
            ? {
                type: 'number',
                value: count,
                href: companyPropertiesHref(company.id),
                ariaLabel: fill(count === 1 ? CORE_STRINGS.companies.viewPropertiesOne : CORE_STRINGS.companies.viewProperties, {
                  count: formatCount(count),
                  name: company.name.trim()
                })
              }
            : { type: 'number', value: count, ariaLabel: fill(CORE_STRINGS.companies.noPropertiesToView, { name: company.name.trim() }) }
      }
    };
  });

/** The Properties listing's value for "no provider" (mirrors AccessibleCompaniesQuery::NO_PROVIDER). */
export const NO_PMS_PROVIDER = 'none';

export const generateCompanyStatusFilterOptions = (): FilterOption[] => [
  { id: 'active', label: i18n.t(CORE_STRINGS.companies.status.active) },
  { id: 'inactive', label: i18n.t(CORE_STRINGS.companies.status.inactive) }
];

/** Provider slugs from `meta.filters.pms_providers`, by label, "Not configured" last. */
export const generateCompanyProviderFilterOptions = (slugs: string[]): FilterOption[] => {
  const providers = slugs
    .filter((slug) => slug !== NO_PMS_PROVIDER)
    .map((slug) => ({ id: slug, label: providerLabel(slug) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'en'));
  if (slugs.includes(NO_PMS_PROVIDER)) providers.push({ id: NO_PMS_PROVIDER, label: i18n.t(CORE_STRINGS.companies.notConfigured) });
  return providers;
};

export const generateCompanyPropertiesFilterOptions = (): FilterOption[] => [
  { id: 'with', label: i18n.t(CORE_STRINGS.companies.filters.withProperties) },
  { id: 'without', label: i18n.t(CORE_STRINGS.companies.filters.withoutProperties) }
];

/** "1,203" on the server and in every browser alike, so hydration agrees. */
export const formatCount = (count: number): string => count.toLocaleString('en-US');

export const countOf = (count: number, one: string, many: string): string =>
  `${formatCount(count)} ${count === 1 ? one : many}`;

/**
 * The header above the toolbar: "217 Companies · 802 properties total". Both
 * numbers cover everything the user can see, so neither moves while searching.
 * Null when the backend did not send the totals.
 */
export const generateCompanyListingSummary = (
  companyCount: number | null,
  propertyCount: number | null
): ListingSummary | null => {
  if (companyCount == null || propertyCount == null) return null;

  return {
    title: countOf(
      companyCount,
      i18n.t(CORE_STRINGS.companies.summary.companyOne),
      i18n.t(CORE_STRINGS.companies.summary.companyMany)
    ),
    subtitle: `${countOf(
      propertyCount,
      i18n.t(CORE_STRINGS.companies.summary.propertyOne),
      i18n.t(CORE_STRINGS.companies.summary.propertyMany)
    )} ${i18n.t(CORE_STRINGS.companies.summary.total)}`
  };
};
