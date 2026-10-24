import { DEMO } from '~/content/demoFixtures';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Callout, Chip, Eyebrow, Segmented } from '~/components/ui2';
import { dayKey, type BookingState, type ScheduleDraft } from '~/store/appState';
import { dayKeyInZone } from '~/store/zone';
import { DOW, MON, dayLabel, parseDay } from '~/store/scenarios';
import { afterSlots, dayNote, daySlots, slotsForDay, tourLengthOptions, type Profile } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  propertyName: string;
  propertyAddress: string;
  draft: ScheduleDraft;
  done: boolean;
  unitOptions: string[];
  verified: boolean;
  /** The property's booking rules and slots, as the CMS answered them. */
  booking: BookingState;
  profile: Profile;
  /** True on the demo provider: the booking is local, the labels carry the `*` marker. */
  demo: boolean;
  /** The leasing office's phone from the CMS (text booking), null when it holds none. */
  phone: string | null;
  onChange: (patch: Partial<ScheduleDraft>) => void;
  onConfirm: () => void;
  onRetry: () => void;
  onBack: () => void;
  onVerify: () => void;
  onCalendar: () => void;
  onDirections: () => void;
  onHome: () => void;
}

/**
 * Schedule Self-Tour: the seven-day strip and the day's times come from the
 * property's booking rules (Settings › Scheduling in the CMS: visiting
 * hours, slot length, notice, horizon, closures, capacity); the tour length,
 * unit and party rows follow the CMS's Schedule-screen options; the booking
 * is made by the CMS, which checks the slot again. The "book via" note and
 * the leasing phone stay demo copy until the CMS carries them.
 */
