import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { Company } from '~/core/models/data/company.data';
import type { ColumnDescriptor, ListingSummary, PillVariant, RowDescriptor } from './listing.types';

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

export const generateCompanyColumns = (): ColumnDescriptor[] => [
  { id: COMPANY_COLUMN_IDS.company, title: i18n.t(CORE_STRINGS.companies.columns.company), align: 'left' },
  { id: COMPANY_COLUMN_IDS.status, title: i18n.t(CORE_STRINGS.companies.columns.status), align: 'left' },
  { id: COMPANY_COLUMN_IDS.pmsProvider, title: i18n.t(CORE_STRINGS.companies.columns.pmsProvider), align: 'left' },
  { id: COMPANY_COLUMN_IDS.properties, title: i18n.t(CORE_STRINGS.companies.columns.properties), align: 'center' }
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

export const generateCompanyRows = (companies: Company[]): RowDescriptor[] =>
  companies.map((company) => {
    const providers = company.pmsProviders.map(providerLabel);

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
        [COMPANY_COLUMN_IDS.properties]: { type: 'number', value: company.propertyCount }
      }
    };
  });

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
