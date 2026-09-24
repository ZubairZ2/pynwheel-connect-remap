'use client';

import { useMemo } from 'react';

import { i18n } from '~/resources/i18n';
import { IconButton } from '~/core/components/atoms/IconButton';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { EyeIcon, ImageIcon, PencilIcon, TrashIcon, UploadIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { MediaThumb } from '~/core/components/molecules/MediaThumb';
import { RecordCard } from '~/core/components/molecules/RecordCard';
import { Pagination } from '~/core/components/organisms/Pagination';
import { useClientPages } from '~/core/hooks/useClientPages';
import type { InventoryActions } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { generateAmenityCards } from '~/core/utils/generator/inventory/amenities.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';

interface Props {
  inventory: PropertyInventory;
  actions: InventoryActions;
}

const PAGE_SIZE = 20;

/** The Amenities tab of the 22-Sep design, on the property's real amenities and galleries. */
export const AmenitiesSection = ({ inventory, actions }: Props) => {
  const cards = useMemo(() => generateAmenityCards(inventory), [inventory]);
  const { pageItems, pager, setPage } = useClientPages(cards, PAGE_SIZE);
  const readOnly = i18n.t(S.readOnlyAction);

  return (
    <div className="bo-inv__section">
      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.amenities.title)}
        subtitle={i18n.t(S.amenities.subtitle)}
        action={
          <button type="button" className="bo-inv__add" onClick={() => actions.openDialog({ kind: 'amenity', id: null })}>
            {i18n.t(S.amenities.add)}
          </button>
        }
      />

      {cards.length === 0 && <div className="bo-inv__empty">{i18n.t(S.amenities.empty)}</div>}

      {pageItems.map((card) => {
        const edit = () => actions.openDialog({ kind: 'amenity', id: card.id });

        return (
          <RecordCard
            key={card.id}
            thumb={
              <MediaThumb
                size="sm"
                src={card.thumb.src}
                alt={card.thumb.alt}
                unavailableLabel={i18n.t(S.imageUnavailable)}
                actions={[
                  {
                    id: 'view',
                    label: i18n.t(S.amenities.preview),
                    icon: <EyeIcon size={14} />,
                    onClick: () => actions.openViewer(card.images)
                  }
                ]}
                placeholder={{ label: i18n.t(S.amenities.addImage), icon: <ImageIcon />, onClick: edit }}
              />
            }
            title={<h3 className="bo-record__title">{card.title}</h3>}
            pills={card.pills.map((pill) => (
              <StatusPill key={pill.label} label={pill.label} variant={pill.variant} />
            ))}
            actions={
              <>
                <select
                  className="bo-field bo-inv__category"
                  value={card.category}
                  aria-label={i18n.t(S.amenities.category)}
                  title={readOnly}
                  disabled
                >
                  <option value={card.category}>{card.category}</option>
                </select>
                <IconButton label={i18n.t(S.amenities.addPhoto)} icon={<UploadIcon />} onClick={edit} />
                <IconButton label={i18n.t(S.amenities.edit)} icon={<PencilIcon />} onClick={edit} />
                <IconButton
                  label={i18n.t(S.amenities.remove)}
                  icon={<TrashIcon />}
                  tone="danger"
                  onClick={() => actions.confirm(card.deleteConfirm)}
                />
              </>
            }
          >
            <p className="bo-record__subtitle">{card.subtitle}</p>
            {card.photos.length > 0 && (
              <ul className="bo-inv__photos">
                {card.photos.map((photo) => {
                  const index = card.images.findIndex((image) => image.src === photo.src);
                  const preview = () => actions.openViewer(card.images, Math.max(index, 0));

                  return (
                    <li key={photo.id} className="bo-inv__photo">
                      <button type="button" className="bo-inv__photoimg" onClick={preview} aria-label={photo.name}>
                        <SafeImage src={photo.src} alt="" fallback={i18n.t(S.imageUnavailable)} />
                      </button>
                      <div className="bo-inv__photobar">
                        <span className="bo-inv__photopos">{photo.position}</span>
                        <IconButton size="sm" label={i18n.t(S.amenities.preview)} icon={<EyeIcon size={12} />} onClick={preview} />
                        <IconButton size="sm" label={readOnly} title={i18n.t(S.amenities.moveEarlier)} icon={<span>←</span>} disabled />
                        <IconButton size="sm" label={readOnly} title={i18n.t(S.amenities.moveLater)} icon={<span>→</span>} disabled />
                        <IconButton
                          size="sm"
                          label={readOnly}
                          title={i18n.t(S.amenities.removePhoto)}
                          icon={<span>×</span>}
                          tone="danger"
                          disabled
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </RecordCard>
        );
      })}

      <Pagination pager={pager} label={i18n.t(S.amenities.title)} onPageChange={setPage} />
    </div>
  );
};
