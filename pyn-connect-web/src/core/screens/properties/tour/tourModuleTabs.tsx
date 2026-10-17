'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { propLiveChatRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import type { TourSetupController } from '~/core/hooks/useTourSetup';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import type { TourOverviewController } from '~/core/hooks/tour/useTourOverview';
import { i18n } from '~/resources/i18n';
import { B, BOOKING_SECTIONS, type BookingSection } from '~/core/utils/generator/tour/tourBooking.generator';
import { generateTourAttention, generateTourChecklist, generateTourKpis, generateTourSettingsGroups, type TourSettingsGroup } from '~/core/utils/generator/tour/tourModule.generator';
import type { StopCard } from '~/core/utils/generator/tour/tourSetup.generator';
import { generateStopItems } from '~/core/utils/generator/tour/tourStops.generator';
import { generateOnSite } from '~/core/utils/generator/tour/tourVisitors.generator';
import { BookingSectionView } from './BookingPanels';

const C = CORE_STRINGS.tours;
const O = CORE_STRINGS.tourModules.overview;
const TM = CORE_STRINGS.tourModules;

interface OverviewProps {
  controller: TourSetupController;
  propId: string;
  /** The map screen with the stop selected or armed (the screen's `mapHref`). */
  mapHref: (card: StopCard) => string;
  overview: TourOverviewController;
  onOpenStop: (key: string) => void;
}

