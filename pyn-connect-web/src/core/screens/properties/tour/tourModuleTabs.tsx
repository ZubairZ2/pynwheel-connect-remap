'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

import { propLiveChatRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import type { TourSetupController } from '~/core/hooks/useTourSetup';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import type { TourOverviewController } from '~/core/hooks/tour/useTourOverview';
import { i18n } from '~/resources/i18n';
import { B, BOOKING_GROUPS, groupOfSection, isBookingSection, type BookingGroup, type BookingSection } from '~/core/utils/generator/tour/tourBooking.generator';
import { generateTourAttention, generateTourChecklist, generateTourKpis, generateTourSettingsGroups, tourSettingsGroupOf, type SettingsSection, type TourSettingsGroupId } from '~/core/utils/generator/tour/tourModule.generator';
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
  const { stops, startPoints, summary, actions, state, publication } = controller;
  const items = useMemo(() => generateStopItems(stops, state, overview.stops), [stops, state, overview.stops]);
  const checklist = useMemo(
    () => generateTourChecklist({ propId, stops, gatedElevators: summary.gatedElevators, startPointsMissing: startPoints.missing, locks: overview.locks, items, publication }),
    [propId, stops, summary.gatedElevators, startPoints.missing, overview.locks, items, publication]
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

type SettingsKey = BookingGroup | TourSettingsGroupId;
const groupOfSettingsSection = (section: SettingsSection): SettingsKey => (isBookingSection(section) ? groupOfSection(section) : tourSettingsGroupOf(section));

interface RailItem {
  id: SettingsKey;
  title: string;
  sub: string;
  sections: SettingsSection[];
}

/**
 * Settings: the design's rail (`SET_GROUPS`, Oct 27 2026): Scheduling (tour
 * types & slots, visiting hours) and Booking & CRM (booking form, booking
 * link, CRM & sync) are the real booking settings; Access & security, Tour
 * experience (where Route & navigation shows the stored flags) and Messages
 * list the design's sections, which Connect has no page for yet. Each group
 * has pills for its sections and `?section=` in the URL.
 */
export const SettingsTab = ({ controller, booking, propertyId, propertyName, initialSection }: { controller: TourSetupController; booking: TourBookingController; propertyId: number; propertyName: string; initialSection?: SettingsSection }) => {
  const S = C.settings;
  const router = useRouter();
  const pathname = usePathname();
  const groups = useMemo(() => generateTourSettingsGroups(controller.map), [controller.map]);
  const items = useMemo((): RailItem[] => {
    const bookingItems: RailItem[] = BOOKING_GROUPS.map((group) => ({
      id: group.id,
      title: i18n.t(group.id === 'scheduling' ? B.rail.scheduling : B.rail.booking),
      sub: i18n.t(group.id === 'scheduling' ? B.rail.schedulingSub : B.rail.bookingSub),
      sections: group.sections
    }));
    const rest: RailItem[] = groups.map((group) => ({ id: group.id, title: group.title, sub: group.sub, sections: group.sections.map((row) => row.id) }));
    return [...bookingItems, ...rest];
  }, [groups]);
  const [section, setSectionState] = useState<SettingsSection>(initialSection ?? 'rules');
  const [groupId, setGroupId] = useState<SettingsKey>(initialSection ? groupOfSettingsSection(initialSection) : 'scheduling');
  const current = items.find((item) => item.id === groupId) ?? items[0];
  const other = groups.flatMap((group) => group.sections).find((row) => row.id === section) ?? null;
  const pillLabel = (id: SettingsSection): string => (isBookingSection(id) ? i18n.t(B.pills[id]) : (groups.flatMap((group) => group.sections).find((row) => row.id === id)?.title ?? id));

  const syncUrl = useCallback(
    (next: SettingsSection) => {
      const params = new URLSearchParams();
      params.set('tab', 'settings');
      params.set('section', next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router]
  );
  const openSection = useCallback(
    (next: SettingsSection) => {
      setGroupId(groupOfSettingsSection(next));
      setSectionState(next);
      syncUrl(next);
    },
    [syncUrl]
  );
  const openGroup = (item: RailItem) => {
    const next = item.sections[0];
    setGroupId(item.id);
    setSectionState(next);
    syncUrl(next);
  };

  return (
    <div className="bo-tm__settings" data-testid="tour-settings">
      <nav className="bo-tm__rail" aria-label={i18n.t(S.title)}>
        {items.map((item) => (
          <button key={item.id} type="button" aria-current={item.id === current.id ? 'true' : undefined} className={`bo-tm__railitem${item.id === current.id ? ' bo-tm__railitem--on' : ''}`} onClick={() => openGroup(item)} data-testid={`settings-group-${item.id}`}>
            <span className="bo-tm__raillabel">{item.title}</span>
            <span className="bo-tm__railsub">{item.sub}</span>
          </button>
        ))}
      </nav>
      <section className="bo-section bo-tm__setcontent">
        <div className="bo-section__head">
          <div className="bo-section__heading">
            <h3 className="bo-section__title">{current.title}</h3>
            <p className="bo-section__subtitle">{current.sub}</p>
          </div>
        </div>
        <div className="bo-tm__pills" role="tablist" aria-label={current.title}>
          {current.sections.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === section} aria-current={id === section ? 'true' : undefined} className={`bo-tm__pill${id === section ? ' bo-tm__pill--on' : ''}`} onClick={() => openSection(id)} data-testid={`settings-${id}`}>
              {pillLabel(id)}
            </button>
          ))}
        </div>
        {isBookingSection(section) && (
          <>
            <p className="bo-tx__intro">{i18n.t(B.intro[section])}</p>
            <BookingSectionView c={booking} section={section} propertyId={propertyId} propertyName={propertyName} onNavigate={openSection} />
          </>
        )}
        {other && (
          <div data-testid={`settings-section-${other.id}`}>
            <p className="bo-tx__intro">{other.intro}</p>
            {other.source === 'real' ? (
              <>
                <p className="bo-map__readonly" role="note">
                  {i18n.t(S.readOnly)}
                </p>
                <div className="bo-configgroup">
                  {other.rows.map((row) => (
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
            ) : (
              <p className="bo-tm__empty">{i18n.t(S.unavailable)}</p>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
