'use client';

import Link from 'next/link';

import { mapEditorRoute, tourContentRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Modal } from '~/core/components/molecules/Modal';
import type { TourSetupController } from '~/core/hooks/useTourSetup';
import { useTourStops, type PathScope, type TourStopsController } from '~/core/hooks/tour/useTourStops';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { ST, lockStateLabel, type StopListItem } from '~/core/utils/generator/tour/tourStops.generator';
import { T, type StopCard } from '~/core/utils/generator/tour/tourSetup.generator';

const X = CORE_STRINGS.tourModules.common;
const SCOPES: PathScope[] = ['plate', 'floors', 'buildings'];

interface Props {
  controller: TourSetupController;
  propertyId: number;
  propId: string;
  mapHref: (card: StopCard) => string;
  /** A stop to open the drawer on (from the Overview's attention list). */
  focusKey: string | null;
  /** Bumped by the page header's Add Stop button; opens the Add stops modal. */
  openAddSignal: number;
  onOpenLocks: () => void;
}

/**
 * The Stops tab (Back Office design, Oct 13 2026): the stops grouped by
 * building with drag-and-drop ordering, the "needs attention" filter, the
 * stop drawer (content, lock, app preview) and, with nothing selected, the
 * read-only route preview with the shortest-path test.
 */
export const StopsTab = ({ controller, propertyId, propId, mapHref, focusKey, openAddSignal, onOpenLocks }: Props) => {
  const c = useTourStops(propertyId, controller, true, focusKey, openAddSignal);
  return (
    <div className="bo-tx" data-testid="tour-stops">
      {c.error && (
        <div className="bo-error" role="alert">
          {c.error}{' '}
          <button type="button" className="bo-tx__btn" onClick={() => void c.reload()}>
            {i18n.t(X.retry)}
          </button>
        </div>
      )}
      <div className="bo-tx__card">
        <div className="bo-tx__cardhead">
          <div className="bo-tx__grow">
            <div className="bo-tx__cardtitle">{i18n.t(ST.title)}</div>
            <div className="bo-tx__cardsub">{i18n.t(ST.sub)}</div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px var(--bo-font)', color: 'var(--bo-muted)', cursor: 'pointer' }}>
            <button
              type="button"
              role="switch"
              aria-checked={c.onlyIssues}
              aria-label={i18n.t(ST.onlyIssues)}
              className={`bo-switch bo-switch--control${c.onlyIssues ? ' bo-switch--on' : ''}`}
              onClick={() => c.setOnlyIssues(!c.onlyIssues)}
              data-testid="stops-only-issues"
            >
              <span className="bo-switch__knob" />
            </button>
            {i18n.t(ST.onlyIssues)}
            {c.issueCount > 0 && <span className="bo-ts__count">{c.issueCount}</span>}
          </label>
          <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" onClick={c.openAdd} data-testid="stops-add">
            {i18n.t(ST.addStops)}
          </button>
        </div>
        <div className="bo-tx__cardbody" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, paddingTop: 10, paddingBottom: 10 }}>
          <span className="bo-tx__name">{c.summary}</span>
          <Link href={tourContentRoute(propId)} className="bo-tx__btn">
            {i18n.t(ST.inventory)}
          </Link>
          <Link href={mapEditorRoute(propId)} className="bo-tx__btn">
            {i18n.t(ST.mapPlotting)}
          </Link>
          {c.variations.map((text) => (
            <span key={text} className="bo-tx__chip bo-tx__chip--on" style={{ cursor: 'default' }}>
              {text}
            </span>
          ))}
          <span className="bo-tx__meta">{i18n.t(ST.dragHint)}</span>
        </div>
      </div>

      <div className="bo-ts">
        <StopList c={c} />
        {c.selected ? <Drawer c={c} controller={controller} propId={propId} mapHref={mapHref} onOpenLocks={onOpenLocks} /> : <RoutePreview c={c} propId={propId} />}
      </div>

      <AddStopsModal c={c} propId={propId} />
    </div>
  );
};

