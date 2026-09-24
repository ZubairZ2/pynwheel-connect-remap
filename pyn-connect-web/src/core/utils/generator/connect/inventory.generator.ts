import { plural } from '~/core/utils/connect/format';
import { AMENITY_CATEGORIES, AVAIL, LEASE_TERMS } from '~/data/mock/core.mock';
import { curInv, curLevel, levels, lvAssets } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

/** Gallery entries are keys in the demo data, not URLs. */
export const photoSrc = (key: string): string =>
  key === 'pool' ? '/images/amenity-pool.jpg' : '/images/amenity-thumb.jpg';

export const generateUnitDetail = (state: DemoState) => {
  const inv = curInv(state);
  const unit = inv.units.find((u) => u.id === state.unitId) ?? inv.units[0];
  if (!unit) return null;

  const plan = inv.floorplans.find((f) => f.id === unit.fpId) ?? {
    name: '—',
    beds: 0,
    baths: 1,
    terms: {} as Record<number, number>
  };
  const level = levels(state).find((l) => l.id === (unit.plevel ?? unit.level));

  const field = (key: 'price' | 'sqft', label: string, value: string) => {
    const manual = unit.src[key] === 'manual';
    return {
      key,
      label,
      value,
      manual,
      srcLabel: manual ? 'Manual' : 'PMS',
      srcV: manual ? 'info' : 'neutral'
    };
  };

  return {
    id: unit.id,
    name: unit.name,
    fpName: plan.name,
    bedLabel: `${plan.beds === 0 ? 'Studio' : `${plan.beds} Bed`} · ${plan.baths} Bath`,
    availLabel: AVAIL[unit.avail].label,
    availV: AVAIL[unit.avail].v,
    avail: unit.avail,
    availOptions: ['available', 'almost', 'sold'],
    priceLabel: `$${unit.price.toLocaleString()}/month`,
    sqftLabel: `${unit.sqft.toLocaleString()} sq.ft`,
    where: level ? `${level.building} · ${level.floor}` : 'No floorplate assigned',
    pmsFloor: `${unit.building} · ${unit.floor}`,
    plottedLabel: unit.plotted ? 'Plotted' : 'Not on map',
    plottedV: unit.plotted ? 'ok' : 'warn',
    plotted: !!unit.plotted,
    notPlotted: !unit.plotted,
    coord: typeof unit.px === 'number' ? `${Math.round(unit.px)}%, ${Math.round(unit.py ?? 0)}%` : '—',
    fields: [field('price', 'Price (USD)', String(unit.price)), field('sqft', 'Square feet', String(unit.sqft))],
    photoCount: plural(unit.gallery.length, 'photo'),
    hasPhotos: unit.gallery.length > 0,
    photos: unit.gallery.map((key, index) => ({ src: photoSrc(key), pos: `#${index + 1}`, index })),
    termRows: LEASE_TERMS.map((term) => ({
      label: term === 12 ? `${term} mo · Base` : `${term} mo`,
      value: `$${(plan.terms[term] ?? 0).toLocaleString()}`,
      border: term === 12 ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: term === 12 ? 'var(--bo-accent-soft)' : '#fff',
      labelColor: term === 12 ? 'var(--bo-accent)' : 'var(--bo-subtle)',
      valueColor: term === 12 ? 'var(--bo-accent)' : 'var(--bo-ink)'
    })),
    viewLabel: unit.plotted ? 'View on Plan' : 'Plot on Plan'
  };
};

/* ---------------- Property Inventory tabs ---------------- */

export const generateTcTabs = (state: DemoState) => {
  const inv = curInv(state);
  const unplotted =
    inv.units.filter((u) => !u.plotted).length + inv.amenities.filter((a) => !a.plotted).length;

  return [
    { id: 'floorplates', label: 'Floorplates', n: levels(state).length },
    { id: 'floorplans', label: 'Floorplans', n: inv.floorplans.length },
    { id: 'units', label: 'Units', n: inv.units.length },
    { id: 'amenities', label: 'Amenities', n: inv.amenities.length },
    { id: 'unplotted', label: 'Unplotted', n: unplotted }
  ].map((tab) => ({
    ...tab,
    count: String(tab.n),
    active: state.tcTab === tab.id,
    bg: state.tcTab === tab.id ? 'var(--bo-ink)' : '#fff',
    color: state.tcTab === tab.id ? '#fff' : 'var(--bo-muted)',
    border: state.tcTab === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)',
    badgeBg: state.tcTab === tab.id ? 'rgba(255,255,255,0.16)' : '#EEF0F4',
    badgeColor: state.tcTab === tab.id ? '#fff' : 'var(--bo-subtle)'
  }));
};

