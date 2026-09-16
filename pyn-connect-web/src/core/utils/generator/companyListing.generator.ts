import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { Company } from '~/core/models/data/company.data';
import type { ColumnDescriptor, RowDescriptor } from './listing.types';

/**
 * Pure context → descriptor transform for the Companies listing
 * (react-architecture.md §8). No fetching, no state, no JSX.
 */
export const COMPANY_COLUMN_IDS = {
  company: 'company',
  regions: 'regions',
  portfolioGroups: 'portfolioGroups',
  pmsProvider: 'pmsProvider',
  properties: 'properties',
  users: 'users'
} as const;

export const generateCompanyColumns = (): ColumnDescriptor[] => [
  { id: COMPANY_COLUMN_IDS.company, title: i18n.t(CORE_STRINGS.companies.columns.company), align: 'left' },
  { id: COMPANY_COLUMN_IDS.regions, title: i18n.t(CORE_STRINGS.companies.columns.regions), align: 'center' },
  {
    id: COMPANY_COLUMN_IDS.portfolioGroups,
    title: i18n.t(CORE_STRINGS.companies.columns.portfolioGroups),
    align: 'center'
  },
  { id: COMPANY_COLUMN_IDS.pmsProvider, title: i18n.t(CORE_STRINGS.companies.columns.pmsProvider), align: 'left' },
  { id: COMPANY_COLUMN_IDS.properties, title: i18n.t(CORE_STRINGS.companies.columns.properties), align: 'center' },
  { id: COMPANY_COLUMN_IDS.users, title: i18n.t(CORE_STRINGS.companies.columns.users), align: 'center' }
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
  onesite: 'OneSite'
};

export const providerLabel = (provider: string): string =>
  PROVIDER_LABELS[provider.toLowerCase()] ?? provider;

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
        [COMPANY_COLUMN_IDS.regions]: { type: 'number', value: company.regionCount },
        [COMPANY_COLUMN_IDS.portfolioGroups]: { type: 'number', value: company.portfolioGroupCount },
        [COMPANY_COLUMN_IDS.pmsProvider]: {
          type: 'pill',
          label: providers.length > 0 ? providers.join(', ') : i18n.t(CORE_STRINGS.companies.notConfigured),
          variant: providers.length > 0 ? 'ok' : 'neutral'
        },
        [COMPANY_COLUMN_IDS.properties]: { type: 'number', value: company.propertyCount },
        [COMPANY_COLUMN_IDS.users]: { type: 'number', value: company.userCount }
      }
    };
  });

/** Same search behaviour as the mockup: name, PMS provider, contact email. */
export const filterCompanies = (companies: Company[], query: string): Company[] => {
  const needle = query.trim().toLowerCase();
  if (!needle) return companies;

  return companies.filter((company) =>
    [company.name, company.email ?? '', company.pmsProviders.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  );
};
