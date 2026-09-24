import { ModelDataConverter } from '~/core/utils/converter/modelDataConverter';
import type {
  AmenityOwnerType,
  FloorplanAvailabilityStatus,
  InventoryAmenity,
  InventoryButton,
  InventoryFloorplan,
  InventoryFloorplate,
  InventoryImage,
  InventoryProperty,
  InventorySitemap,
  InventoryUnit,
  InventoryUpload,
  LockDevice
} from '~/core/models/data/propertyInventory.data';
import { unwrapData } from './envelope.parser';

/**
 * The four inventory listings (floorplates, floorplans, units, amenities), from
 * their envelopes into models. Every value is coerced here, because Rails sends
 * some numbers as text (`floorplans.bedrooms`) and leaves others out.
 */

type Source = Record<string, unknown>;

const camel = (value: unknown): Source => ModelDataConverter.toCamelCase<Source>(value ?? {});

const metaOf = (payload: unknown): Source => camel((payload as { meta?: unknown } | null)?.meta);

const text = (value: unknown): string | null => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const num = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const count = (value: unknown): number => num(value) ?? 0;

const flag = (value: unknown): boolean => value === true;

const upload = (value: unknown): InventoryUpload | null => {
  const source = (value ?? null) as Source | null;
  const url = text(source?.url);
  return url ? { url, fileName: text(source?.fileName) ?? '' } : null;
};

const images = (value: unknown): InventoryImage[] =>
  (Array.isArray(value) ? (value as Source[]) : []).map((image) => ({
    id: count(image.id),
    name: text(image.name),
    url: text(image.url)
  }));

const buttons = (value: unknown): InventoryButton[] =>
  (Array.isArray(value) ? (value as Source[]) : []).map((button) => ({
    label: text(button.label),
    url: text(button.url),
    newTab: flag(button.newTab)
  }));

const flagsOf = <K extends string>(value: unknown, keys: readonly K[]): Record<K, boolean> => {
  const source = (value ?? {}) as Source;
  return keys.reduce((acc, key) => ({ ...acc, [key]: flag(source[key]) }), {} as Record<K, boolean>);
};

export const parseInventoryProperty = (payload: unknown): InventoryProperty | null => {
  const property = (metaOf(payload).property ?? null) as Source | null;
  if (!property || num(property.id) == null) return null;

  return {
    id: count(property.id),
    name: text(property.name) ?? '',
    companyId: num(property.companyId),
    companyName: text(property.companyName)
  };
};

export const parseInventoryFloorplates = (payload: unknown) => {
  const meta = metaOf(payload);
  const sitemap = (meta.sitemap ?? null) as Source | null;

  return {
    floorplates: unwrapData(payload).map((row): InventoryFloorplate => {
      const source = camel(row);
      return {
        id: count(source.id),
        name: text(source.name) ?? '',
        number: num(source.number),
        building: text(source.building),
        range: text(source.range),
        floors: (Array.isArray(source.floors) ? source.floors : []).map(Number).filter(Number.isFinite),
        floorName: text(source.floorName),
        floorNameAdded: flag(source.floorNameAdded),
        manualOverride: flag(source.manualOverride),
        nameIsUpdated: flag(source.nameIsUpdated),
        buildingIsUpdated: flag(source.buildingIsUpdated),
        image: upload(source.image),
        svg: upload(source.svg),
        width: num(source.width),
        height: num(source.height),
        svgWidth: num(source.svgWidth),
        svgHeight: num(source.svgHeight),
        unitCount: count(source.unitCount),
        plottedUnitCount: count(source.plottedUnitCount),
        amenityCount: count(source.amenityCount),
        plottedAmenityCount: count(source.plottedAmenityCount)
      };
    }),
    mapType: meta.mapType === 'sitemap' ? ('sitemap' as const) : ('floorplates' as const),
    svgMode: flag(meta.svgMode),
    tourStopCount: count(meta.tourStopCount),
    sharedBackground: upload(meta.sharedBackground),
    sitemap: sitemap
      ? ({
          id: count(sitemap.id),
          image: upload(sitemap.image),
          svg: upload(sitemap.svg),
          width: num(sitemap.width),
          height: num(sitemap.height)
        } satisfies InventorySitemap)
      : null
  };
};

const AVAILABILITY_STATUSES: FloorplanAvailabilityStatus[] = [
  'available',
  'limited_availability',
  'almost_gone',
  'sold_out'
];

