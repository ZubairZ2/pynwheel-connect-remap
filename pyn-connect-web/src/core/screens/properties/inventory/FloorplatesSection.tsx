'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { mapEditorRoute } from '~/config/app/connectRoutes';
import { i18n } from '~/resources/i18n';
import { IconButton } from '~/core/components/atoms/IconButton';
import {
  EyeIcon,
  PencilIcon,
  PlotPinIcon,
  ReplaceIcon,
  TrashIcon,
  UploadIcon
} from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { MediaThumb } from '~/core/components/molecules/MediaThumb';
import { MetaGrid } from '~/core/components/molecules/MetaGrid';
import { RecordCard } from '~/core/components/molecules/RecordCard';
import type { InventoryActions } from '~/core/hooks/usePropertyInventory';
import type { PropertyInventory } from '~/core/models/data/propertyInventory.data';
import {
  generateBackgroundLibrary,
  generateFloorplateCards,
  generateSitemapPanel
} from '~/core/utils/generator/inventory/floorplates.generator';
import { S } from '~/core/utils/generator/inventory/inventoryText';

interface Props {
  inventory: PropertyInventory;
  actions: InventoryActions;
}

/** The Floorplates tab of the 22-Sep design, on the property's real floorplates. */
export const FloorplatesSection = ({ inventory, actions }: Props) => {
  const cards = useMemo(() => generateFloorplateCards(inventory), [inventory]);
  const library = useMemo(() => generateBackgroundLibrary(inventory), [inventory]);
  const sitemap = useMemo(() => generateSitemapPanel(inventory), [inventory]);
  const plotHref = mapEditorRoute(String(inventory.property.id));
  const readOnly = i18n.t(S.readOnlyAction);

  return (
    <div className="bo-inv__section">
      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.floorplates.title)}
        subtitle={i18n.t(S.floorplates.subtitle)}
        action={
          <button type="button" className="bo-inv__add" onClick={() => actions.openDialog({ kind: 'floorplate', id: null })}>
            {i18n.t(S.floorplates.add)}
          </button>
        }
      />

      {sitemap && (
        <DetailSection
          className="bo-section--inv"
          title={i18n.t(S.floorplates.sitemapTitle)}
          subtitle={i18n.t(S.floorplates.sitemapBody)}
        >
          {sitemap.thumb.src ? (
            <div className="bo-inv__sitemap">
              <MediaThumb
                src={sitemap.thumb.src}
                alt={sitemap.thumb.alt}
                badge={sitemap.thumb.badge}
                fit="contain"
                unavailableLabel={i18n.t(S.imageUnavailable)}
                actions={[
                  {
                    id: 'view',
                    label: i18n.t(S.floorplates.viewSitemap),
                    icon: <EyeIcon size={15} />,
                    onClick: () => actions.openViewer(sitemap.images)
                  }
                ]}
              />
            </div>
          ) : (
            <p className="bo-inv__libempty">{i18n.t(S.floorplates.sitemapNone)}</p>
          )}
        </DetailSection>
      )}

      <DetailSection
        className="bo-section--inv"
        title={i18n.t(S.backgrounds.title)}
        subtitle={i18n.t(S.backgrounds.subtitle)}
        action={<span className="bo-inv__libcount">{library.summary}</span>}
      >
        {library.items.length === 0 ? (
          <p className="bo-inv__libempty">{i18n.t(S.backgrounds.empty)}</p>
        ) : (
          <ul className="bo-inv__bglist">
            {library.items.map((item) => (
              <li key={item.src} className="bo-inv__bgrow">
                <button
                  type="button"
                  className="bo-inv__bgthumb"
                  style={{ backgroundImage: `url("${item.src}")` }}
                  aria-label={i18n.t(S.backgrounds.preview)}
                  onClick={() => actions.openViewer([{ name: item.name, src: item.src }])}
                />
                <span className="bo-inv__bgtext">
                  <span className="bo-inv__bgname">{item.name}</span>
                  <span className="bo-inv__bgmeta">{item.fileName}</span>
                </span>
                <span className="bo-inv__bgusage">{item.usage}</span>
                <IconButton
                  label={i18n.t(S.backgrounds.preview)}
                  icon={<EyeIcon />}
                  onClick={() => actions.openViewer([{ name: item.name, src: item.src }])}
                />
                <IconButton label={readOnly} icon={<ReplaceIcon />} disabled />
                <IconButton label={readOnly} icon={<TrashIcon />} tone="danger" disabled />
              </li>
            ))}
          </ul>
        )}
        <div className="bo-inv__bgadd">
          <input
            className="bo-field bo-inv__bgname-input"
            placeholder={i18n.t(S.backgrounds.namePlaceholder)}
            aria-label={i18n.t(S.backgrounds.nameLabel)}
            disabled
          />
          <button type="button" className="bo-inv__add" disabled title={i18n.t(S.backgrounds.unavailable)}>
            <UploadIcon />
            {i18n.t(S.backgrounds.upload)}
          </button>
        </div>
        <p className="bo-inv__note">{i18n.t(S.backgrounds.unavailable)}</p>
      </DetailSection>

      {cards.length === 0 && <div className="bo-inv__empty">{i18n.t(S.floorplates.empty)}</div>}

      {cards.map((card) => {
        const edit = () => actions.openDialog({ kind: 'floorplate', id: card.id });

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
                  ...(card.images.length
                    ? [
                        {
                          id: 'view',
                          label: i18n.t(S.floorplates.view),
                          icon: <EyeIcon size={15} />,
                          onClick: () => actions.openViewer(card.images)
                        }
                      ]
                    : []),
                  {
                    id: 'replace',
                    label: i18n.t(S.floorplates.replaceSvg),
                    icon: <UploadIcon size={15} />,
                    onClick: edit
                  },
                  ...(card.hasSvg
                    ? [
                        {
                          id: 'remove',
                          label: i18n.t(S.floorplates.removeSvg),
                          icon: <TrashIcon size={15} />,
                          tone: 'danger' as const,
                          onClick: () => actions.confirm(card.removeSvgConfirm)
                        }
                      ]
                    : [])
                ]}
                placeholder={{ label: i18n.t(S.floorplates.uploadSvg), icon: <UploadIcon />, onClick: edit }}
              />
            }
            title={<h3 className="bo-record__title">{card.title}</h3>}
            pills={<StatusPill label={card.svgPill.label} variant={card.svgPill.variant} />}
            actions={
              <>
                <Link href={plotHref} className="bo-inv__plot">
                  <PlotPinIcon />
                  {i18n.t(S.floorplates.plotting)}
                </Link>
                <IconButton label={i18n.t(S.floorplates.edit)} icon={<PencilIcon />} onClick={edit} />
                <IconButton
                  label={i18n.t(S.floorplates.remove)}
                  icon={<TrashIcon />}
                  tone="danger"
                  onClick={() => actions.confirm(card.deleteConfirm)}
                />
              </>
            }
          >
            <MetaGrid items={card.meta} columns="plates" />
          </RecordCard>
        );
      })}
    </div>
  );
};
