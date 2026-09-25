import { i18n } from '~/resources/i18n';
import type { FilterOption } from '../listing.types';
import type {
  InventoryAmenity,
  InventoryButton,
  InventoryFloorplan,
  InventoryFloorplate,
  InventoryUnit,
  InventoryUpload,
  PropertyInventory
} from '~/core/models/data/propertyInventory.data';
import { floorplateTitle } from './floorplates.generator';
import type { ImageDescriptor } from './inventory.types';
import { S, counted, isFed, lockText, naturalCompare, plainText, t } from './inventoryText';

/**
 * What the Add / Edit dialogs start from. "Edit" fills every field from the
 * record's real columns; "Add" starts empty. Connect is read-only, so these
 * forms are only ever shown: Save closes the dialog (gap G20).
 */

/** An upload as the dialog's file slot shows it. */
export interface UploadFileDescriptor {
  name: string;
  src: string | null;
  meta: string;
  isSvg?: boolean;
}

const extensionOf = (fileName: string): string => (fileName.split('.').pop() ?? '').toUpperCase();

/** "PNG · 1412 × 932". The CMS stores no file sizes (gap G19). */
export const uploadFile = (
  upload: InventoryUpload | null,
  width?: number | null,
  height?: number | null
): UploadFileDescriptor | null => {
  if (!upload) return null;
  const extension = extensionOf(upload.fileName);
  const dimensions = width && height ? `${width} × ${height}` : null;

  return {
    name: upload.fileName || upload.url,
    src: upload.url,
    meta: [extension, dimensions].filter(Boolean).join(' · '),
    isSvg: extension === 'SVG'
  };
};

/** Buildings the property's floorplates and units name, in natural order. */
export const buildingOptions = (inventory: PropertyInventory): string[] =>
  [
    ...new Set(
      [...inventory.floorplates.map((plate) => plate.building), ...inventory.units.map((unit) => unit.building)].filter(
        (building): building is string => !!building
      )
    )
  ].sort(naturalCompare);

const text = (value: number | null | undefined): string => (value == null ? '' : String(value));

const threeButtons = (buttons: InventoryButton[]): InventoryButton[] =>
  [0, 1, 2].map((index) => buttons[index] ?? { label: null, url: null, newTab: false });

/* ---------------- Floorplate ---------------- */

export interface FloorplateForm {
  override: boolean;
  name: string;
  building: string;
  range: string;
  addName: boolean;
  image: UploadFileDescriptor | null;
  svg: UploadFileDescriptor | null;
}

export const floorplateForm = (plate: InventoryFloorplate | null): FloorplateForm => ({
  override: plate?.manualOverride ?? false,
  name: plate?.name ?? '',
  building: plate?.building ?? '',
  range: plate?.range ?? '',
  addName: plate?.floorNameAdded ?? false,
  image: plate ? uploadFile(plate.image, plate.width, plate.height) : null,
  svg: plate ? uploadFile(plate.svg, plate.svgWidth, plate.svgHeight) : null
});

export const floorplateDialogTitle = (plate: InventoryFloorplate | null): string =>
  i18n.t(plate ? S.dialogs.floorplate.editTitle : S.dialogs.floorplate.addTitle);

/* ---------------- Floor plan ---------------- */

export interface FloorplanForm {
  override: boolean;
  name: string;
  providerId: string;
  sqft: string;
  beds: string;
  baths: string;
  price: string;
  buttons: InventoryButton[];
  detailsTitle: string;
  details: string;
  showOnCards: boolean;
  primary: UploadFileDescriptor | null;
  secondary: UploadFileDescriptor | null;
  interiors: ImageDescriptor[];
}

