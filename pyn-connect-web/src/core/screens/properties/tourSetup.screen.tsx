'use client';

import Link from 'next/link';
import { useState } from 'react';

import { mapEditorRoute, propRoute, tourContentRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES, legacyCmsURLs } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { Modal } from '~/core/components/molecules/Modal';
import { SetupSwitcher } from '~/core/components/molecules/SetupSwitcher';
import { useTourSetup, type TourSetupController } from '~/core/hooks/useTourSetup';
import type { TourPublication } from '~/core/models/data/tourModules.data';
import { formatWhen } from '~/core/utils/generator/tour/tourLocks.generator';
import { useTourBooking } from '~/core/hooks/tour/useTourBooking';
import { useTourOverview } from '~/core/hooks/tour/useTourOverview';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { CORE_STRINGS } from '~/config/app/strings';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { pinKey } from '~/core/utils/generator/map/mapState';
import { M } from '~/core/utils/generator/map/mapText';
import { generateSetupSwitcher } from '~/core/utils/generator/productSetup.generator';
import { generateTourHeadPills, type SettingsSection } from '~/core/utils/generator/tour/tourModule.generator';
import { T, type StopCard, type TourTab } from '~/core/utils/generator/tour/tourSetup.generator';
import { LocksTab } from './tour/LocksTab';
import { StopsTab } from './tour/StopsTab';
import { VisitorsTab } from './tour/VisitorsTab';
import { ChatTab, OverviewTab, SettingsTab } from './tour/tourModuleTabs';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  map: PropertyMap | null;
  error?: string | null;
  /** The tab to open on (`?tab=`); the Overview otherwise. */
  initialTab?: TourTab;
  /** The Settings section to open on (`?section=`); the booking rules otherwise. */
  initialSection?: SettingsSection;
}

/**
 * Tour Setup on real data: the Back Office design's Tour Module (Oct 27,
 * 2026). Overview, Stops (with the route preview), Locks, Visitors, Live Chat
 * and Settings (scheduling, the booking form and link) read the CMS; the
 * route order lives on the page until Save, while the stop drawer, the lock,
 * visitor and booking actions write through the Connect endpoints (when
 * writes are enabled). Elevators are stops of the route and nodes of the
 * graph; the design has no tab of their own.
 */
export const TourSetupScreen = ({ map, error, initialTab, initialSection }: Props) =>
  map ? <TourSetup map={map} initialTab={initialTab} initialSection={initialSection} /> : <TourUnavailable error={error ?? null} />;

/** The map screen with a stop selected (plotted) or armed for plotting (not yet). */
const mapHref = (propId: string, card: StopCard): string => {
  const params = new URLSearchParams();
  if (card.viewParams.level) params.set('level', card.viewParams.level);
  if (card.viewParams.pin) params.set('pin', pinKey(card.viewParams.pin));
  if (card.viewParams.arm) params.set('arm', '1');
  const query = params.toString();
  return `${mapEditorRoute(propId)}${query ? `?${query}` : ''}`;
};

