'use client';

import Link from 'next/link';
import { useRef } from 'react';

import { mapEditorRoute, propIntegrationsRoute, propRoute, tourContentRoute } from '~/config/app/connectRoutes';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Breadcrumb } from '~/core/components/molecules/Breadcrumb';
import { Modal } from '~/core/components/molecules/Modal';
import { useTourSetup, type TourSetupController } from '~/core/hooks/useTourSetup';
import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { pinKey } from '~/core/utils/generator/map/mapState';
import { M } from '~/core/utils/generator/map/mapText';
import { T, type StopCard } from '~/core/utils/generator/tour/tourSetup.generator';

interface Props {
  /** Null when the property was not found, or could not be loaded (then `error` says so). */
  map: PropertyMap | null;
  error?: string | null;
}

/**
 * Tour Setup on real data: the plotting design's `tourSetup` screen — Tour
 * Stops, Elevators & Locks, Routing — over the community tour's stops, the
 * property's elevators and its pathway graph. Every write action opens its
 * UI, changes the page's local state and sends nothing.
 */
export const TourSetupScreen = ({ map, error }: Props) => (map ? <TourSetup map={map} /> : <TourUnavailable error={error ?? null} />);

/** The map screen with a stop selected (plotted) or armed for plotting (not yet). */
const mapHref = (propId: string, card: StopCard): string => {
  const params = new URLSearchParams();
  if (card.viewParams.level) params.set('level', card.viewParams.level);
  if (card.viewParams.pin) params.set('pin', pinKey(card.viewParams.pin));
  if (card.viewParams.arm) params.set('arm', '1');
  const query = params.toString();
  return `${mapEditorRoute(propId)}${query ? `?${query}` : ''}`;
};

const TourSetup = ({ map }: { map: PropertyMap }) => {
  const controller = useTourSetup(map);
  const { state, summary, actions } = controller;
  const propId = String(map.inventory.property.id);
  const tabs: { id: typeof state.tab; label: string; count: number }[] = [
    { id: 'stops', label: i18n.t(T.tabs.stops), count: summary.stops },
    { id: 'elevators', label: i18n.t(T.tabs.elevators), count: summary.elevators },
    { id: 'routing', label: i18n.t(T.tabs.routing), count: summary.connections }
  ];

  return (
    <div className="bo-inv bo-tour">
      <Breadcrumb
        items={[
          { label: i18n.t(T.breadcrumbRoot), href: APP_ROUTES.properties },
          { label: map.inventory.property.name, href: propRoute(propId) },
          { label: i18n.t(T.breadcrumbCurrent) }
        ]}
      />

      <div className="bo-inv__header">
        <div className="bo-inv__heading">
          <h2 className="bo-inv__title">{i18n.t(T.title)}</h2>
          <p className="bo-inv__summary">{summary.subtitle}</p>
        </div>
        <div className="bo-inv__headactions">
          <Link href={tourContentRoute(propId)} className="bo-inv__ghost">
            {i18n.t(T.header.inventory)}
          </Link>
          <Link href={mapEditorRoute(propId)} className="bo-inv__ghost">
            {i18n.t(T.header.mapPlotting)}
          </Link>
          <button type="button" className="bo-inv__plot" onClick={actions.openAddStop}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {i18n.t(T.header.addStop)}
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
            onClick={() => actions.setTab(tab.id)}
          >
            {tab.label}
            <span className="bo-tour__tabcount">{tab.count}</span>
          </button>
        ))}
      </div>

      {state.tab === 'stops' && <StopsTab controller={controller} propId={propId} />}
      {state.tab === 'elevators' && <ElevatorsTab controller={controller} propId={propId} />}
      {state.tab === 'routing' && <RoutingTab controller={controller} propId={propId} />}

      <TourDialogs controller={controller} />
    </div>
  );
};

