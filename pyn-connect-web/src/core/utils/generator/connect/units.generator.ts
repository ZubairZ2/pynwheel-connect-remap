import { plural } from '~/core/utils/connect/format';
import { AVAIL } from '~/data/mock/core.mock';
import { curInv } from '~/core/store/demo/demo.selectors';
import type { Unit } from '~/core/models/data/connect/inventory.data';
import type { DemoState } from '~/core/store/demo/demo.state';

/** Search + sort for the Units tab, exactly as the design orders them. */
export const filteredUnits = (state: DemoState): Unit[] => {
  const inv = curInv(state);
  const needle = state.puQuery.trim().toLowerCase();
  const planName = (id: string) => inv.floorplans.find((f) => f.id === id)?.name ?? '—';

  let rows = inv.units.slice();
  if (needle) {
    rows = rows.filter((u) =>
      `${u.name} ${planName(u.fpId)} ${u.floor} ${u.building}`.toLowerCase().includes(needle)
    );
  }

  const key = state.puSort;
  const dir = state.puSortDir;

  return rows.sort((a, b) => {
    const av = key === 'price' ? a.price : key === 'fp' ? planName(a.fpId) : key === 'avail' ? a.avail : a.name;
    const bv = key === 'price' ? b.price : key === 'fp' ? planName(b.fpId) : key === 'avail' ? b.avail : b.name;
    return (av > bv ? 1 : av < bv ? -1 : 0) * dir;
  });
};

const availDate = (avail: string) =>
  avail === 'available' ? 'Available Now' : avail === 'almost' ? 'Jun 15, 2026' : 'Leased';

export const generateUnitRows = (state: DemoState) => {
  const inv = curInv(state);
  const residents = state.residents[state.propId] ?? [];
  const planName = (id: string) => inv.floorplans.find((f) => f.id === id)?.name ?? '—';

  return filteredUnits(state).map((unit) => {
    const avail = AVAIL[unit.avail] ?? AVAIL.available;
    const manual = unit.src.price === 'manual';
    const number = unit.name.match(/\d+/)?.[0] ?? '';
    const paired = residents.some((r) => r.unit === number && r.grants.Unit);

    return {
      id: unit.id,
      name: unit.name,
      fpName: planName(unit.fpId),
      priceLabel: `$${(unit.price || 0).toLocaleString()}`,
      availDate: availDate(unit.avail),
      availV: avail.v,
      availLabel: avail.label,
      ovBg: manual ? 'var(--bo-accent)' : '#CDD2DB',
      ovKnob: manual ? '20px' : '3px',
      lockColor: paired ? '#2E9C6A' : '#A9B0BC',
      lockTitle: paired ? 'Smart lock paired' : 'No lock paired',
      floorBldg: `${unit.floor} · ${unit.building}`
    };
  });
};

export const generatePlanCards = (state: DemoState) =>
  curInv(state).floorplans.map((plan) => {
    const avail = AVAIL[plan.status] ?? AVAIL.available;
    const hasImg = plan.gallery.length > 0;

    return {
      id: plan.id,
      name: plan.name,
      spec: `${(plan.sqft || 0).toLocaleString()} sq.ft · $${(plan.rent || 0).toLocaleString()}`,
      bedLabel: plan.beds === 0 ? 'Studio' : plural(plan.beds, 'Bed'),
      sqftLabel: `${(plan.sqft || 0).toLocaleString()} sq.ft`,
      statusV: avail.v,
      statusLabel: avail.label,
      hasImg,
      noImg: !hasImg
    };
  });

export const generateUnitsSummary = (state: DemoState) => {
  const inv = curInv(state);
  const rows = filteredUnits(state);

  return {
    puSummary: `${plural(inv.units.length, 'unit')} · ${plural(inv.floorplans.length, 'floor plan')}`,
    puUnitsCount: inv.units.length,
    puPlansCount: inv.floorplans.length,
    puIsUnits: state.puTab === 'units',
    puIsPlans: state.puTab === 'floorplans',
    puUnitsBorder: state.puTab === 'units' ? 'var(--bo-accent)' : 'transparent',
    puUnitsColor: state.puTab === 'units' ? 'var(--bo-ink)' : 'var(--bo-subtle)',
    puPlansBorder: state.puTab === 'floorplans' ? 'var(--bo-accent)' : 'transparent',
    puPlansColor: state.puTab === 'floorplans' ? 'var(--bo-ink)' : 'var(--bo-subtle)',
    puUnitsEmpty: rows.length === 0,
    puHasUnits: rows.length > 0,
    puPlansEmpty: inv.floorplans.length === 0,
    puEmptyTitle: inv.units.length === 0 ? 'No units yet' : 'No units match your search',
    puEmptyBody:
      inv.units.length === 0
        ? 'Units populate from the PMS feed, or add one manually.'
        : 'Try a different unit number, floor plan, or floor.',
    puSortNameArrow: state.puSort === 'name' ? (state.puSortDir > 0 ? '↑' : '↓') : '',
    puSortFpArrow: state.puSort === 'fp' ? (state.puSortDir > 0 ? '↑' : '↓') : '',
    puSortPriceArrow: state.puSort === 'price' ? (state.puSortDir > 0 ? '↑' : '↓') : '',
    puSortAvailArrow: state.puSort === 'avail' ? (state.puSortDir > 0 ? '↑' : '↓') : ''
  };
};

export const MASS_OVERRIDE_OPTIONS = [
  { id: 'protect', label: 'Protect price from next PMS sync (manual override on)' },
  { id: 'release', label: 'Follow PMS feed again (manual override off)' },
  { id: 'availYes', label: 'Mark all as Available' },
  { id: 'availNo', label: 'Mark all as Unavailable' }
];

export const massOverrideWarning = (action: string | undefined): string =>
  action === 'release'
    ? 'Manual price overrides are cleared — the next PMS sync will overwrite these prices.'
    : action === 'availYes'
      ? 'Availability is forced to Available and protected from the next sync.'
      : action === 'availNo'
        ? 'Availability is forced to Unavailable and protected from the next sync.'
        : 'Current prices are locked as manual overrides and protected from the next PMS sync.';
