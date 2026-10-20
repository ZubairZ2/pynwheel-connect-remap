'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { Modal } from '~/core/components/molecules/Modal';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import type { HoursLane } from '~/core/models/data/tourModules.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import {
  B,
  BOUNDS,
  BUFFERS,
  BUTTON_ICONS,
  DAYS,
  HORIZONS,
  HOUR_TICKS,
  ICON_PATHS,
  INTERVALS,
  LANES,
  NOTICES,
  buttonStyle,
  closureLabel,
  daysLabel,
  fontOptions,
  hoursBars,
  hoursDraftOf,
  hoursLabel,
  minutesLabel,
  openDaysCount,
  type BookingSection,
  type FormPart,
  type RulesCard
} from '~/core/utils/generator/tour/tourBooking.generator';
import { AvailabilityHeader } from './AvailabilityHeader';
import { CrmSyncDemoPanel } from './CrmSyncDemoPanel';

const X = CORE_STRINGS.tourModules.common;

export interface BookingPanelProps {
  c: TourBookingController;
  propertyId: number;
  propertyName: string;
  onNavigate: (section: BookingSection) => void;
}

/** One of the Settings tab's scheduling / booking sections, on the booking settings the CMS stores. */
export const BookingSectionView = ({ section, ...props }: BookingPanelProps & { section: BookingSection }) => {
  const { c } = props;
  if (c.error) {
    return (
      <div className="bo-error" role="alert">
        {c.error}{' '}
        <button type="button" className="bo-tx__btn" onClick={() => void c.reload()}>
          {i18n.t(X.retry)}
        </button>
      </div>
    );
  }
  if (!c.settings || !c.rules || !c.hours || !c.form || !c.closures) return <div className="bo-tx__empty">{i18n.t(X.loading)}</div>;
  switch (section) {
    case 'rules':
      return <RulesPanel {...props} />;
    case 'hours':
      return <HoursPanel {...props} />;
    case 'form':
      return <FormPanel {...props} />;
    case 'link':
      return <LinkPanel {...props} />;
    default:
      return (
        <div className="bo-tx">
          <AvailabilityHeader c={c} propId={String(props.propertyId)} onNavigate={props.onNavigate} />
          <CrmSyncDemoPanel c={c} propertyId={props.propertyId} onNavigate={props.onNavigate} />
        </div>
      );
  }
};

/* ── shared pieces ──────────────────────────────────────────────────── */

const Card = ({ title, sub, right, children, testId, tag }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; testId?: string; tag?: string }) => (
  <div className="bo-tx__card" data-testid={testId}>
    <div className="bo-tx__cardhead">
      <div className="bo-tx__grow">
        <div className="bo-tx__cardtitle">
          {title}
          {tag && <span className="bo-tx__tag--new">{tag}</span>}
        </div>
        {sub && <div className="bo-tx__cardsub">{sub}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

/** A settings row; `allowed` appends the design's "Allowed a–b." to the description. */
const Row = ({ label, sub, indent, tag, allowed, children }: { label: ReactNode; sub?: ReactNode; indent?: boolean; tag?: string; allowed?: readonly [number, number]; children?: ReactNode }) => {
  const hint = allowed ? t(B.header.allowed, { a: allowed[0], b: allowed[1] }) : null;
  return (
    <div className={`bo-tx__setrow${indent ? ' bo-tx__setrow--indent' : ''}`}>
      <div className="bo-tx__grow">
        <div className="bo-tx__setlabel">
          {label}
          {tag && <span className="bo-tx__tag--new">{tag}</span>}
        </div>
        {(sub || hint) && (
          <div className="bo-tx__setdesc">
            {sub}
            {sub && hint ? ' ' : ''}
            {hint}
          </div>
        )}
      </div>
      {children}
    </div>
  );
};

/** The design's number stepper: − · value · + · unit, clamped to `bounds`. */
const Stepper = ({ value, bounds, unit, onChange, disabled, label }: { value: string; bounds: readonly [number, number]; unit?: string; onChange: (value: string) => void; disabled?: boolean; label: string }) => {
  const [min, max] = bounds;
  const n = /^\d+$/.test(value.trim()) ? Number(value.trim()) : null;
  const step = (delta: number) => onChange(String(Math.min(max, Math.max(min, (n ?? (delta > 0 ? min - 1 : max + 1)) + delta))));
  return (
    <span className="bo-tx__num">
      <button type="button" className="bo-tx__step" aria-label={`${i18n.t(B.header.decrement)} ${label}`} disabled={disabled || (n != null && n <= min)} onClick={() => step(-1)}>
        −
      </button>
      <input className="bo-tx__numinput" inputMode="numeric" aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))} />
      <button type="button" className="bo-tx__step" aria-label={`${i18n.t(B.header.increment)} ${label}`} disabled={disabled || (n != null && n >= max)} onClick={() => step(1)}>
        +
      </button>
      {unit && <span className="bo-tx__unit">{unit}</span>}
    </span>
  );
};

