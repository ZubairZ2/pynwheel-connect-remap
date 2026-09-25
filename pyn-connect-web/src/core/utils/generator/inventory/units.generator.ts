import { i18n } from '~/resources/i18n';
import type { FilterOption } from '../listing.types';
import type {
  InventoryFloorplan,
  InventoryUnit,
  PropertyInventory
} from '~/core/models/data/propertyInventory.data';
import { bathsOption } from './floorplans.generator';
import type {
  ConfirmDescriptor,
  ImageDescriptor,
  MetaDescriptor,
  PillDescriptor,
  ThumbDescriptor
} from './inventory.types';
import {
  EMPTY,
  S,
  bedsText,
  counted,
  dateText,
  isFed,
  layoutText,
  lockText,
  money,
  naturalCompare,
  sourceOf,
  t,
  unitAvailability,
  type UnitAvailability
} from './inventoryText';

/**
 * The Units tab. Every unit of the property is loaded once, so each filter
 * works in the browser, on its own or combined: AND across filters, OR within
 * one. The semantics follow the legacy grid's UnitFilterQuery wherever it has
 * the same filter.
 */

export interface UnitFilters {
  query: string;
  floorplan: string[];
  availability: string[];
  building: string[];
  state: string[];
  beds: string[];
  baths: string[];
  floor: string[];
  priceMin: string;
  priceMax: string;
  sqftMin: string;
  sqftMax: string;
}

export const EMPTY_UNIT_FILTERS: UnitFilters = {
  query: '',
  floorplan: [],
  availability: [],
  building: [],
  state: [],
  beds: [],
  baths: [],
  floor: [],
  priceMin: '',
  priceMax: '',
  sqftMin: '',
  sqftMax: ''
};

export const unitFiltersActive = (filters: UnitFilters): boolean =>
  Object.entries(filters).some(([, value]) => (Array.isArray(value) ? value.length > 0 : !!String(value).trim()));

/** Stands for "no value" in a filter (UnitFilterQuery's `none`). */
export const NONE = 'none';

type PlanLookup = Map<number, InventoryFloorplan>;

export const planLookup = (inventory: PropertyInventory): PlanLookup =>
  new Map(inventory.floorplans.map((plan) => [plan.id, plan]));

const planOf = (unit: InventoryUnit, plans: PlanLookup): InventoryFloorplan | undefined =>
  unit.floorplanId != null ? plans.get(unit.floorplanId) : undefined;

/** A unit's own square footage wins; otherwise its floor plan's (UnitFilterQuery::EFFECTIVE_SQFT). */
export const effectiveSqft = (unit: InventoryUnit, plan: InventoryFloorplan | undefined): number | null =>
  unit.squareFeet && unit.squareFeet > 0 ? unit.squareFeet : (plan?.squareFeet ?? null);

/** The name the grid shows for a unit. */
export const unitName = (unit: InventoryUnit): string =>
  unit.displayName ?? unit.marketingName ?? unit.providerUnitId ?? `#${unit.id}`;

/** Any field a person has pinned, or the unit-level Manual Override. */
const hasManualOverrides = (unit: InventoryUnit): boolean =>
  unit.manualOverride || Object.values(unit.flags).some(Boolean);

const hasPhotos = (unit: InventoryUnit): boolean => !!unit.image || unit.interiorImages.length > 0;

const STATES = ['plotted', 'unplotted', 'model', 'manual', 'noPhotos'] as const;

const stateMatches = (unit: InventoryUnit, state: string): boolean => {
  switch (state) {
    case 'plotted':
      return unit.plotted;
    case 'unplotted':
      return !unit.plotted;
    case 'model':
      return unit.modelUnit;
    case 'manual':
      return hasManualOverrides(unit);
    case 'noPhotos':
      return !hasPhotos(unit);
    default:
      return true;
  }
};

export interface UnitFilterOptions {
  floorplan: FilterOption[];
  availability: FilterOption[];
  building: FilterOption[];
  state: FilterOption[];
  beds: FilterOption[];
  baths: FilterOption[];
  floor: FilterOption[];
}

