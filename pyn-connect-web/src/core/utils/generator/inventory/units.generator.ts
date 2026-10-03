import { i18n } from '~/resources/i18n';
import type { FilterOption } from '../listing.types';
import type {
  InventoryFloorplan,
  InventoryUnit,
  PropertyInventory,
  UnitListingOptions
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
 * The Units tab. The toolbar's search and filters are resolved by the CMS
 * (Connect::UnitListingQuery on top of the legacy grid's UnitFilterQuery),
 * which answers one page at a time: AND across filters, OR within one. This
 * module holds the filters' shape, turns them into that request, and builds
 * the cards and dropdown options from what comes back.
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

/** The State filter's values, as Connect::UnitListingQuery reads them. */
const STATES = ['plotted', 'unplotted', 'model', 'manual', 'noPhotos'] as const;

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

/**
 * Each dropdown offers only values this property's units actually have, as the
 * legacy grid does: the floor plans from the floor plans listing, the rest
 * from the units listing's `meta.filters` (`options`; empty until the first
 * page has answered).
 */
export const generateUnitFilterOptions = (inventory: PropertyInventory, options: UnitListingOptions | null): UnitFilterOptions => {
  const withNone = (list: FilterOption[], missing: boolean, label: string): FilterOption[] =>
    missing ? [...list, { id: NONE, label: i18n.t(label) }] : list;

  const buildings = [...(options?.buildings ?? [])].sort(naturalCompare);
  const floors = [...(options?.floors ?? [])].sort((a, b) => a - b);
  const beds = [...(options?.bedrooms ?? [])].sort((a, b) => a - b);
  const baths = (options?.bathrooms ?? []).filter((b) => b > 0).sort((a, b) => a - b);

  return {
    floorplan: withNone(
      [...inventory.floorplans]
        .sort((a, b) => naturalCompare(a.name, b.name))
        .map((plan) => ({ id: String(plan.id), label: plan.name })),
      !!options?.missing.floorplan,
      S.units.noFloorPlan
    ),
    availability: AVAILABILITY.map((option) => ({ id: option.id, label: i18n.t(option.label) })),
    building: withNone(
      buildings.map((building) => ({ id: building, label: building })),
      !!options?.missing.building,
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
      !!options?.missing.floor,
      S.units.noFloor
    )
  };
};

/**
 * The toolbar as a request: the query string `/api/properties/:id/inventory/units`
 * takes, with the parameter names `UnitsController#index` reads for Connect
 * (Connect::UnitListingQuery). Lists travel comma-separated; blanks are left out.
 */
export const unitListingQuery = (filters: UnitFilters, page: number, perPage: number, today: string): string => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('per_page', String(perPage));
  params.set('today', today);
  const text = (key: string, value: string) => {
    if (value.trim()) params.set(key, value.trim());
  };
  const list = (key: string, values: string[]) => {
    if (values.length) params.set(key, values.join(','));
  };
  text('q', filters.query);
  list('floorplan', filters.floorplan);
  list('availability', filters.availability);
  list('building', filters.building);
  list('state', filters.state);
  list('beds', filters.beds);
  list('baths', filters.baths);
  list('floor', filters.floor);
  text('min_price', filters.priceMin);
  text('max_price', filters.priceMax);
  text('min_sqft', filters.sqftMin);
  text('max_sqft', filters.sqftMax);
  return params.toString();
};

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

/**
 * How many per-field manual markers the property's units carry (the Re-sync
 * confirmation's count): counted over the units when they are all here, else
 * the count the floorplates meta announced.
 */
export const manualOverrideCount = (inventory: PropertyInventory): number =>
  inventory.unitsLoaded
    ? inventory.units.reduce((total, unit) => total + Object.values(unit.flags).filter(Boolean).length, 0)
    : inventory.unitOverrideCount;
