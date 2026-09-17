import { PAGE_TYPES, POI_CATEGORIES, POI_RESULTS, SEED_HOOD } from '~/data/mock/content.mock';
import type { DemoState } from '~/core/store/demo/demo.state';

export const generateContentTabs = (active: string) =>
  [
    { id: 'pages', label: 'Pages & Galleries' },
    { id: 'home', label: 'Homepage & Brochure' },
    { id: 'hood', label: 'Neighborhood Guide' }
  ].map((tab) => ({
    ...tab,
    active: active === tab.id,
    bg: active === tab.id ? 'var(--bo-ink)' : '#fff',
    color: active === tab.id ? '#fff' : 'var(--bo-muted)',
    border: active === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));

export const generateContentPages = (state: DemoState) => {
  const list = state.pages[state.propId] ?? [];
  return list.map((page, index) => ({
    ...page,
    typeLabel: PAGE_TYPES[page.type].label,
    icon: PAGE_TYPES[page.type].icon,
    num: index + 1,
    toggleBg: page.onHome ? 'var(--bo-accent)' : '#CDD2DB',
    knob: page.onHome ? '21px' : '3px',
    upOp: index === 0 ? '0.3' : '1',
    downOp: index === list.length - 1 ? '0.3' : '1'
  }));
};

export const generateHomeTiles = (state: DemoState) => {
  const list = state.tiles[state.propId] ?? [];
  return list.map((tile, index) => ({
    ...tile,
    num: index + 1,
    upOp: index === 0 ? '0.3' : '1',
    downOp: index === list.length - 1 ? '0.3' : '1',
    cropLabel: tile.cropped ? 'Cropped' : 'Needs crop',
    cropV: tile.cropped ? 'ok' : 'warn'
  }));
};

export const generateBrochureLinks = (state: DemoState) =>
  (state.brochure[state.propId] ?? []).map((link) => ({
    ...link,
    toggleBg: link.on ? 'var(--bo-accent)' : '#CDD2DB',
    knob: link.on ? '21px' : '3px',
    statusLabel: link.on ? 'In brochure' : 'Hidden',
    statusV: link.on ? 'ok' : 'neutral'
  }));

/** The neighborhood guide, including its 400-call POI lookup quota. */
export const generateHoodView = (state: DemoState) => {
  const hood = state.hood[state.propId] ?? SEED_HOOD.wharf;
  const pct = Math.min(100, Math.round((hood.calls / 400) * 100));
  const level = hood.calls >= 400 ? 'crit' : hood.calls >= 200 ? 'warn' : 'ok';

  return {
    ...hood,
    radiusLabel: `${hood.radius} mi`,
    pct: `${pct}%`,
    quotaLabel: `${hood.calls} / 400 calls`,
    quotaColor: level === 'crit' ? '#E03B45' : level === 'warn' ? '#C9A200' : '#5C8E1C',
    quotaBg: level === 'crit' ? '#FDEDEF' : level === 'warn' ? '#FFF4D4' : '#EEF5E1',
    quotaPill: level === 'crit' ? 'Throttled' : level === 'warn' ? 'Alert sent at 200' : 'Healthy',
    quotaV: level,
    quotaNote:
      level === 'crit'
        ? 'Hard limit reached — lookups blocked until next billing month.'
        : level === 'warn'
          ? 'Warning threshold passed. Second alert fires at 400 calls, where lookups are throttled.'
          : 'Under the 200-call warning threshold.'
  };
};

export const generateHoodCats = (state: DemoState) => {
  const hood = state.hood[state.propId] ?? SEED_HOOD.wharf;
  return POI_CATEGORIES.map((category) => {
    const on = hood.cats.includes(category);
    return {
      label: category,
      on,
      bg: on ? 'var(--bo-accent-soft)' : '#fff',
      border: on ? 'var(--bo-accent)' : 'var(--bo-line)',
      color: on ? 'var(--bo-accent)' : 'var(--bo-subtle)'
    };
  });
};

export const generatePoiResults = (state: DemoState) => {
  const cats = (state.hood[state.propId] ?? SEED_HOOD.wharf).cats;
  return POI_RESULTS.filter((poi) => cats.includes(poi.cat));
};