const TourSetup = ({ map, initialTab, initialSection }: { map: PropertyMap; initialTab?: TourTab; initialSection?: SettingsSection }) => {
  const controller = useTourSetup(map, initialTab);
  const { state, summary, actions, stops } = controller;
  const propertyId = map.inventory.property.id;
  const propId = String(propertyId);
  const booking = useTourBooking(propertyId, state.tab === 'visitors' || state.tab === 'settings');
  const overview = useTourOverview(propertyId, state.tab === 'overview');
  const [stopFocus, setStopFocus] = useState<string | null>(null);
  const [addSignal, setAddSignal] = useState(0);
  // Clicking the Visitors tab while it is open takes the profile back to the list (the tab state itself does not change).
  const [visitorsListSignal, setVisitorsListSignal] = useState(0);
  const pickTab = (id: TourTab) => {
    if (id === 'visitors' && state.tab === 'visitors') setVisitorsListSignal((current) => current + 1);
    actions.setTab(id);
  };
  const TB = CORE_STRINGS.tourModules.tabs;
  const tabs: { id: TourTab; label: string; count: number | null }[] = [
    { id: 'overview', label: i18n.t(TB.overview), count: null },
    { id: 'stops', label: i18n.t(TB.stops), count: summary.stops },
    { id: 'locks', label: i18n.t(TB.locks), count: null },
    { id: 'visitors', label: i18n.t(TB.visitors), count: null },
    { id: 'chat', label: i18n.t(TB.chat), count: null },
    { id: 'settings', label: i18n.t(TB.settings), count: null }
  ];
  const pills = generateTourHeadPills(summary, stops, controller.unsaved);
  const stopHref = (card: StopCard) => mapHref(propId, card);
  const openStop = (key: string) => {
    setStopFocus(key);
    actions.setTab('stops');
  };
  const openAddStops = () => {
    actions.setTab('stops');
    setAddSignal((current) => current + 1);
  };

  return (
    <div className="bo-inv bo-tour bo-tm">
      <Breadcrumb
        items={[
          { label: i18n.t(T.breadcrumbRoot), href: APP_ROUTES.properties },
          { label: map.inventory.property.name, href: propRoute(propId) },
          { label: i18n.t(T.breadcrumbCurrent) }
        ]}
      />

      <div className="bo-inv__header">
        <div className="bo-inv__heading">
          <div className="bo-tm__titlerow">
            <h2 className="bo-inv__title">{i18n.t(T.title)}</h2>
            {pills.map((pill) => (
              <StatusPill key={pill.id} variant={pill.variant} label={pill.label} />
            ))}
          </div>
          <p className="bo-inv__summary">{summary.subtitle}</p>
          <div className="bo-tm__switchrow">
            <SetupSwitcher options={generateSetupSwitcher(propId, 'tour')} label={i18n.t(CORE_STRINGS.prodSetup.switchLabel)} />
          </div>
        </div>
        <div className="bo-inv__headactions">
          <Link href={tourContentRoute(propId)} className="bo-inv__ghost">
            {i18n.t(T.header.inventory)}
          </Link>
          <Link href={mapEditorRoute(propId)} className="bo-inv__ghost">
            {i18n.t(T.header.mapPlotting)}
          </Link>
          <button type="button" className="bo-inv__plot" onClick={openAddStops}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {i18n.t(T.header.addStop)}
          </button>
          <button
            type="button"
            className="bo-inv__add"
            onClick={() => void actions.save()}
            disabled={controller.saving || !controller.unsaved}
            title={controller.canSave ? undefined : i18n.t(map.write.writesEnabled ? T.save.notAllowed : T.save.disabled)}
            data-testid="tour-save"
          >
            {controller.saving ? i18n.t(T.save.saving) : controller.unsaved ? t(T.save.buttonCount, { count: controller.unsaved }) : i18n.t(T.save.button)}
          </button>
          <button type="button" className="bo-inv__add bo-tour__publish" onClick={actions.openPublish}>
            <Icon name="upload" />
            {i18n.t(T.header.publish)}
          </button>
        </div>
      </div>

      <p className="bo-map__readonly" role="note">
        {i18n.t(T.readOnly)}
      </p>

      <div className="bo-tour__tabs" role="tablist" aria-label={i18n.t(T.tabs.label)}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={state.tab === tab.id}
            className={`bo-tour__tab${state.tab === tab.id ? ' bo-tour__tab--on' : ''}`}
            onClick={() => pickTab(tab.id)}
            data-testid={`tour-tab-${tab.id}`}
          >
            {tab.label}
            {tab.count != null && <span className="bo-tour__tabcount">{tab.count}</span>}
          </button>
        ))}
      </div>

      {state.tab === 'overview' && <OverviewTab controller={controller} propId={propId} mapHref={stopHref} overview={overview} onOpenStop={openStop} />}
      {state.tab === 'stops' && (
        <StopsTab controller={controller} propertyId={propertyId} propId={propId} mapHref={stopHref} focusKey={stopFocus} openAddSignal={addSignal} onOpenLocks={() => actions.setTab('locks')} />
      )}
      {state.tab === 'locks' && <LocksTab propertyId={propertyId} legacyUrl={legacyCmsURLs.locks(propertyId)} />}
      {state.tab === 'visitors' && <VisitorsTab propertyId={propertyId} settings={booking.settings} listSignal={visitorsListSignal} />}
      {state.tab === 'chat' && <ChatTab propId={propId} />}
      {state.tab === 'settings' && <SettingsTab controller={controller} booking={booking} propertyId={propertyId} propertyName={map.inventory.property.name} initialSection={initialSection} />}

      <TourDialogs controller={controller} />
    </div>
  );
};

