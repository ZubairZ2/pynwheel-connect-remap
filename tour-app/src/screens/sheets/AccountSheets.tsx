import { DEMO, HOLD_HOURS } from '~/content/demoFixtures';
import { moveInEstimate } from '~/store/access';
import { DEMO_SCENARIOS_ENABLED } from '~/config/env';
import { Icon } from '~/components/Icon';
import { Button, Sheet, Toggle } from '~/components/ui';
import { Eyebrow, Segmented } from '~/components/ui2';
import type { TourHistoryEntry, Unit, Visitor } from '~/models';
import type { AppState, DemoLocationScenario, DemoScenarios, DemoTourScenario } from '~/store/appState';
import { unitMeta, unitPrice } from '~/store/selectors';
import { money, unitFacts, type Profile } from '~/store/views';

interface BookProps {
  open: boolean;
  propertyName: string;
  visitor: Visitor;
  /** The next days of the property's calendar (`key` = `YYYY-MM-DD`), with the agent-guided times still open on each. */
  days: { key: string; label: string; times: string[] }[];
  /** Why no guided tour can be booked (the CMS does not offer them, the calendar failed, nothing open), else null. */
  blocked: string | null;
  loading: boolean;
  units: string[];
  value: { day: string; time: string; unit: string; done: boolean; submitting: boolean };
  onChange: (field: 'day' | 'time' | 'unit', value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/** Book a Live Tour: the agent-guided times the property's calendar still has open (the same CMS rules as the self-tour), booked through the same endpoint. */
export const BookSheet = ({ open, propertyName, visitor, days, blocked, loading, units, value, onChange, onSubmit, onClose }: BookProps) => {
  const day = days.find((d) => d.key === value.day) ?? days.find((d) => d.times.length) ?? null;
  const times = day?.times ?? [];
  return (
  <Sheet open={open} onClose={onClose} title={<span className="pw-sheet__title--18">Book a Live Tour</span>} zIndex={330} headerPadding="tight" className="pw-book" testId="book-sheet">
    {!value.done ? (
      <div className="pw-book__form">
        <div className="pw-book__intro">Prefer a guided tour with a leasing specialist at {propertyName}? Pick a time and the leasing team gets the booking.</div>
        {blocked ? <div className="pw-lockcode__note" role="status">{blocked}</div> : null}
        {loading ? <div className="pw-sched__noslots">Loading times…</div> : null}
        <label className="pw-book__field">
          <span>Date</span>
          <select value={day?.key ?? ''} onChange={(e) => onChange('day', e.target.value)} className="pw-select" disabled={!!blocked || !days.length}>
            {days.map((d) => (
              <option key={d.key} value={d.key} disabled={!d.times.length}>
                {d.label}
                {d.times.length ? '' : ' · no times'}
              </option>
            ))}
          </select>
        </label>
        <label className="pw-book__field">
          <span>Time</span>
          <select value={times.includes(value.time) ? value.time : (times[0] ?? '')} onChange={(e) => onChange('time', e.target.value)} className="pw-select" disabled={!!blocked || !times.length}>
            {times.map((t) => (
              <option key={t}>{t}</option>
            ))}
            {!times.length ? <option value="">No guided-tour times on this day</option> : null}
          </select>
        </label>
        <label className="pw-book__field">
          <span>Interested Unit</span>
          <select value={value.unit} onChange={(e) => onChange('unit', e.target.value)} className="pw-select">
            {units.map((u) => (
              <option key={u}>{u}</option>
            ))}
            <option>No preference *</option>
          </select>
        </label>
        <div className="pw-book__who">
          {visitor.name}
          {visitor.phone ? ` · ${visitor.phone}` : ''}
        </div>
        <Button busy={value.submitting} onClick={onSubmit} disabled={!!blocked || !times.length || !day}>
          Book This Tour
        </Button>
      </div>
    ) : (
      <div className="pw-book__done">
        <span className="pw-book__donebadge">
          <Icon name="check" size={30} color="var(--pw-primary)" strokeWidth={2.4} />
        </span>
        <div className="pw-book__donetitle">Tour booked</div>
        <div className="pw-book__donetext">
          The {propertyName} leasing team has your booking for{' '}
          <b>
            {day?.label ?? value.day} at {value.time}
          </b>
          . It is on their calendar now.
        </div>
        <Button height={48} onClick={onClose}>
          Done
        </Button>
      </div>
    )}
  </Sheet>
  );
};

interface ApplyProps {
  open: boolean;
  step: 'details' | 'hold';
  units: Unit[];
  bestMatch: string | null;
  selected: string | null;
  submitting: boolean;
  profile: Profile;
  verified: boolean;
  mark: string;
  onPick: (node: string) => void;
  onStartHold: () => void;
  onEsign: () => void;
  onBack: () => void;
  onClose: () => void;
}

/** Apply: step one picks the unit (pre-filled from the profile, with the move-in total), step two confirms the local hold and continues to the real application request. */
export const ApplySheet = ({ open, step, units, bestMatch, selected, submitting, profile, verified, mark, onPick, onStartHold, onEsign, onBack, onClose }: ApplyProps) => {
  const unit = units.find((u) => u.node === selected) ?? units[0] ?? null;
  const facts = unit ? unitFacts(unit, mark) : null;
  // The move-in total from published figures only (rent + the floor plan's deposit when the CMS holds one).
  const estimate = unit && facts?.rent != null ? moveInEstimate(unit, facts.rent) : null;
  const total = estimate ? money(estimate.total) : facts?.rent != null ? money(facts.rent) : null;
  const holdEnd = new Date(Date.now() + HOLD_HOURS * 3600000);
  return (
    <Sheet open={open} onClose={onClose} title={step === 'hold' ? 'Unit on hold' : 'Apply For A Unit'} zIndex={320} size="scroll" className="pw-apply">
      <div className="pw-apply__progress">
        <span className="pw-apply__bar pw-apply__bar--on" />
        <span className={`pw-apply__bar${step === 'hold' ? ' pw-apply__bar--on' : ''}`} />
      </div>
      {step === 'details' ? (
        <>
          <div className="pw-apply__intro">Choose which unit to apply for. Your best match from this tour is pre-selected.</div>
          <div className="pw-apply__units">
            {units.map((u) => {
              const on = selected === u.node;
              return (
                <button key={u.node} type="button" className={`pw-apply__unit${on ? ' pw-apply__unit--on' : ''}`} onClick={() => onPick(u.node)} aria-pressed={on}>
                  <span className="pw-apply__unittext">
                    <span className="pw-apply__unithead">
                      <b>{u.name}</b>
                      {bestMatch === u.node ? <span className="pw-apply__best">Best Match</span> : null}
                    </span>
                    <span className="pw-apply__unitmeta">{unitMeta(u)}</span>
                  </span>
                  <span className={`pw-apply__price${on ? ' pw-apply__price--on' : ''}`}>{unitPrice(u)}</span>
                  <span className={`pw-apply__check${on ? ' pw-apply__check--on' : ''}`}>{on ? <Icon name="check" size={12} color="#fff" strokeWidth={3} /> : null}</span>
                </button>
              );
            })}
          </div>
          <div className="pw-apply__prefill">
            <div className="pw-apply__prefillhead">
              <Icon name="shield" size={14} color="var(--pw-live)" strokeWidth={2.2} />
              {verified ? 'Pre-filled from your verified ID' : 'Pre-filled from your profile'}
            </div>
            {(
              [
                ['Name', `${profile.first} ${profile.last}`.trim(), ''],
                ['Phone', profile.phone || '—', ''],
                ['ID status', verified ? `Verified · CheckpointID${DEMO}` : 'Not verified yet', verified ? 'pw-apply__ok' : 'pw-apply__warn']
              ] as const
            ).map(([label, value, cls]) => (
              <div key={label} className="pw-apply__prefillrow">
                <Eyebrow>{label}</Eyebrow>
                <span className={cls}>{value}</span>
              </div>
            ))}
          </div>
          <div className="pw-apply__facts">
            {['$50 application fee · takes about 5 minutes *', `Unit held for ${HOLD_HOURS} hours while you apply *`, 'Refundable if not approved *'].map((fact) => (
              <div key={fact}>
                <Icon name="check" size={16} color="var(--pw-primary)" strokeWidth={2.5} />
                {fact}
              </div>
            ))}
          </div>
          {total ? (
            <div className="pw-apply__total">
              <div>
                <div>Total move-in cost{DEMO}</div>
                <div>12-mo rent + deposit + fees</div>
              </div>
              <b>{total}</b>
            </div>
          ) : null}
          <Button onClick={onStartHold} disabled={!selected}>
            Start Application
          </Button>
        </>
      ) : (
        <>
          <div className="pw-apply__hold">
            <span className="pw-apply__holdbadge">
              <Icon name="lock" size={28} color="#fff" strokeWidth={2.6} />
            </span>
            <div className="pw-apply__holdtitle">
              {unit?.name ?? 'Your unit'} held for {HOLD_HOURS}h · noted in the app{DEMO}
            </div>
            <div className="pw-apply__holdsub">Hold ends {holdEnd.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {holdEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          </div>
          <div className="pw-apply__prefill">
            <div className="pw-apply__prefillrow">
              <span>Applicant</span>
              <b>{`${profile.first} ${profile.last}`.trim()}</b>
            </div>
            <div className="pw-apply__prefillrow">
              <span>Unit</span>
              <b>
                {unit?.name} · {facts?.price}
              </b>
            </div>
            {total ? (
              <div className="pw-apply__prefillrow">
                <span>Total move-in cost</span>
                <b className="pw-apply__ok">{total}</b>
              </div>
            ) : null}
          </div>
          <div className="pw-demonote">The hold is a note on this phone; the leasing office is not told until the application starts.{DEMO}</div>
          <Button busy={submitting} onClick={onEsign}>
            Continue to e-sign
          </Button>
          <button type="button" className="pw-textlink pw-textlink--muted" onClick={onBack}>
            Back
          </button>
        </>
      )}
    </Sheet>
  );
};

const NOTIF_ROWS: { key: keyof AppState['notifs']; label: string; sub: string }[] = [
  { key: 'tours', label: 'Tour Reminders', sub: '24h and 1h before your tour' },
  { key: 'startingSoon', label: 'Tour starting soon', sub: '15 min before your start time' },
  { key: 'accessExpiring', label: 'Access expiring (10 min warning)', sub: 'Before your access pass ends' },
  { key: 'agentReplied', label: 'Agent replied', sub: 'When leasing answers your question' },
  { key: 'priceDrops', label: 'Price Drop Alerts', sub: 'On units you toured' },
  { key: 'newUnits', label: 'New Unit Notifications', sub: 'Matching your saved search' }
];

export const NotificationsSheet = ({ open, value, onToggle, onClose }: { open: boolean; value: AppState['notifs']; onToggle: (key: keyof AppState['notifs']) => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title="Notifications" zIndex={320}>
    <div className="pw-settings">
      {NOTIF_ROWS.map((row) => (
        <div key={row.key} className="pw-settings__row pw-settings__row--toggle">
          <span className="pw-settings__labels">
            <span>{row.label}</span>
            <span className="pw-settings__sub">{row.sub}</span>
          </span>
          <Toggle on={value[row.key]} onChange={() => onToggle(row.key)} label={row.label} />
        </div>
      ))}
      <div className="pw-demonote">Preferences are kept on this phone in this build.{DEMO}</div>
    </div>
  </Sheet>
);

const TOUR_SCENARIOS: { id: DemoTourScenario; label: string }[] = [
  { id: 'auto', label: 'Auto (what you booked)' },
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Later this week' },
  { id: 'pending', label: 'Pending approval' },
  { id: 'past', label: 'Past tour' },
  { id: 'missed', label: 'Missed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'none', label: 'No tours' }
];
const LOCATION_SCENARIOS: { id: DemoLocationScenario; label: string }[] = [
  { id: 'auto', label: 'Auto (ask / allow / deny)' },
  { id: 'denied', label: 'Denied' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'atProperty', label: 'At property' },
  { id: 'approximate', label: 'Approximate' },
  { id: 'offline', label: 'Offline' },
  { id: 'preciseOff', label: 'Precise off' }
];
const LAYOUTS: { id: DemoScenarios['buildLayout']; label: string }[] = [
  { id: 'listMap', label: 'List + map' },
  { id: 'mapCards', label: 'Map + cards' },
  { id: 'tabs', label: 'List / Map tabs' },
  { id: 'switch', label: 'List / Map switch (bottom)' }
];

interface SettingsProps {
  open: boolean;
  email: string;
  version: string;
  demo: DemoScenarios;
  onDemo: (patch: Partial<DemoScenarios>) => void;
  onResetDemo: () => void;
  onClose: () => void;
}

/** Settings, plus the design's Tweaks as "Demo scenarios": the owner can force every variant the design shows. */
export const SettingsSheet = ({ open, email, version, demo, onDemo, onResetDemo, onClose }: SettingsProps) => (
  <Sheet open={open} onClose={onClose} title="Settings" zIndex={320} size="scroll" className="pw-settingssheet">
    <div className="pw-settings pw-settings--list">
      <div className="pw-settings__row">
        <span>Account</span>
        <span className="pw-settings__value">{email}</span>
      </div>
      <div className="pw-settings__row">
        <span>Distance Units</span>
        <span className="pw-settings__value pw-settings__value--primary">Feet (ft)</span>
      </div>
      <div className="pw-settings__row">
        <span>Language</span>
        <span className="pw-settings__value pw-settings__value--primary">English (US)</span>
      </div>
      <div className="pw-settings__row">
        <span>Privacy &amp; Data</span>
        <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
      </div>
      <div className="pw-settings__row pw-settings__row--last">
        <span>App Version</span>
        <span className="pw-settings__value pw-settings__value--subtle">{version}</span>
      </div>
    </div>
    {DEMO_SCENARIOS_ENABLED ? (
      <div className="pw-demo">
        <div className="pw-demo__head">
          <div>
            <div className="pw-demo__title">Demo scenarios{DEMO}</div>
            <div className="pw-demo__sub">The design&rsquo;s tweaks, for review. They change only what this phone shows.</div>
          </div>
          <button type="button" className="pw-textlink pw-textlink--sm" onClick={onResetDemo}>
            Reset
          </button>
        </div>
        <label className="pw-demo__field">
          <Eyebrow>1 · Tour status (signed-in Home)</Eyebrow>
          <select className="pw-select" value={demo.tour} onChange={(e) => onDemo({ tour: e.target.value as DemoTourScenario })}>
            {TOUR_SCENARIOS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="pw-demo__field">
          <Eyebrow>2 · Location</Eyebrow>
          <select className="pw-select" value={demo.location} onChange={(e) => onDemo({ location: e.target.value as DemoLocationScenario })}>
            {LOCATION_SCENARIOS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="pw-settings__row pw-settings__row--toggle">
          <span className="pw-settings__labels">
            <span>3 · ID verification</span>
            <span className="pw-settings__sub">Treat the visitor as verified</span>
          </span>
          <Toggle on={demo.idVerified} onChange={() => onDemo({ idVerified: !demo.idVerified })} label="ID verified" />
        </div>
        <div className="pw-settings__row pw-settings__row--toggle">
          <span className="pw-settings__labels">
            <span>4 · Chat</span>
            <span className="pw-settings__sub">A leasing agent is online</span>
          </span>
          <Toggle on={demo.agentOnline} onChange={() => onDemo({ agentOnline: !demo.agentOnline })} label="Agent online" />
        </div>
        <div className="pw-demo__field">
          <Eyebrow>5 · Upcoming tours list</Eyebrow>
          <Segmented options={[{ id: 'one', label: 'One' }, { id: 'multiple', label: 'Multiple' }]} value={demo.upcomingTours} onChange={(id) => onDemo({ upcomingTours: id })} />
        </div>
        <div className="pw-demo__field">
          <Eyebrow>6 · Tour starting point</Eyebrow>
          <Segmented options={[{ id: 'one', label: 'One' }, { id: 'multiple', label: 'Multiple' }]} value={demo.startingPoints} onChange={(id) => onDemo({ startingPoints: id })} />
        </div>
        <label className="pw-demo__field">
          <Eyebrow>7 · Build Your Tour layout</Eyebrow>
          <select className="pw-select" value={demo.buildLayout} onChange={(e) => onDemo({ buildLayout: e.target.value as DemoScenarios['buildLayout'] })}>
            {LAYOUTS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    ) : null}
  </Sheet>
);

export const HistorySheet = ({ open, history, onClose }: { open: boolean; history: TourHistoryEntry[]; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title="Tour History" size="scroll" zIndex={320}>
    <div className="pw-historylist">
      {history.length ? (
        history.map((item) => (
          <div key={item.id} className="pw-historycard">
            <div className="pw-historycard__head">
              <div className="pw-historycard__property">{item.property}</div>
              <div className="pw-historycard__date">{item.date}</div>
            </div>
            <div className="pw-historycard__tags">
              {item.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="pw-itin__empty">No tours yet.</div>
      )}
    </div>
  </Sheet>
);