export const floorplanForm = (plan: InventoryFloorplan | null): FloorplanForm => ({
  override: plan?.manualOverride ?? false,
  name: plan?.name ?? '',
  providerId: plan?.providerFloorplanId ?? '',
  sqft: text(plan?.squareFeet != null ? Math.round(plan.squareFeet) : null),
  beds: text(plan?.bedrooms),
  baths: text(plan?.bathrooms),
  price: text(plan?.marketRent != null ? Math.round(plan.marketRent) : null),
  buttons: threeButtons(plan?.buttons ?? []),
  detailsTitle: plan?.descriptionTitle ?? '',
  details: plainText(plan?.description ?? null),
  showOnCards: plan?.showDescriptionOnCard ?? false,
  primary: plan ? uploadFile(plan.image) : null,
  secondary: plan ? uploadFile(plan.secondaryImage) : null,
  interiors: (plan?.interiorImages ?? [])
    .filter((image): image is typeof image & { url: string } => !!image.url)
    .map((image, index) => ({
      name: image.name ?? t(S.floorplans.interior, { position: index + 1 }),
      src: image.url
    }))
});

/* ---------------- Unit ---------------- */

export type UnitFormAvailability = 'available' | 'occupied';

export interface UnitForm {
  override: boolean;
  name: string;
  providerId: string;
  floorplanId: string;
  price: string;
  availability: UnitFormAvailability;
  availableDate: string;
  unitStatus: string;
  tourOrder: string;
  building: string;
  floor: string;
  sqft: string;
  sold: boolean;
  model: boolean;
  buttons: InventoryButton[];
  lockType: string;
  lockDevice: string;
  fees: string;
  detailsTitle: string;
  details: string;
  directional: string;
  primary: UploadFileDescriptor | null;
  secondary: UploadFileDescriptor | null;
  interiors: ImageDescriptor[];
}

/** The lock mapped to the unit's door (a lock's `stop_id` is the door it opens). */
const mappedLock = (unit: InventoryUnit, inventory: PropertyInventory): string =>
  unit.doorId != null ? (inventory.lockDevices.find((lock) => lock.stopId === unit.doorId)?.id ?? '') : '';

export const unitForm = (unit: InventoryUnit | null, inventory: PropertyInventory): UnitForm => ({
  override: unit?.manualOverride ?? false,
  name: unit?.marketingName ?? '',
  providerId: unit?.providerUnitId ?? '',
  floorplanId: unit?.floorplanId != null ? String(unit.floorplanId) : '',
  price: text(unit?.price != null ? Math.round(unit.price) : null),
  availability: unit && !unit.available ? 'occupied' : 'available',
  availableDate: unit?.availableDate?.slice(0, 10) ?? '',
  unitStatus: unit?.unitStatus ?? '',
  tourOrder: text(unit?.tourOrder),
  building: unit?.building ?? '',
  floor: text(unit?.floor),
  sqft: text(unit?.squareFeet != null ? Math.round(unit.squareFeet) : null),
  sold: unit?.sold ?? false,
  model: unit?.modelUnit ?? false,
  buttons: threeButtons(unit?.buttons ?? []),
  lockType: unit?.lockProvider ?? '',
  lockDevice: unit ? mappedLock(unit, inventory) : '',
  fees: plainText(unit?.additionalFee ?? null),
  detailsTitle: unit?.descriptionTitle ?? '',
  details: plainText(unit?.description ?? null),
  directional: plainText(unit?.stopDescription ?? null),
  primary: unit ? uploadFile(unit.image) : null,
  secondary: unit ? uploadFile(unit.secondaryImage) : null,
  interiors: (unit?.interiorImages ?? [])
    .filter((image): image is typeof image & { url: string } => !!image.url)
    .map((image, index) => ({
      name: image.name ?? t(S.units.interior, { position: index + 1 }),
      src: image.url
    }))
});

/** Which of a unit's fields the feed maintains, for the dialog's Feed / Manual tags. */
export const unitFieldSources = (unit: InventoryUnit | null) => {
  const fed = !!unit && isFed(unit.provider);
  const tag = (manual: boolean) => (fed ? (manual ? ('manual' as const) : ('feed' as const)) : undefined);

  return {
    name: tag(!!unit?.flags.name),
    providerId: tag(false),
    floorplan: tag(!!unit?.flags.floorplan),
    price: tag(!!unit?.flags.price),
    availability: tag(!!unit && (unit.flags.available || unit.flags.availability)),
    availableDate: tag(!!unit?.flags.availableDate),
    building: tag(!!unit?.flags.building),
    floor: tag(!!unit?.flags.floor),
    sqft: tag(false),
    sold: tag(!!unit?.flags.sold)
  };
};

