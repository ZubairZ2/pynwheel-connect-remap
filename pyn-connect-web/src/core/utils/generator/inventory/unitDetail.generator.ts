import { CORE_STRINGS } from '~/config/app/strings';
import { mapEditorRoute } from '~/config/app/connectRoutes';
import { i18n } from '~/resources/i18n';
import type { InventoryUnit, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type { FilterOption } from '../listing.types';
import type { ConfirmDescriptor, ImageDescriptor, PillDescriptor } from './inventory.types';
import { EMPTY, S, counted, isFed, layoutText, t, unitAvailability, type UnitAvailability } from './inventoryText';
import { availabilityPill, manualOverrideCount, planLookup, unitImages, unitName } from './units.generator';

/**
 * The Unit Detail screen (the 22-Sep design's `unitDetail`), on one real unit
 * of a property's inventory. Pure: every label, pill and tile is decided here
 * from the unit, its floor plan and its floorplate.
 */

const UD = CORE_STRINGS.unitDetail;

/** A Unit Data tile whose value the PMS feed can own: Price, Square feet. */
export interface UnitDataField {
  key: 'price' | 'sqft';
  label: string;
  /** What the read-only input shows; empty when the CMS has no value. */
  value: string;
  /** Shown in the input while `value` is empty ("Not set", "From plan"). */
  placeholder: string;
  /** Manual (info) or PMS (neutral); absent on a hand-entered unit, as on the card. */
  source: PillDescriptor | null;
}

export interface UnitGalleryPhoto extends ImageDescriptor {
  /** "#1", "#2"… */
  position: string;
}

export interface LeaseTermTile {
  term: string;
  rent: string;
  /** The 12-month term is the base the design highlights. */
  base: boolean;
}

export interface UnitDetailDescriptor {
  id: number;
  name: string;
  pills: PillDescriptor[];
  /** "{plan} · {layout} · {building · floor}" or "… · No floorplate assigned". */
  subtitle: string;
  plotted: boolean;
  /** "View on Plan" once plotted, "Plot on Plan" until then; both go to Map & Plotting. */
  plotLabel: string;
  plotHref: string;
  data: {
    fields: UnitDataField[];
    availability: { value: UnitAvailability; options: FilterOption[] };
    pmsFloor: string;
  };
  gallery: {
    countLabel: string;
    photos: UnitGalleryPhoto[];
  };
  placement: {
    summary: string;
    notPlotted: boolean;
  };
  terms: {
    tiles: LeaseTermTile[];
  };
  resyncConfirm: ConfirmDescriptor;
  deleteConfirm: ConfirmDescriptor;
}

const AVAILABILITY_OPTIONS: { id: UnitAvailability; label: string }[] = [
  { id: 'now', label: S.units.availNow },
  { id: 'soon', label: S.units.availSoon },
  { id: 'notAvailable', label: S.units.notAvailable },
  { id: 'sold', label: S.units.sold }
];

/** The design's Manual (info) / PMS (neutral) pill, only for a unit a feed keeps current. */
const sourcePill = (fed: boolean, manual: boolean): PillDescriptor | null =>
  fed
    ? manual
      ? { label: i18n.t(UD.data.sourceManual), variant: 'info' }
      : { label: i18n.t(UD.data.sourcePms), variant: 'neutral' }
    : null;

/** "Tower A · Floor 12", or whichever half the CMS has. */
const placementText = (unit: InventoryUnit, building: string | null): string =>
  [building, unit.floor != null ? t(S.units.floor, { floor: unit.floor }) : null].filter(Boolean).join(' · ');

/**
 * Where the pin sits on the floorplate image, as percentages of its size
 * ("22%, 32%"); "—" when the unit has no raster pin or the plate no size.
 */
const pinText = (unit: InventoryUnit, plate: { width: number | null; height: number | null } | undefined): string => {
  if (unit.xPlot == null || unit.yPlot == null || !plate?.width || !plate.height) return EMPTY;
  const percent = (value: number, size: number) => Math.round((value / size) * 100);
  return `${percent(unit.xPlot, plate.width)}%, ${percent(unit.yPlot, plate.height)}%`;
};

/** A term's month count, so "12 Month" is recognised whatever its spacing. */
const isBaseTerm = (term: string): boolean => /^\s*12\b/.test(term);

export const generateUnitDetail = (inventory: PropertyInventory, unit: InventoryUnit, today: string): UnitDetailDescriptor => {
  const plan = unit.floorplanId != null ? planLookup(inventory).get(unit.floorplanId) : undefined;
  const plate = unit.floorplateId != null ? inventory.floorplates.find((candidate) => candidate.id === unit.floorplateId) : undefined;
  const fed = isFed(unit.provider);
  const name = unitName(unit);
  const propId = String(inventory.property.id);
  const layout = layoutText(plan);
  const pmsFloor = placementText(unit, unit.building) || EMPTY;
  const where = plate ? placementText(unit, unit.building ?? plate.building) || plate.name : i18n.t(UD.noFloorplate);
  // The unit's own images only (no plan given, so no floor plan image is appended).
  const photos = unitImages(unit, undefined);
  const sqft = unit.squareFeet && unit.squareFeet > 0 ? unit.squareFeet : null;

  return {
    id: unit.id,
    name,
    pills: [
      availabilityPill(unit, today),
      unit.plotted ? { label: i18n.t(S.units.plotted), variant: 'ok' } : { label: i18n.t(S.units.notOnMap), variant: 'warn' }
    ],
    subtitle: [plan?.name ?? i18n.t(S.units.noFloorPlan), layout === EMPTY ? null : layout, where].filter(Boolean).join(' · '),
    plotted: unit.plotted,
    plotLabel: i18n.t(unit.plotted ? UD.viewOnPlan : UD.plotOnPlan),
    plotHref: mapEditorRoute(propId),
    data: {
      fields: [
        {
          key: 'price',
          label: t(UD.data.price, { currency: inventory.currencySymbol }),
          value: unit.price != null && unit.price > 0 ? Math.round(unit.price).toLocaleString('en-US') : '',
          placeholder: i18n.t(S.notSet),
          source: sourcePill(fed, unit.flags.price)
        },
        {
          key: 'sqft',
          label: i18n.t(UD.data.sqft),
          value: sqft ? Math.round(sqft).toLocaleString('en-US') : '',
          placeholder: i18n.t(S.units.fromPlan),
          // The CMS has no per-field marker for square footage, so a fed unit's is always the feed's.
          source: sourcePill(fed, false)
        }
      ],
      availability: {
        value: unitAvailability(unit, today),
        options: AVAILABILITY_OPTIONS.map((option) => ({ id: option.id, label: i18n.t(option.label) }))
      },
      pmsFloor
    },
    gallery: {
      countLabel: t(UD.gallery.subtitle, { count: counted(photos.length, S.count.photoOne, S.count.photoMany) }),
      photos: photos.map((photo, index) => ({ ...photo, position: t(UD.gallery.position, { position: index + 1 }) }))
    },
    placement: {
      summary: t(UD.placement.pinAt, { where, coord: pinText(unit, plate) }),
      notPlotted: !unit.plotted
    },
    terms: {
      tiles: unit.leaseTerms.map((row) => ({ term: row.term, rent: row.rent, base: isBaseTerm(row.term) }))
    },
    resyncConfirm: {
      title: i18n.t(S.dialogs.confirm.resyncTitle),
      message: t(S.dialogs.confirm.resyncBody, {
        overrides: counted(manualOverrideCount(inventory), S.count.overrideOne, S.count.overrideMany)
      }),
      label: i18n.t(S.dialogs.confirm.resyncLabel)
    },
    deleteConfirm: {
      title: t(S.dialogs.confirm.deleteUnitTitle, { name }),
      message: i18n.t(S.dialogs.confirm.deleteUnitBody),
      label: i18n.t(S.dialogs.confirm.deleteUnitLabel)
    }
  };
};
