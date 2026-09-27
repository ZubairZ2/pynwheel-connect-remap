'use client';

import { i18n } from '~/resources/i18n';
import { IconButton } from '~/core/components/atoms/IconButton';
import { EyeIcon, PencilIcon, TrashIcon, UploadIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { MediaThumb } from '~/core/components/molecules/MediaThumb';
import { MetaGrid } from '~/core/components/molecules/MetaGrid';
import { MultiFilter } from '~/core/components/molecules/MultiFilter';
import { RecordCard } from '~/core/components/molecules/RecordCard';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { useInventoryAmenities } from '~/core/hooks/useInventoryAmenities';
import type { InventoryActions } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { S, t } from '~/core/utils/generator/inventory/inventoryText';

interface Props {
  inventory: PropertyInventory;
  actions: InventoryActions;
}

/**
 * The Amenities tab of the amenities design (`pyn-connect-amenties.html`), on
 * the property's real amenities: search and six filters over them, then one
 * card per amenity with its image, type, placement and stop-list state,
 * building, floor, lock provider, video, gallery, and content chips.
 */
export const AmenitiesSection = ({ inventory, actions }: Props) => {
  const list = useInventoryAmenities(inventory);
  const showName = i18n.t(S.amenities.showName);

  return (
    <div className="bo-inv__section">
      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.amenities.title)}
        subtitle={i18n.t(S.amenities.subtitle)}
        action={
          <>
            {/* The legacy Amenity Images page's "Show Amenity Name on Webpages" (communities.show_amenity_name), read-only. */}
            <span className="bo-inv__setting" title={i18n.t(S.amenities.showNameTitle)}>
              {showName}
              <Switch on={inventory.showAmenityName} label={`${showName}: ${i18n.t(inventory.showAmenityName ? S.dialogs.yes : S.dialogs.no)}`} />
            </span>
            <button type="button" className="bo-inv__add" onClick={() => actions.openDialog({ kind: 'amenity', id: null })}>
              {i18n.t(S.amenities.add)}
            </button>
          </>
        }
      />

      {list.hasAny && (
        <div className="bo-inv__toolbar">
          <SearchField
            className="bo-inv__search"
            value={list.filters.query}
            placeholder={i18n.t(S.amenities.search)}
            ariaLabel={i18n.t(S.amenities.search)}
            onChange={list.setQuery}
          />
          <MultiFilter
            label={i18n.t(S.amenities.type)}
            allLabel={i18n.t(S.amenities.allTypes)}
            options={list.options.type}
            selected={list.filters.type}
            onToggle={list.toggle('type')}
            onClear={() => list.clear('type')}
          />
          <MultiFilter
            label={i18n.t(S.amenities.building)}
            allLabel={i18n.t(S.amenities.allBuildings)}
            options={list.options.building}
            selected={list.filters.building}
            onToggle={list.toggle('building')}
            onClear={() => list.clear('building')}
          />
          <MultiFilter
            label={i18n.t(S.amenities.floor)}
            allLabel={i18n.t(S.amenities.allFloors)}
            options={list.options.floor}
            selected={list.filters.floor}
            onToggle={list.toggle('floor')}
            onClear={() => list.clear('floor')}
          />
          <MultiFilter
            label={i18n.t(S.amenities.lock)}
            allLabel={i18n.t(S.amenities.anyLock)}
            options={list.options.lock}
            selected={list.filters.lock}
            onToggle={list.toggle('lock')}
            onClear={() => list.clear('lock')}
          />
          <MultiFilter
            label={i18n.t(S.amenities.state)}
            allLabel={i18n.t(S.amenities.anyState)}
            options={list.options.state}
            selected={list.filters.state}
            onToggle={list.toggle('state')}
            onClear={() => list.clear('state')}
          />
          <MultiFilter
            label={i18n.t(S.amenities.setup)}
            allLabel={i18n.t(S.amenities.anySetup)}
            options={list.options.setup}
            selected={list.filters.setup}
            onToggle={list.toggle('setup')}
            onClear={() => list.clear('setup')}
          />
          <span className="bo-inv__showing" aria-live="polite">
            {list.showingLabel}
          </span>
        </div>
      )}

      {list.cards.map((card) => {
        const edit = () => actions.openDialog({ kind: 'amenity', id: card.id });

        return (
          <RecordCard
            key={card.id}
            thumb={
              <MediaThumb
                src={card.thumb.src}
                alt={card.thumb.alt}
                unavailableLabel={i18n.t(S.imageUnavailable)}
                actions={[
                  {
                    id: 'view',
                    label: i18n.t(S.amenities.view),
                    icon: <EyeIcon size={15} />,
                    onClick: () => actions.openViewer(card.images)
                  },
                  { id: 'replace', label: i18n.t(S.amenities.replaceImage), icon: <UploadIcon size={15} />, onClick: edit },
                  ...(card.hasOwnImage
                    ? [
                        {
                          id: 'remove',
                          label: i18n.t(S.amenities.removeImage),
                          icon: <TrashIcon size={15} />,
                          tone: 'danger' as const,
                          onClick: () => actions.confirm(card.removeImageConfirm)
                        }
                      ]
                    : [])
                ]}
                placeholder={{ label: i18n.t(S.amenities.uploadImage), icon: <UploadIcon />, onClick: edit }}
              />
            }
            title={
              <h3 className="bo-record__title">
                <button type="button" className="bo-record__titlebutton" onClick={edit} aria-label={t(S.amenities.open, { name: card.title })}>
                  {card.title}
                </button>
              </h3>
            }
            pills={
              <>
                <span className="bo-record__tag">{card.type}</span>
                {card.pills.map((pill) => (
                  <StatusPill key={pill.label} label={pill.label} variant={pill.variant} />
                ))}
              </>
            }
            actions={
              <>
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
            <MetaGrid items={card.meta} columns={5} />
            <ul className="bo-inv-chips">
              {card.chips.map((chip) => (
                <li key={chip.label} className={`bo-inv-chip${chip.on ? ' bo-inv-chip--on' : ''}`}>
                  {chip.label}
                </li>
              ))}
            </ul>
          </RecordCard>
        );
      })}

      {list.empty && (
        <div className="bo-inv__empty">{i18n.t(list.hasAny ? S.amenities.emptyFiltered : S.amenities.empty)}</div>
      )}

      <Pagination pager={list.pager} label={i18n.t(S.amenities.title)} onPageChange={list.setPage} />
    </div>
  );
};