/** The design's card head controls: status text, Discard while dirty, Save. */
const CardSave = ({ dirty, saving, problems, onSave, onDiscard, testId, label }: { dirty: boolean; saving: boolean; problems: string[]; onSave: () => void; onDiscard: () => void; testId: string; label?: string }) => {
  const status = problems.length ? { text: i18n.t(B.hours.status.errors), cls: 'bo-tx__cardstatus--bad' } : dirty ? { text: i18n.t(B.hours.status.dirty), cls: 'bo-tx__cardstatus--dirty' } : { text: i18n.t(B.hours.status.saved), cls: '' };
  return (
    <div className="bo-tx__cardsave">
      <span className={`bo-tx__cardstatus ${status.cls}`}>{status.text}</span>
      {dirty && (
        <button type="button" className="bo-tx__btn bo-tx__btn--md" disabled={saving} onClick={onDiscard}>
          {i18n.t(X.discard)}
        </button>
      )}
      <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" disabled={!dirty || saving || problems.length > 0} onClick={onSave} data-testid={testId}>
        {saving ? i18n.t(X.saving) : (label ?? i18n.t(X.save))}
      </button>
    </div>
  );
};

const Seg = <V extends string | number>({ value, options, onChange, disabled, label }: { value: V; options: { value: V; label: string }[]; onChange: (value: V) => void; disabled?: boolean; label: string }) => (
  <div className="bo-tx__seg bo-tx__seg--sm" role="group" aria-label={label}>
    {options.map((option) => (
      <button key={String(option.value)} type="button" className={`bo-tx__segbtn${option.value === value ? ' bo-tx__segbtn--on' : ''}`} aria-pressed={option.value === value} disabled={disabled} onClick={() => onChange(option.value)}>
        {option.label}
      </button>
    ))}
  </div>
);

const NEW = () => i18n.t(B.header.tagNew);

/* ── rules ─────────────────────────────────────────────────────────── */

const RulesPanel = ({ c, propertyId, onNavigate }: BookingPanelProps) => {
  const s = c.settings!;
  const r = c.rules!;
  const ro = !c.canEdit;
  const toggle = (key: 'allowSelfTour' | 'allowGuidedTour' | 'doLimitMaxTour' | 'onlyScheduledTour') => (ro ? undefined : () => c.setRules({ [key]: !r[key] }));
  const head = (card: RulesCard) =>
    ro ? undefined : <CardSave dirty={c.rulesDirtyFor(card)} saving={c.saving === 'rules'} problems={Object.values(c.ruleProblemsFor(card))} onSave={() => void c.saveRules(card)} onDiscard={() => c.discardRules(card)} testId={`rules-save-${card}`} />;
  return (
    <div className="bo-tx" data-testid="booking-rules">
      <AvailabilityHeader c={c} propId={String(propertyId)} onNavigate={onNavigate} />
      {ro && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}

      <Card title={i18n.t(B.types.title)} sub={i18n.t(B.types.sub)} testId="rules-types" right={head('types')}>
        <Row label={i18n.t(B.types.self)} sub={i18n.t(B.types.selfSub)}>
          <Switch on={r.allowSelfTour} label={i18n.t(B.types.self)} onToggle={toggle('allowSelfTour')} />
        </Row>
        <Row label={i18n.t(B.types.guided)} sub={i18n.t(B.types.guidedSub)}>
          <Switch on={r.allowGuidedTour} label={i18n.t(B.types.guided)} onToggle={toggle('allowGuidedTour')} />
        </Row>
        {!r.allowSelfTour && !r.allowGuidedTour && (
          <div className="bo-tx__bad" style={{ margin: '0 20px 14px' }}>
            {i18n.t(B.types.banner)}
          </div>
        )}
      </Card>

      <Card title={i18n.t(B.slots.title)} sub={i18n.t(B.slots.sub)} testId="rules-slots" right={head('slots')}>
        <Row label={i18n.t(B.slots.interval)} sub={i18n.t(B.slots.intervalSub)}>
          <Seg value={r.slotIntervalMinutes} label={i18n.t(B.slots.interval)} disabled={ro} options={INTERVALS.map((minutes) => ({ value: minutes, label: minutesLabel(minutes) }))} onChange={(slotIntervalMinutes) => c.setRules({ slotIntervalMinutes })} />
        </Row>
        <Row label={i18n.t(B.slots.buffer)} sub={i18n.t(B.slots.bufferSub)} tag={NEW()}>
          <Seg value={r.bufferMinutes} label={i18n.t(B.slots.buffer)} disabled={ro} options={BUFFERS.map((minutes) => ({ value: minutes, label: minutesLabel(minutes) }))} onChange={(bufferMinutes) => c.setRules({ bufferMinutes })} />
        </Row>
        <Row label={i18n.t(B.slots.notice)} sub={i18n.t(B.slots.noticeSub)} tag={NEW()}>
          <select className="bo-tx__select" aria-label={i18n.t(B.slots.notice)} value={r.minimumNoticeMinutes} disabled={ro} onChange={(event) => c.setRules({ minimumNoticeMinutes: Number(event.target.value) })} data-testid="rules-notice">
            {NOTICES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutesLabel(minutes)}
              </option>
            ))}
          </select>
        </Row>
        <Row label={i18n.t(B.slots.horizon)} sub={i18n.t(B.slots.horizonSub)} tag={NEW()}>
          <select className="bo-tx__select" aria-label={i18n.t(B.slots.horizon)} value={r.bookingHorizonDays} disabled={ro} onChange={(event) => c.setRules({ bookingHorizonDays: Number(event.target.value) })} data-testid="rules-horizon">
            {HORIZONS.map((days) => (
              <option key={days} value={days}>
                {daysLabel(days)}
              </option>
            ))}
          </select>
        </Row>
        <div className="bo-tx__meta" style={{ padding: '0 20px 12px' }}>
          {i18n.t(B.slots.unavailable)}
        </div>
      </Card>

      <Card title={i18n.t(B.cap.title)} sub={i18n.t(B.cap.sub)} testId="rules-capacity" right={head('capacity')}>
        <Row label={i18n.t(B.cap.on)} sub={i18n.t(B.cap.onSub)}>
          <Switch on={r.doLimitMaxTour} label={i18n.t(B.cap.on)} onToggle={toggle('doLimitMaxTour')} />
        </Row>
        {r.doLimitMaxTour && (
          <>
            <Row label={i18n.t(B.cap.self)} allowed={BOUNDS.capacity} indent>
              <Stepper value={r.maxSelf} bounds={BOUNDS.capacity} unit={i18n.t(B.cap.unit)} disabled={ro} label={i18n.t(B.cap.self)} onChange={(value) => c.setRules({ maxSelf: value })} />
            </Row>
            <Row label={i18n.t(B.cap.guided)} allowed={BOUNDS.capacity} indent>
              <Stepper value={r.maxGuided} bounds={BOUNDS.capacity} unit={i18n.t(B.cap.unit)} disabled={ro} label={i18n.t(B.cap.guided)} onChange={(value) => c.setRules({ maxGuided: value })} />
            </Row>
          </>
        )}
      </Card>

      <Card title={i18n.t(B.behaviour.title)} sub={i18n.t(B.behaviour.sub)} testId="rules-behaviour" right={head('behaviour')}>
        <Row label={i18n.t(B.behaviour.schedOnly)} sub={i18n.t(B.behaviour.schedOnlySub)}>
          <Switch on={r.onlyScheduledTour} label={i18n.t(B.behaviour.schedOnly)} onToggle={toggle('onlyScheduledTour')} />
        </Row>
        <Row label={i18n.t(B.behaviour.grace)} sub={i18n.t(B.behaviour.graceSub)} allowed={BOUNDS.grace} indent>
          <Stepper value={r.gracePeriod} bounds={BOUNDS.grace} unit={i18n.t(B.behaviour.minutes)} disabled={ro} label={i18n.t(B.behaviour.grace)} onChange={(value) => c.setRules({ gracePeriod: value })} />
        </Row>
        <Row label={i18n.t(B.behaviour.stay)} sub={i18n.t(B.behaviour.staySub)} allowed={BOUNDS.stay}>
          <Stepper value={r.lengthStayLimit} bounds={BOUNDS.stay} unit={i18n.t(B.behaviour.minutes)} disabled={ro} label={i18n.t(B.behaviour.stay)} onChange={(value) => c.setRules({ lengthStayLimit: value })} />
        </Row>
        <Row label={i18n.t(B.behaviour.onePerPerson)} sub={i18n.t(B.behaviour.onePerPersonSub)}>
          <StatusPill variant="neutral" label={i18n.t(B.behaviour.builtIn)} />
        </Row>
        <Row label={i18n.t(B.behaviour.tz)} sub={i18n.t(B.behaviour.tzSub)}>
          <span className="bo-tx__name">{s.timeZone ?? i18n.t(B.behaviour.tzUnset)}</span>
        </Row>
      </Card>
    </div>
  );
};