const AVAILABILITY: { id: UnitAvailability; label: string }[] = [
  { id: 'now', label: S.units.availNow },
  { id: 'soon', label: S.units.availSoon },
  { id: 'notAvailable', label: S.units.notAvailable },
  { id: 'sold', label: S.units.sold }
];

/** Each dropdown offers only values this property's units actually have, as the legacy grid does. */
export const generateUnitFilterOptions = (inventory: PropertyInventory): UnitFilterOptions => {
  const plans = planLookup(inventory);
  const units = inventory.units;
  const withNone = (options: FilterOption[], missing: boolean, label: string): FilterOption[] =>
    missing ? [...options, { id: NONE, label: i18n.t(label) }] : options;

  const buildings = [...new Set(units.map((unit) => unit.building).filter((b): b is string => !!b))].sort(naturalCompare);
  const floors = [...new Set(units.map((unit) => unit.floor).filter((f): f is number => f != null))].sort((a, b) => a - b);
  const unitPlans = units.map((unit) => planOf(unit, plans));
  const beds = [...new Set(unitPlans.map((plan) => plan?.bedrooms).filter((b): b is number => b != null))].sort(
    (a, b) => a - b
  );
  const baths = [
    ...new Set(unitPlans.map((plan) => plan?.bathrooms).filter((b): b is number => b != null && b > 0))
  ].sort((a, b) => a - b);

  return {
    floorplan: withNone(
      [...inventory.floorplans]
        .sort((a, b) => naturalCompare(a.name, b.name))
        .map((plan) => ({ id: String(plan.id), label: plan.name })),
      units.some((unit) => unit.floorplanId == null),
      S.units.noFloorPlan
    ),
    availability: AVAILABILITY.map((option) => ({ id: option.id, label: i18n.t(option.label) })),
    building: withNone(
      buildings.map((building) => ({ id: building, label: building })),
      units.some((unit) => !unit.building),
      S.units.noBuilding
    ),
    state: STATES.map((state) => ({
      id: state,
      label: i18n.t(
        {
          plotted: S.units.statePlotted,
          unplotted: S.units.stateUnplotted,
          model: S.units.stateModel,
          manual: S.units.stateManual,
          noPhotos: S.units.stateNoPhotos
        }[state]
      )
    })),
    beds: beds.map((b) => ({
      id: String(b),
      label: b > 0 ? `${Math.trunc(b)} ${i18n.t(b === 1 ? S.count.bedOne : S.count.bedMany)}` : bedsText(b)
    })),
    baths: baths.map((b) => ({ id: String(b), label: bathsOption(b) })),
    floor: withNone(
      floors.map((floor) => ({ id: String(floor), label: t(S.units.floor, { floor }) })),
      units.some((unit) => unit.floor == null),
      S.units.noFloor
    )
  };
};

const asNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Search terms as the legacy grid reads them: a comma or new line separates
 * terms (any may match), and `*` is a wildcard anchored at the start ("1-2*").
 * Without a `*` a term matches anywhere.
 */
const searchMatchers = (query: string): ((value: string) => boolean)[] =>
  query
    .split(/[,\n\r]+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50)
    .map((term) => {
      if (!term.includes('*')) return (value: string) => value.includes(term);
      const pattern = new RegExp(`^${term.split('*').map(escapeRegExp).join('.*')}`);
      return (value: string) => pattern.test(value);
    });

const inRange = (value: number | null, min: number | null, max: number | null): boolean => {
  if (min == null && max == null) return true;
  if (value == null) return false;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
};

