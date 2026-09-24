'use client';

import { i18n } from '~/resources/i18n';
import { IconButton } from '~/core/components/atoms/IconButton';
import { EyeIcon, PencilIcon, TrashIcon, UploadIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { MediaThumb } from '~/core/components/molecules/MediaThumb';
import { MetaGrid } from '~/core/components/molecules/MetaGrid';
import { MultiFilter } from '~/core/components/molecules/MultiFilter';
import { RangeFilter } from '~/core/components/molecules/RangeFilter';
import { RecordCard } from '~/core/components/molecules/RecordCard';
import { SearchField } from '~/core/components/molecules/SearchField';
import { Pagination } from '~/core/components/organisms/Pagination';
import { useInventoryFloorplans } from '~/core/hooks/useInventoryFloorplans';
import type { InventoryActions } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { S, t } from '~/core/utils/generator/inventory/inventoryText';

interface Props {
  inventory: PropertyInventory;
  actions: InventoryActions;
}

/** The Floorplans tab of the 22-Sep design, on the property's real floor plans. */
export const FloorplansSection = ({ inventory, actions }: Props) => {
  const list = useInventoryFloorplans(inventory);
  const sqftLabel = i18n.t(S.floorplans.sqft);

  return (
    <div className="bo-inv__section">
      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.floorplans.title)}
        subtitle={i18n.t(S.floorplans.subtitle)}
        action={
          <button type="button" className="bo-inv__add" onClick={() => actions.openDialog({ kind: 'floorplan', id: null })}>
            {i18n.t(S.floorplans.add)}
          </button>
        }
      />

      {list.hasAny && (
        <div className="bo-inv__toolbar">
          <SearchField
            className="bo-inv__search"
            value={list.filters.query}
            placeholder={i18n.t(S.floorplans.search)}
            ariaLabel={i18n.t(S.floorplans.search)}
            onChange={list.setQuery}
          />
          <MultiFilter
            label={i18n.t(S.floorplans.layout)}
            allLabel={i18n.t(S.floorplans.allLayouts)}
            options={list.options.layout}
            selected={list.filters.layout}
            onToggle={list.toggle('layout')}
            onClear={() => list.clear('layout')}
          />
          <MultiFilter
            label={i18n.t(S.floorplans.baths)}
            allLabel={i18n.t(S.floorplans.allBaths)}
            options={list.options.baths}
            selected={list.filters.baths}
            onToggle={list.toggle('baths')}
            onClear={() => list.clear('baths')}
          />
          <RangeFilter
            label={sqftLabel}
            min={list.filters.sqftMin}
            max={list.filters.sqftMax}
            minLabel={t(S.units.minimum, { label: sqftLabel })}
            maxLabel={t(S.units.maximum, { label: sqftLabel })}
            minPlaceholder={i18n.t(S.units.min)}
            maxPlaceholder={i18n.t(S.units.max)}
            onChange={list.setSqft}
          />
          <MultiFilter
            label={i18n.t(S.floorplans.setup)}
            allLabel={i18n.t(S.floorplans.anySetup)}
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
        const edit = () => actions.openDialog({ kind: 'floorplan', id: card.id });

        return (
          <RecordCard
            key={card.id}
            thumb={
              <MediaThumb
                src={card.thumb.src}
                alt={card.thumb.alt}
                badge={card.thumb.badge}
                fit="contain"
                unavailableLabel={i18n.t(S.imageUnavailable)}
                actions={[
                  {
                    id: 'view',
                    label: i18n.t(S.floorplans.view),
                    icon: <EyeIcon size={15} />,
                    onClick: () => actions.openViewer(card.images)
                  },
                  { id: 'replace', label: i18n.t(S.floorplans.replace), icon: <UploadIcon size={15} />, onClick: edit },
                  ...(card.hasPrimary
                    ? [
                        {
                          id: 'remove',
                          label: i18n.t(S.floorplans.removeImage),
                          icon: <TrashIcon size={15} />,
                          tone: 'danger' as const,
                          onClick: () => actions.confirm(card.removeImageConfirm)
                        }
                      ]
                    : [])
                ]}
                placeholder={{ label: i18n.t(S.floorplans.uploadImage), icon: <UploadIcon />, onClick: edit }}
              />
            }
            title={<h3 className="bo-record__title">{card.title}</h3>}
            pills={card.pills.map((pill) => (
              <StatusPill key={pill.label} label={pill.label} variant={pill.variant} />
            ))}
            actions={
              <>
                <IconButton label={i18n.t(S.floorplans.edit)} icon={<PencilIcon />} onClick={edit} />
                <IconButton
                  label={i18n.t(S.floorplans.remove)}
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
        <div className="bo-inv__empty">
          {i18n.t(list.hasAny ? S.floorplans.emptyFiltered : S.floorplans.empty)}
        </div>
      )}

      <Pagination pager={list.pager} label={i18n.t(S.floorplans.title)} onPageChange={list.setPage} />
    </div>
  );
};