/* ── hours ─────────────────────────────────────────────────────────── */

const TICK_LABELS = [B.hours.ticks.t6, B.hours.ticks.t9, B.hours.ticks.t12, B.hours.ticks.t15, B.hours.ticks.t18, B.hours.ticks.t21];

const HoursPanel = ({ c, propertyId, onNavigate }: BookingPanelProps) => {
  const s = c.settings!;
  const h = c.hours!;
  const errors = Object.keys(c.hourErrors).length;
  const status = errors ? { label: i18n.t(B.hours.status.errors), variant: 'crit' as const } : c.hoursDirty ? { label: i18n.t(B.hours.status.dirty), variant: 'warn' as const } : { label: i18n.t(B.hours.status.saved), variant: 'ok' as const };
  return (
    <div className="bo-tx" data-testid="booking-hours">
      <AvailabilityHeader c={c} propId={String(propertyId)} onNavigate={onNavigate} />
      {!c.canEdit && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
      {s.crm.managedHours && <div className="bo-tx__note">{t(B.hours.managed, { crm: s.crm.managedHours })}</div>}
      <Card
        title={i18n.t(B.hours.title)}
        sub={i18n.t(B.hours.sub)}
        testId="hours-card"
        right={
          <>
            <div className="bo-tx__legend">
              <span>
                <i className="bo-tx__swatch" /> {i18n.t(B.hours.self)}
              </span>
              <span>
                <i className="bo-tx__swatch bo-tx__swatch--agent" /> {i18n.t(B.hours.guided)}
              </span>
            </div>
            <StatusPill variant={status.variant} label={status.label} />
            {c.canEdit && c.hoursDirty && (
              <button type="button" className="bo-tx__btn bo-tx__btn--md" disabled={c.saving === 'hours'} onClick={() => c.settings && c.setHoursAll(hoursDraftOf(c.settings))}>
                {i18n.t(B.hours.discard)}
              </button>
            )}
            {c.canEdit && (
              <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" disabled={!c.hoursDirty || errors > 0 || c.saving === 'hours'} onClick={() => void c.saveHours()} data-testid="hours-save">
                {c.saving === 'hours' ? i18n.t(X.saving) : i18n.t(B.hours.save)}
              </button>
            )}
          </>
        }
      >
        <div className="bo-tx__axis">
          <span />
          <div className="bo-tx__axistrack">
            {HOUR_TICKS.map((tick, index) => (
              <span key={tick.hour} className="bo-tx__tick" style={{ left: `${tick.left}%` }}>
                {i18n.t(TICK_LABELS[index])}
              </span>
            ))}
          </div>
          <span />
          <span />
        </div>
        {DAYS.map((day) => {
          const open = c.hoursEditor === day;
          const error = c.hourErrors[`self.${day}`] ?? c.hourErrors[`guided.${day}`];
          return (
            <div key={day} className={open ? 'bo-tx__dayrow--open' : undefined} style={{ borderBottom: '1px solid var(--bo-line-2)' }} data-testid={`hours-day-${day}`}>
              <div className="bo-tx__dayrow" role={c.canEdit ? 'button' : undefined} tabIndex={c.canEdit ? 0 : undefined} aria-expanded={c.canEdit ? open : undefined} onClick={c.canEdit ? () => c.setHoursEditor(open ? null : day) : undefined} onKeyDown={c.canEdit ? (event) => (event.key === 'Enter' || event.key === ' ') && c.setHoursEditor(open ? null : day) : undefined}>
                <span style={{ font: '800 12.5px var(--bo-font)', color: 'var(--bo-ink)' }}>{day.slice(0, 3)}</span>
                <div className="bo-tx__bars">
                  {LANES.map((lane) => (
                    <div key={lane} className="bo-tx__bar">
                      {hoursBars(h[lane][day] ?? []).map((bar, index) => (
                        <span key={index} className={`bo-tx__barfill${lane === 'guided' ? ' bo-tx__barfill--agent' : ''}`} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
                      ))}
                    </div>
                  ))}
                </div>
                <div className={`bo-tx__daylabels${error ? ' bo-tx__warn' : ''}`}>
                  {error ? <span>{error}</span> : LANES.map((lane) => <span key={lane}>{hoursLabel(h[lane][day] ?? [])}</span>)}
                </div>
                {c.canEdit && <span className="bo-tx__caret">{i18n.t(open ? B.hours.closeEditor : B.hours.edit)}</span>}
              </div>
              {open && c.canEdit && (
                <div className="bo-tx__lanes" data-testid="hours-editor">
                  {LANES.map((lane) => (
                    <LaneEditor key={lane} c={c} lane={lane} day={day} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </Card>
      <ClosuresCard c={c} />
    </div>
  );
};

const LaneEditor = ({ c, lane, day }: { c: TourBookingController; lane: HoursLane; day: string }) => {
  const ranges = c.hours![lane][day] ?? [];
  const error = c.hourErrors[`${lane}.${day}`];
  return (
    <div className="bo-tx__lane">
      <div className="bo-tx__lanehead">
        <span className={`bo-tx__lanedot${lane === 'guided' ? ' bo-tx__lanedot--agent' : ''}`} />
        <span className="bo-tx__lanename">{i18n.t(lane === 'self' ? B.hours.self : B.hours.guided)}</span>
        <span className="bo-tx__lanesub">{i18n.t(lane === 'self' ? B.hours.laneSelfSub : B.hours.laneGuidedSub)}</span>
      </div>
      {ranges.map((range, index) => (
        <div key={index} className="bo-tx__range">
          <input type="time" className="bo-tx__time" aria-label={`${day} ${i18n.t(B.hours.opens)}`} value={range.open} onChange={(event) => c.setRange(lane, day, index, { open: event.target.value })} />
          <span className="bo-tx__meta">{i18n.t(B.hours.to)}</span>
          <input type="time" className="bo-tx__time" aria-label={`${day} ${i18n.t(B.hours.closes)}`} value={range.close} onChange={(event) => c.setRange(lane, day, index, { close: event.target.value })} />
          <button type="button" className="bo-tx__btn bo-tx__btn--remove" aria-label={i18n.t(B.hours.removeRange)} onClick={() => c.removeRange(lane, day, index)}>
            ×
          </button>
        </div>
      ))}
      {ranges.length === 0 && <span className="bo-tx__meta">{i18n.t(B.hours.closed)}</span>}
      {error && <span className="bo-tx__error">{error}</span>}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="bo-tx__btn bo-tx__btn--xs bo-tx__btn--accent" onClick={() => c.addRange(lane, day)}>
          {i18n.t(B.hours.addRange)}
        </button>
        {ranges.length > 0 && (
          <button type="button" className="bo-tx__btn bo-tx__btn--xs" onClick={() => c.setRanges(lane, day, [])}>
            {i18n.t(B.hours.closeDay)}
          </button>
        )}
        <button type="button" className="bo-tx__btn bo-tx__btn--xs" onClick={() => c.applyWeekdays(lane, day)}>
          {i18n.t(B.hours.applyWeekdays)}
        </button>
      </div>
    </div>
  );
};

const today = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const ClosuresCard = ({ c }: { c: TourBookingController }) => {
  const C = B.closures;
  const rows = c.closures!;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ date: today(), label: '', closedAllDay: true, startTime: '09:00', endTime: '12:00' });
  const errors = c.closureErrors;
  const add = () => {
    c.addClosure(draft);
    setOpen(false);
    setDraft({ date: today(), label: '', closedAllDay: true, startTime: '09:00', endTime: '12:00' });
  };
  return (
    <Card
      title={i18n.t(C.title)}
      sub={i18n.t(C.sub)}
      tag={NEW()}
      testId="closures-card"
      right={
        c.canEdit ? (
          <>
            {c.closuresDirty && <span className="bo-tx__meta">{i18n.t(X.unsavedChanges)}</span>}
            <button type="button" className="bo-tx__btn bo-tx__btn--md bo-tx__btn--accent" onClick={() => setOpen(true)} data-testid="closure-add">
              {i18n.t(C.add)}
            </button>
            <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" disabled={!c.closuresDirty || Object.keys(errors).length > 0 || c.saving === 'closures'} onClick={() => void c.saveClosures()} data-testid="closures-save">
              {c.saving === 'closures' ? i18n.t(X.saving) : i18n.t(C.save)}
            </button>
          </>
        ) : undefined
      }
    >
      <div className="bo-tx__closures">
        {rows.length === 0 && <div className="bo-tx__empty">{i18n.t(C.empty)}</div>}
        {rows.map((row) => (
          <div key={row.key} className={`bo-tx__closure${errors[row.key] ? ' bo-tx__closure--bad' : ''}`} data-testid="closure-row">
            <div className="bo-tx__grow">
              <div className="bo-tx__closuredate">{closureLabel({ date: row.date, closedAllDay: row.closedAllDay, startTime: row.startTime, endTime: row.endTime })}</div>
              <div className="bo-tx__closurelabel">{errors[row.key] ?? row.label}</div>
            </div>
            {c.canEdit && (
              <button type="button" className="bo-tx__btn bo-tx__btn--danger" onClick={() => c.removeClosure(row.key)}>
                {i18n.t(C.remove)}
              </button>
            )}
          </div>
        ))}
      </div>
      <Modal
        open={open}
        title={i18n.t(C.modal.title)}
        width={440}
        onClose={() => setOpen(false)}
        closeLabel={i18n.t(C.modal.close)}
        className="bo-map__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={() => setOpen(false)}>
              {i18n.t(C.modal.cancel)}
            </button>
            <button type="button" className="bo-btn bo-btn--primary" onClick={add} disabled={!draft.date || (!draft.closedAllDay && draft.startTime >= draft.endTime)} data-testid="closure-confirm">
              {i18n.t(C.modal.confirm)}
            </button>
          </>
        }
      >
        <div className="bo-tx" style={{ gap: 12 }}>
          <label className="bo-tx__field">
            {i18n.t(C.modal.date)}
            <input type="date" className="bo-tx__input" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} data-testid="closure-date" />
          </label>
          <label className="bo-tx__field">
            {i18n.t(C.modal.label)}
            <input className="bo-tx__input" placeholder={i18n.t(C.modal.labelPlaceholder)} maxLength={60} value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} data-testid="closure-label" />
          </label>
          <Row label={i18n.t(C.modal.allDay)}>
            <Switch on={draft.closedAllDay} label={i18n.t(C.modal.allDay)} onToggle={() => setDraft({ ...draft, closedAllDay: !draft.closedAllDay })} />
          </Row>
          {!draft.closedAllDay && (
            <div className="bo-tx__range">
              <span className="bo-tx__meta">{i18n.t(C.modal.from)}</span>
              <input type="time" className="bo-tx__time" value={draft.startTime} aria-label={i18n.t(C.modal.from)} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} />
              <span className="bo-tx__meta">{i18n.t(C.modal.to)}</span>
              <input type="time" className="bo-tx__time" value={draft.endTime} aria-label={i18n.t(C.modal.to)} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} />
            </div>
          )}
        </div>
      </Modal>
    </Card>
  );
};

/* ── form ──────────────────────────────────────────────────────────── */

const FormPanel = ({ c, propertyName, onNavigate }: BookingPanelProps) => {
  const s = c.settings!;
  const f = c.form!;
  const r = c.rules!;
  const ro = !c.canEdit;
  const F = B.form;
  const toggle = (key: 'creditCardRequired' | 'idVerificationFee' | 'visualIdVerification' | 'showDesiredBedroom' | 'showDesiredMoveInDate') => (ro ? undefined : () => c.setForm({ [key]: !f[key] }));
  const appToggle = (key: 'afterHoursLabel' | 'allowShorterTour' | 'askUnit' | 'showTextBooking') => (ro ? undefined : () => c.setApp({ [key]: !f.app[key] }));
  const { preview, loadPreview } = c;
  useEffect(() => {
    if (!preview) void loadPreview();
  }, [loadPreview, preview]);
  const head = (part: FormPart) =>
    ro ? undefined : <CardSave dirty={c.formDirtyFor(part)} saving={c.saving === 'form'} problems={Object.values(c.formProblemsFor(part))} onSave={() => void c.saveForm(part)} onDiscard={() => c.discardForm(part)} testId={`form-save-${part}`} />;
  return (
    <div className="bo-tx__grid2 bo-tx__grid2--wide" data-testid="booking-form">
      <div className="bo-tx">
        {ro && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
        <Card title={i18n.t(F.title)} sub={i18n.t(F.sub)} testId="form-fields" right={head('fields')}>
          <Row label={i18n.t(F.contact)} sub={i18n.t(F.contactSub)}>
            <StatusPill variant="neutral" label={i18n.t(F.always)} />
          </Row>
          <Row label={i18n.t(F.card)} sub={i18n.t(F.cardSub)}>
            <Switch on={f.creditCardRequired} label={i18n.t(F.card)} onToggle={toggle('creditCardRequired')} />
          </Row>
          <Row label={i18n.t(F.idFee)} sub={i18n.t(F.idFeeSub)} indent>
            <Switch on={f.idVerificationFee} label={i18n.t(F.idFee)} onToggle={toggle('idVerificationFee')} />
          </Row>
          <Row label={i18n.t(F.visualId)} sub={i18n.t(F.visualIdSub)}>
            <Switch on={f.visualIdVerification} label={i18n.t(F.visualId)} onToggle={toggle('visualIdVerification')} />
          </Row>
          <Row label={i18n.t(F.beds)} sub={i18n.t(F.bedsSub)}>
            <Switch on={f.showDesiredBedroom} label={i18n.t(F.beds)} onToggle={toggle('showDesiredBedroom')} />
          </Row>
          <Row label={i18n.t(F.moveIn)} sub={i18n.t(F.moveInSub)}>
            <Switch on={f.showDesiredMoveInDate} label={i18n.t(F.moveIn)} onToggle={toggle('showDesiredMoveInDate')} />
          </Row>
          <Row label={i18n.t(F.lead)} sub={i18n.t(F.leadSub)}>
            <StatusPill variant={s.form?.discoverySource ? 'ok' : 'neutral'} label={s.form?.discoverySource ? t(F.leadOn, { crm: s.form.discoverySource }) : i18n.t(F.leadOff)} />
          </Row>
          <Row label={i18n.t(F.leadReq)} sub={i18n.t(s.form?.marketingSourceAvailable ? F.marketingSub : F.leadReqSub)} indent>
            <Switch on={f.marketingSourceRequired} label={i18n.t(F.leadReq)} disabled={!s.form?.marketingSourceAvailable} onToggle={ro || !s.form?.marketingSourceAvailable ? undefined : () => c.setForm({ marketingSourceRequired: !f.marketingSourceRequired })} />
          </Row>
          <Row label={i18n.t(F.sms)} sub={i18n.t(F.smsSub)}>
            <StatusPill variant="neutral" label={i18n.t(s.form?.smsOptInDefault ? B.crm.on : B.crm.off)} />
          </Row>
        </Card>
        <Card title={i18n.t(F.app.title)} sub={i18n.t(F.app.sub)} tag={NEW()} testId="form-app" right={head('app')}>
          <Row label={i18n.t(F.app.days)} sub={i18n.t(F.app.daysSub)}>
            <span className="bo-tx__setinfo">{t(F.app.daysOpen, { n: openDaysCount(c.hours!) })}</span>
            <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => onNavigate('hours')}>
              {i18n.t(F.app.hours)}
            </button>
          </Row>
          <Row label={i18n.t(F.app.afterHours)} sub={i18n.t(F.app.afterHoursSub)}>
            <Switch on={f.app.afterHoursLabel} label={i18n.t(F.app.afterHours)} onToggle={appToggle('afterHoursLabel')} />
          </Row>
          <Row label={i18n.t(F.app.shorter)} sub={t(F.app.shorterSub, { n: r.lengthStayLimit || '45' })}>
            <Switch on={f.app.allowShorterTour} label={i18n.t(F.app.shorter)} onToggle={appToggle('allowShorterTour')} />
          </Row>
          <Row label={i18n.t(F.app.party)} sub={i18n.t(F.app.partySub)} allowed={BOUNDS.party}>
            <Stepper value={f.app.partySizeLimit} bounds={BOUNDS.party} unit={i18n.t(F.app.people)} disabled={ro} label={i18n.t(F.app.party)} onChange={(value) => c.setApp({ partySizeLimit: value })} />
          </Row>
          <Row label={i18n.t(F.app.unit)} sub={i18n.t(F.app.unitSub)}>
            <Switch on={f.app.askUnit} label={i18n.t(F.app.unit)} onToggle={appToggle('askUnit')} />
          </Row>
          <Row label={i18n.t(F.app.text)} sub={i18n.t(F.app.textSub)}>
            <Switch on={f.app.showTextBooking} label={i18n.t(F.app.text)} onToggle={appToggle('showTextBooking')} />
          </Row>
        </Card>
      </div>
      <ProspectPreview c={c} propertyName={propertyName} />
    </div>
  );
};

const ProspectPreview = ({ c, propertyName }: { c: TourBookingController; propertyName: string }) => {
  const s = c.settings!;
  const f = c.form!;
  const r = c.rules!;
  const P = B.preview;
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'walk' | 'sched'>('sched');
  const [time, setTime] = useState<string | null>(null);
  const scheduled = r.onlyScheduledTour || mode === 'sched';
  const day = c.preview?.days.find((row) => row.date === c.previewDate) ?? null;
  const slot = day?.slots.find((row) => row.time === time) ?? null;
  const failing = s.gates.find((gate) => !gate.ok);
  const typeLabel = (type: string) => i18n.t(type === 'guided_tour' ? B.types.guided : B.types.self);
  const draftTypes = (types: string[]) => types.filter((type) => (type === 'self_tour' ? r.allowSelfTour : type === 'guided_tour' ? r.allowGuidedTour : false));
  const types = slot ? draftTypes(slot.types) : [r.allowSelfTour ? 'self_tour' : null, r.allowGuidedTour ? 'guided_tour' : null].filter((row): row is string => !!row);
  const todayHours = hoursLabel(c.hours!.self[DAYS[(new Date().getDay() + 6) % 7]] ?? []);
  const field = (label: string) => <span className="bo-tx__pvfield">{label}</span>;
  return (
    <Card title={i18n.t(P.title)} sub={i18n.t(P.sub)} right={<span className="bo-ts__tag">{i18n.t(P.pill)}</span>} testId="prospect-preview">
      <div className="bo-tx__cardbody">
        <div className="bo-tx__phone" style={{ margin: '0 auto' }}>
          <div className="bo-tx__phonebar" />
          <div className="bo-tx__phonebody">
            <div className="bo-tx__name">{t(P.book, { property: propertyName })}</div>
            {!s.widgetLive && !s.salesforce ? (
              <div className="bo-tx__bad">
                <b>{i18n.t(P.blocked)}</b> · {failing?.error ?? ''}
              </div>
            ) : (
              <>
                {!r.onlyScheduledTour && (
                  <div className="bo-tx__segment">
                    <button type="button" className={mode === 'walk' ? 'bo-tx__segment--on' : undefined} onClick={() => setMode('walk')}>
                      {i18n.t(P.walkin)}
                    </button>
                    <button type="button" className={mode === 'sched' ? 'bo-tx__segment--on' : undefined} onClick={() => setMode('sched')}>
                      {i18n.t(P.scheduled)}
                    </button>
                  </div>
                )}
                {!scheduled && <div className="bo-tx__meta">{t(P.walkinNote, { hours: todayHours })}</div>}
                {scheduled && s.crm.managedHours && <div className="bo-tx__meta">{t(P.crmNote, { crm: s.crm.managedHours })}</div>}
                {scheduled && c.preview && (
                  <>
                    <div className="bo-tx__daygrid">
                      {c.preview.days.map((row) => {
                        const date = new Date(`${row.date}T12:00:00`);
                        const off = row.closed || row.slots.length === 0;
                        return (
                          <button
                            key={row.date}
                            type="button"
                            className={`bo-tx__day${row.date === c.previewDate ? ' bo-tx__day--on' : ''}${off ? ' bo-tx__day--off' : ''}`}
                            disabled={off}
                            onClick={() => {
                              c.setPreviewDate(row.date);
                              setTime(null);
                            }}
                          >
                            <div style={{ font: '700 9.5px var(--bo-font)' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div style={{ font: '800 13px var(--bo-font)' }}>{date.getDate()}</div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="bo-tx__times">
                      {(day?.slots ?? []).slice(0, 12).map((row) => {
                        const full = row.full.length === row.types.length;
                        return (
                          <button key={row.time} type="button" className={`bo-tx__timechip${row.time === time ? ' bo-tx__timechip--on' : ''}`} disabled={full} onClick={() => setTime(row.time)}>
                            {row.label}
                          </button>
                        );
                      })}
                      {day && day.slots.length === 0 && <span className="bo-tx__meta">{i18n.t(P.noTimes)}</span>}
                    </div>
                  </>
                )}
                <div className="bo-tx__statlabel">{i18n.t(P.tourType)}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {types.map((type, index) => (
                    <span key={type} className={`bo-tx__chip${index === 0 ? ' bo-tx__chip--on' : ''}`} style={{ cursor: 'default' }}>
                      {typeLabel(type)}
                    </span>
                  ))}
                  {types.length === 0 && <span className="bo-tx__bad">{i18n.t(B.types.banner)}</span>}
                </div>
                {slot && types.length === 1 && <div className="bo-tx__meta">{i18n.t(P.autoType)}</div>}
                {field(i18n.t(P.first))}
                {field(i18n.t(P.last))}
                {field(i18n.t(P.phone))}
                {field(i18n.t(P.email))}
                {f.creditCardRequired && (
                  <>
                    {field(i18n.t(P.cardNumber))}
                    <div style={{ display: 'flex', gap: 6 }}>
                      {field(i18n.t(P.expiry))}
                      {field(i18n.t(P.cvv))}
                    </div>
                    <div className="bo-tx__meta">
                      {i18n.t(P.cardNote)}
                      {f.idVerificationFee ? i18n.t(P.idFeeNote) : ''}
                    </div>
                  </>
                )}
                {f.showDesiredBedroom && field(i18n.t(P.bedsField))}
                {f.showDesiredMoveInDate && field(i18n.t(P.moveInField))}
                {s.form?.discoverySource && field(i18n.t(P.leadField))}
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', font: '500 11.5px var(--bo-font)', color: 'var(--bo-muted)' }}>
                  <input type="checkbox" checked={!!s.form?.smsOptInDefault} readOnly /> {i18n.t(P.smsField)}
                </label>
                <button type="button" style={{ ...buttonStyle(f.button), alignSelf: 'center', cursor: 'pointer' }} onClick={() => dispatch(demoActions.showToast(i18n.t(P.previewOnly)))} data-testid="preview-submit">
                  {f.button.text || i18n.t(P.submit)}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

/* ── link ──────────────────────────────────────────────────────────── */

const ButtonIcon = ({ icon }: { icon: string }) =>
  ICON_PATHS[icon] ? (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[icon]} />
    </svg>
  ) : null;

const LinkPanel = ({ c, propertyId, onNavigate }: BookingPanelProps) => {
  const s = c.settings!;
  const f = c.form!;
  const b = f.button;
  const link = s.link;
  const ro = !c.canEdit;
  const K = B.button;
  const L = B.link;
  const preview = (
    <span style={buttonStyle(b)}>
      <ButtonIcon icon={b.icon} />
      {b.text}
    </span>
  );
  return (
    <div className="bo-tx" data-testid="booking-link">
      <AvailabilityHeader c={c} propId={String(propertyId)} onNavigate={onNavigate} />
      {!link.url && <div className="bo-tx__bad">{i18n.t(L.noHost)}</div>}
      {link.url && link.hostSource === 'request' && <div className="bo-tx__info">{t(L.hostDefault, { host: link.host ?? '' })}</div>}
      {link.url && !link.live && <div className="bo-tx__note">{t(L.notLive, { error: link.reasons[0] ?? '' })}</div>}
      <div className="bo-tx__grid2 bo-tx__grid2--link">
        <div className="bo-tx">
          {ro && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
          <Card title={i18n.t(K.title)} sub={i18n.t(K.sub)} testId="button-card" right={ro ? undefined : <CardSave dirty={c.formDirtyFor('button')} saving={c.saving === 'form'} problems={Object.values(c.formProblemsFor('button'))} onSave={() => void c.saveForm('button')} onDiscard={() => c.discardForm('button')} testId="button-save" />}>
            <Row label={i18n.t(K.text)}>
              <span className="bo-tx__textrow">
                <span className="bo-tx__counter">{t(K.counter, { n: b.text.length })}</span>
                <input className="bo-tx__input" aria-label={i18n.t(K.text)} maxLength={50} value={b.text} disabled={ro} onChange={(event) => c.setButton({ text: event.target.value })} style={{ width: 180 }} data-testid="button-text" />
              </span>
            </Row>
            <Row label={i18n.t(K.color)}>
              <span className="bo-tx__colorrow">
                <input type="color" aria-label={i18n.t(K.color)} value={/^#[0-9a-fA-F]{6}$/.test(b.color) ? b.color : '#20a345'} disabled={ro} onChange={(event) => c.setButton({ color: event.target.value })} />
                <input className="bo-tx__input bo-tx__mono" value={b.color} disabled={ro} aria-label={`${i18n.t(K.color)} hex`} onChange={(event) => c.setButton({ color: event.target.value })} style={{ width: 110 }} />
              </span>
            </Row>
            <Row label={i18n.t(K.textColor)} tag={NEW()}>
              <span className="bo-tx__colorrow">
                <input type="color" aria-label={i18n.t(K.textColor)} value={/^#[0-9a-fA-F]{6}$/.test(b.textColor) ? b.textColor : '#ffffff'} disabled={ro} onChange={(event) => c.setButton({ textColor: event.target.value })} />
                <input className="bo-tx__input bo-tx__mono" value={b.textColor} disabled={ro} aria-label={`${i18n.t(K.textColor)} hex`} onChange={(event) => c.setButton({ textColor: event.target.value })} style={{ width: 110 }} />
              </span>
            </Row>
            <Row label={i18n.t(K.icon)} sub={i18n.t(K.iconSub)} tag={NEW()}>
              <select className="bo-tx__select" aria-label={i18n.t(K.icon)} value={b.icon} disabled={ro} onChange={(event) => c.setButton({ icon: event.target.value })}>
                <option value="">{i18n.t(K.iconNone)}</option>
                {BUTTON_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {i18n.t((K.icons as Record<string, string>)[icon])}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={i18n.t(K.font)}>
              <select className="bo-tx__select" aria-label={i18n.t(K.font)} value={b.font} disabled={ro} onChange={(event) => c.setButton({ font: event.target.value })}>
                {fontOptions(b.font).map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={i18n.t(K.size)} allowed={BOUNDS.fontSize}>
              <Stepper value={b.fontSize} bounds={BOUNDS.fontSize} unit={i18n.t(K.px)} disabled={ro} label={i18n.t(K.size)} onChange={(value) => c.setButton({ fontSize: value })} />
            </Row>
            <Row label={i18n.t(K.width)} allowed={BOUNDS.px}>
              <Stepper value={b.width} bounds={BOUNDS.px} unit={i18n.t(K.px)} disabled={ro} label={i18n.t(K.width)} onChange={(value) => c.setButton({ width: value })} />
            </Row>
            <Row label={i18n.t(K.height)} allowed={BOUNDS.px}>
              <Stepper value={b.height} bounds={BOUNDS.px} unit={i18n.t(K.px)} disabled={ro} label={i18n.t(K.height)} onChange={(value) => c.setButton({ height: value })} />
            </Row>
          </Card>
        </div>
        <div className="bo-tx">
          <Card title={i18n.t(L.preview)}>
            <div className="bo-tx__cardbody">
              <div className="bo-tx__btnpreview">{link.url ? <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{preview}</a> : preview}</div>
            </div>
          </Card>
          <Card title={i18n.t(L.embed)} sub={i18n.t(K.asSaved)}>
            <div className="bo-tx__cardbody">
              <pre className="bo-tx__pre" data-testid="embed-code">{link.embedHtml ?? ''}</pre>
              <div>
                <button type="button" className="bo-tx__btn" disabled={!link.embedHtml} onClick={() => void c.copy(link.embedHtml ?? '')}>
                  {i18n.t(L.copyCode)}
                </button>
              </div>
            </div>
          </Card>
          <Card title={i18n.t(L.direct)} sub={i18n.t(L.signed)}>
            <div className="bo-tx__cardbody">
              <input className="bo-tx__input bo-tx__mono" readOnly aria-label={i18n.t(L.direct)} value={link.url ?? ''} data-testid="booking-url" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="button" className="bo-tx__btn" disabled={!link.url} onClick={() => void c.copy(link.url ?? '')}>
                  {i18n.t(L.copyLink)}
                </button>
                {link.url && (
                  <a className="bo-tx__btn bo-tx__btn--accent" href={link.url} target="_blank" rel="noopener noreferrer" data-testid="booking-open">
                    {i18n.t(L.open)}
                  </a>
                )}
              </div>
            </div>
          </Card>
          <Card title={i18n.t(L.whereTitle)}>
            <div className="bo-tx__cardbody">
              {[
                [L.where.button, L.where.buttonSub],
                [L.where.direct, L.where.directSub],
                [L.where.map, L.where.mapSub],
                [L.where.app, L.where.appSub]
              ].map(([title, sub]) => (
                <div key={title} className="bo-tx__kv">
                  {i18n.t(title)}
                  <b>{i18n.t(sub)}</b>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

