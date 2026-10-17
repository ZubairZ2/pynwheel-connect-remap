'use client';

import { useEffect, type ReactNode } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import type { HoursLane } from '~/core/models/data/tourModules.data';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { B, DAYS, INTERVALS, LANES, buttonStyle, formDraftOf, hoursBars, hoursLabel, rulesDraftOf, wherePlaces, type BookingSection } from '~/core/utils/generator/tour/tourBooking.generator';
import { V } from '~/core/utils/generator/tour/tourVisitors.generator';

const X = CORE_STRINGS.tourModules.common;

/** One of the Settings tab's scheduling / booking sections, on the booking settings the CMS stores. */
export const BookingSectionView = ({ c, section, propertyName }: { c: TourBookingController; section: BookingSection; propertyName: string }) => {
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
  if (!c.settings || !c.rules || !c.hours || !c.form) return <div className="bo-tx__empty">{i18n.t(X.loading)}</div>;
  switch (section) {
    case 'rules':
      return <RulesPanel c={c} />;
    case 'hours':
      return <HoursPanel c={c} />;
    case 'form':
      return <FormPanel c={c} propertyName={propertyName} />;
    case 'link':
      return <LinkPanel c={c} />;
    default:
      return <CrmPanel c={c} />;
  }
};

const Card = ({ title, sub, right, children, testId }: { title: string; sub?: string; right?: ReactNode; children: ReactNode; testId?: string }) => (
  <div className="bo-tx__card" data-testid={testId}>
    <div className="bo-tx__cardhead">
      <div className="bo-tx__grow">
        <div className="bo-tx__cardtitle">{title}</div>
        {sub && <div className="bo-tx__cardsub">{sub}</div>}
      </div>
      {right}
    </div>
    <div className="bo-tx__cardbody">{children}</div>
  </div>
);

const Row = ({ label, sub, indent, children }: { label: string; sub?: string | null; indent?: boolean; children?: ReactNode }) => (
  <div className={`bo-tx__setrow${indent ? ' bo-tx__setrow--indent' : ''}`}>
    <div className="bo-tx__grow">
      <div className="bo-tx__setlabel">{label}</div>
      {sub && <div className="bo-tx__setdesc">{sub}</div>}
    </div>
    {children}
  </div>
);

const Num = ({ value, unit, onChange, disabled, width = 70, label }: { value: string; unit?: string; onChange: (value: string) => void; disabled?: boolean; width?: number; label: string }) => (
  <span className="bo-tx__num">
    <input className="bo-tx__numinput" style={{ width }} inputMode="numeric" aria-label={label} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value.replace(/[^0-9]/g, ''))} />
    {unit && <span className="bo-tx__unit">{unit}</span>}
  </span>
);

