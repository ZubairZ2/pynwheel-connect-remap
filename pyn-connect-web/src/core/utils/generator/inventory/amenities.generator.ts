import { i18n } from '~/resources/i18n';
import type { InventoryAmenity, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type { ConfirmDescriptor, ImageDescriptor, PillDescriptor, ThumbDescriptor } from './inventory.types';
import { S, counted, naturalCompare, t } from './inventoryText';

/**
 * The Amenities tab: the property's amenities — the records that become tour
 * stops once plotted on a floorplate or the property map.
 *
 * `AmenitiesController#index` lists every amenity carrying the property's id.
 * A few of those belong to a floor plan or unit instead (their interior
 * images); they are shown with that floor plan or unit, not here.
 */
export const propertyAmenities = (inventory: PropertyInventory): InventoryAmenity[] =>
  inventory.amenities.filter(
    (amenity) => amenity.ownerType == null || amenity.ownerType === 'Floorplate' || amenity.ownerType === 'Sitemap'
  );

/** Where the amenity is plotted, as the plotting pages name it. */
export const amenityWhere = (amenity: InventoryAmenity): string => {
  if (amenity.ownerType === 'Sitemap') return i18n.t(S.amenities.propertyMap);
  if (amenity.ownerType === 'Floorplate') {
    const name = amenity.ownerName ?? '';
    const plate = /^-?\d+$/.test(name) ? t(S.floorplates.floor, { floor: name }) : t(S.amenities.floorplateWhere, { name });
    return [plate, amenity.ownerBuilding].filter(Boolean).join(' · ');
  }
  return i18n.t(S.amenities.notPlaced);
};

export interface AmenityPhoto {
  id: number;
  position: string;
  src: string;
  name: string;
}

export interface AmenityCard {
  id: number;
  title: string;
  pills: PillDescriptor[];
  subtitle: string;
  category: string;
  thumb: ThumbDescriptor;
  photos: AmenityPhoto[];
  images: ImageDescriptor[];
  deleteConfirm: ConfirmDescriptor;
}

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

export const generateAmenityCards = (inventory: PropertyInventory): AmenityCard[] =>
  [...propertyAmenities(inventory)]
    .sort((a, b) => naturalCompare(a.name, b.name))
    .map((amenity) => {
      const images = amenityImages(amenity);
      const pills: PillDescriptor[] = [
        amenity.plotted
          ? { label: i18n.t(S.amenities.plotted), variant: 'ok' }
          : { label: i18n.t(S.amenities.notOnMap), variant: 'warn' }
      ];
      if (amenity.tourStop) pills.push({ label: i18n.t(S.amenities.tourStop), variant: 'info' });

      return {
        id: amenity.id,
        title: amenity.name,
        pills,
        subtitle: `${amenityWhere(amenity)} · ${t(S.amenities.inGallery, {
          photos: counted(amenity.gallery.length, S.count.photoOne, S.count.photoMany)
        })}`,
        category: amenity.category ?? i18n.t(S.amenities.noCategory),
        thumb: {
          src: amenity.image?.url ?? amenity.gallery.find((photo) => photo.url)?.url ?? null,
          alt: `${amenity.name} — ${i18n.t(S.amenities.amenityImage)}`
        },
        photos: amenity.gallery
          .filter((photo): photo is typeof photo & { url: string } => !!photo.url)
          .map((photo, index) => ({
            id: photo.id,
            position: `#${index + 1}`,
            src: photo.url,
            name: photo.name ?? t(S.amenities.photo, { position: index + 1 })
          })),
        images,
        deleteConfirm: {
          title: t(S.dialogs.confirm.deleteAmenityTitle, { name: amenity.name }),
          message: i18n.t(S.dialogs.confirm.deleteAmenityBody),
          label: i18n.t(S.dialogs.confirm.deleteAmenityLabel)
        }
      };
    });