const TourDialogs = ({ controller }: { controller: TourSetupController }) => {
  const { state, sources, summary, actions, stops, map, dialogProblem } = controller;
  const dialog = state.dialog;
  const editing = dialog?.kind === 'editStop' ? stops.find((row) => row.key === dialog.key) ?? null : null;
  const confirm = state.confirm;
  const footer = (
    <>
      <p className="bo-dlg__readonly">{i18n.t(T.dialogs.readOnly)}</p>
      <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closeDialog}>
        {i18n.t(T.dialogs.cancel)}
      </button>
      <button type="button" className="bo-btn bo-btn--primary" onClick={actions.saveDialog} disabled={!!dialogProblem}>
        {i18n.t(dialog?.kind === 'addStop' ? T.dialogs.addStop : T.dialogs.saveChanges)}
      </button>
    </>
  );
  const dwellField = (value: string, hint: string) => (
    <label className="bo-dlg__field">
      <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.duration)}</span>
      <input
        className="bo-field"
        inputMode="numeric"
        value={value}
        aria-invalid={dialogProblem ? 'true' : undefined}
        onChange={(event) => actions.setDialog({ duration: event.target.value.replace(/[^0-9]/g, '') })}
      />
      {dialogProblem ? <span className="bo-dlg__fielderror" role="alert">{dialogProblem}</span> : <span className="bo-dlg__fieldhint">{hint}</span>}
    </label>
  );

  return (
    <>
      <Modal
        open={!!dialog}
        title={i18n.t(dialog?.kind === 'addStop' ? T.dialogs.addStopTitle : T.dialogs.editStopTitle)}
        subtitle={dialog?.kind === 'editStop' && editing ? `${editing.name} · ${editing.kindLabel} · ${editing.whereLabel}` : undefined}
        width={520}
        onClose={actions.closeDialog}
        closeLabel={i18n.t(T.dialogs.close)}
        className="bo-tour__dialog"
        footer={footer}
      >
        {dialog?.kind === 'addStop' && (
          <div className="bo-dlg bo-dlg--stacked">
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.source)}</span>
              <select className="bo-field" value={dialog.source} onChange={(event) => actions.setDialog({ source: event.target.value })}>
                {sources.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="bo-dlg__fieldhint">{i18n.t(T.dialogs.sourceHint)}</span>
            </label>
            {dwellField(dialog.duration, i18n.t(T.dialogs.durationHint))}
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.stops.talkingPoint)}</span>
              <textarea className="bo-field bo-dlg__textarea" value={dialog.talkingPoint} onChange={(event) => actions.setDialog({ talkingPoint: event.target.value })} />
            </label>
          </div>
        )}
        {dialog?.kind === 'editStop' && (
          <div className="bo-dlg bo-dlg--stacked">
            {dwellField(dialog.duration, i18n.t(T.dialogs.durationHint))}
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.stops.talkingPoint)}</span>
              <textarea className="bo-field bo-dlg__textarea" value={dialog.talkingPoint} onChange={(event) => actions.setDialog({ talkingPoint: event.target.value })} />
              <span className="bo-dlg__fieldhint">{i18n.t(T.dialogs.talkingHint)}</span>
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={!!confirm}
        title={confirm?.title ?? ''}
        width={460}
        onClose={actions.closeConfirm}
        closeLabel={i18n.t(T.dialogs.close)}
        className="bo-map__dialog"
        footer={
          confirm && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closeConfirm}>
                {i18n.t(T.dialogs.cancel)}
              </button>
              <button type="button" className="bo-btn bo-btn--primary bo-map__btn--danger" onClick={confirm.onConfirm}>
                {confirm.label}
              </button>
            </>
          )
        }
      >
        <p className="bo-map__dialogtext">{confirm?.message}</p>
        <p className="bo-map__dialognote">{i18n.t(T.dialogs.confirmNote)}</p>
      </Modal>

      <Modal
        open={state.publishOpen}
        title={i18n.t(T.publish.title)}
        width={480}
        onClose={actions.closePublish}
        closeLabel={i18n.t(T.dialogs.close)}
        className="bo-map__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closePublish}>
              {i18n.t(T.dialogs.close)}
            </button>
            <button
              type="button"
              className="bo-btn bo-btn--primary"
              onClick={() => void actions.publish()}
              disabled={controller.publishing || controller.unsaved > 0 || !controller.canSave || controller.publication?.tourEnabled === false}
              data-testid="tour-publish-confirm"
            >
              {i18n.t(controller.publishing ? T.publish.publishing : T.publish.confirm)}
            </button>
          </>
        }
      >
        <p className="bo-map__dialogtext">
          {t(T.publish.body, {
            stops: t(summary.stops === 1 ? T.header.stopOne : T.header.stopMany, { count: summary.stops }),
            property: map.inventory.property.name
          })}
        </p>
        <p className="bo-map__dialognote" data-testid="tour-publish-state">
          {publicationText(controller.publication)}
        </p>
        <p className="bo-map__dialognote">{i18n.t(T.publish.hint)}</p>
        {controller.unsaved > 0 ? <div className="bo-map__warnbox">{i18n.t(T.publish.saveFirst)}</div> : null}
        {controller.publication?.tourEnabled === false ? <div className="bo-map__warnbox">{i18n.t(T.publish.tourOff)}</div> : null}
      </Modal>
    </>
  );
};

/** The publish dialog's status line (October 25, 2026): never / last published by whom and when / changed since. */
const publicationText = (publication: TourPublication | null): string => {
  if (!publication || !publication.everPublished) return i18n.t(T.publish.never);
  const by = publication.publishedBy?.name || publication.publishedBy?.email || '—';
  const last = t(T.publish.last, { when: formatWhen(publication.publishedAt), by });
  return `${last} ${i18n.t(publication.changedSincePublish ? T.publish.changed : T.publish.upToDate)}`;
};

const TourUnavailable = ({ error }: { error: string | null }) => (
  <div className="bo-inv">
    <Breadcrumb items={[{ label: i18n.t(T.breadcrumbRoot), href: APP_ROUTES.properties }, { label: i18n.t(T.breadcrumbCurrent) }]} />
    {error ? (
      <div className="bo-error" role="alert">
        {error}
      </div>
    ) : (
      <div className="bo-section bo-section--empty" role="status">
        <h2 className="bo-section__title">{i18n.t(M.notFound.title)}</h2>
        <p className="bo-section__subtitle">{i18n.t(M.notFound.body)}</p>
        <Link href={APP_ROUTES.properties} className="bo-linkbutton">
          {i18n.t(M.notFound.back)}
        </Link>
      </div>
    )}
  </div>
);
