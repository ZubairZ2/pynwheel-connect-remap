import type { PlotTarget } from './floorSvg';

/**
 * The Auto Plot wizard's matching engine: PMS unit numbers against SVG
 * polygon IDs, with the pattern rules of the design (tokens, find & replace,
 * trim, pad & wrap, comparison switches). Pure functions over data already
 * loaded on the page; nothing here is sent anywhere.
 *
 * The legacy CMS matches a unit to a polygon by the room label or id after
 * stripping every non-alphanumeric character (`svgAutoPlotting.js`
 * `normalize`); "ignore separators + ignore letter case" reproduces that.
 */

export type ApDir = 'pms' | 'svg';
export type ApTrim = 'none' | 'dropFirst' | 'dropLast' | 'keepFirst' | 'keepLast';

export interface ApReplace {
  find: string;
  repl: string;
}

export interface ApRules {
  /** Which side the rules rewrite. */
  dir: ApDir;
  pattern: string;
  replaces: ApReplace[];
  trim: ApTrim;
  trimN: string;
  pad: string;
  prefix: string;
  suffix: string;
  ignoreSep: boolean;
  ignoreZeros: boolean;
  ignoreCase: boolean;
}

export const apDefault = (dir: ApDir = 'pms'): ApRules => ({
  dir,
  pattern: dir === 'svg' ? '{id}' : '{unit}',
  replaces: [],
  trim: 'none',
  trimN: '2',
  pad: '',
  prefix: '',
  suffix: '',
  ignoreSep: false,
  ignoreZeros: false,
  ignoreCase: true
});

/** "Exact match": the number is compared to the id as is (letter case aside). */
export const apIsDefault = (r: ApRules): boolean =>
  (r.pattern === '{unit}' || r.pattern === '{id}') &&
  !r.replaces.some((x) => x.find) &&
  r.trim === 'none' &&
  !r.pad &&
  !r.prefix &&
  !r.suffix &&
  !r.ignoreSep &&
  !r.ignoreZeros;

export interface ApToken {
  t: string;
  d: string;
}

export const AP_TOKENS: Record<ApDir, ApToken[]> = {
  pms: [
    { t: '{unit}', d: 'Full PMS number' },
    { t: '{digits}', d: 'Digits only' },
    { t: '{letters}', d: 'Letters only' },
    { t: '{floor}', d: 'PMS floor' },
    { t: '{floor2}', d: 'Floor, 2 digits' },
    { t: '{stack}', d: 'Last 2 digits' },
    { t: '{stack3}', d: 'Last 3 digits' },
    { t: '{bldg}', d: 'Building code' }
  ],
  svg: [
    { t: '{id}', d: 'Full polygon ID' },
    { t: '{digits}', d: 'Digits only' },
    { t: '{letters}', d: 'Letters only' },
    { t: '{floor}', d: 'Floorplate floor' },
    { t: '{floor2}', d: 'Floor, 2 digits' },
    { t: '{stack}', d: 'Last 2 digits' },
    { t: '{stack3}', d: 'Last 3 digits' },
    { t: '{bldg}', d: 'Building code' }
  ]
};

export interface ApPreset {
  l: string;
  p: string;
}

export const AP_PRESETS: Record<ApDir, ApPreset[]> = {
  pms: [
    { l: 'As is', p: '{unit}' },
    { l: 'Stack only', p: '{stack}' },
    { l: 'Floor-Stack', p: '{floor}-{stack}' },
    { l: 'Digits only', p: '{digits}' },
    { l: 'Building + Digits', p: '{bldg}{digits}' }
  ],
  svg: [
    { l: 'As is', p: '{id}' },
    { l: 'Digits only', p: '{digits}' },
    { l: 'Floor + Stack', p: '{floor2}{stack}' },
    { l: 'Building-Floor-Stack', p: '{bldg}-{floor}{stack}' }
  ]
};

export const AP_TRIMS: { l: string; v: ApTrim }[] = [
  { l: 'None', v: 'none' },
  { l: 'Drop first', v: 'dropFirst' },
  { l: 'Drop last', v: 'dropLast' },
  { l: 'Keep first', v: 'keepFirst' },
  { l: 'Keep last', v: 'keepLast' }
];

