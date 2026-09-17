import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: 'orgs' | 'properties';
}

export interface NavGroup {
  header: string;
  items: NavItem[];
}

/**
 * This phase ships one navigation group only — Accounts → Companies,
 * Properties — matching the `BO_GROUPS` "Accounts" group in the design.
 */
export const generateNavigation = (): NavGroup[] => [
  {
    header: i18n.t(CORE_STRINGS.nav.accounts),
    items: [
      {
        id: 'companies',
        label: i18n.t(CORE_STRINGS.nav.companies),
        href: APP_ROUTES.companies,
        icon: 'orgs'
      },
      {
        id: 'properties',
        label: i18n.t(CORE_STRINGS.nav.properties),
        href: APP_ROUTES.properties,
        icon: 'properties'
      }
    ]
  }
];