const SaveBar = ({ dirty, saving, label, onSave, onDiscard }: { dirty: boolean; saving: boolean; label: string; onSave: () => void; onDiscard: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
    {dirty && <span className="bo-tx__meta">{i18n.t(X.unsavedChanges)}</span>}
    <button type="button" className="bo-tx__btn" disabled={!dirty || saving} onClick={onDiscard}>
      {i18n.t(X.discard)}
    </button>
    <button type="button" className="bo-tx__btn bo-tx__btn--primary" disabled={!dirty || saving} onClick={onSave} data-testid="booking-save">
      {saving ? i18n.t(X.saving) : label}
    </button>
  </div>
);

/* ── rules ─────────────────────────────────────────────────────────── */

const RulesPanel = ({ c }: { c: TourBookingController }) => {
  const s = c.settings!;
  const r = c.rules!;
  const w = c.widget!;
  const ro = !c.canEdit;
  const toggle = (key: keyof typeof r) => (ro ? undefined : () => c.setRules({ [key]: !r[key] }));
  return (
    <div className="bo-tx" data-testid="booking-rules">
      {ro && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
      <div className="bo-tx__card">
        <div className="bo-tx__cardbody" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="bo-tx__cardtitle bo-tx__grow">{w.label}</span>
            <StatusPill variant={w.variant} label={w.pill} />
          </div>
          <div className="bo-tx__meta">{w.sub}</div>
          {c.gates.map((gate) => (
            <div key={gate.key} className="bo-tx__kv">
              {gate.label}
              <b className={gate.ok ? undefined : 'bo-tx__warn'}>
                {gate.text}
                {gate.fix ? ` · ${gate.fix}` : ''}
              </b>
            </div>
          ))}
          <Row label={i18n.t(B.widget.scheduler)} sub={i18n.t(B.rail.schedulingSub)}>
            <Switch on={r.schedulerEnabled} label={i18n.t(B.widget.scheduler)} onToggle={toggle('schedulerEnabled')} />
          </Row>
        </div>
      </div>

      <Card title={i18n.t(B.types.title)} sub={i18n.t(B.types.sub)}>
        <Row label={i18n.t(B.types.self)} sub={i18n.t(B.types.selfSub)}>
          <Switch on={r.allowSelfTour} label={i18n.t(B.types.self)} onToggle={toggle('allowSelfTour')} />
        </Row>
        <Row label={i18n.t(B.types.guided)} sub={i18n.t(B.types.guidedSub)}>
          <Switch on={r.allowGuidedTour} label={i18n.t(B.types.guided)} onToggle={toggle('allowGuidedTour')} />
        </Row>
        <Row label={i18n.t(B.types.virtual)} sub={i18n.t(B.types.virtualSub)}>
          <Switch on={r.allowVirtualTour} label={i18n.t(B.types.virtual)} onToggle={toggle('allowVirtualTour')} />
        </Row>
        {!r.allowSelfTour && !r.allowGuidedTour && <div className="bo-tx__bad">{i18n.t(B.types.banner)}</div>}
      </Card>

      <Card title={i18n.t(B.slots.title)} sub={i18n.t(B.slots.sub)}>
        <Row label={i18n.t(B.slots.interval)} sub={i18n.t(B.slots.intervalSub)}>
          <select className="bo-tx__select" aria-label={i18n.t(B.slots.interval)} value={r.slotIntervalMinutes} disabled={ro} onChange={(event) => c.setRules({ slotIntervalMinutes: Number(event.target.value) })}>
            {INTERVALS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} {i18n.t(B.behaviour.minutes)}
              </option>
            ))}
          </select>
        </Row>
        <div className="bo-tx__meta">{i18n.t(B.slots.unavailable)}</div>
      </Card>

      <Card title={i18n.t(B.cap.title)} sub={i18n.t(B.cap.sub)}>
        <Row label={i18n.t(B.cap.on)} sub={i18n.t(B.cap.onSub)}>
          <Switch on={r.doLimitMaxTour} label={i18n.t(B.cap.on)} onToggle={toggle('doLimitMaxTour')} />
        </Row>
        {r.doLimitMaxTour && (
          <>
            <Row label={i18n.t(B.cap.self)} indent>
              <Num value={r.maxSelf} unit={i18n.t(B.cap.unit)} disabled={ro} label={i18n.t(B.cap.self)} onChange={(value) => c.setRules({ maxSelf: value })} />
            </Row>
            <Row label={i18n.t(B.cap.guided)} indent>
              <Num value={r.maxGuided} unit={i18n.t(B.cap.unit)} disabled={ro} label={i18n.t(B.cap.guided)} onChange={(value) => c.setRules({ maxGuided: value })} />
            </Row>
            <Row label={i18n.t(B.cap.total)} sub={i18n.t(B.cap.totalSub)} indent>
              <Num value={r.limitMaxTour} unit={i18n.t(B.cap.unit)} disabled={ro} label={i18n.t(B.cap.total)} onChange={(value) => c.setRules({ limitMaxTour: value })} />
            </Row>
          </>
        )}
      </Card>

      <Card title={i18n.t(B.behaviour.title)} sub={i18n.t(B.behaviour.sub)}>
        <Row label={i18n.t(B.behaviour.schedOnly)} sub={i18n.t(B.behaviour.schedOnlySub)}>
          <Switch on={r.onlyScheduledTour} label={i18n.t(B.behaviour.schedOnly)} onToggle={toggle('onlyScheduledTour')} />
        </Row>
        <Row label={i18n.t(B.behaviour.grace)} sub={i18n.t(B.behaviour.graceSub)}>
          <Num value={r.gracePeriod} unit={i18n.t(B.behaviour.minutes)} disabled={ro} label={i18n.t(B.behaviour.grace)} onChange={(value) => c.setRules({ gracePeriod: value })} />
        </Row>
        <Row label={i18n.t(B.behaviour.stay)} sub={i18n.t(B.behaviour.staySub)}>
          <Num value={r.lengthStayLimit} unit={i18n.t(B.behaviour.minutes)} disabled={ro} label={i18n.t(B.behaviour.stay)} onChange={(value) => c.setRules({ lengthStayLimit: value })} />
        </Row>
        <Row label={i18n.t(B.behaviour.onePerPerson)} sub={i18n.t(B.behaviour.onePerPersonSub)}>
          <StatusPill variant="neutral" label={i18n.t(B.behaviour.builtIn)} />
        </Row>
        <Row label={i18n.t(B.behaviour.tz)} sub={i18n.t(B.behaviour.tzSub)}>
          <span className="bo-tx__name">{s.timeZone ?? i18n.t(B.behaviour.tzUnset)}</span>
        </Row>
        {Object.values(c.ruleProblems).map((problem) => (
          <div key={problem} className="bo-tx__bad">
            {problem}
          </div>
        ))}
      </Card>
      {!ro && <SaveBar dirty={c.rulesDirty} saving={c.saving === 'rules'} label={i18n.t(B.rules.save)} onSave={() => void c.saveRules()} onDiscard={() => c.settings && c.setRules(rulesDraftOf(c.settings))} />}
    </div>
  );
};

