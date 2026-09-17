import { initials, plural } from '~/core/utils/connect/format';
import { STAGE_PILL } from '~/data/mock/core.mock';
import type { DemoState } from '~/core/store/demo/demo.state';

/** Rate cards are strings like "$249" in the demo data. */
const money = (value: string): number => parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;

export const generateBillingStats = (state: DemoState) => {
  const billing = state.props.filter((p) => p.billing.month !== 'Pending');
  const total = billing.reduce((sum, p) => sum + money(p.billing.combined), 0);
  const withTour = state.props.filter((p) => p.billing.tour !== '—').length;
  const withMaps = state.props.filter((p) => p.billing.maps !== '—').length;

  return [
    { label: 'Properties billing', value: `${billing.length} / ${state.props.length}`, sub: 'rate card active this month' },
    { label: 'Combined rates', value: `$${total.toLocaleString()}`, sub: 'sum of monthly combined rates' },
    { label: 'Self-guided attached', value: String(withTour), sub: 'properties paying a tour rate' },
    { label: 'Maps attached', value: String(withMaps), sub: 'properties paying a maps rate' }
  ];
};

export const generateRateCardRows = (state: DemoState) =>
  state.props.map((prop) => ({
    id: prop.id,
    name: prop.name,
    org: state.orgs.find((o) => o.id === prop.orgId)?.name ?? '—',
    touch: prop.billing.touch,
    tour: prop.billing.tour,
    maps: prop.billing.maps,
    combined: prop.billing.combined,
    month: prop.billing.month,
    stageLabel: STAGE_PILL[prop.stage].label,
    stageV: STAGE_PILL[prop.stage].v
  }));

export const generateOrgRollup = (state: DemoState) =>
  state.orgs
    .map((org) => {
      const list = state.props.filter((p) => p.orgId === org.id && p.billing.month !== 'Pending');
      const total = list.reduce((sum, p) => sum + money(p.billing.combined), 0);
      return {
        id: org.id,
        name: org.name,
        initials: initials(org.name),
        total: `$${total.toLocaleString()}`,
        detail: list.length
          ? `${plural(list.length, 'property', 'properties')} billing · ${org.pms.provider || 'No PMS'}`
          : 'No properties billing yet'
      };
    })
    .filter((row) => row.total !== '$0');
