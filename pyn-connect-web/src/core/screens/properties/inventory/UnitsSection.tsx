'use client';

import { useMemo } from 'react';

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
import { useInventoryUnits } from '~/core/hooks/useInventoryUnits';
import type { InventoryActions } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { S, counted, syncText, t } from '~/core/utils/generator/inventory/inventoryText';
import { manualOverrideCount } from '~/core/utils/generator/inventory/units.generator';

interface Props {
  inventory: PropertyInventory;
  today: string;
  actions: InventoryActions;
}

/** The Units tab of the 22-Sep design, on every real unit of the property. */
export const UnitsSection = ({ inventory, today, actions }: Props) => {
  const list = useInventoryUnits(inventory, today);
  const overrides = useMemo(() => manualOverrideCount(inventory), [inventory]);
  const connected = !!inventory.dataProvider;
  const priceLabel = i18n.t(S.units.price);
  const sqftLabel = i18n.t(S.units.sqft);

  const resync = () =>
    actions.confirm({
      title: i18n.t(S.dialogs.confirm.resyncTitle),
      message: t(S.dialogs.confirm.resyncBody, {
        overrides: counted(overrides, S.count.overrideOne, S.count.overrideMany)
      }),
      label: i18n.t(S.dialogs.confirm.resyncLabel)
    });

  return (
    <div className="bo-inv__section">
      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.units.title)}
        subtitle={connected ? t(S.units.lastSync, { when: syncText(inventory.lastSync) }) : i18n.t(S.units.noPms)}
        action={
          <>
            <button
              type="button"
              className="bo-inv__ghost"
              onClick={resync}
              disabled={!connected}
              title={connected ? undefined : i18n.t(S.units.noPms)}
            >
              {i18n.t(S.units.resync)}
            </button>
            <button
              type="button"
              className="bo-inv__ghost"
              onClick={() => actions.openDialog({ kind: 'mass', count: list.matchingCount, filtered: list.filtering })}
            >
              {i18n.t(S.units.massOverrides)}
            </button>
            <button type="button" className="bo-inv__add" onClick={() => actions.openDialog({ kind: 'unit', id: null })}>
              {i18n.t(S.units.add)}
            </button>
          </>
        }
      />

      {list.hasAny && (
        <div className="bo-inv__toolbar">
          <SearchField
            className="bo-inv__search"
            value={list.filters.query}
            placeholder={i18n.t(S.units.search)}
            ariaLabel={i18n.t(S.units.search)}
            onChange={list.setQuery}
          />
          <MultiFilter
            label={i18n.t(S.units.floorPlan)}
            allLabel={i18n.t(S.units.allFloorPlans)}
            options={list.options.floorplan}
            selected={list.filters.floorplan}
            onToggle={list.toggle('floorplan')}
            onClear={() => list.clear('floorplan')}
          />
          <MultiFilter
            label={i18n.t(S.units.availability)}
            allLabel={i18n.t(S.units.allAvailability)}
            options={list.options.availability}
            selected={list.filters.availability}
            onToggle={list.toggle('availability')}
            onClear={() => list.clear('availability')}
          />
          <MultiFilter
            label={i18n.t(S.units.building)}
            allLabel={i18n.t(S.units.allBuildings)}
            options={list.options.building}
            selected={list.filters.building}
            onToggle={list.toggle('building')}
            onClear={() => list.clear('building')}
          />
          <MultiFilter
            label={i18n.t(S.units.state)}
            allLabel={i18n.t(S.units.anyState)}
            options={list.options.state}
            selected={list.filters.state}
            onToggle={list.toggle('state')}
            onClear={() => list.clear('state')}
          />
          <MultiFilter
            label={i18n.t(S.units.beds)}
            allLabel={i18n.t(S.units.allBeds)}
            options={list.options.beds}
            selected={list.filters.beds}
            onToggle={list.toggle('beds')}
            onClear={() => list.clear('beds')}
          />
          <MultiFilter
            label={i18n.t(S.units.baths)}
            allLabel={i18n.t(S.units.allBaths)}
            options={list.options.baths}
            selected={list.filters.baths}
            onToggle={list.toggle('baths')}
            onClear={() => list.clear('baths')}
          />
          <MultiFilter
            label={i18n.t(S.units.floors)}
            allLabel={i18n.t(S.units.allFloors)}
            options={list.options.floor}
            selected={list.filters.floor}
            onToggle={list.toggle('floor')}
            onClear={() => list.clear('floor')}
          />
          <RangeFilter
            label={priceLabel}
            prefix={inventory.currencySymbol}
            min={list.filters.priceMin}
            max={list.filters.priceMax}
            minLabel={t(S.units.minimum, { label: priceLabel })}
            maxLabel={t(S.units.maximum, { label: priceLabel })}
            minPlaceholder={i18n.t(S.units.min)}
            maxPlaceholder={i18n.t(S.units.max)}
            onChange={list.setPrice}
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
          <span className="bo-inv__showing" aria-live="polite">
            {list.showingLabel}
          </span>
        </div>
      )}

      {list.cards.map((card) => {
        const edit = () => actions.openDialog({ kind: 'unit', id: card.id });

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
                    label: i18n.t(S.units.view),
                    icon: <EyeIcon size={14} />,
                    onClick: () => actions.openViewer(card.images)
                  },
                  { id: 'manage', label: i18n.t(S.units.manageImages), icon: <UploadIcon size={14} />, onClick: edit },
                  ...(card.hasOwnImage
                    ? [
                        {
                          id: 'remove',
                          label: i18n.t(S.units.removeImage),
                          icon: <TrashIcon size={14} />,
                          tone: 'danger' as const,
                          onClick: () => actions.confirm(card.removeImageConfirm)
                        }
                      ]
                    : [])
                ]}
                placeholder={{ label: i18n.t(S.units.addImage), icon: <UploadIcon />, onClick: edit }}
              />
            }
            title={
              <h3 className="bo-record__title">
                <button
                  type="button"
                  className="bo-record__titlebutton"
                  onClick={edit}
                  aria-label={t(S.units.open, { name: card.title })}
                >
                  {card.title}
                </button>
              </h3>
            }
            pills={card.pills.map((pill) => (
              <StatusPill key={pill.label} label={pill.label} variant={pill.variant} />
            ))}
            actions={
              <>
                <IconButton label={i18n.t(S.units.edit)} icon={<PencilIcon />} onClick={edit} />
                <IconButton
                  label={i18n.t(S.units.remove)}
                  icon={<TrashIcon />}
                  tone="danger"
                  onClick={() => actions.confirm(card.deleteConfirm)}
                />
              </>
            }
          >
            <MetaGrid items={card.meta} columns={5} />
          </RecordCard>
        );
      })}

      {list.empty && (
        <div className="bo-inv__empty">{i18n.t(list.hasAny ? S.units.emptyFiltered : S.units.empty)}</div>
      )}

      <Pagination pager={list.pager} label={i18n.t(S.tabs.units)} onPageChange={list.setPage} />
    </div>
  );
};