interface Parts {
  full: string;
  digits: string;
  letters: string;
  floor: string;
  bldg: string;
}

/** "Unit 1204" → "1204": the design strips a leading "Unit" from a PMS name. */
export const apUnitNo = (name: string | null): string => String(name ?? '').replace(/^unit\s+/i, '').trim();

const apParts = (full: string, floor: number | null, building: string | null): Parts => ({
  full,
  digits: (full.match(/\d+/g) ?? []).join(''),
  letters: (full.match(/[A-Za-z]+/g) ?? []).join(''),
  floor: floor == null ? '' : String(floor),
  bldg: String(building ?? '').trim().split(/\s+/).pop() ?? ''
});

const apFill = (tpl: string, v: Parts): string =>
  String(tpl || '')
    .replace(/\{(unit|id)\}/g, v.full)
    .replace(/\{digits\}/g, v.digits)
    .replace(/\{letters\}/g, v.letters)
    .replace(/\{floor2\}/g, v.floor.padStart(2, '0'))
    .replace(/\{floor\}/g, v.floor)
    .replace(/\{stack3\}/g, v.digits.slice(-3))
    .replace(/\{stack\}/g, v.digits.slice(-2))
    .replace(/\{bldg\}/g, v.bldg);

const apPost = (key: string, r: ApRules): string => {
  let k = key;
  r.replaces.forEach((x) => {
    if (x.find) k = k.split(x.find).join(x.repl || '');
  });
  const n = parseInt(r.trimN, 10) || 0;
  if (r.trim === 'dropFirst' && n) k = k.slice(n);
  if (r.trim === 'dropLast' && n) k = k.slice(0, Math.max(0, k.length - n));
  if (r.trim === 'keepFirst' && n) k = k.slice(0, n);
  if (r.trim === 'keepLast' && n) k = k.slice(-n);
  const p = parseInt(r.pad, 10) || 0;
  if (p && /^\d+$/.test(k)) k = k.padStart(p, '0');
  return (r.prefix || '') + k + (r.suffix || '');
};

/** A PMS unit number rewritten by the rules (rules on the PMS side). */
export const apUnitKey = (number: string, floor: number | null, building: string | null, r: ApRules): string => {
  const tpl = String(r.pattern || '{unit}').replace(/\{id\}/g, '{unit}');
  return apPost(apFill(tpl, apParts(number, floor, building)), r);
};

/** A polygon id rewritten by the rules (rules on the SVG side). */
export const apPolygonKey = (code: string, floor: number | null, building: string | null, r: ApRules): string => {
  const tpl = String(r.pattern || '{id}').replace(/\{unit\}/g, '{id}');
  return apPost(apFill(tpl, apParts(code, floor, building)), r);
};

/** The comparison switches: case, separators, leading zeros. */
export const apNorm = (x: string, r: ApRules): string => {
  let v = String(x || '');
  if (r.ignoreCase !== false) v = v.toLowerCase();
  if (r.ignoreSep) v = v.replace(/[-_\s.\/]/g, '');
  if (r.ignoreZeros) v = v.replace(/(^|[^0-9])0+(?=\d)/g, '$1');
  return v;
};

export interface ApUnitInput {
  key: string;
  name: string;
  number: string;
  floor: number | null;
  building: string | null;
}

export interface ApAmenityInput {
  key: string;
  name: string;
}

export interface ApLevelInput {
  id: string;
  name: string;
  building: string | null;
  floors: number[];
  hasSvg: boolean;
  /** Null while the level's SVG is still loading. */
  targets: PlotTarget[] | null;
  units: ApUnitInput[];
  amenities: ApAmenityInput[];
}

export type ApHow = 'exact' | 'pattern' | 'manual' | 'none' | 'nosvg' | 'loading' | 'amenity';

export interface ApRow {
  kind: 'unit' | 'amenity';
  key: string;
  levelId: string;
  levelName: string;
  name: string;
  pmsRaw: string;
  pmsKey: string;
  svgRaw: string;
  svgKey: string;
  /** The closest polygon by trailing digits, shown as a hint when nothing matched. */
  isCand: boolean;
  /** The polygon the row resolves to (matched or picked), when it does. */
  target: PlotTarget | null;
  ok: boolean;
  how: ApHow;
  /** The level's polygons, for the manual pick. */
  choices: PlotTarget[];
  dir: ApDir;
}