export const unitDialogSubtitle = (inventory: PropertyInventory): string =>
  t(S.dialogs.unit.propLabel, {
    property: inventory.property.name,
    units: counted(inventory.units.length, S.count.unitOne, S.count.unitMany)
  });

/** The lock vendor accounts `all_locks` reads, by the provider name units and doors store. */
const VENDOR_PROVIDER: Record<string, string> = {
  latch: 'Latch',
  zerv: 'Zerv',
  igloohome: 'Igloohome',
  edgestate: 'EdgeState',
  dwelo: 'Dwelo'
};

/**
 * Community#lock_options: "Manual", plus every vendor this property has locks
 * with — and the unit's current provider, so an Edit always shows its value.
 */
export const lockTypeOptions = (inventory: PropertyInventory, current: string): FilterOption[] => {
  const providers = new Set(['Manual']);
  inventory.lockDevices.forEach((lock) => {
    const provider = VENDOR_PROVIDER[lock.vendor];
    if (provider) providers.add(provider);
  });
  if (current) providers.add(current);

  return [
    { id: '', label: i18n.t(S.none) },
    ...[...providers].map((provider) => ({ id: provider, label: lockText(provider) }))
  ];
};

export const lockDeviceOptions = (inventory: PropertyInventory, provider: string): FilterOption[] => [
  { id: '', label: i18n.t(S.dialogs.unit.unmapped) },
  ...inventory.lockDevices
    .filter((lock) => VENDOR_PROVIDER[lock.vendor] === provider)
    .map((lock) => ({ id: lock.id, label: lock.name || lock.id }))
];

/* ---------------- Amenity ---------------- */

export interface AmenityForm {
  name: string;
  category: string;
  /** '' (not placed), 'sitemap', or a floorplate id. */
  placement: string;
  photos: ImageDescriptor[];
}

export const amenityForm = (amenity: InventoryAmenity | null): AmenityForm => ({
  name: amenity?.name ?? '',
  category: amenity?.category ?? '',
  placement:
    amenity?.ownerType === 'Sitemap'
      ? 'sitemap'
      : amenity?.ownerType === 'Floorplate' && amenity.ownerId != null
        ? String(amenity.ownerId)
        : '',
  photos: [
    ...(amenity?.image ? [{ name: amenity.name, src: amenity.image.url }] : []),
    ...(amenity?.gallery ?? [])
      .filter((photo): photo is typeof photo & { url: string } => !!photo.url)
      .map((photo, index) => ({ name: photo.name ?? t(S.amenities.photo, { position: index + 1 }), src: photo.url }))
  ]
});

export const amenityPlacementOptions = (inventory: PropertyInventory): FilterOption[] => [
  { id: '', label: i18n.t(S.dialogs.amenity.notPlaced) },
  ...(inventory.mapType === 'sitemap' || inventory.sitemap ? [{ id: 'sitemap', label: i18n.t(S.amenities.propertyMap) }] : []),
  ...inventory.floorplates.map((plate) => ({
    id: String(plate.id),
    label: [floorplateTitle(plate), plate.building].filter(Boolean).join(' · ')
  }))
];

/* ---------------- Mass overrides ---------------- */

export type MassOverrideAction = 'protect' | 'release' | 'availYes' | 'availNo';

/**
 * The design's four actions. Each is a real legacy mass override
 * (`set_manual_override` on/off, `set_available` true/false); Connect only
 * shows it (gap G20).
 */
export const MASS_OVERRIDE_ACTIONS: { id: MassOverrideAction; label: string; warning: string }[] = [
  { id: 'protect', label: S.dialogs.mass.protect, warning: S.dialogs.mass.warnProtect },
  { id: 'release', label: S.dialogs.mass.release, warning: S.dialogs.mass.warnRelease },
  { id: 'availYes', label: S.dialogs.mass.availYes, warning: S.dialogs.mass.warnAvailYes },
  { id: 'availNo', label: S.dialogs.mass.availNo, warning: S.dialogs.mass.warnAvailNo }
];

export const massOverrideScope = (count: number, filtered: boolean): string =>
  t(filtered ? S.dialogs.mass.scopeFiltered : S.dialogs.mass.scopeAll, {
    units: counted(count, S.count.unitOne, S.count.unitMany)
  });
