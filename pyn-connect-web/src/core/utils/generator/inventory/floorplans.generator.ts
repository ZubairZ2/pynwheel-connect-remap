import { i18n } from '~/resources/i18n';
import type { FilterOption } from '../listing.types';
import type { InventoryFloorplan, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type {
  ChipDescriptor,
  ConfirmDescriptor,
  ImageDescriptor,
  MetaDescriptor,
  PillDescriptor,
  ThumbDescriptor
} from './inventory.types';
import { S, bathsText, counted, isFed, layoutText, money, naturalCompare, sourceOf, t } from './inventoryText';

/**
 * The Floorplans tab: the property's floor plans, filterable in the browser
 * (search, Layout, Baths, Sq Ft, Setup — AND across filters, OR within one),
 * then described as cards.
 */

export interface FloorplanFilters {
  query: string;
  layout: string[];
  baths: string[];
  sqftMin: string;
  sqftMax: string;
  setup: string[];
}

export const EMPTY_FLOORPLAN_FILTERS: FloorplanFilters = {
  query: '',
  layout: [],
  baths: [],
  sqftMin: '',
  sqftMax: '',
  setup: []
};

export const floorplanFiltersActive = (filters: FloorplanFilters): boolean =>
  !!filters.query.trim() ||
  filters.layout.length > 0 ||
  filters.baths.length > 0 ||
  !!filters.sqftMin ||
  !!filters.sqftMax ||
  filters.setup.length > 0;

/** A button counts once it has somewhere to go: the app shows none without a URL. */
export const configuredButtons = (plan: Pick<InventoryFloorplan, 'buttons'>): number =>
  plan.buttons.filter((button) => !!button.url).length;

const LAYOUTS = ['studio', 'b1', 'b2', 'b3'] as const;

const layoutKey = (beds: number | null): (typeof LAYOUTS)[number] | null => {
  if (beds == null) return null;
  if (beds <= 0) return 'studio';
  if (beds < 2) return 'b1';
  if (beds < 3) return 'b2';
  return 'b3';
};

const SETUPS = {
  noPrimary: S.floorplans.setupNoPrimary,
  noSecondary: S.floorplans.setupNoSecondary,
  hasInteriors: S.floorplans.setupHasInteriors,
  noInteriors: S.floorplans.setupNoInteriors,
  noButtons: S.floorplans.setupNoButtons,
  noProvider: S.floorplans.setupNoProvider
} as const;

const setupMatches = (plan: InventoryFloorplan, setup: string): boolean => {
  switch (setup) {
    case 'noPrimary':
      return !plan.image;
    case 'noSecondary':
      return !plan.secondaryImage;
    case 'hasInteriors':
      return plan.interiorImages.length > 0;
    case 'noInteriors':
      return plan.interiorImages.length === 0;
    case 'noButtons':
      return configuredButtons(plan) === 0;
    case 'noProvider':
      return !plan.providerFloorplanId;
    default:
      return true;
  }
};

/** "1 bath", "1.5 baths", "2 baths". */
export const bathsOption = (baths: number): string =>
  `${bathsText(baths)} ${i18n.t(baths === 1 ? S.count.bathOne : S.count.bathMany)}`;

export interface FloorplanFilterOptions {
  layout: FilterOption[];
  baths: FilterOption[];
  setup: FilterOption[];
}

/** Layout and Baths offer only what the property's floor plans have; Setup always offers all six. */
export const generateFloorplanFilterOptions = (floorplans: InventoryFloorplan[]): FloorplanFilterOptions => {
  const layoutLabel: Record<(typeof LAYOUTS)[number], string> = {
    studio: i18n.t(S.floorplans.studio),
    b1: t(S.floorplans.bedLabel, { count: 1 }),
    b2: t(S.floorplans.bedLabel, { count: 2 }),
    b3: i18n.t(S.floorplans.threePlus)
  };
  const present = new Set(floorplans.map((plan) => layoutKey(plan.bedrooms)));
  const baths = [...new Set(floorplans.map((plan) => plan.bathrooms).filter((b): b is number => b != null && b > 0))];

  return {
    layout: LAYOUTS.filter((key) => present.has(key)).map((key) => ({ id: key, label: layoutLabel[key] })),
    baths: baths.sort((a, b) => a - b).map((b) => ({ id: String(b), label: bathsOption(b) })),
    setup: Object.entries(SETUPS).map(([id, label]) => ({ id, label: i18n.t(label) }))
  };
};

const asNumber = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const filterFloorplans = (floorplans: InventoryFloorplan[], filters: FloorplanFilters): InventoryFloorplan[] => {
  const query = filters.query.trim().toLowerCase();
  const min = asNumber(filters.sqftMin);
  const max = asNumber(filters.sqftMax);

  return floorplans.filter((plan) => {
    if (query && ![plan.name, plan.providerFloorplanId ?? ''].some((field) => field.toLowerCase().includes(query))) {
      return false;
    }
    if (filters.layout.length && !filters.layout.includes(layoutKey(plan.bedrooms) ?? '')) return false;
    if (filters.baths.length && !filters.baths.includes(String(plan.bathrooms ?? ''))) return false;
    if ((min != null || max != null) && plan.squareFeet == null) return false;
    if (min != null && (plan.squareFeet ?? 0) < min) return false;
    if (max != null && (plan.squareFeet ?? 0) > max) return false;
    if (filters.setup.length && !filters.setup.some((setup) => setupMatches(plan, setup))) return false;
    return true;
  });
};

/** Floor plans in the order the legacy grid lists them: by name, naturally. */
export const sortFloorplans = (floorplans: InventoryFloorplan[]): InventoryFloorplan[] =>
  [...floorplans].sort((a, b) => naturalCompare(a.name, b.name));

export const generateShowingLabel = (shown: number, total: number, one: string, many: string): string =>
  shown === total
    ? counted(total, one, many)
    : t(S.count.showing, { shown: shown.toLocaleString('en-US'), total: total.toLocaleString('en-US') });

export interface FloorplanCard {
  id: number;
  title: string;
  pills: PillDescriptor[];
  thumb: ThumbDescriptor;
  hasPrimary: boolean;
  meta: MetaDescriptor[];
  chips: ChipDescriptor[];
  images: ImageDescriptor[];
  deleteConfirm: ConfirmDescriptor;
  removeImageConfirm: ConfirmDescriptor;
}

const STATUS: Record<NonNullable<InventoryFloorplan['availabilityStatus']>, PillDescriptor> = {
  available: { label: S.floorplans.status.available, variant: 'ok' },
  limited_availability: { label: S.floorplans.status.limited, variant: 'warn' },
  almost_gone: { label: S.floorplans.status.almostGone, variant: 'warn' },
  sold_out: { label: S.floorplans.status.soldOut, variant: 'crit' }
};

/** Every real image of a floor plan, primary first, for the viewer. */
export const floorplanImages = (plan: InventoryFloorplan): ImageDescriptor[] => {
  const images: ImageDescriptor[] = [];
  if (plan.image) images.push({ name: `${plan.name} — ${i18n.t(S.floorplans.primaryImage)}`, src: plan.image.url });
  if (plan.secondaryImage) {
    images.push({ name: `${plan.name} — ${i18n.t(S.floorplans.secondaryImage)}`, src: plan.secondaryImage.url });
  }
  plan.interiorImages.forEach((image, index) => {
    if (!image.url) return;
    const label = t(S.floorplans.interior, { position: index + 1 });
    images.push({ name: `${plan.name} — ${image.name ? `${label} · ${image.name}` : label}`, src: image.url });
  });
  return images;
};

export const generateFloorplanCards = (
  floorplans: InventoryFloorplan[],
  inventory: PropertyInventory
): FloorplanCard[] =>
  floorplans.map((plan) => {
    const fed = isFed(plan.provider);
    const buttons = configuredButtons(plan);
    const interiors = plan.interiorImages.length;
    const pills: PillDescriptor[] = [];
    // The legacy grid only offers a floor plan's status when the property turns it on.
    if (inventory.turnAvailabilityOn && plan.availabilityStatus) {
      const status = STATUS[plan.availabilityStatus];
      pills.push({ label: i18n.t(status.label), variant: status.variant });
    }
    if (plan.manualOverride) pills.push({ label: i18n.t(S.floorplans.manualOverride), variant: 'neutral' });

    return {
      id: plan.id,
      title: plan.name,
      pills,
      hasPrimary: !!plan.image,
      thumb: {
        src: plan.image?.url ?? plan.secondaryImage?.url ?? null,
        badge: plan.image
          ? i18n.t(S.floorplans.badgePrimary)
          : plan.secondaryImage
            ? i18n.t(S.floorplans.badgeSecondary)
            : undefined,
        alt: `${plan.name} — ${i18n.t(plan.image ? S.floorplans.primaryImage : S.floorplans.secondaryImage)}`
      },
      meta: [
        { label: i18n.t(S.floorplans.meta.providerId), value: plan.providerFloorplanId ?? i18n.t(S.notSet) },
        {
          label: i18n.t(S.floorplans.meta.layout),
          value: layoutText(plan),
          source: sourceOf(fed, plan.flags.bedrooms || plan.flags.bathrooms)
        },
        {
          label: i18n.t(S.floorplans.meta.squareFeet),
          value:
            plan.squareFeet && plan.squareFeet > 0
              ? t(S.floorplans.sqftValue, { count: Math.round(plan.squareFeet).toLocaleString('en-US') })
              : i18n.t(S.notSet),
          source: sourceOf(fed, plan.flags.squareFeet)
        },
        {
          label: i18n.t(S.floorplans.meta.basePrice),
          value:
            plan.marketRent && plan.marketRent > 0
              ? t(S.floorplans.priceValue, { price: money(plan.marketRent, inventory.currencySymbol) })
              : i18n.t(S.notSet),
          source: sourceOf(fed, plan.flags.marketRent)
        },
        {
          label: i18n.t(S.floorplans.meta.units),
          value:
            plan.unitCount > 0
              ? `${counted(plan.unitCount, S.count.unitOne, S.count.unitMany)} · ${t(S.count.available, {
                  count: plan.availableUnitCount
                })}`
              : counted(0, S.count.unitOne, S.count.unitMany)
        }
      ],
      chips: [
        {
          label: buttons
            ? t(S.floorplans.buttonsConfigured, { count: counted(buttons, S.count.buttonOne, S.count.buttonMany) })
            : i18n.t(S.floorplans.noButtons),
          on: buttons > 0
        },
        {
          label: interiors ? counted(interiors, S.count.interiorOne, S.count.interiorMany) : i18n.t(S.floorplans.noInteriors),
          on: interiors > 0
        },
        {
          label: i18n.t(plan.secondaryImage ? S.floorplans.secondarySet : S.floorplans.noSecondary),
          on: !!plan.secondaryImage
        }
      ],
      images: floorplanImages(plan),
      deleteConfirm: {
        title: t(S.dialogs.confirm.deleteFloorplanTitle, { name: plan.name }),
        message: t(S.dialogs.confirm.deleteFloorplanBody, {
          units: counted(plan.unitCount, S.count.unitOne, S.count.unitMany)
        }),
        label: i18n.t(S.dialogs.confirm.deleteFloorplanLabel)
      },
      removeImageConfirm: {
        title: i18n.t(S.dialogs.confirm.removeImageTitle),
        message: i18n.t(S.dialogs.confirm.removeImageBody),
        label: i18n.t(S.dialogs.confirm.removeLabel)
      }
    };
  });