export interface ApAnalysis {
  rows: ApRow[];
  units: number;
  matched: number;
  manual: number;
  unmatched: number;
  skipped: number;
  nosvg: number;
  loading: number;
  exact: boolean;
  sampleIds: string[];
  sampleLevel: ApLevelInput | null;
}

const trailingAgreement = (a: string, b: string): number => {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n += 1;
  return n;
};

const closest = (number: string, targets: PlotTarget[]): PlotTarget | null => {
  if (!targets.length) return null;
  const digits = (number.match(/\d+/g) ?? []).join('');
  let best = targets[0];
  let bestScore = -1;
  targets.forEach((target) => {
    const score = trailingAgreement(digits, (target.code.match(/\d+/g) ?? []).join(''));
    if (score > bestScore) {
      bestScore = score;
      best = target;
    }
  });
  return best;
};

/**
 * Runs the rules over every unplotted unit of the scope's levels, as the
 * design's `apAnalyze` does: a unit matches when its rewritten number equals
 * a polygon's rewritten id (or its label), a manual pick counts when it
 * still names one of the level's polygons, and everything else is reported.
 */
export const apAnalyze = (levels: ApLevelInput[], rules: ApRules, manual: Record<string, string>, noManual = false): ApAnalysis => {
  const r = rules;
  const dir = r.dir || 'pms';
  const rows: ApRow[] = [];
  const counts = { matched: 0, manual: 0, unmatched: 0, skipped: 0, nosvg: 0, loading: 0 };
  const exact = apIsDefault(r);

  levels.forEach((level) => {
    const floor = level.floors.length ? level.floors[0] : null;
    const targets = level.targets ?? [];
    const index = new Map<string, PlotTarget[]>();
    const converted = new Map<string, string>();
    targets.forEach((target) => {
      const keys = [target.code, target.label].filter((value): value is string => !!value);
      keys.forEach((raw, position) => {
        const key = dir === 'svg' ? apPolygonKey(raw, floor, level.building, r) : raw;
        if (position === 0) converted.set(target.key, key);
        const norm = apNorm(key, r);
        const list = index.get(norm) ?? [];
        list.push(target);
        index.set(norm, list);
      });
    });
    const taken = new Set<string>();
    const take = (candidates: PlotTarget[] | undefined): PlotTarget | null => {
      if (!candidates?.length) return null;
      const free = candidates.find((candidate) => !taken.has(candidate.key)) ?? candidates[0];
      taken.add(free.key);
      return free;
    };

    const row = (unit: ApUnitInput, how: ApHow, target: PlotTarget | null): ApRow => {
      const raw = apUnitNo(unit.number || unit.name);
      const pk = dir === 'pms' ? apUnitKey(raw, unit.floor, unit.building, r) : raw;
      const cand = !target && how === 'none' ? closest(raw, targets) : null;
      const shown = target ?? cand;
      return {
        kind: 'unit',
        key: unit.key,
        levelId: level.id,
        levelName: level.name,
        name: unit.name,
        pmsRaw: raw,
        pmsKey: pk,
        svgRaw: shown ? shown.code : '',
        svgKey: shown ? (converted.get(shown.key) ?? shown.code) : '',
        isCand: !!cand,
        target,
        ok: !!target,
        how,
        choices: targets,
        dir
      };
    };

    level.units.forEach((unit) => {
      if (!level.hasSvg) {
        counts.nosvg += 1;
        rows.push(row(unit, 'nosvg', null));
        return;
      }
      if (level.targets == null) {
        counts.loading += 1;
        rows.push(row(unit, 'loading', null));
        return;
      }
      const raw = apUnitNo(unit.number || unit.name);
      const pk = dir === 'pms' ? apUnitKey(raw, unit.floor, unit.building, r) : raw;
      const hit = take(index.get(apNorm(pk, r)));
      const pick = noManual ? '' : manual[unit.key] || '';
      const picked = pick ? (targets.find((target) => target.key === pick) ?? null) : null;
      if (hit) {
        counts.matched += 1;
        rows.push(row(unit, exact ? 'exact' : 'pattern', hit));
      } else if (picked) {
        counts.manual += 1;
        rows.push(row(unit, 'manual', picked));
      } else {
        counts.unmatched += 1;
        rows.push(row(unit, 'none', null));
      }
    });

    level.amenities.forEach((amenity) => {
      counts.skipped += 1;
      rows.push({
        kind: 'amenity',
        key: amenity.key,
        levelId: level.id,
        levelName: level.name,
        name: amenity.name,
        pmsRaw: '—',
        pmsKey: '—',
        svgRaw: '',
        svgKey: '',
        isCand: false,
        target: null,
        ok: false,
        how: 'amenity',
        choices: targets,
        dir
      });
    });
  });

  const order: Record<ApHow, number> = { none: 0, loading: 1, nosvg: 1, manual: 2, pattern: 3, exact: 3, amenity: 4 };
  rows.sort((a, b) => order[a.how] - order[b.how]);
  const sampleLevel = levels.find((level) => level.hasSvg && level.targets?.length) ?? null;

  return {
    rows,
    units: counts.matched + counts.manual + counts.unmatched + counts.loading,
    ...counts,
    exact,
    sampleIds: sampleLevel ? (sampleLevel.targets ?? []).map((target) => target.code) : [],
    sampleLevel
  };
};