export const parseInventoryFloorplans = (payload: unknown) => {
  const meta = metaOf(payload);

  return {
    floorplans: unwrapData(payload).map((row): InventoryFloorplan => {
      const source = camel(row);
      const status = text(source.availabilityStatus) as FloorplanAvailabilityStatus | null;

      return {
        id: count(source.id),
        name: text(source.name) ?? '',
        provider: text(source.provider),
        providerFloorplanId: text(source.providerFloorplanId),
        bedrooms: num(source.bedrooms),
        bathrooms: num(source.bathrooms),
        squareFeet: num(source.squareFeet),
        marketRent: num(source.marketRent),
        deposit: num(source.deposit),
        unitCount: count(source.unitCount),
        availableUnitCount: count(source.availableUnitCount),
        availabilityStatus: status && AVAILABILITY_STATUSES.includes(status) ? status : null,
        manualOverride: flag(source.manualOverride),
        flags: flagsOf(source.flags, ['name', 'squareFeet', 'bedrooms', 'bathrooms', 'marketRent'] as const),
        image: upload(source.image),
        secondaryImage: upload(source.secondaryImage),
        interiorImages: images(source.interiorImages),
        buttons: buttons(source.buttons),
        descriptionTitle: text(source.descriptionTitle),
        description: text(source.description),
        showDescriptionOnCard: flag(source.showDescriptionOnCard)
      };
    }),
    currencySymbol: text(meta.currencySymbol) ?? '$',
    turnAvailabilityOn: flag(meta.turnAvailabilityOn)
  };
};

const UNIT_FLAGS = [
  'name',
  'floorplan',
  'price',
  'available',
  'availableDate',
  'availability',
  'floor',
  'building',
  'sold'
] as const;

export const parseInventoryUnits = (payload: unknown) => {
  const meta = metaOf(payload);

  return {
    units: unwrapData(payload).map((row): InventoryUnit => {
      const source = camel(row);
      return {
        id: count(source.id),
        marketingName: text(source.marketingName),
        displayName: text(source.displayName),
        providerUnitId: text(source.providerUnitId),
        provider: text(source.provider),
        unitType: text(source.unitType),
        floorplanId: num(source.floorplanId),
        floorplanProviderId: text(source.floorplanProviderId),
        price: num(source.price),
        marketRent: num(source.marketRent),
        squareFeet: num(source.squareFeet),
        available: flag(source.available),
        availableDate: text(source.availableDate),
        availability: text(source.availability),
        sold: flag(source.sold),
        unitStatus: text(source.unitStatus),
        building: text(source.building),
        floor: num(source.floor),
        floorplateId: num(source.floorplateId),
        plotted: flag(source.plotted),
        visible: flag(source.visible),
        showOnMap: flag(source.showOnMap),
        modelUnit: flag(source.modelUnit),
        manualOverride: flag(source.manualOverride),
        flags: flagsOf(source.flags, UNIT_FLAGS),
        lockProvider: text(source.lockProvider),
        doorId: num(source.doorId),
        tourOrder: num(source.tourOrder),
        image: upload(source.image),
        secondaryImage: upload(source.secondaryImage),
        interiorImages: images(source.interiorImages),
        buttons: buttons(source.buttons),
        additionalFee: text(source.additionalFee),
        descriptionTitle: text(source.descriptionTitle),
        description: text(source.description),
        stopDescription: text(source.stopDescription)
      };
    }),
    currencySymbol: text(meta.currencySymbol) ?? '$',
    dataProvider: text(meta.dataProvider),
    lastSync: text(meta.lastSync),
    lockDevices: (Array.isArray(meta.lockDevices) ? (meta.lockDevices as Source[]) : [])
      .map((lock): LockDevice => ({
        vendor: text(lock.vendor) ?? '',
        id: text(lock.id) ?? '',
        name: text(lock.name) ?? '',
        stopId: num(lock.stopId)
      }))
      .filter((lock) => lock.id)
  };
};

const OWNER_TYPES: AmenityOwnerType[] = ['Floorplate', 'Sitemap', 'Floorplan', 'Unit'];

export const parseInventoryAmenities = (payload: unknown) => {
  const meta = metaOf(payload);

  return {
    amenities: unwrapData(payload).map((row): InventoryAmenity => {
      const source = camel(row);
      const ownerType = text(source.ownerType) as AmenityOwnerType | null;

      return {
        id: count(source.id),
        name: text(source.name) ?? '',
        category: text(source.category),
        ownerType: ownerType && OWNER_TYPES.includes(ownerType) ? ownerType : null,
        ownerId: num(source.ownerId),
        ownerName: text(source.ownerName),
        ownerBuilding: text(source.ownerBuilding),
        floor: num(source.floor),
        building: text(source.building),
        plotted: flag(source.plotted),
        tourStop: flag(source.tourStop),
        image: upload(source.image),
        gallery: (Array.isArray(source.gallery) ? (source.gallery as Source[]) : []).map((photo) => ({
          id: count(photo.id),
          name: text(photo.name),
          description: text(photo.description),
          url: text(photo.url)
        })),
        videoLink: text(source.videoLink),
        description: text(source.description),
        directionalText: text(source.directionalText)
      };
    }),
    amenityCategories: (Array.isArray(meta.categoryOptions) ? meta.categoryOptions : [])
      .map((option) => text(option))
      .filter((option): option is string => !!option)
  };
};