export const ScheduleScreen = ({ propertyName, propertyAddress, draft, done, unitOptions, verified, booking, profile, demo, phone, onChange, onConfirm, onRetry, onBack, onVerify, onCalendar, onDirections, onHome }: Props) => {
  // The week starts on the property's today, not the phone's (October 25, 2026).
  const days = Array.from({ length: 7 }, (_, i) => dayKeyInZone(Date.now(), booking.settings?.timeZone, i));
  const day = daySlots(booking, draft.date);
  const after = afterSlots(booking, draft.date);
  const noSlots = !day.length && !after.length;
  const settings = booking.settings;
  const loading = booking.status === 'loading' && !booking.days[draft.date];
  const lengths = tourLengthOptions(settings);
  const partyMax = settings?.app.partySizeLimit ?? 6;
  const askUnit = settings?.app.askUnit ?? true;
  const showText = (settings?.app.showTextBooking ?? true) && !!phone;
  const askBedroom = settings?.form.showDesiredBedroom ?? false;
  const askMoveIn = settings?.form.showDesiredMoveInDate ?? false;
  const selfToursOff = !!settings && !settings.tourTypes.selfTour;
  const cardNote = settings?.form.creditCardRequired ? 'This property asks for a card on file before a self-tour; the leasing team will confirm it with you.' : null;
  const blocked = settings && !settings.bookable ? (settings.gateError ?? 'This property is not taking bookings right now.') : null;
  const email = profile.email;
  const detailsOk = !!(draft.first.trim() && draft.last.trim() && draft.phone.trim() && email.trim());
  const mark = demo ? DEMO : '';

  return (
    <LightShell>
      <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Schedule Self-Tour" />
      {!done ? (
        <div className="pw-sched">
          <div className="pw-sched__where">
            {propertyName} · {propertyAddress}
          </div>
          {booking.status === 'error' ? <Callout tone="warn" body={booking.error ?? 'The booking calendar could not be loaded.'} action={<Button variant="secondary" height={36} onClick={onRetry}>Retry</Button>} /> : null}
          {blocked ? <Callout tone="warn" body={<>Bookings are paused: {blocked}. Call the leasing office to arrange a visit.</>} /> : null}
          {selfToursOff && !blocked ? <Callout tone="warn" body="This property does not offer self-guided tours at the moment. Book a live tour with the leasing team instead." /> : null}
          {cardNote ? <Callout tone="info" body={cardNote} /> : null}
          <div className="pw-sched__block">
            <Eyebrow>Date</Eyebrow>
            <div className="pw-sched__days">
              {days.map((key, i) => {
                const d = parseDay(key);
                const on = draft.date === key;
                const open = slotsForDay(booking, key).length > 0;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`pw-sched__day${on ? ' pw-sched__day--on' : ''}`}
                    style={!open && booking.status === 'ready' ? { opacity: 0.45 } : undefined}
                    onClick={() => onChange({ date: key, time: slotsForDay(booking, key).includes(draft.time) ? draft.time : (slotsForDay(booking, key)[0] ?? '') })}
                    aria-pressed={on}
                  >
                    <span className="pw-sched__dow">{i === 0 ? 'Today' : DOW[d.getDay()]}</span>
                    <span className="pw-sched__num">{d.getDate()}</span>
                    <span className="pw-sched__mon">{MON[d.getMonth()]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pw-sched__block">
            {loading ? <div className="pw-sched__noslots">Loading times…</div> : null}
            {day.length ? (
              <>
                <Eyebrow>Daytime</Eyebrow>
                <div className="pw-sched__slots">
                  {day.map((t) => (
                    <Chip key={t} on={draft.time === t} onClick={() => onChange({ time: t })}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </>
            ) : null}
            {after.length ? (
              <>
                <div className="pw-sched__afterhead">
                  <Eyebrow>After hours</Eyebrow>
                  <span className="pw-sched__tag">Self-tour only</span>
                </div>
                <div className="pw-sched__slots">
                  {after.map((t) => (
                    <Chip key={t} on={draft.time === t} onClick={() => onChange({ time: t })}>
                      {t}
                    </Chip>
                  ))}
                </div>
              </>
            ) : null}
            {!loading && noSlots ? <div className="pw-sched__noslots">{dayNote(booking, draft.date) ?? 'No self-tour times on this day.'} Pick another day.</div> : null}
          </div>
          {lengths.length > 1 ? (
            <div className="pw-sched__block">
              <Eyebrow>Tour length</Eyebrow>
              <Segmented options={lengths.map((n) => ({ id: String(n), label: `${n} min` }))} value={String(lengths.includes(draft.length) ? draft.length : lengths[lengths.length - 1])} onChange={(id) => onChange({ length: Number(id) })} />
            </div>
          ) : null}
          {askUnit ? (
            <div className="pw-sched__block">
              <Eyebrow>Interested in</Eyebrow>
              <div className="pw-sched__units">
                {[...unitOptions, 'No preference'].map((u) => (
                  <Chip key={u} on={draft.unit === u} onClick={() => onChange({ unit: u })}>
                    {u}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <div className="pw-sched__party">
            <div>
              <div className="pw-sched__partytitle">Party size</div>
              <div className="pw-sched__partysub">Including you · up to {partyMax}</div>
            </div>
            <div className="pw-sched__stepper">
              <button type="button" aria-label="Fewer people" onClick={() => onChange({ party: Math.max(1, draft.party - 1) })}>
                <Icon name="minus" size={16} />
              </button>
              <span>{Math.min(draft.party, partyMax)}</span>
              <button type="button" aria-label="More people" onClick={() => onChange({ party: Math.min(partyMax, draft.party + 1) })}>
                <Icon name="plus" size={16} />
              </button>
            </div>
          </div>
          <div className="pw-sched__block">
            <Eyebrow>Your details</Eyebrow>
            <div className="pw-sched__slots" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input className="pw-input" placeholder="First name" aria-label="First name" autoComplete="given-name" value={draft.first} onChange={(e) => onChange({ first: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
                <input className="pw-input" placeholder="Last name" aria-label="Last name" autoComplete="family-name" value={draft.last} onChange={(e) => onChange({ last: e.target.value })} style={{ flex: 1, minWidth: 0 }} />
              </div>
              <input className="pw-input" placeholder="Mobile phone" aria-label="Mobile phone" inputMode="tel" autoComplete="tel" value={draft.phone} onChange={(e) => onChange({ phone: e.target.value })} />
              {askBedroom ? (
                <select className="pw-select" aria-label="Desired bedrooms" value={draft.bedroom} onChange={(e) => onChange({ bedroom: e.target.value })}>
                  <option value="">Desired bedrooms (optional)</option>
                  <option value="0">Studio</option>
                  <option value="1">1 bedroom</option>
                  <option value="2">2 bedrooms</option>
                  <option value="3">3 bedrooms</option>
                  <option value="4">4+ bedrooms</option>
                </select>
              ) : null}
              {askMoveIn ? <input className="pw-input" type="date" aria-label="Desired move-in date" value={draft.moveIn} min={dayKey(0)} onChange={(e) => onChange({ moveIn: e.target.value })} /> : null}
              <div className="pw-sched__partysub">{email ? `Confirmation to ${email}` : 'Sign in with your email to book.'}</div>
            </div>
          </div>
          <div className="pw-sched__block pw-sched__block--tight">
            <Eyebrow>Book via</Eyebrow>
            <div className="pw-sched__via">
              <span className="pw-sched__via--on">App</span>
              <span>SMS</span>
              <span>Website</span>
              <span>Zillow</span>
            </div>
            <div className="pw-sched__vianote">Every channel books the same calendar, so your tour shows up here either way.{DEMO}</div>
          </div>
          <Button onClick={onConfirm} disabled={noSlots || !draft.time || !detailsOk || !!blocked || selfToursOff || booking.saving} busy={booking.saving}>
            {booking.saving ? 'Booking…' : 'Confirm Self-Tour'}
          </Button>
          {booking.saveError ? <div className="pw-sched__noslots">{booking.saveError}</div> : null}
          {showText ? (
            <div className="pw-sched__text">
              Also book by text: <b>{phone}</b>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="pw-sched pw-sched--done">
          <div className="pw-sched__donehead">
            <span className="pw-sched__donebadge">
              <Icon name="check" size={30} color="var(--pw-primary)" strokeWidth={2.4} />
            </span>
            <div className="pw-sched__donetitle">Self-tour confirmed{mark}</div>
            <div className="pw-sched__where">
              {propertyName} · {propertyAddress}
            </div>
          </div>
          <div className="pw-sched__ticket">
            <div className="pw-sched__ticketdate">
              <div>{dayLabel(draft.date)}</div>
              <div>
                {draft.time} · {draft.length} min
              </div>
            </div>
            <div className="pw-sched__ticketgrid">
              <div>
                <Eyebrow>Interested in</Eyebrow>
                <b>{draft.unit}</b>
              </div>
              <div>
                <Eyebrow>Party</Eyebrow>
                <b>{draft.party === 1 ? 'Just me' : `${draft.party} people`}</b>
              </div>
            </div>
          </div>
          <div className="pw-sched__pair">
            <Button variant="secondary" height={46} onClick={onCalendar} style={{ fontSize: 13.5 }}>
              Add to calendar
            </Button>
            <Button variant="secondary" height={46} onClick={onDirections} style={{ fontSize: 13.5 }}>
              Get directions
            </Button>
          </div>
          <Callout tone="info" body={<>We&rsquo;ll remind you 24h and 1h before{DEMO}</>} />
          {!verified ? (
            <Button onClick={onVerify}>Verify your identity now</Button>
          ) : (
            <Callout tone="live" body="Identity verified. You're ready for tour day." />
          )}
          <Button variant="ghost" height={44} onClick={onHome}>
            Back To Home
          </Button>
          <div className="pw-sched__foot">You can also book on the property&rsquo;s website or lobby kiosk</div>
        </div>
      )}
    </LightShell>
  );
};
