'use client';

import { useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { propRoute } from '~/config/app/connectRoutes';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { Modal } from '~/core/components/molecules/Modal';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import { B, type BookingSection } from '~/core/utils/generator/tour/tourBooking.generator';

const T = CORE_STRINGS.tourSetup;

/**
 * The availability header of the design (`isAvailability`): whether the
 * booking widget is live, the Scheduler switch (its own one-field write, with
 * a confirmation before turning it off) and the four gates the widget checks,
 * each with the way to fix it. Shown above the rules, hours, link and CRM
 * sections; Salesforce properties get the title only.
 */
export const AvailabilityHeader = ({ c, propId, onNavigate }: { c: TourBookingController; propId: string; onNavigate: (section: BookingSection) => void }) => {
  const s = c.settings!;
  const w = c.widget!;
  const [confirmOff, setConfirmOff] = useState(false);
  const busy = c.saving === 'scheduler';
  const toggle = () => {
    if (busy) return;
    if (s.schedulerEnabled) setConfirmOff(true);
    else void c.setSchedulerEnabled(true);
  };
  const fix = (key: string) => {
    switch (key) {
      case 'scheduler_on':
        return (
          <button type="button" className="bo-tx__linkbtn" disabled={!c.canEdit || busy} onClick={() => void c.setSchedulerEnabled(true)}>
            {i18n.t(B.gate.fix.scheduler_on)}
          </button>
        );
      case 'tour_type_on':
        return (
          <button type="button" className="bo-tx__linkbtn" onClick={() => onNavigate('rules')}>
            {i18n.t(B.gate.fix.tour_type_on)}
          </button>
        );
      case 'property_active':
      case 'tour_on':
        return (
          <a className="bo-tx__linkbtn" href={propRoute(propId)}>
            {i18n.t(key === 'tour_on' ? B.gate.fix.tour_on : B.gate.fix.property_active)}
          </a>
        );
      default:
        return null;
    }
  };
  return (
    <div className="bo-tx__header" data-testid="availability-header">
      <div className="bo-tx__headerrow">
        <div className="bo-tx__grow">
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span className="bo-tx__headertitle">{w.label}</span>
            <StatusPill variant={w.variant} label={w.pill} />
          </div>
          <div className="bo-tx__headersub">{w.sub}</div>
        </div>
        {!s.salesforce && (
          <>
            <span className="bo-tx__meta" style={{ fontSize: 12, color: 'var(--bo-muted)' }}>
              {i18n.t(B.widget.scheduler)}
            </span>
            <Switch on={s.schedulerEnabled} label={i18n.t(B.widget.scheduler)} disabled={busy} onToggle={c.canEdit ? toggle : undefined} />
          </>
        )}
      </div>
      {!s.salesforce && (
        <div className="bo-tx__gates">
          {c.gates.map((gate) => (
            <div key={gate.key} className="bo-tx__gate" data-testid={`gate-${gate.key}`}>
              <StatusPill variant={gate.ok ? 'ok' : 'crit'} label={gate.text} />
              <div className="bo-tx__gatelabel">{gate.label}</div>
              {!gate.ok && fix(gate.key)}
            </div>
          ))}
        </div>
      )}
      <Modal
        open={confirmOff}
        title={i18n.t(B.header.turnOffTitle)}
        width={460}
        onClose={() => setConfirmOff(false)}
        closeLabel={i18n.t(T.dialogs.close)}
        className="bo-map__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={() => setConfirmOff(false)}>
              {i18n.t(T.dialogs.cancel)}
            </button>
            <button
              type="button"
              className="bo-btn bo-btn--primary bo-map__btn--danger"
              data-testid="scheduler-off-confirm"
              onClick={() => {
                setConfirmOff(false);
                void c.setSchedulerEnabled(false);
              }}
            >
              {i18n.t(B.header.turnOffConfirm)}
            </button>
          </>
        }
      >
        <p className="bo-map__dialogtext">{i18n.t(B.header.turnOffBody)}</p>
      </Modal>
    </div>
  );
};
