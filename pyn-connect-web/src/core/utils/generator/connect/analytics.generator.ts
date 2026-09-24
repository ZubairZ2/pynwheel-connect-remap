import { DEVICE_SPLIT, SURFACES } from '~/data/mock/analytics.mock';
import { PROP_ANALYTICS } from '~/data/mock/core.mock';
import type { Prop } from '~/core/models/data/connect/account.data';
import type { DemoState } from '~/core/store/demo/demo.state';

const RANGE_MULT: Record<string, number> = {
  'Last 7 days': 0.24,
  'Last 30 days': 1,
  'Last 90 days': 2.85,
  'Year to date': 7.4,
  Custom: 1.6
};

/** The properties the current scope selector resolves to. */
export const scopedProps = (state: DemoState): Prop[] => {
  if (state.scope === 'org') {
    const id = state.scopeId || state.orgs[0]?.id;
    return state.props.filter((p) => p.orgId === id);
  }

  if (state.scope === 'region') {
    let hit: { orgId: string; name: string } | null = null;
    state.orgs.forEach((org) =>
      org.regions.forEach((region) => {
        if (region.id === state.scopeId) hit = { orgId: org.id, name: region.name };
      })
    );
    if (!hit) {
      const org = state.orgs.find((o) => o.regions.length);
      hit = org ? { orgId: org.id, name: org.regions[0].name } : null;
    }
    const resolved = hit as { orgId: string; name: string } | null;
    return resolved
      ? state.props.filter((p) => p.orgId === resolved.orgId && p.region === resolved.name)
      : [];
  }

  if (state.scope === 'property') {
    const id = state.scopeId || state.props[0]?.id;
    return state.props.filter((p) => p.id === id);
  }

  return state.props;
};

export interface AnalyticsTotals {
  props: Prop[];
  tours: number;
  completed: number;
  abandoned: number;
  leases: number;
  surf: Array<{ sessions: number; pct: number }>;
  dev: number[];
}

/** Aggregates the per-property analytics fixtures over the current scope. */
export const analyticsTotals = (state: DemoState): AnalyticsTotals => {
  const props = scopedProps(state);
  const mult = RANGE_MULT[state.dateRange] ?? 1;

  let tours = 0;
  let completed = 0;
  let leases = 0;
  const surf = [0, 0, 0, 0, 0];
  const dev = [0, 0, 0, 0];

  props.forEach((prop) => {
    const a = PROP_ANALYTICS[prop.id] ?? {
      tours: 0,
      completion: 0,
      conversion: 0,
      surf: [0, 0, 0, 0, 0],
      dev: [0, 0, 0, 0]
    };
    const t = Math.round(a.tours * mult);
    tours += t;
    completed += Math.round((t * a.completion) / 100);
    leases += (t * a.conversion) / 100;
    a.surf.forEach((v, i) => {
      surf[i] += (t * v) / 100;
    });
    a.dev.forEach((v, i) => {
      dev[i] += (t * v) / 100;
    });
  });

  const sessions = surf.reduce((x, y) => x + y, 0) || 1;
  const devTotal = dev.reduce((x, y) => x + y, 0) || 1;

  return {
    props,
    tours,
    completed,
    abandoned: tours - completed,
    leases,
    surf: surf.map((v) => ({ sessions: Math.round(v), pct: Math.round((v / sessions) * 100) })),
    dev: dev.map((v) => Math.round((v / devTotal) * 100))
  };
};

export const generateScopeOptions = (state: DemoState) => {
  if (state.scope === 'org') return state.orgs.map((o) => ({ id: o.id, name: o.name }));
  if (state.scope === 'region') {
    const out: Array<{ id: string; name: string }> = [];
    state.orgs.forEach((org) =>
      org.regions.forEach((region) => out.push({ id: region.id, name: `${org.name} — ${region.name}` }))
    );
    return out;
  }
  return state.props.map((p) => ({ id: p.id, name: p.name }));
};

export const generateScopeSummary = (state: DemoState): string => {
  if (state.scope === 'platform') return `All companies and properties · ${state.dateRange}`;
  const label = state.scope === 'org' ? 'company' : state.scope === 'region' ? 'region' : 'property';
  const options = generateScopeOptions(state);
  const selected = options.find((o) => o.id === state.scopeId) ?? options[0];
  return `Scoped to one ${label}: ${selected?.name ?? '—'} · ${state.dateRange}`;
};