const StopList = ({ c }: { c: TourStopsController }) => (
  <div className="bo-ts__list" data-testid="stops-list">
    {c.groups.map((group) => (
      <div key={group.key}>
        <div className="bo-ts__group">
          <div className="bo-tx__grow">
            <div className="bo-ts__grouptitle">{group.title}</div>
            <div className="bo-ts__groupsub">{group.sub}</div>
          </div>
          <span className="bo-ts__count">{group.count}</span>
        </div>
        <div className="bo-ts__rows">
          {group.items.map((item) => (
            <StopRowView key={item.key} item={item} c={c} />
          ))}
          {group.items.length === 0 && <div className="bo-tx__meta" style={{ padding: '4px 6px 8px' }}>{i18n.t(c.onlyIssues ? ST.emptyFiltered : ST.group.empty)}</div>}
        </div>
      </div>
    ))}
    {c.items.length === 0 && (
      <div className="bo-tx__empty">
        {i18n.t(ST.empty)} <b>{i18n.t(ST.addStops)}</b>
      </div>
    )}
  </div>
);

const StopRowView = ({ item, c }: { item: StopListItem; c: TourStopsController }) => {
  const on = c.selected?.key === item.key;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={on}
      className={`bo-ts__row${on ? ' bo-ts__row--on' : ''}${c.drag.over === item.key && c.drag.key !== item.key ? ' bo-ts__row--over' : ''}${c.drag.key === item.key ? ' bo-ts__row--drag' : ''}`}
      draggable
      data-testid="stop-row"
      data-stop-key={item.key}
      onClick={() => c.select(item.key)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          c.select(item.key);
        }
      }}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', item.key);
        c.onDragStart(item.key);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        c.onDragOver(item.key);
      }}
      onDrop={(event) => {
        event.preventDefault();
        c.onDrop(item.key);
      }}
      onDragEnd={c.onDragEnd}
    >
      <span className="bo-ts__grip" title={i18n.t(ST.grip)} aria-hidden="true">
        ⋮⋮
      </span>
      <span className="bo-ts__num" style={{ background: item.hidden ? '#B8BEC9' : item.color }}>
        {item.num}
      </span>
      <div className="bo-ts__body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className={`bo-ts__name${item.hidden ? ' bo-ts__name--hidden' : ''}`}>{item.name}</span>
          {item.model && <span className="bo-ts__tag bo-ts__tag--model">{i18n.t(ST.tag.model)}</span>}
          {item.hidden && <span className="bo-ts__tag">{i18n.t(ST.tag.hidden)}</span>}
          {item.local && <span className="bo-ts__tag bo-ts__tag--local">{i18n.t(ST.tag.local)}</span>}
          {item.missing && <span className="bo-ts__tag">{i18n.t(ST.tag.missing)}</span>}
        </div>
        <div className="bo-tx__meta">
          {item.kindLabel} · {item.sub}
        </div>
        {item.issues.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {item.issues.map((issue) => (
              <span key={issue.key} className="bo-ts__issue">
                {issue.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <button
          type="button"
          className="bo-ts__eye"
          aria-label={`${i18n.t(item.hidden ? ST.eye.show : ST.eye.hide)} · ${item.name}`}
          title={i18n.t(item.hidden ? ST.eye.show : ST.eye.hide)}
          onClick={(event) => {
            event.stopPropagation();
            c.toggleVisible(item.key);
          }}
        >
          {item.hidden ? '◌' : '◉'}
        </button>
      </span>
    </div>
  );
};

const Drawer = ({ c, controller, propId, mapHref, onOpenLocks }: { c: TourStopsController; controller: TourSetupController; propId: string; mapHref: (card: StopCard) => string; onOpenLocks: () => void }) => {
  const item = c.selected!;
  const row = item.row;
  const tabs: { id: 'content' | 'lock' | 'preview'; label: string }[] = [
    { id: 'content', label: i18n.t(ST.drawer.tabs.content) },
    { id: 'lock', label: i18n.t(ST.drawer.tabs.lock) },
    { id: 'preview', label: i18n.t(ST.drawer.tabs.preview) }
  ];
  return (
    <div className="bo-ts__drawer" data-testid="stop-drawer">
      <div className="bo-ts__drawerhead">
        <span className="bo-ts__num" style={{ background: item.color, width: 30, height: 30, fontSize: 13 }}>
          {item.num}
        </span>
        <div className="bo-tx__grow">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ font: '800 16px var(--bo-font)', color: 'var(--bo-ink)' }}>{item.name}</span>
            {item.model && <span className="bo-ts__tag bo-ts__tag--model">{i18n.t(ST.drawer.alwaysOn)}</span>}
            {item.hidden && <StatusPill variant="neutral" label={i18n.t(ST.tag.hidden)} />}
            {item.local && <StatusPill variant="info" label={i18n.t(ST.tag.local)} />}
          </div>
          <div className="bo-tx__meta">
            {item.kindLabel} · {item.sub}
          </div>
        </div>
        <button type="button" className="bo-tx__btn" onClick={() => controller.actions.toggleVisible(item.key)}>
          {i18n.t(item.hidden ? ST.drawer.show : ST.drawer.hide)}
        </button>
        <button type="button" className="bo-tx__btn bo-tx__btn--danger" onClick={() => controller.actions.removeStop(item.key)}>
          {i18n.t(ST.drawer.remove)}
        </button>
        <button type="button" className="bo-tx__btn" aria-label={i18n.t(ST.drawer.close)} onClick={() => c.select(null)}>
          ×
        </button>
      </div>
      <div className="bo-ts__drawertabs" role="tablist">
        {tabs.map((tab) => (
          <button key={tab.id} type="button" role="tab" aria-selected={c.drawerTab === tab.id} className={`bo-ts__drawertab${c.drawerTab === tab.id ? ' bo-ts__drawertab--on' : ''}`} onClick={() => c.setDrawerTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      {c.drawerTab === 'content' && (
        <div className="bo-ts__drawerbody">
          {!row && <div className="bo-tx__note">{i18n.t(ST.drawer.unsaved)}</div>}
          {row && (
            <div className="bo-tx__info">
              {t(ST.drawer.recordNote, { record: i18n.t(item.kind === 'unit' ? ST.sourceUnit : item.kind === 'amenity' ? ST.sourceAmenity : ST.kind[item.kind as 'elevator' | 'building_starting_point']) })}{' '}
              <Link href={tourContentRoute(propId)} className="bo-breadcrumb__link">
                {i18n.t(ST.drawer.openInventory)}
              </Link>
            </div>
          )}
          <label className="bo-tx__field">
            {i18n.t(ST.drawer.name)}
            <input className="bo-tx__input" value={c.draft.name} disabled={!row || !c.editable.has('name')} onChange={(event) => c.setDraft({ name: event.target.value })} />
            {row && !c.editable.has('name') && <span className="bo-tx__meta">{i18n.t(ST.drawer.renameInInventory)}</span>}
          </label>
          {c.editable.has('description') && (
            <label className="bo-tx__field">
              {i18n.t(ST.drawer.description)}
              <textarea className="bo-tx__textarea" rows={3} value={c.draft.description} onChange={(event) => c.setDraft({ description: event.target.value })} />
            </label>
          )}
          <label className="bo-tx__field">
            {i18n.t(ST.drawer.directions)}
            <textarea className="bo-tx__textarea" rows={3} value={c.draft.instructions} placeholder={i18n.t(ST.drawer.directionsPlaceholder)} disabled={!row || !c.editable.has('instructions')} onChange={(event) => c.setDraft({ instructions: event.target.value })} />
          </label>
          {c.editable.has('video_link') && (
            <label className="bo-tx__field">
              {i18n.t(ST.drawer.videoLink)}
              <input className="bo-tx__input" value={c.draft.videoLink} onChange={(event) => c.setDraft({ videoLink: event.target.value })} />
            </label>
          )}
          {c.editable.has('virtual_tour_url') && (
            <label className="bo-tx__field">
              {i18n.t(ST.drawer.virtualTour)}
              <input className="bo-tx__input" value={c.draft.virtualTourUrl} onChange={(event) => c.setDraft({ virtualTourUrl: event.target.value })} />
            </label>
          )}
          <div className="bo-tx__setrow">
            <div className="bo-tx__grow">
              <div className="bo-tx__setlabel">{i18n.t(ST.drawer.photos)}</div>
              <div className="bo-tx__setdesc">{i18n.t(row?.record?.hasImage ? ST.drawer.hasImage : ST.drawer.noImage)}</div>
              <div className="bo-tx__meta">{i18n.t(ST.drawer.photosNote)}</div>
            </div>
            {item.card.image && (
              <div style={{ width: 96, height: 64, borderRadius: 6, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                <SafeImage className="bo-tour__stopimg" src={item.card.image} alt="" fallback={i18n.t(T.elevators.photoUnavailable)} />
              </div>
            )}
          </div>
          <div className="bo-tx__setrow">
            <div className="bo-tx__grow">
              <div className="bo-tx__setlabel">{i18n.t(ST.drawer.dwell)}</div>
              <div className="bo-tx__setdesc">{i18n.t(ST.drawer.dwellHint)}</div>
            </div>
            <span className="bo-tx__name">{item.card.duration}</span>
            <button type="button" className="bo-tx__btn" onClick={() => controller.actions.openEditStop(item.key)}>
              {i18n.t(ST.drawer.editDwell)}
            </button>
          </div>
          <div className="bo-tx__setrow">
            <div className="bo-tx__grow">
              <div className="bo-tx__setlabel">{i18n.t(ST.drawer.pin)}</div>
              <div className="bo-tx__setdesc">
                {item.card.plotted ? i18n.t(ST.drawer.plotted) : i18n.t(ST.drawer.notPlotted)} · {item.sub}
              </div>
              <div className="bo-tx__meta">{i18n.t(ST.drawer.pinNote)}</div>
            </div>
            <Link href={mapHref(item.card)} className="bo-tx__btn bo-tx__btn--accent">
              {i18n.t(item.card.plotted ? ST.drawer.viewOnPlan : ST.drawer.plotOnPlan)}
            </Link>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="bo-tx__btn" disabled={!c.dirty} onClick={() => c.setDraft({ ...c.draft, ...(row ? { name: row.name, description: row.record?.description ?? '', instructions: row.record?.instructions ?? '', videoLink: row.record?.videoLink ?? '', virtualTourUrl: row.record?.virtualTourUrl ?? '' } : {}) })}>
              {i18n.t(X.discard)}
            </button>
            <button type="button" className="bo-tx__btn bo-tx__btn--primary" disabled={!row || !c.dirty || c.savingContent} onClick={() => void c.saveContent()} data-testid="stop-save-content">
              {c.savingContent ? i18n.t(X.saving) : i18n.t(ST.drawer.saveContent)}
            </button>
          </div>
        </div>
      )}
      {c.drawerTab === 'lock' && <LockPane c={c} onOpenLocks={onOpenLocks} />}
      {c.drawerTab === 'preview' && <PreviewPane c={c} />}
    </div>
  );
};

const LockPane = ({ c, onOpenLocks }: { c: TourStopsController; onOpenLocks: () => void }) => {
  const item = c.selected!;
  const lock = item.row?.lock ?? null;
  const state = lockStateLabel(lock);
  const noDevices = !!c.inventory && c.inventory.locks.length === 0;
  return (
    <div className="bo-ts__drawerbody" data-testid="stop-lock">
      {!item.row && <div className="bo-tx__note">{i18n.t(ST.drawer.unsaved)}</div>}
      <div className="bo-tx__setrow">
        <div className="bo-tx__grow">
          <div className="bo-tx__setlabel">{i18n.t(ST.lock.title)}</div>
          <div className="bo-tx__setdesc">{i18n.t(ST.lock.sub)}</div>
          {item.row?.holder && item.row.holder.kind === 'door' && <div className="bo-tx__meta">{t(ST.lock.onDoor, { door: item.row.holder.name })}</div>}
        </div>
        <StatusPill variant={state.variant} label={state.label} />
      </div>
      {lock?.missing && <div className="bo-tx__bad">{i18n.t(ST.lock.missing)}</div>}
      {lock?.device && (
        <div className="bo-tx__ok" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="bo-tx__grow">{t(ST.lock.current, { name: lock.device.name, provider: lock.device.vendor })}</span>
          <button type="button" className="bo-tx__btn" disabled={c.lockBusy} onClick={c.unassign}>
            {i18n.t(ST.lock.unassign)}
          </button>
        </div>
      )}
      <div className="bo-tx__seg" role="radiogroup">
        {(['smart', 'manual', 'none'] as const).map((choice) => (
          <button key={choice} type="button" role="radio" aria-checked={c.lockChoice === choice} className={`bo-tx__segbtn${c.lockChoice === choice ? ' bo-tx__segbtn--on' : ''}`} disabled={!item.row || c.lockBusy} onClick={() => c.chooseLock(choice)}>
            {i18n.t(ST.lock[choice])}
          </button>
        ))}
      </div>
      {c.lockChoice === 'smart' && (
        <>
          {c.inventoryLoading && <div className="bo-tx__meta">{i18n.t(X.loading)}</div>}
          {noDevices && (
            <div className="bo-tx__note">
              {i18n.t(ST.lock.noProvider)}{' '}
              <button type="button" className="bo-tx__btn" onClick={onOpenLocks}>
                {i18n.t(ST.lock.openLocks)}
              </button>
            </div>
          )}
          {!noDevices && c.inventory && (
            <>
              <input className="bo-tx__input" placeholder={i18n.t(ST.lock.search)} aria-label={i18n.t(ST.lock.search)} value={c.lockQuery} onChange={(event) => c.setLockQuery(event.target.value)} />
              <div className="bo-tx__rowlist" style={{ maxHeight: 260, overflowY: 'auto' }}>
                {c.lockChoices.map((choice) => (
                  <div key={choice.key} className={`bo-tx__rowitem bo-tx__rowitem--static${choice.current ? ' bo-tx__rowitem--on' : ''}`}>
                    <div className="bo-tx__grow">
                      <div className="bo-tx__name">{choice.name}</div>
                      <div className="bo-tx__meta">{choice.sub}</div>
                    </div>
                    {choice.current ? (
                      <StatusPill variant="ok" label={i18n.t(ST.lock.assigned)} />
                    ) : (
                      <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={c.lockBusy} onClick={() => c.assignDevice(choice.lock)}>
                        {i18n.t(ST.lock.assign)}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {c.lockChoice === 'manual' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <label className="bo-tx__field bo-tx__grow">
            {i18n.t(ST.lock.manualCode)}
            <input className="bo-tx__input bo-tx__input--code" value={c.manualCode} placeholder="2468#" onChange={(event) => c.setManualCode(event.target.value)} />
          </label>
          <button type="button" className="bo-tx__btn bo-tx__btn--primary" disabled={!item.row || c.lockBusy} onClick={c.saveManual}>
            {c.lockBusy ? i18n.t(ST.lock.saving) : i18n.t(ST.lock.saveCode)}
          </button>
          {lock?.manualCodePresent && (
            <button type="button" className="bo-tx__btn bo-tx__btn--danger" disabled={c.lockBusy} onClick={c.clearManual}>
              {i18n.t(ST.lock.clearCode)}
            </button>
          )}
        </div>
      )}
      <div className="bo-tx__meta">
        <button type="button" className="bo-tx__btn" onClick={onOpenLocks}>
          {i18n.t(ST.lock.openLocks)}
        </button>
      </div>
    </div>
  );
};

const PreviewPane = ({ c }: { c: TourStopsController }) => {
  const item = c.selected!;
  const lock = item.row?.lock ?? null;
  const directions = c.draft.instructions || item.row?.record?.instructions || item.card.talkingPoint;
  return (
    <div className="bo-ts__drawerbody" data-testid="stop-preview">
      <div className="bo-tx__meta">{i18n.t(ST.preview.title)}</div>
      <div className="bo-tx__phone" style={{ margin: '0 auto' }}>
        <div className="bo-tx__phonebar">{t(ST.preview.stop, { num: item.num })}</div>
        <div className="bo-tx__phonebody">
          {item.card.image ? (
            <div style={{ height: 120, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <SafeImage className="bo-tour__stopimg" src={item.card.image} alt="" fallback={i18n.t(T.elevators.photoUnavailable)} />
            </div>
          ) : (
            <div style={{ height: 120, borderRadius: 8, background: 'repeating-linear-gradient(45deg,#F4F5F7,#F4F5F7 8px,#ECEEF2 8px,#ECEEF2 16px)' }} />
          )}
          <div style={{ font: '800 15px var(--bo-font)', color: 'var(--bo-ink)' }}>{c.draft.name || item.name}</div>
          <div style={{ font: '500 12px/1.5 var(--bo-font)', color: 'var(--bo-muted)' }}>{directions || i18n.t(ST.issue.no_instructions)}</div>
          {lock?.provider && (
            <div className={lock.missing ? 'bo-tx__bad' : 'bo-tx__ok'}>
              <b>{i18n.t(ST.preview.code)}</b> · {lock.missing ? i18n.t(ST.preview.locked) : lock.provider === 'Manual' ? (lock.manualCode ?? '••••') : lockStateLabel(lock).label}
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <span className="bo-tx__btn bo-tx__btn--primary bo-tx__grow" style={{ textAlign: 'center' }}>{i18n.t(ST.preview.checkIn)}</span>
            <span className="bo-tx__btn bo-tx__grow" style={{ textAlign: 'center' }}>{i18n.t(ST.preview.next)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const RoutePreview = ({ c, propId }: { c: TourStopsController; propId: string }) => {
  const level = c.previewLevel;
  const graph = c.previewGraph;
  const dims = graph?.dims ?? (level?.width && level.height ? { w: level.width, h: level.height } : null);
  const image = level?.image?.url ?? null;
  const stroke = dims ? Math.max(2, dims.w / 450) : 2;
  return (
    <div className="bo-ts__drawer" data-testid="route-preview">
      <div className="bo-ts__drawerhead" style={{ paddingBottom: 12, borderBottom: '1px solid var(--bo-line)' }}>
        <div className="bo-tx__grow">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bo-tx__cardtitle">{i18n.t(ST.route.title)}</span>
            <span className="bo-ts__tag">{i18n.t(ST.route.readOnly)}</span>
          </div>
          <div className="bo-tx__meta">{i18n.t(ST.route.tip)}</div>
        </div>
        <select className="bo-tx__select" aria-label={i18n.t(ST.route.level)} value={level?.id ?? ''} onChange={(event) => c.setPreviewLevelId(event.target.value)}>
          {c.previewLevel == null && <option value="">—</option>}
          {c.levels.map((row) => (
            <option key={row.id} value={row.id}>
              {row.sub} · {row.label}
            </option>
          ))}
        </select>
        <Link href={mapEditorRoute(propId)} className="bo-tx__btn bo-tx__btn--accent">
          {i18n.t(ST.route.edit)}
        </Link>
      </div>
      <div className="bo-ts__grid">
        <div style={{ padding: 14 }}>
          {!image && !dims && <div className="bo-tx__empty">{i18n.t(ST.route.noMap)}</div>}
          {(image || dims) && (
            <div className="bo-ts__preview" style={{ aspectRatio: dims ? `${dims.w} / ${dims.h}` : '16 / 10' }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- the floor image is a CMS file on S3 */}
              {image && <img className="bo-ts__previewimg" src={image} alt="" />}
              {dims && graph && (
                <svg viewBox={`0 0 ${dims.w} ${dims.h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
                  {graph.edges.map((edge) => (
                    <polyline key={edge.key} fill="none" stroke="#0077AE" strokeOpacity={0.55} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" points={[[edge.x1, edge.y1], ...edge.points.map((p) => [p.x, p.y]), [edge.x2, edge.y2]].map((p) => p.join(',')).join(' ')} />
                  ))}
                  {c.routeLegsHere.map((leg) => (
                    <polyline key={leg.index} fill="none" stroke="#4A7212" strokeWidth={stroke * 2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${stroke * 3} ${stroke * 2}`} points={(leg.points ?? []).map((p) => p.join(',')).join(' ')} />
                  ))}
                </svg>
              )}
              {c.previewPins.map((pin) =>
                pin.num ? (
                  <button key={pin.key} type="button" className="bo-ts__pin" style={{ left: `${pin.x}%`, top: `${pin.y}%`, background: pin.color }} title={pin.label} onClick={() => pin.stopKey && c.select(pin.stopKey)}>
                    {pin.num}
                  </button>
                ) : (
                  <span key={pin.key} className="bo-ts__dot" style={{ left: `${pin.x}%`, top: `${pin.y}%` }} title={pin.label} />
                )
              )}
            </div>
          )}
          {graph && graph.edges.length === 0 && <div className="bo-tx__meta" style={{ marginTop: 8 }}>{i18n.t(ST.route.noPaths)}</div>}
          <div style={{ display: 'flex', gap: 14, marginTop: 8 }} className="bo-tx__meta">
            <span>● {i18n.t(ST.route.legend.stop)}</span>
            <span style={{ color: '#0077AE' }}>— {i18n.t(ST.route.legend.hallway)}</span>
            <span style={{ color: '#4A7212' }}>┄ {i18n.t(ST.route.legend.route)}</span>
          </div>
        </div>
        <PathPanel c={c} />
      </div>
    </div>
  );
};

const PathPanel = ({ c }: { c: TourStopsController }) => {
  const result = c.path.result;
  return (
    <div className="bo-ts__pathpanel" data-testid="path-panel">
      <div className="bo-tx__statlabel">{i18n.t(ST.path.title)}</div>
      <div className="bo-tx__meta">{i18n.t(ST.path.across)}</div>
      <div className="bo-ts__scopes" role="radiogroup">
        {SCOPES.map((scope) => (
          <button key={scope} type="button" role="radio" aria-checked={c.path.scope === scope} className={`bo-ts__scope${c.path.scope === scope ? ' bo-ts__scope--on' : ''}`} onClick={() => c.setPath({ ...c.path, scope, result: null })}>
            {i18n.t(ST.path.scope[scope])}
          </button>
        ))}
      </div>
      <div className="bo-ts__ends">
        <div className="bo-ts__end">
          <span className="bo-ts__endlabel">{i18n.t(ST.path.from)}</span>
          <select className="bo-ts__endselect" aria-label={i18n.t(ST.path.from)} value={c.path.from} onChange={(event) => c.setPath({ ...c.path, from: event.target.value })}>
            {c.endpoints.map((row) => (
              <option key={row.key} value={row.key}>
                {row.group} · {row.label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="bo-ts__swap" style={{ gridRow: '1 / span 2' }} aria-label={i18n.t(ST.path.swap)} title={i18n.t(ST.path.swap)} onClick={() => c.setPath({ ...c.path, from: c.path.to, to: c.path.from })}>
          ⇅
        </button>
        <div className="bo-ts__end" style={{ borderBottom: 'none' }}>
          <span className="bo-ts__endlabel">{i18n.t(ST.path.to)}</span>
          <select className="bo-ts__endselect" aria-label={i18n.t(ST.path.to)} value={c.path.to} onChange={(event) => c.setPath({ ...c.path, to: event.target.value })}>
            {c.endpoints.map((row) => (
              <option key={row.key} value={row.key}>
                {row.group} · {row.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px var(--bo-font)', color: 'var(--bo-ink)', cursor: 'pointer' }}>
        <input type="checkbox" checked={c.path.stepFree} onChange={(event) => c.setPath({ ...c.path, stepFree: event.target.checked })} />
        {i18n.t(ST.path.stepFree)} <span className="bo-tx__meta">{i18n.t(ST.path.stepFreeSub)}</span>
      </label>
      <button type="button" className="bo-ts__find" disabled={c.path.loading || c.endpoints.length < 2} onClick={() => void c.findPath()} data-testid="path-find">
        {c.path.loading ? i18n.t(ST.path.finding) : i18n.t(ST.path.find)}
      </button>
      {c.endpoints.length < 2 && <div className="bo-tx__meta">{i18n.t(ST.path.none)}</div>}
      {result && (
        <div className={`bo-ts__result${result.ok ? '' : ' bo-tx__bad'}`} role="status" data-testid="path-result">
          <div className="bo-ts__resulthead" style={result.ok ? undefined : { background: 'transparent', borderBottom: 'none', color: 'inherit' }}>
            {result.head}
            {result.sub && <div className="bo-tx__meta">{result.sub}</div>}
          </div>
          {result.steps.map((step, index) => (
            <div key={`${step.leg}-${index}`} className="bo-ts__step">
              <span className="bo-ts__num" style={{ width: 18, height: 18, fontSize: 9.5, background: step.kind === 'arrive' ? '#4A7212' : 'var(--bo-ink)' }}>
                {index + 1}
              </span>
              <span>
                <b style={{ color: 'var(--bo-ink)' }}>{step.title}</b>
                {step.sub ? ` · ${step.sub}` : ''}
              </span>
            </div>
          ))}
          {result.warnings.length > 0 && (
            <div className="bo-ts__step" style={{ color: '#8a6a00' }}>
              <b>{i18n.t(ST.path.warnings)}</b> {result.warnings.join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AddStopsModal = ({ c, propId }: { c: TourStopsController; propId: string }) => {
  const picked = c.add.picked.filter((id) => c.candidates.some((row) => row.id === id && row.plotted)).length;
  const pinned = c.addShown.filter((row) => row.plotted).length;
  return (
    <Modal
      open={c.add.open}
      title={i18n.t(ST.add.title)}
      subtitle={i18n.t(ST.add.body)}
      width={720}
      onClose={c.closeAdd}
      closeLabel={i18n.t(X.close)}
      className="bo-tour__dialog"
      footer={
        <>
          <span className="bo-tx__meta bo-tx__grow">{picked ? t(ST.add.picked, { count: picked }) : i18n.t(ST.add.nothing)}</span>
          <button type="button" className="bo-btn bo-btn--secondary" onClick={c.closeAdd}>
            {i18n.t(X.cancel)}
          </button>
          <button type="button" className="bo-btn bo-btn--primary" disabled={!picked} onClick={c.submitAdd} data-testid="add-stops-submit">
            {t(ST.add.submit, { count: picked })}
          </button>
        </>
      }
    >
      <div className="bo-dlg bo-dlg--stacked">
        <div className="bo-tx__toolbar">
          <input className="bo-tx__input bo-tx__grow" placeholder={i18n.t(ST.add.search)} aria-label={i18n.t(ST.add.search)} value={c.add.query} onChange={(event) => c.setAdd({ ...c.add, query: event.target.value })} />
          <div className="bo-tx__seg">
            {(['all', 'amenity', 'unit'] as const).map((tab) => (
              <button key={tab} type="button" className={`bo-tx__segbtn${c.add.tab === tab ? ' bo-tx__segbtn--on' : ''}`} onClick={() => c.setAdd({ ...c.add, tab })}>
                {i18n.t(ST.add.tabs[tab])}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="bo-tx__meta bo-tx__grow">{t(ST.add.shown, { count: c.addShown.length, pinned })}</span>
          <button type="button" className="bo-tx__btn" onClick={c.pickShown}>
            {i18n.t(ST.add.selectAll)}
          </button>
          <button type="button" className="bo-tx__btn" onClick={c.clearShown}>
            {i18n.t(ST.add.clearShown)}
          </button>
        </div>
        <div className="bo-ts__addgrid">
          {c.addShown.map((row) => {
            const on = c.add.picked.includes(row.id);
            return (
              <button key={row.id} type="button" className={`bo-tx__rowitem${on ? ' bo-tx__rowitem--on' : ''}`} disabled={!row.plotted} onClick={() => c.togglePick(row.id)} data-testid="add-stop-item">
                <span className={`bo-tx__check${on ? ' bo-tx__check--on' : ''}`} />
                <div className="bo-tx__grow">
                  <div className="bo-tx__name">{row.name}</div>
                  <div className="bo-tx__meta">{row.sub}</div>
                </div>
                {!row.plotted && (
                  <Link href={`${mapEditorRoute(propId)}?pin=${encodeURIComponent(row.id)}&arm=1`} className="bo-tx__btn" onClick={(event) => event.stopPropagation()} title={i18n.t(ST.add.notPinned)}>
                    {i18n.t(ST.add.pinOnMap)}
                  </Link>
                )}
              </button>
            );
          })}
          {c.addShown.length === 0 && <div className="bo-tx__empty">{c.candidates.length === 0 ? i18n.t(ST.add.empty) : t(ST.add.noMatch, { q: c.add.query })}</div>}
        </div>
      </div>
    </Modal>
  );
};
