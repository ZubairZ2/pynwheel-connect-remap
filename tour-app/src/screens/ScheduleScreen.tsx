import { DEMO, LEASING_PHONE, PARTY_MAX, TOUR_LENGTHS } from '~/content/demoFixtures';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Callout, Chip, Eyebrow, Segmented } from '~/components/ui2';
import { dayKey, type ScheduleDraft } from '~/store/appState';
import { DOW, MON, dayLabel, parseDay } from '~/store/scenarios';
import { afterSlots, daySlots } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  propertyName: string;
  propertyAddress: string;
  draft: ScheduleDraft;
  done: boolean;
  unitOptions: string[];
  verified: boolean;
  onChange: (patch: Partial<ScheduleDraft>) => void;
  onConfirm: () => void;
  onBack: () => void;
  onVerify: () => void;
  onCalendar: () => void;
  onDirections: () => void;
  onHome: () => void;
}

/**
 * Schedule Self-Tour: the seven-day strip, daytime and after-hours slots,
 * tour length, the unit of interest, party size and the "book via" note, then
 * the confirmation card. The booking is kept on this phone only: the
 * scheduling backend is not part of this phase, so everything here is marked
 * as demo data.
 */
export const ScheduleScreen = ({ propertyName, propertyAddress, draft, done, unitOptions, verified, onChange, onConfirm, onBack, onVerify, onCalendar, onDirections, onHome }: Props) => {
  const days = Array.from({ length: 7 }, (_, i) => dayKey(i));
  const day = daySlots(draft.date);
  const after = afterSlots(draft.date);
  const noSlots = !day.length && !after.length;

  return (
    <LightShell>
      <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Schedule Self-Tour" />
      {!done ? (
        <div className="pw-sched">
          <div className="pw-sched__where">
            {propertyName} · {propertyAddress}
          </div>
          <div className="pw-sched__block">
            <Eyebrow>Date</Eyebrow>
            <div className="pw-sched__days">
              {days.map((key, i) => {
                const d = parseDay(key);
                const on = draft.date === key;
                return (
                  <button key={key} type="button" className={`pw-sched__day${on ? ' pw-sched__day--on' : ''}`} onClick={() => onChange({ date: key, time: [...daySlots(key), ...afterSlots(key)].includes(draft.time) ? draft.time : (daySlots(key)[0] ?? afterSlots(key)[0] ?? '') })} aria-pressed={on}>
                    <span className="pw-sched__dow">{i === 0 ? 'Today' : DOW[d.getDay()]}</span>
                    <span className="pw-sched__num">{d.getDate()}</span>
                    <span className="pw-sched__mon">{MON[d.getMonth()]}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="pw-sched__block">
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
            {noSlots ? <div className="pw-sched__noslots">No self-tour times on this day. Pick another day.</div> : null}
          </div>
          <div className="pw-sched__block">
            <Eyebrow>Tour length</Eyebrow>
            <Segmented options={TOUR_LENGTHS.map((n) => ({ id: String(n), label: `${n} min` }))} value={String(draft.length)} onChange={(id) => onChange({ length: Number(id) })} />
          </div>
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
          <div className="pw-sched__party">
            <div>
              <div className="pw-sched__partytitle">Party size</div>
              <div className="pw-sched__partysub">Including you</div>
            </div>
            <div className="pw-sched__stepper">
              <button type="button" aria-label="Fewer people" onClick={() => onChange({ party: Math.max(1, draft.party - 1) })}>
                <Icon name="minus" size={16} />
              </button>
              <span>{draft.party}</span>
              <button type="button" aria-label="More people" onClick={() => onChange({ party: Math.min(PARTY_MAX, draft.party + 1) })}>
                <Icon name="plus" size={16} />
              </button>
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
          <Button onClick={onConfirm} disabled={noSlots || !draft.time}>
            Confirm Self-Tour
          </Button>
          <div className="pw-sched__text">
            Also book by text: <b>{LEASING_PHONE}</b>
            {DEMO}
          </div>
        </div>
      ) : (
        <div className="pw-sched pw-sched--done">
          <div className="pw-sched__donehead">
            <span className="pw-sched__donebadge">
              <Icon name="check" size={30} color="var(--pw-primary)" strokeWidth={2.4} />
            </span>
            <div className="pw-sched__donetitle">Self-tour confirmed{DEMO}</div>
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