export const generateScopeTabs = (scope: string) =>
  [
    { id: 'platform', label: 'Platform-wide' },
    { id: 'org', label: 'Company' },
    { id: 'region', label: 'Region' },
    { id: 'property', label: 'Property' }
  ].map((tab) => ({
    ...tab,
    active: scope === tab.id,
    bg: scope === tab.id ? 'var(--bo-ink)' : '#fff',
    color: scope === tab.id ? '#fff' : 'var(--bo-muted)',
    border: scope === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));

export const generateAnalyticsKpis = (state: DemoState) => {
  const a = analyticsTotals(state);
  const completion = a.tours ? Math.round((a.completed / a.tours) * 100) : 0;

  return [
    { label: 'Tours started', value: a.tours.toLocaleString(), sub: state.dateRange.toLowerCase() },
    { label: 'Completion rate', value: `${completion}%`, sub: `${a.completed.toLocaleString()} finished` },
    {
      label: 'Lead → lease',
      value: `${(a.tours ? (a.leases / a.tours) * 100 : 0).toFixed(1)}%`,
      sub: `${Math.round(a.leases)} signed leases`
    },
    {
      label: 'Properties in scope',
      value: String(a.props.length),
      sub: a.props.length === 1 ? a.props[0].name : 'aggregated'
    }
  ];
};

export const generateFunnel = (state: DemoState) => {
  const a = analyticsTotals(state);
  const pct = (n: number) => (a.tours ? `${Math.round((n / a.tours) * 100)}%` : '0%');

  return [
    { label: 'Tours Started', value: a.tours.toLocaleString(), pct: a.tours ? '100%' : '0%' },
    { label: 'Tours Completed', value: a.completed.toLocaleString(), pct: pct(a.completed) },
    { label: 'Abandoned', value: a.abandoned.toLocaleString(), pct: pct(a.abandoned) }
  ];
};

export const generateSurfaceRows = (state: DemoState) => {
  const a = analyticsTotals(state);
  return SURFACES.map((surface, index) => ({
    ...surface,
    sessions: a.surf[index].sessions,
    sessionsLabel: a.surf[index].sessions.toLocaleString(),
    pctLabel: `${a.surf[index].pct}%`,
    barWidth: `${a.surf[index].pct}%`,
    deltaColor: surface.delta.charAt(0) === '-' ? '#E03B45' : '#4A7212'
  }));
};

export const generateDeviceSplit = (state: DemoState) => {
  const a = analyticsTotals(state);
  return DEVICE_SPLIT.map((slice, index) => ({
    ...slice,
    pct: a.dev[index],
    pctLabel: `${a.dev[index]}%`,
    barWidth: `${a.dev[index]}%`
  }));
};

/** Native-app vs QR entry split, derived from the device mix. */
const entryNative = (state: DemoState): number => {
  const dev = analyticsTotals(state).dev;
  return Math.min(92, Math.max(8, 100 - (dev[1] ?? 0) - Math.round((dev[2] ?? 0) / 2)));
};

export const generateEntrySplit = (state: DemoState) => {
  const native = entryNative(state);
  return {
    entryNativePct: `${native}%`,
    entryQrPct: `${100 - native}%`,
    entryConic: `conic-gradient(var(--bo-accent) 0 ${native}%, #EEF0F3 ${native}% 100%)`
  };
};

export const generateTopProps = (state: DemoState) => {
  const a = analyticsTotals(state);
  const mult = RANGE_MULT[state.dateRange] ?? 1;

  return a.props
    .map((prop) => {
      const x = PROP_ANALYTICS[prop.id] ?? { tours: 0, completion: 0, conversion: 0 };
      return {
        id: prop.id,
        name: prop.name,
        raw: x.tours,
        tours: Math.round(x.tours * mult).toLocaleString(),
        completion: `${x.completion}%`,
        conversion: `${x.conversion}%`
      };
    })
    .sort((a1, b1) => b1.raw - a1.raw);
};
