/**
 * The Property Inventory of one real property, as the four legacy inventory
 * listings return it (`GET /communities/:id/{floorplates,floorplans,units,
 * amenities}.json`). Field names follow the Rails columns; the parser is the
 * only place their snake_case spelling appears.
 */

/** A stored upload: the file's name and where the CMS serves it. */
export interface InventoryUpload {
  url: string;
  fileName: string;
}

/** An image in a gallery (a floor plan's or unit's interior images). */
export interface InventoryImage {
  id: number;
  name: string | null;
  url: string | null;
}

/** One of the three buttons a floor plan or unit card can carry. */
export interface InventoryButton {
  label: string | null;
  url: string | null;
  newTab: boolean;
}

/**
 * An SVG-mode placement (`pointer_data`): the SVG element the pin points at
 * and its position in the floor SVG's user units (not the raster's pixels).
 */
export interface SvgPointer {
  xPlot: number;
  yPlot: number;
  tag: string | null;
  elementId: string | null;
  selector: string | null;
}

export interface InventoryProperty {
  id: number;
  name: string;
  companyId: number | null;
  companyName: string | null;
}

export interface InventoryFloorplate {
  id: number;
  name: string;
  number: number | null;
  building: string | null;
  /** Floors this floorplate covers, as the CMS stores them: "3", "3-10", "3,5,7". */
  range: string | null;
  floors: number[];
  floorName: string | null;
  /** "Add Floor Name": the floor name is printed on the kiosk map. */
  floorNameAdded: boolean;
  /** The name was set by hand rather than derived from the range. */
  manualOverride: boolean;
  nameIsUpdated: boolean;
  buildingIsUpdated: boolean;
  /** The raster floor image. */
  image: InventoryUpload | null;
  /** The floor SVG. */
  svg: InventoryUpload | null;
  width: number | null;
  height: number | null;
  svgWidth: number | null;
  svgHeight: number | null;
  /** Visible units on this floorplate's floors, and how many are plotted on it. */
  unitCount: number;
  plottedUnitCount: number;
  amenityCount: number;
  plottedAmenityCount: number;
}

export type FloorplanAvailabilityStatus = 'available' | 'limited_availability' | 'almost_gone' | 'sold_out';

export interface FloorplanFlags {
  name: boolean;
  squareFeet: boolean;
  bedrooms: boolean;
  bathrooms: boolean;
  marketRent: boolean;
}

export interface InventoryFloorplan {
  id: number;
  name: string;
  provider: string | null;
  providerFloorplanId: string | null;
  /** The CMS stores bedrooms as text holding a number ("0" is a studio). */
  bedrooms: number | null;
  bathrooms: number | null;
  squareFeet: number | null;
  marketRent: number | null;
  deposit: number | null;
  unitCount: number;
  availableUnitCount: number;
  availabilityStatus: FloorplanAvailabilityStatus | null;
  manualOverride: boolean;
  flags: FloorplanFlags;
  image: InventoryUpload | null;
  secondaryImage: InventoryUpload | null;
  interiorImages: InventoryImage[];
  buttons: InventoryButton[];
  descriptionTitle: string | null;
  description: string | null;
  showDescriptionOnCard: boolean;
}

/** Unit::FEED_OVERRIDE_FLAGS: fields set by hand, which the feed leaves alone. */
export interface UnitFlags {
  name: boolean;
  floorplan: boolean;
  price: boolean;
  available: boolean;
  availableDate: boolean;
  availability: boolean;
  floor: boolean;
  building: boolean;
  sold: boolean;
}

/** One row of the kiosk's lease-term matrix, as the CMS formats it ("12 Month" → "$1,500"). */
export interface UnitLeaseTerm {
  term: string;
  rent: string;
}

export interface InventoryUnit {
  id: number;
  marketingName: string | null;
  /** What the legacy grid labels the row with. */
  displayName: string | null;
  providerUnitId: string | null;
  provider: string | null;
  unitType: string | null;
  /** The floor plan's primary key, resolved from the provider id the unit stores. */
  floorplanId: number | null;
  floorplanProviderId: string | null;
  price: number | null;
  marketRent: number | null;
  squareFeet: number | null;
  available: boolean;
  /** ISO date (yyyy-mm-dd). */
  availableDate: string | null;
  availability: string | null;
  sold: boolean;
  unitStatus: string | null;
  building: string | null;
  floor: number | null;
  floorplateId: number | null;
  plotted: boolean;
  /**
   * The pin's position on the floorplate's raster image, in image pixels.
   * Null for an SVG-pointer placement (then `plotted` is still true) and for
   * an unplotted unit.
   */
  xPlot: number | null;
  yPlot: number | null;
  svgPointer: SvgPointer | null;
  visible: boolean;
  showOnMap: boolean;
  modelUnit: boolean;
  manualOverride: boolean;
  flags: UnitFlags;
  lockProvider: string | null;
  doorId: number | null;
  tourOrder: number | null;
  image: InventoryUpload | null;
  secondaryImage: InventoryUpload | null;
  interiorImages: InventoryImage[];
  buttons: InventoryButton[];
  /** Empty unless the property shows pricing options and the feed sent a matrix. */
  leaseTerms: UnitLeaseTerm[];
  additionalFee: string | null;
  descriptionTitle: string | null;
  description: string | null;
  stopDescription: string | null;
}

export type AmenityOwnerType = 'Floorplate' | 'Sitemap' | 'Floorplan' | 'Unit';

export interface InventoryAmenity {
  id: number;
  name: string;
  category: string | null;
  /** Where the amenity is plotted; null while it is not placed on a map. */
  ownerType: AmenityOwnerType | null;
  ownerId: number | null;
  ownerName: string | null;
  ownerBuilding: string | null;
  floor: number | null;
  building: string | null;
  plotted: boolean;
  /** The pin's pixel position on the owner's image; null when unplotted or placed by SVG pointer. */
  xPlot: number | null;
  yPlot: number | null;
  svgPointer: SvgPointer | null;
  tourStop: boolean;
  image: InventoryUpload | null;
  gallery: { id: number; name: string | null; description: string | null; url: string | null }[];
  videoLink: string | null;
  description: string | null;
  directionalText: string | null;
}

export interface LockDevice {
  /** The lock vendor account: latch, zerv, igloohome, edgestate, dwelo. */
  vendor: string;
  id: string;
  name: string;
  /** The door this lock is mapped to, if any. */
  stopId: number | null;
}

export interface InventorySitemap {
  id: number;
  image: InventoryUpload | null;
  svg: InventoryUpload | null;
  width: number | null;
  height: number | null;
}

export interface PropertyInventory {
  property: InventoryProperty;
  floorplates: InventoryFloorplate[];
  floorplans: InventoryFloorplan[];
  units: InventoryUnit[];
  amenities: InventoryAmenity[];
  /** `floorplates` (floorplate maps) or `sitemap` (one property map). */
  mapType: 'floorplates' | 'sitemap';
  svgMode: boolean;
  tourStopCount: number;
  /** A Beans property's one shared background map (communities.background_svg_image). */
  sharedBackground: InventoryUpload | null;
  sitemap: InventorySitemap | null;
  currencySymbol: string;
  /** The legacy "Show all as available" setting, which turns on floor plan statuses. */
  turnAvailabilityOn: boolean;
  dataProvider: string | null;
  /** communities.data_provider_updated_on: a timestamp, or the CMS's own "Never". */
  lastSync: string | null;
  lockDevices: LockDevice[];
  amenityCategories: string[];
}