export const filterUnits = (
  units: InventoryUnit[],
  filters: UnitFilters,
  inventory: PropertyInventory,
  today: string
): InventoryUnit[] => {
  const plans = planLookup(inventory);
  const matchers = searchMatchers(filters.query);
  const priceMin = asNumber(filters.priceMin);
  const priceMax = asNumber(filters.priceMax);
  const sqftMin = asNumber(filters.sqftMin);
  const sqftMax = asNumber(filters.sqftMax);
  const pick = (selected: string[], value: string | null) =>
    selected.length === 0 || selected.includes(value == null || value === '' ? NONE : value);

  return units.filter((unit) => {
    const plan = planOf(unit, plans);

    if (matchers.length) {
      const fields = [unit.displayName, unit.marketingName, unit.providerUnitId, plan?.name]
        .filter((field): field is string => !!field)
        .map((field) => field.toLowerCase());
      if (!matchers.some((matches) => fields.some(matches))) return false;
    }
    if (!pick(filters.floorplan, unit.floorplanId != null ? String(unit.floorplanId) : null)) return false;
    if (filters.availability.length && !filters.availability.includes(unitAvailability(unit, today))) return false;
    if (!pick(filters.building, unit.building)) return false;
    if (filters.state.length && !filters.state.some((state) => stateMatches(unit, state))) return false;
    if (filters.beds.length && !filters.beds.includes(String(plan?.bedrooms ?? ''))) return false;
    if (filters.baths.length && !filters.baths.includes(String(plan?.bathrooms ?? ''))) return false;
    if (!pick(filters.floor, unit.floor != null ? String(unit.floor) : null)) return false;
    if (!inRange(unit.price, priceMin, priceMax)) return false;
    if (!inRange(effectiveSqft(unit, plan), sqftMin, sqftMax)) return false;
    return true;
  });
};

/** Natural order by name, like the grid's default sort (UnitFilterQuery::NATURAL_NAME). */
export const sortUnits = (units: InventoryUnit[]): InventoryUnit[] =>
  [...units].sort((a, b) => naturalCompare(unitName(a), unitName(b)));

export interface UnitCard {
  id: number;
  title: string;
  pills: PillDescriptor[];
  thumb: ThumbDescriptor;
  hasOwnImage: boolean;
  meta: MetaDescriptor[];
  images: ImageDescriptor[];
  deleteConfirm: ConfirmDescriptor;
  removeImageConfirm: ConfirmDescriptor;
}

export const availabilityPill = (unit: InventoryUnit, today: string): PillDescriptor => {
  switch (unitAvailability(unit, today)) {
    case 'sold':
      return { label: i18n.t(S.units.sold), variant: 'crit' };
    case 'notAvailable':
      return { label: i18n.t(S.units.notAvailable), variant: 'neutral' };
    case 'soon':
      return { label: t(S.units.availOn, { date: dateText(unit.availableDate) ?? '' }), variant: 'warn' };
    default:
      return { label: i18n.t(S.units.availNow), variant: 'ok' };
  }
};

/** Every real image of a unit: its own, then its interior photos, then its floor plan's. */
export const unitImages = (unit: InventoryUnit, plan: InventoryFloorplan | undefined): ImageDescriptor[] => {
  const name = unitName(unit);
  const images: ImageDescriptor[] = [];
  if (unit.image) images.push({ name: `${name} — ${i18n.t(S.units.unitImage)}`, src: unit.image.url });
  if (unit.secondaryImage) images.push({ name: `${name} — ${i18n.t(S.units.secondaryImage)}`, src: unit.secondaryImage.url });
  unit.interiorImages.forEach((image, index) => {
    if (!image.url) return;
    const label = t(S.units.interior, { position: index + 1 });
    images.push({ name: `${name} — ${image.name ? `${label} · ${image.name}` : label}`, src: image.url });
  });
  if (plan?.image) images.push({ name: `${name} — ${i18n.t(S.units.floorPlanImage)} (${plan.name})`, src: plan.image.url });
  return images;
};

