'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { propLiveChatRoute } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill as DemoStatusPill } from '~/core/components/atoms/connect/StatusPill';
import { DemoMark } from '~/core/components/atoms/DemoMark';
import { Switch } from '~/core/components/atoms/Switch';
import type { TourSetupController } from '~/core/hooks/useTourSetup';
import { i18n } from '~/resources/i18n';
import {
  generateDemoVisitorRows,
  generateTourAttention,
  generateTourChecklist,
  generateTourKpis,
  generateTourSettingsGroups
} from '~/core/utils/generator/tour/tourModule.generator';
import type { StopCard } from '~/core/utils/generator/tour/tourSetup.generator';

const C = CORE_STRINGS.tours;

interface TabProps {
  controller: TourSetupController;
  propId: string;
  /** The map screen with the stop selected or armed (the screen's `mapHref`). */
  mapHref: (card: StopCard) => string;
}

/** Overview: the setup checklist, four KPIs, the stops needing attention and the (unavailable) live visitors. */
export const OverviewTab = ({ controller, propId, mapHref }: TabProps) => {
  const { stops, elevators, startPoints, summary, actions } = controller;
  const checklist = useMemo(
    () => generateTourChecklist({ propId, stops, elevators, startPointsMissing: startPoints.missing }),
    [propId, stops, elevators, startPoints.missing]
  );
  const kpis = useMemo(() => generateTourKpis(summary, stops, elevators), [summary, stops, elevators]);
  const attention = useMemo(() => generateTourAttention(stops), [stops]);

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

      <div className="bo-tm__kpis">
        {kpis.map((kpi) => (
          <div key={kpi.id} className="bo-tm__kpi">
            <span className={`bo-tm__kpivalue bo-tm__kpivalue--${kpi.tone}`}>{kpi.value}</span>
            <span className="bo-tm__kpilabel">{kpi.label}</span>
          </div>
        ))}
      </div>

      <div className="bo-tm__grid">
        <section className="bo-section">
          <div className="bo-section__head">
            <div className="bo-section__heading">
              <h3 className="bo-section__title">{i18n.t(C.attention.title)}</h3>
              <p className="bo-section__subtitle">{i18n.t(C.attention.subtitle)}</p>
            </div>
          </div>
          {attention.length === 0 ? (
            <p className="bo-tm__empty">{i18n.t(C.attention.empty)}</p>
          ) : (
            <ul className="bo-tm__attention">
              {attention.map((stop) => (
                <li key={stop.key} className="bo-tm__attentionrow">
                  <DemoStatusPill variant="warn" label={i18n.t(C.attention.notPlotted)} />
                  <div className="bo-tm__attentiontext">
                    <div className="bo-tm__attentionname">{stop.name}</div>
                    <div className="bo-tm__attentionsub">
                      {stop.kindLabel} · {stop.whereLabel}
                    </div>
                  </div>
                  <Link href={mapHref(stop)} className="bo-tour__smallbtn bo-tour__smallbtn--md">
                    {i18n.t(C.attention.cta)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="bo-section">
          <div className="bo-section__head">
            <div className="bo-section__heading">
              <h3 className="bo-section__title">{i18n.t(C.live.title)}</h3>
              <p className="bo-section__subtitle">{i18n.t(C.live.subtitle)}</p>
            </div>
          </div>
          <p className="bo-tm__empty">{i18n.t(C.live.unavailable)}</p>
        </section>
      </div>
    </div>
  );
};

/** Visitors: the demo bookings, marked as such. The CMS does not expose bookings to Connect yet. */
export const VisitorsTab = () => {
  const rows = useMemo(() => generateDemoVisitorRows(), []);
  return (
    <section className="bo-section bo-tm__visitors" data-testid="tour-visitors">
      <div className="bo-section__head">
        <div className="bo-section__heading">
          <h3 className="bo-section__title">
            {i18n.t(C.visitors.title)}
            <DemoMark />
          </h3>
          <p className="bo-section__subtitle">{i18n.t(C.visitors.subtitle)}</p>
        </div>
      </div>
      <div className="bo-panel__scroll">
        <table className="bo-tm__table">
          <thead>
            <tr>
              <th>{i18n.t(C.visitors.when)}</th>
              <th>{i18n.t(C.visitors.visitor)}</th>
              <th>{i18n.t(C.visitors.type)}</th>
              <th>{i18n.t(C.visitors.status)}</th>
              <th>{i18n.t(C.visitors.crm)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.when}</td>
                <td>
                  <div className="bo-tm__visitorname">
                    {row.visitor}
                    <DemoMark />
                  </div>
                  <div className="bo-tm__visitorsub">{row.email}</div>
                </td>
                <td>{row.type}</td>
                <td>
                  <DemoStatusPill variant={row.statusVariant} label={row.status} />
                </td>
                <td>{row.crm}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="bo-tm__empty">
                  {i18n.t(C.visitors.empty)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
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

/** Settings: the design's rail of groups; the route group is real, scheduling is demo, the rest are not in Connect yet. */
export const SettingsTab = ({ controller }: { controller: TourSetupController }) => {
  const groups = useMemo(() => generateTourSettingsGroups(controller.map), [controller.map]);
  const [activeId, setActiveId] = useState(groups[0].id);
  const active = groups.find((group) => group.id === activeId) ?? groups[0];
  const S = C.settings;

  return (
    <div className="bo-tm__settings" data-testid="tour-settings">
      <nav className="bo-tm__rail" aria-label={i18n.t(S.title)}>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            aria-current={group.id === active.id ? 'true' : undefined}
            className={`bo-tm__railitem${group.id === active.id ? ' bo-tm__railitem--on' : ''}`}
            onClick={() => setActiveId(group.id)}
          >
            <span className="bo-tm__raillabel">
              {group.title}
              {group.source === 'demo' && <DemoMark />}
            </span>
            <span className="bo-tm__railsub">{group.sub}</span>
          </button>
        ))}
      </nav>
      <section className="bo-section bo-tm__setcontent">
        <div className="bo-section__head">
          <div className="bo-section__heading">
            <h3 className="bo-section__title">
              {active.title}
              {active.source === 'demo' && <DemoMark />}
            </h3>
            <p className="bo-section__subtitle">{active.sub}</p>
          </div>
        </div>
        {active.source === 'real' && (
          <>
            <p className="bo-map__readonly" role="note">
              {i18n.t(S.readOnly)}
            </p>
            <div className="bo-configgroup">
              {active.rows.map((row) => (
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
        {active.source === 'demo' && (
          <>
            <div className="bo-offnote">{i18n.t(S.demoNote)}</div>
            <div className="bo-tm__setgrid">
              <div>
                <h4 className="bo-configgroup__title">{i18n.t(S.hours)}</h4>
                <ul className="bo-tm__hours">
                  {active.hours.map((hour) => (
                    <li key={hour.day} className="bo-tm__hour">
                      <span className="bo-tm__hourday">{hour.day}</span>
                      <span className="bo-tm__hourlabel">{hour.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="bo-configgroup__title">{i18n.t(S.tourTypes)}</h4>
                <ul className="bo-tm__types">
                  {active.tourTypes.map((type) => (
                    <li key={type.id} className="bo-tm__type">
                      <div className="bo-tm__typetext">
                        <div className="bo-tm__typename">{type.label}</div>
                        <div className="bo-tm__typesub">
                          {type.note} · {type.caps}
                        </div>
                      </div>
                      <Switch on={type.on} label={`${type.label}: ${type.on ? 'on' : 'off'}`} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}
        {active.source === 'unavailable' && <p className="bo-tm__empty">{i18n.t(S.unavailable)}</p>}
      </section>
    </div>
  );
};
