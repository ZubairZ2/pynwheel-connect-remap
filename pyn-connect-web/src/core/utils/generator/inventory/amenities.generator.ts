import { i18n } from '~/resources/i18n';
import type { FilterOption } from '../listing.types';
import type { InventoryAmenity, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type {
  ChipDescriptor,
  ConfirmDescriptor,
  ImageDescriptor,
  MetaDescriptor,
  PillDescriptor,
  ThumbDescriptor
} from './inventory.types';
import { EMPTY, S, counted, lockText, naturalCompare, t } from './inventoryText';

/**
 * The Amenities tab: the property's amenities — the records that become tour
 * stops once plotted on a floorplate or the property map — filterable in the
 * browser (search, Type, Building, Floor, Lock, State, Setup: AND across
 * filters, OR within one), then described as cards.
 *
 * `AmenitiesController#index` lists every amenity carrying the property's id.
 * A few of those belong to a floor plan or unit instead (their interior
 * images); they are shown with that floor plan or unit, not here.
 */
export const propertyAmenities = (inventory: PropertyInventory): InventoryAmenity[] =>
  inventory.amenities.filter(
    (amenity) => amenity.ownerType == null || amenity.ownerType === 'Floorplate' || amenity.ownerType === 'Sitemap'
  );

/** Stands for "no value" in a filter. */
export const NONE = 'none';

/**
 * Where the amenity is: its own `building` / `floor` columns, else the
 * floorplate it is plotted on (the legacy amenity form offers that floorplate's
 * floors, and the plotting page names the plate).
 */
export const amenityWhere = (amenity: InventoryAmenity): { building: string | null; floor: string | null } => {
  const building = amenity.building ?? (amenity.ownerType === 'Floorplate' ? amenity.ownerBuilding : null);
  let floor: string | null = null;
  if (amenity.floor != null) floor = t(S.units.floor, { floor: amenity.floor });
  else if (amenity.ownerType === 'Floorplate' && amenity.ownerName) {
    const name = amenity.ownerName.trim();
    floor = /^-?\d+$/.test(name) ? t(S.units.floor, { floor: name }) : name;
  }
  return { building, floor };
};

/* ---------------- Filters ---------------- */

export interface AmenityFilters {
  query: string;
  type: string[];
  building: string[];
  floor: string[];
  lock: string[];
  state: string[];
  setup: string[];
}

export const EMPTY_AMENITY_FILTERS: AmenityFilters = {
  query: '',
  type: [],
  building: [],
  floor: [],
  lock: [],
  state: [],
  setup: []
};

export const amenityFiltersActive = (filters: AmenityFilters): boolean =>
  !!filters.query.trim() || Object.values(filters).some((value) => Array.isArray(value) && value.length > 0);

const STATES = {
  stops: S.amenities.stateStops,
  hidden: S.amenities.stateHidden,
  plotted: S.amenities.statePlotted,
  unplotted: S.amenities.stateUnplotted
} as const;

const SETUPS = {
  noImage: S.amenities.setupNoImage,
  noGallery: S.amenities.setupNoGallery,
  hasVideo: S.amenities.setupHasVideo,
  noDescription: S.amenities.setupNoDescription,
  noDirectional: S.amenities.setupNoDirectional
} as const;

const hasText = (value: string | null): boolean => !!value && !!value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

const stateMatches = (amenity: InventoryAmenity, state: string): boolean => {
  switch (state) {
    case 'stops':
      return amenity.showInStops;
    case 'hidden':
      return !amenity.showInStops;
    case 'plotted':
      return amenity.plotted;
    case 'unplotted':
      return !amenity.plotted;
    default:
      return true;
  }
};

const setupMatches = (amenity: InventoryAmenity, setup: string): boolean => {
  switch (setup) {
    case 'noImage':
      return !amenity.image;
    case 'noGallery':
      return amenity.gallery.length === 0;
    case 'hasVideo':
      return !!amenity.videoLink;
    case 'noDescription':
      return !hasText(amenity.description);
    case 'noDirectional':
      return !hasText(amenity.directionalText);
    default:
      return true;
  }
};

export interface AmenityFilterOptions {
  type: FilterOption[];
  building: FilterOption[];
  floor: FilterOption[];
  lock: FilterOption[];
  state: FilterOption[];
  setup: FilterOption[];
}

/**
 * Type, Building, Floor and Lock offer only the values this property's
 * amenities carry (as the design's `amTypeOptions` etc. do); State and Setup
 * always offer every state. Types keep the CMS's own order
 * (`Amenity::AMENITY_TYPE`), with any type outside that list after it.
 */
export const generateAmenityFilterOptions = (amenities: InventoryAmenity[], inventory: PropertyInventory): AmenityFilterOptions => {
  const withNone = (options: FilterOption[], missing: boolean, label: string): FilterOption[] =>
    missing ? [...options, { id: NONE, label: i18n.t(label) }] : options;

  const used = new Set(amenities.map((amenity) => amenity.category).filter((c): c is string => !!c));
  const known = inventory.amenityCategories.filter((category) => used.has(category));
  const other = [...used].filter((category) => !inventory.amenityCategories.includes(category)).sort(naturalCompare);

  const where = amenities.map(amenityWhere);
  const buildings = [...new Set(where.map((w) => w.building).filter((b): b is string => !!b))].sort(naturalCompare);
  const floors = [...new Set(where.map((w) => w.floor).filter((f): f is string => !!f))].sort(naturalCompare);
  const locks = [...new Set(amenities.map((amenity) => amenity.lockProvider).filter((l): l is string => !!l))].sort(
    naturalCompare
  );

  return {
    type: withNone(
      [...known, ...other].map((category) => ({ id: category, label: category })),
      amenities.some((amenity) => !amenity.category),
      S.amenities.noCategory
    ),
    building: withNone(
      buildings.map((building) => ({ id: building, label: building })),
      where.some((w) => !w.building),
      S.amenities.noBuilding
    ),
    floor: withNone(
      floors.map((floor) => ({ id: floor, label: floor })),
      where.some((w) => !w.floor),
      S.amenities.noFloor
    ),
    lock: withNone(
      locks.map((lock) => ({ id: lock, label: lockText(lock) })),
      amenities.some((amenity) => !amenity.lockProvider),
      S.amenities.noLock
    ),
    state: Object.entries(STATES).map(([id, label]) => ({ id, label: i18n.t(label) })),
    setup: Object.entries(SETUPS).map(([id, label]) => ({ id, label: i18n.t(label) }))
  };
};

/** Search as the design does it: one term, anywhere in the name, type, building or floor. */
export const filterAmenities = (amenities: InventoryAmenity[], filters: AmenityFilters): InventoryAmenity[] => {
  const query = filters.query.trim().toLowerCase();
  const pick = (selected: string[], value: string | null) => selected.length === 0 || selected.includes(value || NONE);

  return amenities.filter((amenity) => {
    const where = amenityWhere(amenity);

    if (query) {
      const haystack = [amenity.name, amenity.category, where.building, where.floor]
        .filter((field): field is string => !!field)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    if (!pick(filters.type, amenity.category)) return false;
    if (!pick(filters.building, where.building)) return false;
    if (!pick(filters.floor, where.floor)) return false;
    if (!pick(filters.lock, amenity.lockProvider)) return false;
    if (filters.state.length && !filters.state.some((state) => stateMatches(amenity, state))) return false;
    if (filters.setup.length && !filters.setup.some((setup) => setupMatches(amenity, setup))) return false;
    return true;
  });
};

/** Natural order by name, as the other inventory tabs list their records. */
export const sortAmenities = (amenities: InventoryAmenity[]): InventoryAmenity[] =>
  [...amenities].sort((a, b) => naturalCompare(a.name, b.name));

/* ---------------- Cards ---------------- */

export interface AmenityCard {
  id: number;
  title: string;
  /** The grey tag after the name: the amenity type. */
  type: string;
  pills: PillDescriptor[];
  thumb: ThumbDescriptor;
  hasOwnImage: boolean;
  meta: MetaDescriptor[];
  chips: ChipDescriptor[];
  images: ImageDescriptor[];
  deleteConfirm: ConfirmDescriptor;
  removeImageConfirm: ConfirmDescriptor;
}

/** Every real image of an amenity, its own first, then the gallery, for the viewer. */
export const amenityImages = (amenity: InventoryAmenity): ImageDescriptor[] => {
  const images: ImageDescriptor[] = [];
  if (amenity.image) images.push({ name: `${amenity.name} — ${i18n.t(S.amenities.amenityImage)}`, src: amenity.image.url });
  amenity.gallery.forEach((photo, index) => {
    if (!photo.url) return;
    const label = t(S.amenities.photo, { position: index + 1 });
    images.push({ name: `${amenity.name} — ${photo.name ? `${label} · ${photo.name}` : label}`, src: photo.url });
  });
  return images;
};

/** The pop-up button's label: the stored one, else the CMS's default. */
export const videoLabel = (amenity: InventoryAmenity): string =>
  amenity.videoLinkButtonLabel ?? i18n.t(S.amenities.playVideo);

export const generateAmenityCards = (amenities: InventoryAmenity[]): AmenityCard[] =>
  amenities.map((amenity) => {
    const where = amenityWhere(amenity);
    const gallery = amenity.gallery.filter((photo) => !!photo.url).length;
    const pills: PillDescriptor[] = [
      amenity.plotted
        ? { label: i18n.t(S.amenities.plotted), variant: 'ok' }
        : { label: i18n.t(S.amenities.notOnMap), variant: 'warn' },
      amenity.showInStops
        ? { label: i18n.t(S.amenities.inStops), variant: 'info' }
        : { label: i18n.t(S.amenities.hiddenFromStops), variant: 'neutral' }
    ];

    return {
      id: amenity.id,
      title: amenity.name,
      type: amenity.category ?? i18n.t(S.amenities.noCategory),
      pills,
      hasOwnImage: !!amenity.image,
      thumb: {
        src: amenity.image?.url ?? amenity.gallery.find((photo) => photo.url)?.url ?? null,
        alt: `${amenity.name} — ${i18n.t(S.amenities.amenityImage)}`
      },
      meta: [
        { label: i18n.t(S.amenities.meta.building), value: where.building ?? EMPTY },
        { label: i18n.t(S.amenities.meta.floor), value: where.floor ?? EMPTY },
        { label: i18n.t(S.amenities.meta.lock), value: lockText(amenity.lockProvider) },
        amenity.videoLink
          ? {
              label: i18n.t(S.amenities.meta.video),
              value: videoLabel(amenity),
              href: amenity.videoLink,
              hrefLabel: t(S.amenities.openVideo, { name: amenity.name })
            }
          : { label: i18n.t(S.amenities.meta.video), value: i18n.t(S.none) },
        {
          label: i18n.t(S.amenities.meta.gallery),
          value: gallery ? counted(gallery, S.count.imageOne, S.count.imageMany) : i18n.t(S.amenities.galleryEmpty)
        }
      ],
      chips: [
        { label: i18n.t(S.amenities.chipDescription), on: hasText(amenity.description) },
        { label: i18n.t(S.amenities.chipDirectional), on: hasText(amenity.directionalText) },
        { label: i18n.t(S.amenities.chipVideo), on: !!amenity.videoLink }
      ],
      images: amenityImages(amenity),
      deleteConfirm: {
        title: t(S.dialogs.confirm.deleteAmenityTitle, { name: amenity.name }),
        message: i18n.t(S.dialogs.confirm.deleteAmenityBody),
        label: i18n.t(S.dialogs.confirm.deleteAmenityLabel)
      },
      removeImageConfirm: {
        title: i18n.t(S.dialogs.confirm.removeImageTitle),
        message: i18n.t(S.dialogs.confirm.removeImageBody),
        label: i18n.t(S.dialogs.confirm.removeLabel)
      }
    };
  });
