'use client';

import Link from 'next/link';

import { propRoute, tourContentRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { EyeIcon, UploadIcon } from '~/core/components/atoms/Icons';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { ImageViewer } from '~/core/components/organisms/ImageViewer';
import { useUnitDetail } from '~/core/hooks/useUnitDetail';
import type { InventoryUnit, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import { S, t } from '~/core/utils/generator/inventory/inventoryText';
import { InventoryDialogs } from './inventory/InventoryDialogs';

const UD = CORE_STRINGS.unitDetail;

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  inventory: PropertyInventory | null;
  unitId: number;
  /** The server's date (yyyy-mm-dd), so availability reads the same on both renders. */
  today: string;
  error?: string | null;
}

/**
 * Unit Detail on real data: the 22-Sep design's `unitDetail` screen, on one
 * unit of the property's inventory listings. Read-only: Edit Unit opens the
 * inventory's Unit dialog, Delete and Re-sync open the shared confirm, and
 * every other write control is inert.
 */
export const UnitDetailScreen = ({ inventory, unitId, today, error }: Props) => {
  const unit = inventory?.units.find((candidate) => candidate.id === unitId) ?? null;

  return inventory && unit ? (
    <Detail inventory={inventory} unit={unit} today={today} />
  ) : (
    <UnitUnavailable inventory={inventory} error={error ?? null} />
  );
};

const Detail = ({ inventory, unit, today }: { inventory: PropertyInventory; unit: InventoryUnit; today: string }) => {
  const state = useUnitDetail(inventory, unit, today);
  const { detail } = state;
  const propId = String(inventory.property.id);
  const readOnly = i18n.t(S.readOnlyAction);

  return (
    <div className="bo-inv bo-unit">
      <Breadcrumb
        items={[
          { label: i18n.t(S.breadcrumbRoot), href: APP_ROUTES.properties },
          { label: inventory.property.name, href: propRoute(propId) },
          { label: i18n.t(UD.breadcrumbUnits), href: `${tourContentRoute(propId)}?tab=units` },
          { label: detail.name }
        ]}
      />

      <div className="bo-inv__header">
        <div className="bo-inv__heading">
          <div className="bo-unit__titlerow">
            <h2 className="bo-unit__title">{detail.name}</h2>
            {detail.pills.map((pill) => (
              <StatusPill key={pill.label} label={pill.label} variant={pill.variant} />
            ))}
          </div>
          <p className="bo-unit__subtitle">{detail.subtitle}</p>
        </div>
        <Link href={detail.plotHref} className="bo-inv__ghost">
          {detail.plotLabel}
        </Link>
        <button type="button" className="bo-inv__ghost" onClick={state.openEdit}>
          {i18n.t(UD.edit)}
        </button>
        <button type="button" className="bo-inv__ghost bo-inv__ghost--danger" onClick={state.remove}>
          {i18n.t(UD.remove)}
        </button>
      </div>

      <div className="bo-unit__layout">
        <div className="bo-unit__col">
          <DetailSection
            className="bo-section--unit"
            title={i18n.t(UD.data.title)}
            subtitle={i18n.t(UD.data.subtitle)}
            action={
              <button type="button" className="bo-inv__ghost bo-inv__ghost--sm" onClick={state.resync}>
                {i18n.t(S.units.resync)}
              </button>
            }
          >
            <div className="bo-unit__grid">
              {detail.data.fields.map((field) => (
                <div key={field.key} className="bo-unit__tile">
                  <div className="bo-unit__tilehead">
                    <span className="bo-unit__caption">{field.label}</span>
                    {field.source && <StatusPill label={field.source.label} variant={field.source.variant} />}
                    <button type="button" className="bo-unit__toggle" disabled title={readOnly}>
                      {i18n.t(UD.data.toggle)}
                    </button>
                  </div>
                  <input
                    className="bo-field bo-unit__value bo-unit__value--bold"
                    value={field.value}
                    placeholder={field.placeholder}
                    aria-label={field.label}
                    readOnly
                  />
                </div>
              ))}
              <div className="bo-unit__tile">
                <div className="bo-unit__caption bo-unit__caption--block">{i18n.t(UD.data.availability)}</div>
                <select
                  className="bo-field bo-unit__value"
                  value={detail.data.availability.value}
                  aria-label={i18n.t(UD.data.availability)}
                  title={readOnly}
                  disabled
                >
                  {detail.data.availability.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="bo-unit__tile">
                <div className="bo-unit__caption bo-unit__caption--block">{i18n.t(UD.data.pmsFloor)}</div>
                <div className="bo-unit__static">{detail.data.pmsFloor}</div>
              </div>
            </div>
          </DetailSection>

          <DetailSection
            className="bo-section--unit"
            title={i18n.t(UD.gallery.title)}
            subtitle={detail.gallery.countLabel}
            action={
              <button type="button" className="bo-inv__ghost bo-inv__ghost--sm" disabled title={readOnly}>
                {i18n.t(UD.gallery.addPhoto)}
              </button>
            }
          >
            {detail.gallery.photos.length ? (
              <div className="bo-unit__photos">
                {detail.gallery.photos.map((photo, index) => (
                  <div key={`${photo.src}-${index}`} className="bo-unit__photo">
                    <div className="bo-unit__photoimg">
                      <SafeImage
                        className="bo-unit__photofile"
                        src={photo.src}
                        alt={photo.name}
                        fallback={i18n.t(S.imageUnavailable)}
                      />
                    </div>
                    <div className="bo-unit__photobar">
                      <span className="bo-unit__photopos">{photo.position}</span>
                      <button
                        type="button"
                        className="bo-unit__photobtn"
                        aria-label={i18n.t(UD.gallery.preview)}
                        title={i18n.t(UD.gallery.preview)}
                        onClick={() => state.openViewer(detail.gallery.photos, index)}
                      >
                        <EyeIcon size={12} />
                      </button>
                      <button type="button" className="bo-unit__photobtn" aria-label={i18n.t(UD.gallery.moveEarlier)} title={readOnly} disabled>
                        ←
                      </button>
                      <button type="button" className="bo-unit__photobtn" aria-label={i18n.t(UD.gallery.moveLater)} title={readOnly} disabled>
                        →
                      </button>
                      <button
                        type="button"
                        className="bo-unit__photobtn bo-unit__photobtn--danger"
                        aria-label={i18n.t(UD.gallery.remove)}
                        title={readOnly}
                        disabled
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bo-upload bo-upload--empty bo-upload--static" aria-disabled="true" title={readOnly}>
                <span className="bo-upload__icon">
                  <UploadIcon size={20} />
                </span>
                <span className="bo-upload__text">
                  <span className="bo-upload__prompt">
                    {i18n.t(UD.gallery.dropPrompt)} <span className="bo-upload__browse">{i18n.t(UD.gallery.browse)}</span>
                  </span>
                  <span className="bo-upload__hint">{i18n.t(UD.gallery.dropHint)}</span>
                </span>
              </div>
            )}
          </DetailSection>
        </div>

        <div className="bo-unit__col">
          <DetailSection className="bo-section--unit-side" title={i18n.t(UD.placement.title)} subtitle={detail.placement.summary}>
            <Link href={detail.plotHref} className="bo-inv__add bo-unit__plot">
              {detail.plotLabel}
            </Link>
            {detail.placement.notPlotted && (
              <p className="bo-unit__warn" role="note">
                {i18n.t(UD.placement.warning)}
              </p>
            )}
          </DetailSection>

          <DetailSection className="bo-section--unit-side" title={i18n.t(UD.terms.title)} subtitle={i18n.t(UD.terms.subtitle)}>
            {detail.terms.tiles.length ? (
              <div className="bo-unit__terms">
                {detail.terms.tiles.map((tile) => (
                  <div key={tile.term} className={`bo-unit__term${tile.base ? ' bo-unit__term--base' : ''}`}>
                    <div className="bo-unit__termlabel">{tile.term}</div>
                    <div className="bo-unit__termvalue">{tile.rent}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bo-unit__termsempty" role="status">
                {i18n.t(UD.terms.empty)}
              </p>
            )}
          </DetailSection>
        </div>
      </div>

      <InventoryDialogs
        inventory={inventory}
        dialog={state.editing ? { kind: 'unit', id: unit.id } : null}
        onClose={state.closeEdit}
        onView={state.openViewer}
      />

      <ImageViewer
        images={state.viewer.images}
        index={state.viewer.index}
        onIndexChange={state.setViewerIndex}
        onClose={state.closeViewer}
        labels={{
          close: i18n.t(S.viewer.close),
          previous: i18n.t(S.viewer.previous),
          next: i18n.t(S.viewer.next),
          position: (current, total) => t(S.viewer.position, { current, total }),
          unavailable: i18n.t(S.viewer.unavailable)
        }}
      />
    </div>
  );
};

/** The property could not be loaded, is not found, or has no unit with this id. */
const UnitUnavailable = ({ inventory, error }: { inventory: PropertyInventory | null; error: string | null }) => {
  const propId = inventory ? String(inventory.property.id) : null;
  const unitsHref = propId ? `${tourContentRoute(propId)}?tab=units` : null;

  return (
    <div className="bo-inv bo-unit">
      <Breadcrumb
        items={[
          { label: i18n.t(S.breadcrumbRoot), href: APP_ROUTES.properties },
          ...(inventory && propId ? [{ label: inventory.property.name, href: propRoute(propId) }] : []),
          ...(unitsHref ? [{ label: i18n.t(UD.breadcrumbUnits), href: unitsHref }] : []),
          { label: i18n.t(UD.title) }
        ]}
      />
      {error ? (
        <div className="bo-error" role="alert">
          {error}
        </div>
      ) : (
        <div className="bo-section bo-section--empty" role="status">
          <h2 className="bo-section__title">{i18n.t(inventory ? UD.notFound.title : S.notFound.title)}</h2>
          <p className="bo-section__subtitle">{i18n.t(inventory ? UD.notFound.body : S.notFound.body)}</p>
          <Link href={unitsHref ?? APP_ROUTES.properties} className="bo-linkbutton">
            {i18n.t(unitsHref ? UD.notFound.back : S.notFound.back)}
          </Link>
        </div>
      )}
    </div>
  );
};