export const generateInvFloorplans = (state: DemoState) => {
  const inv = curInv(state);

  return inv.floorplans.map((plan) => ({
    ...plan,
    bedLabel: `${plan.beds === 0 ? 'Studio' : `${plan.beds} Bed`} · ${plan.baths} Bath`,
    sqftLabel: `${plan.sqft.toLocaleString()} sq.ft`,
    rentLabel: `$${plan.rent.toLocaleString()}/month`,
    depositLabel: `$${plan.deposit.toLocaleString()}`,
    statusLabel: AVAIL[plan.status].label,
    statusV: AVAIL[plan.status].v,
    unitCount: plural(inv.units.filter((u) => u.fpId === plan.id).length, 'unit'),
    termRows: LEASE_TERMS.map((term) => ({
      term: `${term} mo`,
      value: `$${(plan.terms[term] ?? 0).toLocaleString()}`,
      raw: String(plan.terms[term] ?? 0),
      fmt: (plan.terms[term] ?? 0).toLocaleString(),
      label: term === 12 ? `${term} mo · Base` : `${term} mo`,
      border: term === 12 ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: term === 12 ? 'var(--bo-accent-soft)' : '#fff',
      labelColor: term === 12 ? 'var(--bo-accent)' : 'var(--bo-subtle)',
      valueColor: term === 12 ? 'var(--bo-accent)' : 'var(--bo-ink)',
      termKey: term
    })),
    photoCount: plural(plan.gallery.length, 'photo'),
    hasPhotos: plan.gallery.length > 0,
    photos: plan.gallery.map((key, index) => ({ src: photoSrc(key), pos: `#${index + 1}`, index })),
    srcRows: (
      [
        ['rent', 'Rent'],
        ['deposit', 'Deposit'],
        ['sqft', 'Sq Ft']
      ] as const
    ).map(([key, label]) => {
      const manual = plan.src[key] === 'manual';
      return { key, label, manual, srcLabel: manual ? 'Manual' : 'PMS', srcV: manual ? 'info' : 'neutral' };
    })
  }));
};

export const generateInvUnits = (state: DemoState) => {
  const inv = curInv(state);
  const residents = state.residents[state.propId] ?? [];

  return inv.units.map((unit) => {
    const plan = inv.floorplans.find((f) => f.id === unit.fpId);
    const number = unit.name.match(/\d+/)?.[0] ?? '';
    const paired = residents.some((r) => r.unit === number && r.grants.Unit);

    const field = (key: 'price' | 'sqft' | 'avail', label: string, value: string) => ({
      key,
      label,
      value,
      manual: unit.src[key] === 'manual',
      srcLabel: unit.src[key] === 'manual' ? 'Manual' : 'PMS',
      srcV: unit.src[key] === 'manual' ? 'info' : 'neutral'
    });

    return {
      ...unit,
      fpName: plan?.name ?? '—',
      availLabel: AVAIL[unit.avail].label,
      availV: AVAIL[unit.avail].v,
      priceLabel: `$${unit.price.toLocaleString()}/mo`,
      sqftLabel: `${unit.sqft.toLocaleString()} sq.ft`,
      where: `${unit.building} · ${unit.floor}`,
      lockColor: paired ? '#2E9C6A' : '#A9B0BC',
      lockTitle: paired ? 'Smart lock paired' : 'No lock paired',
      plottedLabel: unit.plotted ? 'Plotted' : 'Not on map',
      plottedV: unit.plotted ? 'ok' : 'warn',
      photoCount: plural(unit.gallery.length, 'photo'),
      fields: [
        field('price', 'Price', `$${unit.price.toLocaleString()}`),
        field('sqft', 'Sq Ft', unit.sqft.toLocaleString()),
        field('avail', 'Availability', AVAIL[unit.avail].label)
      ]
    };
  });
};

export const generateInvAmenities = (state: DemoState) => {
  const levelList = levels(state);

  return curInv(state).amenities.map((amenity) => {
    const level = levelList.find((l) => l.id === (amenity.plevel ?? amenity.level));
    return {
      ...amenity,
      categoryOptions: AMENITY_CATEGORIES,
      photoCount: plural(amenity.gallery.length, 'photo'),
      whereLabel: level ? `${level.building} · ${level.floor}` : 'No floorplate',
      plottedLabel: amenity.plotted ? 'Plotted' : 'Not on map',
      plottedV: amenity.plotted ? 'ok' : 'warn',
      photos: amenity.gallery.map((key, index) => ({ src: photoSrc(key), pos: `#${index + 1}`, index }))
    };
  });
};

/** A floor range like "3-10" reads as "Floors 3–10"; anything else is named. */
export const rangeLabelOf = (range: string | undefined): string => {
  const value = String(range ?? '').trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) return `Floor ${value}`;
  if (/^\d+\s*-\s*\d+$/.test(value)) return `Floors ${value.replace(/\s*-\s*/, '–')}`;
  if (/^\d+(\s*,\s*\d+)+$/.test(value)) return `Floors ${value.split(',').map((x) => x.trim()).join(', ')}`;
  return '';
};