const StopsTab = ({ controller, propId }: { controller: TourSetupController; propId: string }) => {
  const { stops, summary, actions } = controller;
  return (
    <>
      <div className="bo-tour__bar">
        <div className="bo-tour__bartext">
          <div className="bo-tour__bartitle">{i18n.t(T.stops.title)}</div>
          <div className="bo-tour__barsub">
            {i18n.t(T.stops.subtitle)} · {summary.poolLabel}
          </div>
        </div>
      </div>
      <div className="bo-tour__list" data-testid="tour-stops">
        {stops.map((stop) => (
          <article key={stop.key} className={`bo-tour__stop${stop.visible ? '' : ' bo-tour__stop--hidden'}`}>
            {stop.image && (
              <div className="bo-tour__stopimage">
                <SafeImage className="bo-tour__stopimg" src={stop.image} alt="" fallback={i18n.t(T.elevators.photoUnavailable)} />
              </div>
            )}
            <div className="bo-tour__stopbody">
              <div className="bo-tour__stophead">
                <Icon name={stop.icon} style={{ color: 'var(--bo-accent)', display: 'flex' }} />
                <div className="bo-tour__stopname">{stop.name}</div>
                <span className="bo-tour__tag">{stop.kindLabel}</span>
                <StatusPill variant={stop.plotVariant} label={stop.plotLabel} />
                {!stop.visible && <StatusPill variant="neutral" label={i18n.t(T.stops.hiddenPill)} />}
                {stop.local && <StatusPill variant="info" label={i18n.t(T.stops.localPill)} />}
                <Link href={mapHref(propId, stop)} className="bo-tour__smallbtn">
                  {stop.viewLabel}
                </Link>
                <div className="bo-tour__stopactions">
                  <button type="button" className="bo-tour__iconbtn" aria-label={i18n.t(T.stops.moveUp)} disabled={stop.first} onClick={() => actions.moveStop(stop.key, -1)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button type="button" className="bo-tour__iconbtn" aria-label={i18n.t(T.stops.moveDown)} disabled={stop.last} onClick={() => actions.moveStop(stop.key, 1)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button type="button" className="bo-tour__smallbtn" onClick={() => actions.toggleVisible(stop.key)}>
                    {i18n.t(stop.visible ? T.stops.hide : T.stops.show)}
                  </button>
                  <button type="button" className="bo-tour__smallbtn" onClick={() => actions.openEditStop(stop.key)}>
                    {i18n.t(T.stops.edit)}
                  </button>
                  <button type="button" className="bo-tour__iconbtn bo-tour__iconbtn--danger" aria-label={i18n.t(T.stops.remove)} onClick={() => actions.removeStop(stop.key)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="bo-tour__meta">
                <span>
                  <Icon name="pin" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                  {stop.floorLabel}
                </span>
                <span>
                  <Icon name="properties" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                  {stop.whereLabel}
                </span>
                <span className="bo-tour__metasource">{stop.sourceLabel}</span>
                <span title={i18n.t(T.stops.distanceNote)}>
                  <Icon name="ruler" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                  {t(T.stops.distance, { value: stop.distance })}
                </span>
                <span title={i18n.t(T.stops.durationNote)}>
                  <Icon name="clock" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                  {t(T.stops.duration, { value: stop.duration })}
                </span>
                <span>
                  <Icon name="node" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                  {stop.nodeLabel}
                </span>
                {stop.lockLabel && (
                  <span>
                    <Icon name="lock" style={{ display: 'flex', color: 'var(--bo-subtle)' }} />
                    {stop.lockLabel}
                  </span>
                )}
              </div>
              <div>
                <div className="bo-tour__talklabel">
                  <Icon name="ai" style={{ display: 'flex' }} />
                  {i18n.t(T.stops.talkingPoint)}
                </div>
                <textarea
                  className="bo-tour__talk"
                  value={stop.talkingPoint}
                  placeholder={i18n.t(T.stops.talkingPlaceholder)}
                  aria-label={`${i18n.t(T.stops.talkingPoint)} · ${stop.name}`}
                  onChange={(event) => actions.setTalkingPoint(stop.key, event.target.value)}
                />
              </div>
            </div>
          </article>
        ))}
        {stops.length === 0 && (
          <div className="bo-tour__emptycard">
            {i18n.t(T.stops.emptyBefore)} <b>{i18n.t(T.header.addStop)}</b> {i18n.t(T.stops.emptyAfter)}
          </div>
        )}
      </div>
    </>
  );
};

const ElevatorsTab = ({ controller, propId }: { controller: TourSetupController; propId: string }) => {
  const { elevators, actions } = controller;
  const fileRef = useRef<HTMLInputElement | null>(null);
  const pendingRef = useRef<string | null>(null);
  return (
    <div className="bo-tour__list" data-testid="tour-elevators">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        data-testid="elevator-photo-file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && pendingRef.current) actions.addPhoto(pendingRef.current, file);
          event.target.value = '';
        }}
      />
      <div className="bo-tour__bar">
        <div className="bo-tour__bartext">
          <div className="bo-tour__bartitle">{i18n.t(T.elevators.title)}</div>
          <div className="bo-tour__barsub">{i18n.t(T.elevators.subtitle)}</div>
        </div>
        <Link href={propIntegrationsRoute(propId)} className="bo-tour__smallbtn bo-tour__smallbtn--md">
          {i18n.t(T.elevators.lockVendors)}
        </Link>
        <button type="button" className="bo-tour__smallbtn bo-tour__smallbtn--md bo-tour__smallbtn--accent" onClick={actions.openAddElevator}>
          {i18n.t(T.elevators.add)}
        </button>
      </div>
      {elevators.map((elevator) => (
        <article key={elevator.key} className="bo-tour__elevator">
          <div className="bo-tour__elevatorhead">
            <div className="bo-tour__elevatoricon">
              <Icon name="properties" style={{ display: 'flex' }} />
            </div>
            <div className="bo-tour__elevatortext">
              <div className="bo-tour__elevatorname">
                <span>{elevator.name}</span>
                <StatusPill variant={elevator.lockVariant} label={elevator.lockLabel} />
                {elevator.stopLabel && <StatusPill variant={elevator.local ? 'info' : 'neutral'} label={elevator.stopLabel} />}
              </div>
              <div className="bo-tour__elevatorsub">
                {elevator.building} · {t(T.elevators.serves, { range: elevator.rangeLabel })} · {elevator.photoCount}
              </div>
            </div>
            <span className="bo-tour__gatedlabel">{i18n.t(T.elevators.gatedLabel)}</span>
            <button
              type="button"
              role="switch"
              aria-checked={elevator.gated}
              aria-label={`${i18n.t(T.elevators.gatedLabel)} · ${elevator.name}`}
              className={`bo-switch bo-switch--control${elevator.gated ? ' bo-switch--on' : ''}`}
              onClick={() => actions.toggleGated(elevator.key)}
            >
              <span className="bo-switch__knob" />
            </button>
            <button
              type="button"
              className="bo-tour__smallbtn bo-tour__smallbtn--md"
              onClick={() => {
                pendingRef.current = elevator.key;
                fileRef.current?.click();
              }}
            >
              {i18n.t(T.elevators.addPhoto)}
            </button>
            <button type="button" className="bo-tour__iconbtn bo-tour__iconbtn--md bo-tour__iconbtn--danger" aria-label={t(T.elevators.delete, { name: elevator.name })} onClick={() => actions.removeElevator(elevator.key)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7h16" />
                <path d="M9 7V5h6v2" />
                <path d="M6 7l1 13h10l1-13" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>
          {(elevator.directionalText || elevator.description || elevator.banks.length > 0) && (
            <div className="bo-tour__elevatormeta">
              {elevator.directionalText && (
                <span>
                  <b>{i18n.t(T.elevators.directional)}</b> {elevator.directionalText}
                </span>
              )}
              {elevator.description && (
                <span>
                  <b>{i18n.t(T.elevators.description)}</b> {elevator.description}
                </span>
              )}
              {elevator.banks.length > 0 && (
                <span>
                  <b>{i18n.t(T.elevators.banks)}</b> {elevator.banks.map((bank) => bank.label).join(' · ')}
                </span>
              )}
            </div>
          )}
          <div className="bo-tour__photos">
            {elevator.photos.map((photo) => (
              <div key={photo.key} className="bo-tour__photo">
                {photo.src ? (
                  <div className="bo-tour__photoimg">
                    <SafeImage className="bo-tour__photofile" src={photo.src} alt={photo.name} fallback={i18n.t(T.elevators.photoUnavailable)} />
                  </div>
                ) : (
                  <div className="bo-tour__photoimg bo-tour__photoimg--missing">{i18n.t(T.elevators.photoUnavailable)}</div>
                )}
                <div className="bo-tour__photobar">
                  <span className="bo-tour__photopos" title={photo.name}>
                    {photo.position}
                    {photo.local ? ` · ${i18n.t(T.elevators.localPhoto)}` : ''}
                  </span>
                  {photo.src && (
                    <a className="bo-tour__iconbtn bo-tour__iconbtn--xs" href={photo.src} target="_blank" rel="noopener noreferrer" aria-label={i18n.t(T.elevators.preview)} title={i18n.t(T.elevators.preview)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1.6 12S5.5 5 12 5s10.4 7 10.4 7-3.9 7-10.4 7S1.6 12 1.6 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </a>
                  )}
                  {!photo.local && (
                    <>
                      <button type="button" className="bo-tour__iconbtn bo-tour__iconbtn--xs" aria-label={i18n.t(T.elevators.moveEarlier)} onClick={() => actions.movePhoto(elevator.key, photo.key, -1)}>
                        ←
                      </button>
                      <button type="button" className="bo-tour__iconbtn bo-tour__iconbtn--xs" aria-label={i18n.t(T.elevators.moveLater)} onClick={() => actions.movePhoto(elevator.key, photo.key, 1)}>
                        →
                      </button>
                    </>
                  )}
                  <button type="button" className="bo-tour__iconbtn bo-tour__iconbtn--xs bo-tour__iconbtn--danger" aria-label={i18n.t(T.elevators.removePhoto)} onClick={() => actions.removePhoto(elevator.key, photo.key)}>
                    ×
                  </button>
                </div>
              </div>
            ))}
            {elevator.photos.length === 0 && <div className="bo-tour__nophotos">{i18n.t(T.elevators.noPhotos)}</div>}
          </div>
        </article>
      ))}
      {elevators.length === 0 && <div className="bo-tour__emptycard">{i18n.t(T.elevators.empty)}</div>}
    </div>
  );
};

const RoutingTab = ({ controller, propId }: { controller: TourSetupController; propId: string }) => {
  const { state, endpoints, startPoints, summary, actions } = controller;
  const tone = state.routeResult?.tone ?? 'muted';
  return (
    <div className="bo-tour__routing" data-testid="tour-routing">
      <section className="bo-tour__card">
        <div className="bo-tour__cardtitle">{i18n.t(T.routing.title)}</div>
        <div className="bo-tour__cardsub">{i18n.t(T.routing.subtitle)}</div>
        <div className="bo-tour__stack">
          <select className="bo-field" value={state.routeFrom} aria-label={i18n.t(T.routing.from)} onChange={(event) => actions.setRouteFrom(event.target.value)}>
            <option value="">{i18n.t(T.routing.fromPick)}</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint.key} value={endpoint.key}>
                {i18n.t(T.routing.from)}: {endpoint.label}
              </option>
            ))}
          </select>
          <select className="bo-field" value={state.routeTo} aria-label={i18n.t(T.routing.to)} onChange={(event) => actions.setRouteTo(event.target.value)}>
            <option value="">{i18n.t(T.routing.toPick)}</option>
            {endpoints.map((endpoint) => (
              <option key={endpoint.key} value={endpoint.key}>
                {i18n.t(T.routing.to)}: {endpoint.label}
              </option>
            ))}
          </select>
          <button type="button" className="bo-tour__compute" onClick={actions.computeRoute} disabled={endpoints.length < 2}>
            {i18n.t(T.routing.compute)}
          </button>
          <div className={`bo-tour__routeresult bo-tour__routeresult--${tone}`} role="status">
            {state.routeResult?.text ?? (endpoints.length < 2 ? i18n.t(T.routing.needTwo) : i18n.t(T.routing.idle))}
          </div>
          <p className="bo-tour__note">
            {t(T.routing.graphNote, { nodes: controller.map.graph.hallways.length, connections: summary.connections })}
          </p>
        </div>
      </section>
      <section className="bo-tour__card">
        <div className="bo-tour__cardhead">
          <div>
            <div className="bo-tour__cardtitle">{i18n.t(M.starts.title)}</div>
            <div className="bo-tour__cardsub">{i18n.t(T.routing.startSubtitle)}</div>
          </div>
          <Link href={mapEditorRoute(propId)} className="bo-tour__smallbtn bo-tour__smallbtn--md">
            {i18n.t(T.routing.openMap)}
          </Link>
        </div>
        {startPoints.rows.map((row) => (
          <div key={row.building} className="bo-map__listrow">
            <div className="bo-map__listtext">
              <div className="bo-map__listtitle">{row.building}</div>
              <div className="bo-map__listsub">{row.name}</div>
            </div>
            <StatusPill variant={row.variant} label={row.state} />
          </div>
        ))}
        {startPoints.missing && <div className="bo-map__warnbox">{i18n.t(M.starts.missing)}</div>}
      </section>
    </div>
  );
};