/** Overview: the setup checklist, six KPIs, the stops needing attention and who is touring right now. */
export const OverviewTab = ({ controller, propId, mapHref, overview, onOpenStop }: OverviewProps) => {
  const { stops, elevators, startPoints, summary, actions, state } = controller;
  const items = useMemo(() => generateStopItems(stops, state, overview.stops), [stops, state, overview.stops]);
  const checklist = useMemo(
    () => generateTourChecklist({ propId, stops, elevators, startPointsMissing: startPoints.missing, locks: overview.locks, items }),
    [propId, stops, elevators, startPoints.missing, overview.locks, items]
  );
  const kpis = useMemo(() => generateTourKpis(summary, items, overview.visitors, overview.stops != null), [summary, items, overview.visitors, overview.stops]);
  const attention = useMemo(() => generateTourAttention(items), [items]);
  const onSite = useMemo(() => (overview.visitors ? generateOnSite(overview.visitors) : []), [overview.visitors]);

  const cta = (step: (typeof checklist.steps)[number]) => {
    if (!step.cta) return null;
    if (step.cta.href) {
      return (
        <Link href={step.cta.href} className="bo-tm__stepcta">
          {step.cta.label}
        </Link>
      );
    }
    const onClick = step.cta.tab ? () => actions.setTab(step.cta!.tab!) : step.cta.action === 'addStop' ? actions.openAddStop : actions.openPublish;
    return (
      <button type="button" className="bo-tm__stepcta" onClick={onClick}>
        {step.cta.label}
      </button>
    );
  };

  return (
    <div className="bo-tm__overview" data-testid="tour-overview">
      <section className="bo-section bo-tm__checklist">
        <div className="bo-section__head">
          <div className="bo-section__heading">
            <h3 className="bo-section__title">{i18n.t(C.checklist.title)}</h3>
            <p className="bo-section__subtitle">{checklist.progress}</p>
          </div>
          <div className="bo-tm__dots" aria-hidden="true">
            {checklist.steps.map((step) => (
              <span key={step.id} className={`bo-tm__dot${step.done ? ' bo-tm__dot--done' : ''}`} />
            ))}
          </div>
        </div>
        <ol className="bo-tm__steps">
          {checklist.steps.map((step) => (
            <li key={step.id} className={`bo-tm__step${step.done ? ' bo-tm__step--done' : ''}`}>
              <span className="bo-tm__stepnum">{step.done ? '✓' : step.num}</span>
              <div className="bo-tm__steptitle">{step.title}</div>
              <div className="bo-tm__stepstate">{step.state}</div>
              {cta(step)}
            </li>
          ))}
        </ol>
      </section>

      <div className="bo-tm__kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }} data-testid="tour-kpis">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bo-tm__kpi" data-kpi={kpi.id}>
            <span className={`bo-tm__kpivalue bo-tm__kpivalue--${kpi.tone}`}>{kpi.value}</span>
            <span className="bo-tm__kpilabel">{kpi.label}</span>
          </div>
        ))}
      </div>
      {overview.failed && <div className="bo-tx__note">{i18n.t(O.failed)}</div>}

      <div className="bo-tm__grid">
        <section className="bo-section" data-testid="tour-attention">
          <div className="bo-section__head">
            <div className="bo-section__heading">
              <h3 className="bo-section__title">{i18n.t(O.attention)}</h3>
              <p className="bo-section__subtitle">{i18n.t(O.attentionSub)}</p>
            </div>
          </div>
          {!overview.stops && overview.loading ? (
            <p className="bo-tm__empty">{i18n.t(O.loading)}</p>
          ) : attention.length === 0 ? (
            <p className="bo-tm__empty">{i18n.t(O.attentionEmpty)}</p>
          ) : (
            <ul className="bo-tm__attention">
              {attention.map((item) => (
                <li key={item.key} className="bo-tm__attentionrow">
                  <span className="bo-ts__num" style={{ background: item.color }}>
                    {item.num}
                  </span>
                  <div className="bo-tm__attentiontext">
                    <div className="bo-tm__attentionname">{item.name}</div>
                    <div className="bo-tm__attentionsub">
                      {item.kindLabel} · {item.sub}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                      {item.issues.map((issue) => (
                        <span key={issue.key} className="bo-ts__issue">
                          {issue.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  {item.issues.some((issue) => issue.key === 'no_pin') ? (
                    <Link href={mapHref(item.card)} className="bo-tour__smallbtn bo-tour__smallbtn--md">
                      {i18n.t(C.attention.cta)}
                    </Link>
                  ) : (
                    <button type="button" className="bo-tour__smallbtn bo-tour__smallbtn--md" onClick={() => onOpenStop(item.key)}>
                      {i18n.t(O.openStop)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bo-section" data-testid="tour-live">
          <div className="bo-section__head">
            <div className="bo-section__heading">
              <h3 className="bo-section__title">{i18n.t(O.liveTitle)}</h3>
              <p className="bo-section__subtitle">{i18n.t(O.liveSub)}</p>
            </div>
            <button type="button" className="bo-tour__smallbtn bo-tour__smallbtn--md" onClick={() => actions.setTab('visitors')}>
              {i18n.t(O.openVisitors)}
            </button>
          </div>
          {!overview.visitors && overview.loading ? (
            <p className="bo-tm__empty">{i18n.t(O.loading)}</p>
          ) : onSite.length === 0 ? (
            <p className="bo-tm__empty">{i18n.t(O.liveEmpty)}</p>
          ) : (
            <ul className="bo-tm__attention">
              {onSite.map((row) => (
                <li key={row.id} className="bo-tm__attentionrow">
                  <span className="bo-tx__avatar">{row.initials}</span>
                  <div className="bo-tm__attentiontext">
                    <div className="bo-tm__attentionname">{row.name}</div>
                    <div className="bo-tm__attentionsub">{row.sub}</div>
                  </div>
                  <span className={`bo-tx__name${row.lengthy ? ' bo-tx__warn' : ''}`}>{row.elapsed}</span>
                  {row.lengthy && <StatusPill variant="warn" label={i18n.t(TM.visitors.lengthy)} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
};

/** Live Chat: the conversations live on the property's Live Chat page. */
export const ChatTab = ({ propId }: { propId: string }) => (
  <section className="bo-section bo-tm__chat" data-testid="tour-chat">
    <span className="bo-section__icon" aria-hidden="true">
      <Icon name="chat" />
    </span>
    <div className="bo-section__heading">
      <h3 className="bo-section__title">{i18n.t(C.chat.title)}</h3>
      <p className="bo-section__subtitle">{i18n.t(C.chat.body)}</p>
    </div>
    <Link href={propLiveChatRoute(propId)} className="bo-primarybutton bo-tm__chatbtn">
      {i18n.t(C.chat.open)}
    </Link>
  </section>
);

type SettingsKey = BookingSection | TourSettingsGroup['id'];

interface RailItem {
  id: SettingsKey;
  group: string;
  title: string;
  sub: string;
}

/**
 * Settings: the design's rail. Scheduling (tour types & slots, visiting
 * hours) and Booking & CRM (booking form, booking link, CRM & sync) are the
 * real booking settings; Route & navigation shows the stored flags; the
 * remaining groups are not in Connect yet.
 */
export const SettingsTab = ({ controller, booking, propertyName, initialSection }: { controller: TourSetupController; booking: TourBookingController; propertyName: string; initialSection?: SettingsKey }) => {
  const S = C.settings;
  const groups = useMemo(() => generateTourSettingsGroups(controller.map), [controller.map]);
  const items = useMemo((): RailItem[] => {
    const sections = BOOKING_SECTIONS.map((section) => ({
      id: section.id,
      group: i18n.t(section.group === 'scheduling' ? B.rail.scheduling : B.rail.booking),
      title: i18n.t(B.pills[section.id]),
      sub: i18n.t(B.intro[section.id])
    }));
    const rest = groups.map((group) => ({ id: group.id, group: i18n.t(group.source === 'real' ? TM.settings.navigation : TM.settings.other), title: group.title, sub: group.sub }));
    return [...sections, ...rest];
  }, [groups]);
  const [active, setActive] = useState<SettingsKey>(initialSection ?? 'rules');
  const current = items.find((item) => item.id === active) ?? items[0];
  const group = groups.find((row) => row.id === active) ?? null;
  const isBooking = BOOKING_SECTIONS.some((section) => section.id === active);
  let lastGroup = '';

  return (
    <div className="bo-tm__settings" data-testid="tour-settings">
      <nav className="bo-tm__rail" aria-label={i18n.t(S.title)}>
        {items.map((item) => {
          const heading = item.group !== lastGroup ? item.group : null;
          lastGroup = item.group;
          return (
            <div key={item.id}>
              {heading && <div className="bo-tx__statlabel" style={{ padding: '10px 12px 4px' }}>{heading}</div>}
              <button type="button" aria-current={item.id === current.id ? 'true' : undefined} className={`bo-tm__railitem${item.id === current.id ? ' bo-tm__railitem--on' : ''}`} onClick={() => setActive(item.id)} data-testid={`settings-${item.id}`}>
                <span className="bo-tm__raillabel">{item.title}</span>
                <span className="bo-tm__railsub">{item.sub}</span>
              </button>
            </div>
          );
        })}
      </nav>
      <section className="bo-section bo-tm__setcontent">
        <div className="bo-section__head">
          <div className="bo-section__heading">
            <h3 className="bo-section__title">{current.title}</h3>
            <p className="bo-section__subtitle">{current.sub}</p>
          </div>
        </div>
        {isBooking && <BookingSectionView c={booking} section={active as BookingSection} propertyName={propertyName} />}
        {group?.source === 'real' && (
          <>
            <p className="bo-map__readonly" role="note">
              {i18n.t(S.readOnly)}
            </p>
            <div className="bo-configgroup">
              {group.rows.map((row) => (
                <div key={row.label} className="bo-configrow">
                  <span className="bo-configrow__label">{row.label}</span>
                  {row.kind === 'toggle' ? (
                    <Switch on={row.on} label={`${row.label}: ${i18n.t(row.on ? CORE_STRINGS.propertyDetail.products.enabled : CORE_STRINGS.propertyDetail.products.notEnabled)}`} />
                  ) : (
                    <span className="bo-configrow__value">{row.value}</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
        {group?.source === 'unavailable' && <p className="bo-tm__empty">{i18n.t(S.unavailable)}</p>}
      </section>
    </div>
  );
};