export interface ApSuggestion {
  pattern: string;
  ignoreZeros: boolean;
  matched: number;
  rules: ApRules;
}

/** Tries the design's list of common patterns and keeps the one that matches the most units. */
export const apSuggest = (levels: ApLevelInput[], rules: ApRules): ApSuggestion | null => {
  const current = apAnalyze(levels, rules, {}, true).matched;
  const base = apDefault('pms');
  let best: ApSuggestion | null = null;
  ['{unit}', '{stack}', '{floor}-{stack}', '{digits}', '{floor2}{stack}', '{bldg}{digits}', '{bldg}-{digits}', '{stack3}', '{letters}{digits}'].forEach((pattern) => {
    [false, true].forEach((ignoreZeros) => {
      const candidate: ApRules = { ...base, pattern, ignoreSep: true, ignoreZeros };
      const matched = apAnalyze(levels, candidate, {}, true).matched;
      if (matched > current && (!best || matched > best.matched)) best = { pattern, ignoreZeros, matched, rules: candidate };
    });
  });
  return best;
};

/** "On PMS numbers: {floor}-{stack} · replace “B-”→“TB” · keep last 2 · ignore separators". */
export const apRuleSummary = (x: ApRules): string => {
  const parts = [(x.dir === 'svg' ? 'On SVG IDs: ' : 'On PMS numbers: ') + x.pattern];
  x.replaces.filter((q) => q.find).forEach((q) => parts.push(`replace “${q.find}”→“${q.repl || ''}”`));
  if (x.trim !== 'none') {
    const label = { dropFirst: 'drop first ', dropLast: 'drop last ', keepFirst: 'keep first ', keepLast: 'keep last ' }[x.trim];
    parts.push(label + x.trimN);
  }
  if (x.pad) parts.push(`pad to ${x.pad}`);
  if (x.prefix) parts.push(`prefix ${x.prefix}`);
  if (x.suffix) parts.push(`suffix ${x.suffix}`);
  if (x.ignoreSep) parts.push('ignore separators');
  if (x.ignoreZeros) parts.push('ignore leading zeros');
  return parts.join(' · ');
};

/** Validation of a draft before it is applied: the pattern must name something, and each rule must be usable. */
export const apDraftProblem = (draft: ApRules): string | null => {
  const pattern = (draft.pattern || '').trim();
  if (!pattern) return 'pattern';
  if (!/\{(unit|id|digits|letters|floor|floor2|stack|stack3|bldg)\}/.test(pattern)) return 'token';
  const unknown = pattern.match(/\{[^}]*\}/g)?.filter((token) => !/^\{(unit|id|digits|letters|floor|floor2|stack|stack3|bldg)\}$/.test(token));
  if (unknown?.length) return 'unknownToken';
  if (draft.replaces.some((rule) => !rule.find && rule.repl)) return 'replaceFind';
  if (draft.trim !== 'none' && !(parseInt(draft.trimN, 10) > 0)) return 'trimCount';
  if (draft.pad && !/^\d+$/.test(draft.pad)) return 'pad';
  return null;
};