export const generateUnitCards = (
  units: InventoryUnit[],
  inventory: PropertyInventory,
  today: string
): UnitCard[] => {
  const plans = planLookup(inventory);

  return units.map((unit) => {
    const plan = planOf(unit, plans);
    const fed = isFed(unit.provider);
    const name = unitName(unit);
    const sqft = unit.squareFeet && unit.squareFeet > 0 ? unit.squareFeet : null;
    const interiors = unit.interiorImages.length;
    const pills: PillDescriptor[] = [
      availabilityPill(unit, today),
      unit.plotted
        ? { label: i18n.t(S.units.plotted), variant: 'ok' }
        : { label: i18n.t(S.units.notOnMap), variant: 'warn' }
    ];
    if (unit.modelUnit) pills.push({ label: i18n.t(S.units.modelUnit), variant: 'info' });
    if (unit.manualOverride) pills.push({ label: i18n.t(S.units.manualOverride), variant: 'neutral' });

    // The grid's thumbnail: the unit's own image, else its floor plan's.
    const thumbSrc = unit.image?.url ?? plan?.image?.url ?? plan?.secondaryImage?.url ?? null;

    return {
      id: unit.id,
      title: name,
      pills,
      hasOwnImage: !!unit.image,
      thumb: {
        src: thumbSrc,
        badge: interiors
          ? counted(interiors, S.count.photoOne, S.count.photoMany)
          : unit.image
            ? i18n.t(S.units.badgeUnitImage)
            : thumbSrc
              ? i18n.t(S.units.badgeFloorPlan)
              : undefined,
        alt: `${name} — ${i18n.t(unit.image ? S.units.unitImage : S.units.floorPlanImage)}`
      },
      meta: [
        { label: i18n.t(S.units.meta.providerId), value: unit.providerUnitId ?? i18n.t(S.notSet) },
        {
          label: i18n.t(S.units.meta.floorPlan),
          value: plan?.name ?? i18n.t(S.units.noFloorPlan),
          source: sourceOf(fed, unit.flags.floorplan)
        },
        { label: i18n.t(S.units.meta.layout), value: layoutText(plan) },
        {
          label: i18n.t(S.units.meta.price),
          value:
            unit.price != null && unit.price > 0
              ? t(S.floorplans.priceValue, { price: money(unit.price, inventory.currencySymbol) })
              : i18n.t(S.notSet),
          source: sourceOf(fed, unit.flags.price)
        },
        {
          label: i18n.t(S.units.meta.sqft),
          value: sqft ? t(S.floorplans.sqftValue, { count: Math.round(sqft).toLocaleString('en-US') }) : i18n.t(S.units.fromPlan)
        },
        {
          label: i18n.t(S.units.meta.available),
          value: unit.sold
            ? i18n.t(S.units.sold)
            : unit.available
              ? (dateText(unit.availableDate) ?? i18n.t(S.units.availNow))
              : i18n.t(S.units.notAvailable),
          source: sourceOf(fed, unit.flags.available || unit.flags.availableDate || unit.flags.availability)
        },
        {
          label: i18n.t(S.units.meta.placement),
          value:
            [unit.building, unit.floor != null ? t(S.units.floor, { floor: unit.floor }) : null].filter(Boolean).join(' · ') ||
            EMPTY,
          source: sourceOf(fed, unit.flags.floor || unit.flags.building)
        },
        { label: i18n.t(S.units.meta.lock), value: lockText(unit.lockProvider) },
        {
          label: i18n.t(S.units.meta.tourOrder),
          value: unit.tourOrder != null ? String(unit.tourOrder) : i18n.t(S.units.unset)
        },
        { label: i18n.t(S.units.meta.unitStatus), value: unit.unitStatus ?? EMPTY }
      ],
      images: unitImages(unit, plan),
      deleteConfirm: {
        title: t(S.dialogs.confirm.deleteUnitTitle, { name }),
        message: i18n.t(S.dialogs.confirm.deleteUnitBody),
        label: i18n.t(S.dialogs.confirm.deleteUnitLabel)
      },
      removeImageConfirm: {
        title: i18n.t(S.dialogs.confirm.removeImageTitle),
        message: i18n.t(S.dialogs.confirm.removeImageBody),
        label: i18n.t(S.dialogs.confirm.removeLabel)
      }
    };
  });
};

/** How many per-field manual markers the property's units carry (the Re-sync confirmation's count). */
export const manualOverrideCount = (inventory: PropertyInventory): number =>
  inventory.units.reduce((total, unit) => total + Object.values(unit.flags).filter(Boolean).length, 0);