export const generateFloorplates = (state: DemoState) => {
  const inv = curInv(state);
  const current = curLevel(state);

  return levels(state).map((level) => {
    const assets = lvAssets(state, level);
    const unitsHere = inv.units.filter((u) => (u.plevel ?? u.level) === level.id);
    const amenitiesHere = inv.amenities.filter((a) => (a.plevel ?? a.level) === level.id);
    const all = [...unitsHere, ...amenitiesHere];
    const placed = all.filter((o) => o.plotted).length;
    const opt = state.svgOpt[level.id];
    const extended = level as typeof level & { range?: string; showFloorName?: boolean };

    return {
      id: level.id,
      building: level.building,
      floor: level.floor,
      planLabel: assets.has ? (assets.svg ? 'SVG Ready' : 'Background Only') : 'No Plan',
      planV: assets.has ? (assets.svg ? 'ok' : 'info') : 'crit',
      unitLabel: plural(unitsHere.length, 'unit'),
      amenityLabel: plural(amenitiesHere.length, 'amenity', 'amenities'),
      plottedLabel: `${placed} of ${all.length} plotted`,
      barPct: `${all.length ? Math.round((placed / all.length) * 100) : 0}%`,
      rangeLabel: `${
        extended.range
          ? `Covers ${(rangeLabelOf(extended.range) || extended.range).toLowerCase()}`
          : 'Named floorplate'
      }${extended.showFloorName ? ' · floor name shown on map' : ''}`,
      hasPlan: assets.has,
      noPlan: !assets.has,
      current: level.id === current?.id,
      rowBorder: level.id === current?.id ? 'var(--bo-accent)' : 'var(--bo-line)',
      bgFile: assets.bg || 'No background image',
      hasBg: !!assets.bg,
      noBg: !assets.bg,
      svgFile: assets.svg || 'No floor SVG',
      hasSvg: !!assets.svg,
      noSvg: !assets.svg,
      bgBorder: assets.bg ? 'var(--bo-line)' : '#FFECAE',
      bgBg: assets.bg ? '#FBFBFC' : '#FFF4D4',
      svgBorder: assets.svg ? 'var(--bo-line)' : '#FFECAE',
      svgBg: assets.svg ? '#FBFBFC' : '#FFF4D4',
      optRun: !!opt,
      optStatusV: opt?.valid ? 'ok' : 'warn',
      optStatusLabel: opt?.valid ? 'Valid' : 'Needs Attention',
      optSize: opt ? `${opt.beforeKb} KB → ${opt.afterKb} KB` : '',
      optNodes: opt ? `${opt.nodesBefore.toLocaleString()} → ${opt.nodesAfter.toLocaleString()}` : '',
      optPaths: opt ? opt.pathsAfter.toLocaleString() : '',
      optNote: opt
        ? opt.valid
          ? 'Geometry parses cleanly and is ready for the kiosk map.'
          : 'Some paths use unsupported filters — review before publishing.'
        : ''
    };
  });
};

export const generateFloorplateSummary = (state: DemoState): string =>
  `${plural(levels(state).length, 'floorplate')} · ${
    levels(state).filter((l) => !lvAssets(state, l).svg).length
  } without a floor SVG`;

export const generateUnplotted = (state: DemoState) => {
  const inv = curInv(state);
  const levelList = levels(state);

  const units = inv.units
    .filter((u) => !u.plotted)
    .map((unit) => ({
      ...unit,
      fpName: inv.floorplans.find((f) => f.id === unit.fpId)?.name ?? '—',
      where: `${unit.building} · ${unit.floor}`,
      priceLabel: `$${unit.price.toLocaleString()}/mo`,
      availLabel: AVAIL[unit.avail].label,
      availV: AVAIL[unit.avail].v
    }));

  const amenities = inv.amenities
    .filter((a) => !a.plotted)
    .map((amenity) => {
      const level = levelList.find((l) => l.id === (amenity.plevel ?? amenity.level));
      return {
        ...amenity,
        where: level ? `${level.building} · ${level.floor}` : 'No matching level',
        photoCount: plural(amenity.gallery.length, 'photo')
      };
    });

  return {
    unplottedUnits: units,
    unplottedAmenities: amenities,
    unplottedClear: units.length === 0,
    unplottedAmenitiesClear: amenities.length === 0,
    unplottedCount: `${plural(units.length, 'unit')} not yet on the map`,
    unplottedAmenityCount: `${plural(amenities.length, 'amenity', 'amenities')} not yet on the map`
  };
};