/* ── hours ─────────────────────────────────────────────────────────── */

const HoursPanel = ({ c }: { c: TourBookingController }) => {
  const s = c.settings!;
  const h = c.hours!;
  const errors = Object.keys(c.hourErrors).length;
  const status = errors ? { label: i18n.t(B.hours.status.errors), variant: 'crit' as const } : c.hoursDirty ? { label: i18n.t(B.hours.status.dirty), variant: 'warn' as const } : { label: i18n.t(B.hours.status.saved), variant: 'ok' as const };
  return (
    <div className="bo-tx" data-testid="booking-hours">
      {!c.canEdit && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
      {s.crm.managedHours && <div className="bo-tx__note">{t(B.hours.managed, { crm: s.crm.managedHours })}</div>}
      <Card
        title={i18n.t(B.hours.title)}
        sub={i18n.t(B.hours.sub)}
        right={
          <>
            <StatusPill variant={status.variant} label={status.label} />
            {c.canEdit && (
              <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" disabled={!c.hoursDirty || errors > 0 || c.saving === 'hours'} onClick={() => void c.saveHours()} data-testid="hours-save">
                {c.saving === 'hours' ? i18n.t(X.saving) : i18n.t(B.hours.save)}
              </button>
            )}
          </>
        }
      >
        <div className="bo-tx__lanes">
          {LANES.map((lane) => (
            <div key={lane} className="bo-tx__lane">
              <div className="bo-tx__statlabel">{i18n.t(lane === 'self' ? B.hours.self : B.hours.guided)}</div>
              {DAYS.map((day) => {
                const ranges = h[lane][day] ?? [];
                const editing = c.hoursEditor?.lane === lane && c.hoursEditor.day === day;
                const error = c.hourErrors[`${lane}.${day}`];
                return (
                  <div key={day}>
                    <div className="bo-tx__dayrow">
                      <span style={{ width: 40, font: '700 12px var(--bo-font)', color: 'var(--bo-ink)' }}>{day.slice(0, 3)}</span>
                      <div className="bo-tx__bars">
                        {hoursBars(ranges).map((bar, index) => (
                          <span key={index} className={`bo-tx__barfill${lane === 'guided' ? ' bo-tx__barfill--agent' : ''}`} style={{ left: `${bar.left}%`, width: `${bar.width}%` }} />
                        ))}
                      </div>
                      <span className={`bo-tx__meta${error ? ' bo-tx__warn' : ''}`} style={{ minWidth: 150 }}>
                        {error ?? hoursLabel(ranges)}
                      </span>
                      {c.canEdit && (
                        <button type="button" className="bo-tx__btn" onClick={() => c.setHoursEditor(editing ? null : { lane, day })}>
                          {i18n.t(editing ? B.hours.closeEditor : B.hours.edit)}
                        </button>
                      )}
                    </div>
                    {editing && <RangeEditor c={c} lane={lane} day={day} />}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>
      <Card title={i18n.t(B.hours.holidays)} sub={i18n.t(B.hours.holidaysSub)}>
        <span className="bo-tx__meta">—</span>
      </Card>
    </div>
  );
};

const RangeEditor = ({ c, lane, day }: { c: TourBookingController; lane: HoursLane; day: string }) => {
  const ranges = c.hours![lane][day] ?? [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0 10px 40px' }} data-testid="hours-editor">
      {ranges.map((range, index) => (
        <div key={index} className="bo-tx__range">
          <span className="bo-tx__meta">{i18n.t(B.hours.opens)}</span>
          <input type="time" className="bo-tx__time" aria-label={`${day} ${i18n.t(B.hours.opens)}`} value={range.open} onChange={(event) => c.setRange(lane, day, index, { open: event.target.value })} />
          <span className="bo-tx__meta">{i18n.t(B.hours.closes)}</span>
          <input type="time" className="bo-tx__time" aria-label={`${day} ${i18n.t(B.hours.closes)}`} value={range.close} onChange={(event) => c.setRange(lane, day, index, { close: event.target.value })} />
          <button type="button" className="bo-tx__btn bo-tx__btn--danger" aria-label={i18n.t(B.hours.removeRange)} onClick={() => c.removeRange(lane, day, index)}>
            ×
          </button>
        </div>
      ))}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => c.addRange(lane, day)}>
          {i18n.t(B.hours.addRange)}
        </button>
        {ranges.length > 0 && (
          <button type="button" className="bo-tx__btn" onClick={() => c.setRanges(lane, day, [])}>
            {i18n.t(B.hours.closeDay)}
          </button>
        )}
        <button type="button" className="bo-tx__btn" onClick={() => c.applyWeekdays(lane, day)}>
          {i18n.t(B.hours.applyWeekdays)}
        </button>
      </div>
    </div>
  );
};

/* ── form ──────────────────────────────────────────────────────────── */

const FormPanel = ({ c, propertyName }: { c: TourBookingController; propertyName: string }) => {
  const s = c.settings!;
  const f = c.form!;
  const ro = !c.canEdit;
  const toggle = (key: keyof Omit<typeof f, 'button'>) => (ro ? undefined : () => c.setForm({ [key]: !f[key] }));
  const { preview, loadPreview } = c;
  useEffect(() => {
    if (!preview) void loadPreview();
  }, [loadPreview, preview]);
  return (
    <div className="bo-tx__grid2 bo-tx__grid2--wide" data-testid="booking-form">
      <div className="bo-tx">
        {ro && <div className="bo-tx__info">{i18n.t(B.readOnlyNote)}</div>}
        <Card title={i18n.t(B.form.title)} sub={i18n.t(B.form.sub)}>
          <Row label={i18n.t(B.form.contact)} sub={i18n.t(B.form.contactSub)}>
            <StatusPill variant="neutral" label={i18n.t(B.form.always)} />
          </Row>
          <Row label={i18n.t(B.form.card)} sub={i18n.t(B.form.cardSub)}>
            <Switch on={f.creditCardRequired} label={i18n.t(B.form.card)} onToggle={toggle('creditCardRequired')} />
          </Row>
          <Row label={i18n.t(B.form.idFee)} sub={i18n.t(B.form.idFeeSub)} indent>
            <Switch on={f.idVerificationFee} label={i18n.t(B.form.idFee)} onToggle={toggle('idVerificationFee')} />
          </Row>
          <Row label={i18n.t(B.form.visualId)} sub={i18n.t(B.form.visualIdSub)}>
            <Switch on={f.visualIdVerification} label={i18n.t(B.form.visualId)} onToggle={toggle('visualIdVerification')} />
          </Row>
          <Row label={i18n.t(B.form.beds)} sub={i18n.t(B.form.bedsSub)}>
            <Switch on={f.showDesiredBedroom} label={i18n.t(B.form.beds)} onToggle={toggle('showDesiredBedroom')} />
          </Row>
          <Row label={i18n.t(B.form.moveIn)} sub={i18n.t(B.form.moveInSub)}>
            <Switch on={f.showDesiredMoveInDate} label={i18n.t(B.form.moveIn)} onToggle={toggle('showDesiredMoveInDate')} />
          </Row>
          <Row label={i18n.t(B.form.lead)} sub={i18n.t(B.form.leadSub)}>
            <StatusPill variant={s.form?.discoverySource ? 'ok' : 'neutral'} label={s.form?.discoverySource ? t(B.form.leadOn, { crm: s.form.discoverySource }) : i18n.t(B.form.leadOff)} />
          </Row>
          <Row label={i18n.t(B.form.marketing)} sub={i18n.t(B.form.marketingSub)}>
            <Switch on={f.marketingSourceRequired} label={i18n.t(B.form.marketing)} disabled={!s.form?.marketingSourceAvailable} onToggle={ro || !s.form?.marketingSourceAvailable ? undefined : () => c.setForm({ marketingSourceRequired: !f.marketingSourceRequired })} />
          </Row>
          <Row label={i18n.t(B.form.sms)} sub={i18n.t(B.form.smsSub)}>
            <StatusPill variant="neutral" label={i18n.t(s.form?.smsOptInDefault ? B.crm.on : B.crm.off)} />
          </Row>
        </Card>
        <Card title={i18n.t(B.button.title)} sub={i18n.t(B.button.sub)}>
          <div className="bo-dlg__grid bo-dlg__grid--two">
            <label className="bo-tx__field">
              {i18n.t(B.button.text)}
              <input className="bo-tx__input" value={f.button.text} disabled={ro} onChange={(event) => c.setButton({ text: event.target.value })} />
            </label>
            <label className="bo-tx__field">
              {i18n.t(B.button.color)}
              <span style={{ display: 'flex', gap: 6 }}>
                <input type="color" aria-label={i18n.t(B.button.color)} value={/^#[0-9a-fA-F]{6}$/.test(f.button.color) ? f.button.color : '#0077ae'} disabled={ro} onChange={(event) => c.setButton({ color: event.target.value })} style={{ width: 40, height: 34, padding: 0, border: '1px solid var(--bo-line)', borderRadius: 6 }} />
                <input className="bo-tx__input bo-tx__mono bo-tx__grow" value={f.button.color} disabled={ro} onChange={(event) => c.setButton({ color: event.target.value })} />
              </span>
            </label>
            <label className="bo-tx__field">
              {i18n.t(B.button.font)}
              <input className="bo-tx__input" value={f.button.font} disabled={ro} onChange={(event) => c.setButton({ font: event.target.value })} />
            </label>
            <label className="bo-tx__field">
              {i18n.t(B.button.size)}
              <input className="bo-tx__input" value={f.button.fontSize} disabled={ro} placeholder="14px" onChange={(event) => c.setButton({ fontSize: event.target.value })} />
            </label>
            <label className="bo-tx__field">
              {i18n.t(B.button.width)}
              <Num value={f.button.width} unit={i18n.t(B.button.px)} disabled={ro} label={i18n.t(B.button.width)} onChange={(value) => c.setButton({ width: value })} />
            </label>
            <label className="bo-tx__field">
              {i18n.t(B.button.height)}
              <Num value={f.button.height} unit={i18n.t(B.button.px)} disabled={ro} label={i18n.t(B.button.height)} onChange={(value) => c.setButton({ height: value })} />
            </label>
          </div>
        </Card>
        {!ro && <SaveBar dirty={c.formDirty} saving={c.saving === 'form'} label={i18n.t(X.save)} onSave={() => void c.saveForm()} onDiscard={() => c.settings && c.setFormAll(formDraftOf(c.settings))} />}
      </div>
      <ProspectPreview c={c} propertyName={propertyName} />
    </div>
  );
};

const ProspectPreview = ({ c, propertyName }: { c: TourBookingController; propertyName: string }) => {
  const s = c.settings!;
  const f = c.form!;
  const r = c.rules!;
  const day = c.preview?.days.find((row) => row.date === c.previewDate) ?? null;
  const failing = s.gates.find((gate) => !gate.ok);
  const types = [r.allowSelfTour ? i18n.t(B.types.self) : null, r.allowGuidedTour ? i18n.t(B.types.guided) : null].filter((row): row is string => !!row);
  const field = (label: string) => (
    <span className="bo-tx__input" style={{ display: 'block', color: 'var(--bo-subtle)', background: '#fff' }}>
      {label}
    </span>
  );
  return (
    <Card title={i18n.t(B.preview.title)} sub={i18n.t(B.preview.sub)} right={<span className="bo-ts__tag">{i18n.t(B.preview.pill)}</span>} testId="prospect-preview">
      <div className="bo-tx__phone" style={{ margin: '0 auto' }}>
        <div className="bo-tx__phonebar">{t(B.preview.book, { property: propertyName })}</div>
        <div className="bo-tx__phonebody">
          {!s.widgetLive && !s.salesforce ? (
            <div className="bo-tx__bad">
              <b>{i18n.t(B.preview.blocked)}</b> · {failing?.error ?? ''}
            </div>
          ) : (
            <>
              <div className="bo-tx__statlabel">{i18n.t(B.preview.tourType)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {types.map((type, index) => (
                  <span key={type} className={`bo-tx__chip${index === 0 ? ' bo-tx__chip--on' : ''}`} style={{ cursor: 'default' }}>
                    {type}
                  </span>
                ))}
                {types.length === 0 && <span className="bo-tx__bad">{i18n.t(B.types.banner)}</span>}
              </div>
              {!r.onlyScheduledTour && <div className="bo-tx__meta">{i18n.t(B.preview.today)}</div>}
              {c.preview && (
                <>
                  <div className="bo-tx__daygrid">
                    {c.preview.days.map((row) => {
                      const date = new Date(`${row.date}T12:00:00`);
                      return (
                        <button key={row.date} type="button" className={`bo-tx__day${row.date === c.previewDate ? ' bo-tx__day--on' : ''}${row.closed ? ' bo-tx__day--off' : ''}`} disabled={row.closed} onClick={() => c.setPreviewDate(row.date)}>
                          <div style={{ font: '700 9.5px var(--bo-font)' }}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div style={{ font: '800 13px var(--bo-font)' }}>{date.getDate()}</div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="bo-tx__times">
                    {(day?.slots ?? []).map((slot) => (
                      <span key={slot.time} className="bo-tx__timechip" style={slot.full.length === slot.types.length ? { opacity: 0.4 } : undefined}>
                        {slot.label}
                      </span>
                    ))}
                    {day && day.slots.length === 0 && <span className="bo-tx__meta">{i18n.t(B.preview.noTimes)}</span>}
                  </div>
                </>
              )}
              {field(i18n.t(V.booking.first))}
              {field(i18n.t(V.booking.last))}
              {field(i18n.t(V.booking.phone))}
              {field(i18n.t(V.booking.email))}
              {f.showDesiredBedroom && field(i18n.t(B.preview.bedsField))}
              {f.showDesiredMoveInDate && field(i18n.t(B.preview.moveInField))}
              {s.form?.discoverySource && field(i18n.t(B.preview.leadField))}
              {f.creditCardRequired && (
                <>
                  {field(i18n.t(B.preview.cardNumber))}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {field(i18n.t(B.preview.expiry))}
                    {field(i18n.t(B.preview.cvv))}
                  </div>
                  <div className="bo-tx__meta">
                    {i18n.t(B.preview.cardNote)}
                    {f.idVerificationFee ? i18n.t(B.preview.idFeeNote) : ''}
                  </div>
                </>
              )}
              <label style={{ display: 'flex', gap: 6, alignItems: 'center', font: '500 11.5px var(--bo-font)', color: 'var(--bo-muted)' }}>
                <input type="checkbox" checked={!!s.form?.smsOptInDefault} readOnly /> {i18n.t(B.preview.smsField)}
              </label>
              <span style={{ ...buttonStyle(f.button), alignSelf: 'center' }}>{f.button.text || i18n.t(B.preview.submit)}</span>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

/* ── link ──────────────────────────────────────────────────────────── */

const LinkPanel = ({ c }: { c: TourBookingController }) => {
  const s = c.settings!;
  const f = c.form!;
  const link = s.link;
  return (
    <div className="bo-tx" data-testid="booking-link">
      <Card title={i18n.t(B.link.title)} sub={i18n.t(B.intro.link)}>
        {!link.hostConfigured && <div className="bo-tx__bad">{i18n.t(B.link.noHost)}</div>}
        {link.url && !link.live && <div className="bo-tx__note">{t(B.link.notLive, { error: link.reasons[0] ?? '' })}</div>}
        <div className="bo-tx__statlabel">{i18n.t(B.link.preview)}</div>
        <div>
          {link.url ? (
            <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ ...buttonStyle(f.button), textDecoration: 'none' }}>
              {f.button.text}
            </a>
          ) : (
            <span style={buttonStyle(f.button)}>{f.button.text}</span>
          )}
        </div>
        <div className="bo-tx__statlabel">{i18n.t(B.link.embed)}</div>
        <textarea className="bo-tx__textarea bo-tx__mono" readOnly rows={5} aria-label={i18n.t(B.link.embed)} value={link.embedHtml ?? ''} />
        <div>
          <button type="button" className="bo-tx__btn" disabled={!link.embedHtml} onClick={() => void c.copy(link.embedHtml ?? '')}>
            {i18n.t(B.link.copyCode)}
          </button>
        </div>
        <div className="bo-tx__statlabel">{i18n.t(B.link.direct)}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="bo-tx__input bo-tx__mono bo-tx__grow" readOnly aria-label={i18n.t(B.link.direct)} value={link.url ?? ''} data-testid="booking-url" />
          <button type="button" className="bo-tx__btn" disabled={!link.url} onClick={() => void c.copy(link.url ?? '')}>
            {i18n.t(B.link.copyLink)}
          </button>
          {link.url && (
            <a className="bo-tx__btn bo-tx__btn--accent" href={link.url} target="_blank" rel="noopener noreferrer">
              {i18n.t(B.link.open)}
            </a>
          )}
        </div>
        <div className="bo-tx__meta">{i18n.t(B.link.signed)}</div>
      </Card>
      <Card title={i18n.t(B.link.whereTitle)}>
        {wherePlaces().map((place) => (
          <div key={place.title} className="bo-tx__kv">
            {place.title}
            <b>{place.sub}</b>
          </div>
        ))}
      </Card>
    </div>
  );
};

/* ── crm (deferred) ────────────────────────────────────────────────── */

const CrmPanel = ({ c }: { c: TourBookingController }) => {
  const s = c.settings!;
  return (
    <div className="bo-tx" data-testid="booking-crm">
      <div className="bo-tx__note">{i18n.t(B.crm.deferred)}</div>
      <Card title={i18n.t(B.pills.crm)} sub={i18n.t(B.intro.crm)}>
        <div className="bo-tx__kv">
          {i18n.t(B.crm.provider)}
          <b>{s.crm.provider ?? i18n.t(B.crm.none)}</b>
        </div>
        <div className="bo-tx__kv">
          {i18n.t(B.crm.leadSync)}
          <b>{i18n.t(s.crm.leadSync ? B.crm.on : B.crm.off)}</b>
        </div>
        <div className="bo-tx__kv">
          {i18n.t(B.crm.dataProvider)}
          <b>{s.crm.dataProvider ?? s.crm.managedHours ?? i18n.t(B.crm.none)}</b>
        </div>
      </Card>
    </div>
  );
};