const TourDialogs = ({ controller }: { controller: TourSetupController }) => {
  const { state, sources, buildings, summary, actions, stops, map, dialogProblem } = controller;
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
        {i18n.t(dialog?.kind === 'addStop' ? T.dialogs.addStop : dialog?.kind === 'addElevator' ? T.dialogs.addElevator : T.dialogs.saveChanges)}
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
        title={i18n.t(dialog?.kind === 'addStop' ? T.dialogs.addStopTitle : dialog?.kind === 'addElevator' ? T.dialogs.addElevatorTitle : T.dialogs.editStopTitle)}
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
        {dialog?.kind === 'addElevator' && (
          <div className="bo-dlg bo-dlg--stacked">
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.bankName)}</span>
              <input className="bo-field" value={dialog.name} placeholder={i18n.t(T.dialogs.bankNamePlaceholder)} onChange={(event) => actions.setDialog({ name: event.target.value })} />
            </label>
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.building)}</span>
              <select className="bo-field" value={dialog.building} onChange={(event) => actions.setDialog({ building: event.target.value })}>
                <option value="">{i18n.t(T.elevators.noBuilding)}</option>
                {buildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </label>
            <div className="bo-dlg__grid bo-dlg__grid--two">
              <label className="bo-dlg__field">
                <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.servesFrom)}</span>
                <input className="bo-field" value={dialog.from} placeholder={i18n.t(T.dialogs.servesFromPlaceholder)} onChange={(event) => actions.setDialog({ from: event.target.value })} />
              </label>
              <label className="bo-dlg__field">
                <span className="bo-dlg__fieldlabel">{i18n.t(T.dialogs.servesTo)}</span>
                <input className="bo-field" value={dialog.to} placeholder={i18n.t(T.dialogs.servesToPlaceholder)} onChange={(event) => actions.setDialog({ to: event.target.value })} />
              </label>
            </div>
            <label className="bo-dlg__field">
              <span className="bo-dlg__fieldlabel">{i18n.t(T.elevators.gatedLabel)}</span>
              <select className="bo-field" value={dialog.gated ? 'yes' : 'no'} onChange={(event) => actions.setDialog({ gated: event.target.value === 'yes' })}>
                <option value="yes">{i18n.t(T.dialogs.yes)}</option>
                <option value="no">{i18n.t(T.dialogs.no)}</option>
              </select>
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
          <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closePublish}>
            {i18n.t(T.dialogs.close)}
          </button>
        }
      >
        <p className="bo-map__dialogtext">
          {t(T.publish.body, {
            stops: t(summary.stops === 1 ? T.header.stopOne : T.header.stopMany, { count: summary.stops }),
            elevators: summary.elevators,
            property: map.inventory.property.name
          })}
        </p>
        <div className="bo-map__warnbox">{i18n.t(T.publish.unavailable)}</div>
      </Modal>
    </>
  );
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
