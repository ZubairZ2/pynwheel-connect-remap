import { STAGE_PILL } from '~/data/mock/core.mock';
import { plural } from '~/core/utils/connect/format';
import type { DemoState } from '~/core/store/demo/demo.state';

export interface GlobalResult {
  kind: 'Company' | 'Property' | 'User';
  id: string;
  name: string;
  icon: string;
  sub: string;
}

/**
 * The topbar's omni-search, as the design builds it: at most four companies,
 * five properties and four users, each with a one-line summary.
 */
export const generateGlobalResults = (state: DemoState): GlobalResult[] => {
  const needle = state.globalQuery.trim().toLowerCase();
  if (!needle) return [];

  const propertyCount = (orgId: string) => state.props.filter((p) => p.orgId === orgId).length;

  const companies = state.orgs
    .filter((o) => o.name.toLowerCase().includes(needle) || o.contact.toLowerCase().includes(needle))
    .slice(0, 4)
    .map<GlobalResult>((o) => ({
      kind: 'Company',
      id: o.id,
      name: o.name,
      icon: 'orgs',
      sub: `${plural(propertyCount(o.id), 'property', 'properties')} · ${o.pms.provider || 'No PMS'}`
    }));

  const properties = state.props
    .filter((p) => p.name.toLowerCase().includes(needle) || p.city.toLowerCase().includes(needle))
    .slice(0, 5)
    .map<GlobalResult>((p) => ({
      kind: 'Property',
      id: p.id,
      name: p.name,
      icon: 'properties',
      sub: `${p.city} · ${STAGE_PILL[p.stage].label}`
    }));

  const users = state.users
    .filter((u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle))
    .slice(0, 4)
    .map<GlobalResult>((u) => ({
      kind: 'User',
      id: u.id,
      name: u.name,
      icon: 'users',
      sub: `${u.role} · ${u.org}`
    }));

  return [...companies, ...properties, ...users];
};

export const generateGlobalEmptyLabel = (query: string): string =>
  `Nothing matches “${query.trim()}” across companies, properties, or users.`;
