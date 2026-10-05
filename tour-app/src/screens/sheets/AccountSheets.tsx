import { Icon } from '~/components/Icon';
import { Button, Sheet, Toggle } from '~/components/ui';
import type { TourHistoryEntry, Unit, Visitor } from '~/models';
import { unitMeta, unitPrice } from '~/store/selectors';

interface BookProps {
  open: boolean;
  propertyName: string;
  visitor: Visitor;
  days: string[];
  times: string[];
  units: string[];
  value: { day: string; time: string; unit: string; done: boolean; submitting: boolean };
  onChange: (field: 'day' | 'time' | 'unit', value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const BookSheet = ({ open, propertyName, visitor, days, times, units, value, onChange, onSubmit, onClose }: BookProps) => (
  <Sheet open={open} onClose={onClose} title={<span className="pw-sheet__title--18">Book a Live Tour</span>} zIndex={330} headerPadding="tight" className="pw-book">
    {!value.done ? (
      <div className="pw-book__form">
        <div className="pw-book__intro">Prefer a guided tour with a leasing specialist at {propertyName}? Pick a time and we&rsquo;ll confirm it.</div>
        <label className="pw-book__field">
          <span>Date</span>
          <select value={value.day} onChange={(e) => onChange('day', e.target.value)} className="pw-select">
            {days.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label className="pw-book__field">
          <span>Time</span>
          <select value={value.time} onChange={(e) => onChange('time', e.target.value)} className="pw-select">
            {times.map((t) => (
              <option key={t}>{t}</option>
            ))}
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
          {visitor.name} · {visitor.phone}
        </div>
        <Button busy={value.submitting} onClick={onSubmit}>
          Request This Tour
        </Button>
      </div>
    ) : (
      <div className="pw-book__done">
        <span className="pw-book__donebadge">
          <Icon name="check" size={30} color="var(--pw-primary)" strokeWidth={2.4} />
        </span>
        <div className="pw-book__donetitle">Request Sent</div>
        <div className="pw-book__donetext">
          The {propertyName} leasing team has your request for{' '}
          <b>
            {value.day} at {value.time}
          </b>
          . They&rsquo;ll confirm by text shortly. It&rsquo;s now on their board.
        </div>
        <Button height={48} onClick={onClose}>
          Done
        </Button>
      </div>
    )}
  </Sheet>
);

interface ApplyProps {
  open: boolean;
  units: Unit[];
  bestMatch: string | null;
  selected: string | null;
  submitting: boolean;
  onPick: (node: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const ApplySheet = ({ open, units, bestMatch, selected, submitting, onPick, onSubmit, onClose }: ApplyProps) => (
  <Sheet open={open} onClose={onClose} title="Apply For A Unit" zIndex={320}>
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
    <div className="pw-apply__facts">
      {['$50 application fee · takes about 5 minutes *', 'Unit held for 48 hours while you apply *', 'Refundable if not approved *'].map((fact) => (
        <div key={fact}>
          <Icon name="check" size={16} color="var(--pw-primary)" strokeWidth={2.5} />
          {fact}
        </div>
      ))}
    </div>
    <Button busy={submitting} onClick={onSubmit} disabled={!selected}>
      Start Application
    </Button>
  </Sheet>
);

export const NotificationsSheet = ({ open, value, onToggle, onClose }: { open: boolean; value: { tours: boolean; priceDrops: boolean; newUnits: boolean }; onToggle: (key: 'tours' | 'priceDrops' | 'newUnits') => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title="Notifications" zIndex={320}>
    <div className="pw-settings">
      <div className="pw-settings__row pw-settings__row--toggle">
        <span>Tour Reminders</span>
        <Toggle on={value.tours} onChange={() => onToggle('tours')} label="Tour reminders" />
      </div>
      <div className="pw-settings__row pw-settings__row--toggle">
        <span>Price Drop Alerts</span>
        <Toggle on={value.priceDrops} onChange={() => onToggle('priceDrops')} label="Price drop alerts" />
      </div>
      <div className="pw-settings__row pw-settings__row--toggle">
        <span>New Unit Notifications</span>
        <Toggle on={value.newUnits} onChange={() => onToggle('newUnits')} label="New unit notifications" />
      </div>
    </div>
  </Sheet>
);

export const SettingsSheet = ({ open, email, version, onClose }: { open: boolean; email: string; version: string; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} title="Settings" zIndex={320}>
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
