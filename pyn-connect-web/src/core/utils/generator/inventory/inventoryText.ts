import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import type { InventoryFloorplan, InventoryUnit } from '~/core/models/data/propertyInventory.data';
import { formatCount } from '../companyListing.generator';

/**
 * Wording and formatting shared by the Property Inventory generators. Values
 * come from the CMS as stored; these only decide how they read.
 */

export const S = CORE_STRINGS.inventory;

export const EMPTY = '—';

/** A translated string with its `{placeholders}` filled in. */
export const t = (key: string, values: Record<string, string | number> = {}): string =>
  i18n.t(key).replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));

/** "1 unit", "305 units". */
export const counted = (count: number, one: string, many: string): string =>
  `${formatCount(count)} ${i18n.t(count === 1 ? one : many)}`;

/** Whole currency units, the way the legacy grid shows rent (`show_integer_rent`). */
export const money = (value: number, symbol: string): string =>
  `${symbol}${Math.round(value).toLocaleString('en-US')}`;

/** 2 reads as "2", 1.5 stays "1.5" (UnitsHelper#floorplan_bathrooms_label); JS numbers already print that way. */
export const bathsText = (baths: number): string => String(baths);

/** "Studio" for 0 bedrooms, otherwise "N Bed" (UnitsHelper#floorplan_bedrooms_label). */
export const bedsText = (beds: number): string =>
  beds > 0 ? t(S.floorplans.bedLabel, { count: Math.trunc(beds) }) : i18n.t(S.floorplans.studio);

/** "2 Bed · 2 Bath", "Studio · 1 Bath", or the part that is known. */
export const layoutText = (plan: Pick<InventoryFloorplan, 'bedrooms' | 'bathrooms'> | null | undefined): string => {
  if (!plan || (plan.bedrooms == null && plan.bathrooms == null)) return EMPTY;
  if (plan.bathrooms == null || plan.bathrooms <= 0) return plan.bedrooms == null ? EMPTY : bedsText(plan.bedrooms);
  if (plan.bedrooms == null) return `${bathsText(plan.bathrooms)} Bath`;

  return t(S.floorplans.layoutValue, { beds: bedsText(plan.bedrooms), baths: bathsText(plan.bathrooms) });
};

/**
 * A floorplate range as a reader says it: "3" → "Floor 3", "3-10" →
 * "Floors 3–10", "3,5,7" → "Floors 3, 5, 7". Anything else is shown as stored.
 */
export const rangeText = (range: string | null): string => {
  const value = (range ?? '').replace(/\s+/g, '');
  if (!value) return '';
  if (/^-?\d+$/.test(value)) return t(S.floorplates.floor, { floor: value });
  if (/^\d+-\d+$/.test(value)) return t(S.floorplates.floors, { floors: value.replace('-', '–') });
  if (/^\d+(,\d+)+$/.test(value)) return t(S.floorplates.floors, { floors: value.split(',').join(', ') });
  return range ?? '';
};

/** "Sep 24, 2026", from a yyyy-mm-dd date, without shifting it across a time zone. */
export const dateText = (iso: string | null): string | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

/**
 * `communities.data_provider_updated_on` holds a timestamp, or the word
 * "Never" the CMS writes before the first sync.
 */
export const syncText = (value: string | null): string => {
  if (!value || /^never$/i.test(value.trim())) return i18n.t(S.units.neverSynced);
  const date = new Date(value.replace(' +0000', 'Z').replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short'
  });
};

/** HTML the CMS stores for descriptions and fees, as plain text for a textarea. */
export const plainText = (html: string | null): string =>
  (html ?? '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h\d)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/**
 * A unit's availability, with the states the CMS has (UnitFilterQuery's
 * `availability` values plus the `sold` flag): sold wins, then the `available`
 * flag, then whether its date has arrived.
 */
export type UnitAvailability = 'now' | 'soon' | 'notAvailable' | 'sold';

export const unitAvailability = (unit: InventoryUnit, today: string): UnitAvailability => {
  if (unit.sold) return 'sold';
  if (!unit.available) return 'notAvailable';
  if (unit.availableDate && unit.availableDate.slice(0, 10) > today) return 'soon';
  return 'now';
};

/** "Zerv" is sold as Pynwheel Access (UnitsHelper#lock_provider_label). */
export const lockText = (provider: string | null): string => {
  if (!provider) return i18n.t(S.none);
  return provider === 'Zerv' ? i18n.t(S.units.pynwheelAccess) : provider;
};

/** A record another system keeps current, so its fields can be Feed or Manual. */
export const isFed = (provider: string | null): boolean => !!provider && provider !== 'manually';

export const sourceOf = (fed: boolean, manual: boolean) =>
  fed
    ? manual
      ? { kind: 'manual' as const, label: i18n.t(S.source.manual), title: i18n.t(S.source.manualTitle) }
      : { kind: 'feed' as const, label: i18n.t(S.source.feed), title: i18n.t(S.source.feedTitle) }
    : undefined;

/** Natural order, so "Building 2" comes before "Building 10". */
export const naturalCompare = (a: string, b: string): number =>
  a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
