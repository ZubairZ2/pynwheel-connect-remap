import { plural } from '~/core/utils/connect/format';
import { isProdStage } from '~/data/mock/core.mock';
import type { DemoState } from '~/core/store/demo/demo.state';

const money = (value: string): number => parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;

const LIVE_NOW: Record<string, string> = { all: '27', touch: '11', tour: '12', maps: '4' };
const LIVE_SUB: Record<string, string> = {
  all: 'Kiosk, self-guided and map sessions',
  touch: 'Kiosk sessions on-site',
  tour: 'Self-guided tours in progress',
  maps: 'Map widget sessions'
};

export const generateKpis = (state: DemoState) => {
  const rates = state.props
    .filter((p) => p.billing.month !== 'Pending')
    .reduce((sum, p) => sum + money(p.billing.combined), 0);

  return [
    {
      id: 'properties',
      label: 'Active Properties',
      value: String(state.props.filter((p) => isProdStage(p.stage)).length),
      delta: `of ${state.props.length} total`,
      deltaColor: '#4A7212'
    },
    {
      id: 'sessions',
      label: 'Sessions Right Now',
      value: LIVE_NOW[state.dashProduct],
      delta: LIVE_SUB[state.dashProduct],
      deltaColor: '#5B6270'
    },
    {
      id: 'alerts',
      label: 'Open Alerts',
      value: String(1 + state.abandoned.filter((a) => a.state === 'open').length),
      delta: '2 critical',
      deltaColor: '#C62534'
    },
    {
      id: 'rates',
      label: 'Contracted Rates',
      value: `$${rates.toLocaleString()}/mo`,
      delta: 'per-property rate cards',
      deltaColor: '#4A7212'
    }
  ];
};

const PRODUCT_DEFS = [
  { id: 'touch', label: 'Pynwheel Touch', note: 'Leasing-office kiosk', value: '318', sub: 'kiosk sessions today', key: 'touch' as const },
  { id: 'tour', label: 'Self-Guided Tours', note: 'Unaccompanied app tours', value: '46', sub: 'tours today', key: 'tour' as const },
  { id: 'maps', label: 'Maps & Wayfinding', note: 'Web and mobile map widget', value: '1,204', sub: 'map views today', key: 'maps' as const }
];

export const generateDashProducts = (state: DemoState) =>
  PRODUCT_DEFS.map((def) => {
    const billed = state.props.filter((p) => p.billing[def.key] && p.billing[def.key] !== '—').length;
    const active = state.dashProduct === def.id;
    return {
      ...def,
      propLabel: `${plural(billed, 'property', 'properties')} billed`,
      active,
      border: active ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: active ? 'var(--bo-accent-soft)' : 'var(--bo-panel)',
      valueColor: active ? 'var(--bo-accent)' : 'var(--bo-ink)'
    };
  });

export const DASH_SCOPE_LABEL: Record<string, string> = {
  all: 'All three products',
  touch: 'Pynwheel Touch only',
  tour: 'Self-Guided Tours only',
  maps: 'Maps & Wayfinding only'
};

export const TREND_TITLE: Record<string, string> = {
  all: 'Session Volume — Last 14 Days',
  touch: 'Kiosk Sessions — Last 14 Days',
  tour: 'Self-Guided Tours — Last 14 Days',
  maps: 'Map Views — Last 14 Days'
};

const TREND_BASE = [38, 52, 45, 61, 58, 72, 66, 80, 74, 69, 88, 95, 84, 92];
const TREND_MULT: Record<string, number> = { all: 1, touch: 0.74, tour: 0.26, maps: 0.93 };

export const generateTrendBars = (product: string) => {
  const mult = TREND_MULT[product] ?? 1;
  return TREND_BASE.map((height, index) => ({
    h: Math.max(6, Math.round(height * 1.6 * mult)),
    op: (0.55 + 0.03 * index).toFixed(2),
    d: index % 2 ? '' : String(index + 8)
  }));
};

const LIVE_TOURS = [
  { property: 'Luxe Mile High', stop: 'At Rooftop Pool', elapsed: '4m', product: 'Self-Guided', pk: 'tour', propId: 'luxe' },
  { property: 'Cortland Sky', stop: 'Kiosk · Comparing Floorplans', elapsed: '7m', product: 'Touch', pk: 'touch', propId: 'cortsky' },
  { property: 'Mill Creek Parkside', stop: 'Resort Pool', elapsed: '2m', product: 'Self-Guided', pk: 'tour', propId: 'millpark' },
  { property: 'Alliance Uptown Residences', stop: 'Map Widget · Site Plan', elapsed: '11m', product: 'Maps', pk: 'maps', propId: 'uptown' },
  { property: 'Luxe Mile High', stop: 'Kiosk · Amenity Gallery', elapsed: '1m', product: 'Touch', pk: 'touch', propId: 'luxe' }
];

export const generateLiveTours = (product: string) =>
  LIVE_TOURS.filter((tour) => product === 'all' || tour.pk === product);

export const DASH_ALERTS = [
  { title: '2 abandoned self-guided tours', sub: 'Idle over 60 minutes · Luxe Mile High, Mill Creek Parkside', variant: 'crit', tag: 'Critical', color: '#E03B45', bg: '#FDEDEF', border: '#F9DCE0', target: { kind: 'screen', id: 'scheduling' } },
  { title: 'PMS sync failing', sub: 'Luxe Mile High · Yardi connector', variant: 'crit', tag: 'Critical', color: '#E03B45', bg: '#FDEDEF', border: '#F9DCE0', target: { kind: 'prop', id: 'luxe' } },
  { title: 'Build rejected by App Store', sub: 'Mill Creek Parkside · v5.2.0', variant: 'crit', tag: 'Critical', color: '#E03B45', bg: '#FDEDEF', border: '#F9DCE0', target: { kind: 'prop', id: 'millpark' } },
  { title: 'PMS credential expiring', sub: 'Cortland · RealPage push-down disabled', variant: 'warn', tag: 'PMS', color: '#C9A200', bg: '#FFF4D4', border: '#FFECAE', target: { kind: 'org', id: 'cortland' } }
] as const;

export const RECENT_SIGNUPS = [
  { name: 'Willow Bridge', plan: 'No PMS configured', when: '2d ago', status: 'Onboarding', variant: 'warn', initials: 'WB', orgId: 'willow' },
  { name: 'Bell Partners', plan: 'ResMan', when: '1w ago', status: 'Activated', variant: 'info', initials: 'BP', orgId: 'bell' },
  { name: 'Mill Creek', plan: 'Yardi Voyager', when: '2w ago', status: 'In Production', variant: 'live', initials: 'MC', orgId: 'millcreek' },
  { name: 'Cortland', plan: 'RealPage', when: '3w ago', status: 'Final Approval', variant: 'submitted', initials: 'CO', orgId: 'cortland' }
] as const;
