import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DEMO, FINISHES, HOLD_HOURS, MOVE_IN_FEES } from '~/content/demoFixtures';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Pill, stopIconOf } from '~/components/ui';
import { Chip, Eyebrow } from '~/components/ui2';
import type { LockPin } from '~/models';
import { success, tap } from '~/services/native';
import type { AppState, Reaction } from '~/store/appState';
import type { TourStopView } from '~/store/selectors';
import { money, unitFacts } from '~/store/views';
import { LockAccessCard, type BluetoothControls } from './LockAccess';
import { LightShell } from './shared';

/** The smart-lock state of the stop on screen (the store's door code and request for this stop). */
export interface StopLockProps {
  lockPin: LockPin | null;
  lockBusy: boolean;
  lockError: string | null;
  onRequestPin: () => void;
  /** The igloohome v1 Bluetooth flow for this stop. */
  lockBluetooth: BluetoothControls;
}

interface Props extends StopLockProps {
  stop: TourStopView;
  stopNumber: number;
  stopTotal: number;
  isLast: boolean;
  virtual: boolean;
  demo: boolean;
  mark: string;
  unlocked: boolean;
  reaction: Reaction | null;
  favourite: boolean;
  photos: number;
  note: string;
  leaseTerm: AppState['leaseTerm'];
  held: boolean;
  compared: boolean;
  narration: AppState['narration'];
  now: number;
  onBack: () => void;
  onItinerary: () => void;
  onFavourite: () => void;
  onReaction: (r: Reaction) => void;
  onDemoUnlock: () => void;
  onVideo: () => void;
  onPano: () => void;
  onNote: () => void;
  onPhoto: () => void;
  onGallery: () => void;
  onAi: () => void;
  onLeaseTerm: (t: AppState['leaseTerm']) => void;
  onHold: () => void;
  onCompare: () => void;
  onNarration: (next: AppState['narration']) => void;
  onNext: () => void;
  onSkip: () => void;
}

const NARRATION_S = 42;

/**
 * The Stop screen: one screen for units and amenities. The lock card is the
 * real one where the CMS assigned a smart lock (door code / Bluetooth), the
 * design's slide-to-unlock on the demo property, and "Open access" where
 * there is no lock. Below it the stop's facts, the unit's floor plan and
 * pricing (demo-marked where the backend publishes no such data), photos,
 * the narration player, reactions, the actions grid, the concierge and
 * Next Stop (or Skip while the door is still locked).
 */
export const StopScreen = (p: Props) => {
  const { stop } = p;
  const isUnit = stop.kind === 'unit';
  const facts = stop.unit ? unitFacts(stop.unit, p.mark) : null;
  const realLock = stop.lock;
  const demoSlide = !realLock && p.demo && isUnit && !p.virtual;
  const locked = !p.virtual && ((realLock && realLock.supported && !p.unlocked) || (demoSlide && !p.unlocked));
  const open = !locked;

  // Slide to unlock (the demo property): 44 px thumb on a 52 px track, released past 85 %.
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startX: number; pct: number } | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const pct = drag?.pct ?? (p.unlocked ? 100 : 0);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (p.unlocked || unlocking) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, pct: 0 });
    void tap();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const w = (track.current?.clientWidth ?? 300) - 52;
    setDrag({ ...drag, pct: Math.max(0, Math.min(100, ((e.clientX - drag.startX) / w) * 100)) });
  };
  const onUp = () => {
    if (!drag) return;
    const done = drag.pct > 85;
    setDrag(null);
    if (done) {
      setUnlocking(true);
      window.setTimeout(() => {
        setUnlocking(false);
        p.onDemoUnlock();
        void success();
      }, 900);
    }
  };

  // Narration (simulated 0:42 clip).
  const n = p.narration;
  const mine = n.node === stop.node;
  const cur = mine ? Math.min(NARRATION_S, n.base + (n.startAt ? (p.now - n.startAt) / 1000 : 0)) : 0;
  const narrPlaying = mine && !!n.startAt && cur < NARRATION_S;
  const toggleNarr = () => {
    if (!mine || cur >= NARRATION_S) p.onNarration({ node: stop.node, base: 0, startAt: Date.now() });
    else if (n.startAt) p.onNarration({ node: stop.node, base: cur, startAt: null });
    else p.onNarration({ node: stop.node, base: n.base, startAt: Date.now() });
  };
  useEffect(() => () => undefined, []);

  const where = stop.floor || stop.floorLabel;
  // A lock this app cannot open (Zerv, Latch, Dwelo, …): the door is not unlocked, so the strip says so instead of claiming a code was accepted.
  const unsupported = !p.virtual && !!realLock && !realLock.supported;
  const stripTitle = p.virtual ? 'Virtual tour' : !realLock && !demoSlide ? 'Open access' : unsupported ? 'Staff-assisted door' : realLock?.method === 'pin' ? 'Code accepted — push the door to enter' : 'Door unlocked — push the door to enter';
  const stripSub = p.virtual ? 'Doors stay locked. Explore everything below.' : !realLock && !demoSlide ? (isUnit ? 'No smart lock on this door. Ask the leasing office if it is locked.' : 'Walk right in. No unlock needed.') : unsupported ? 'This lock cannot be opened from the app. The leasing office can let you in; you can still continue.' : 'Lock the door behind you when you leave.';
  const termRent = facts?.terms ? facts.terms[p.leaseTerm] : null;
  const feeTotal = MOVE_IN_FEES.reduce((a, f) => a + f.amount, 0);

  return (
    <LightShell
      footer={
        <div className="pw-stop__foot">
          {open ? (
            <Button onClick={p.onNext}>{p.isLast ? (p.virtual ? 'Finish Tour' : 'Next Stop') : 'Next Stop'}</Button>
          ) : (
            <Button variant="secondary" onClick={p.onSkip} style={{ color: 'var(--pw-text-muted)' }}>
              Skip to Next Stop
            </Button>
          )}
        </div>
      }
    >
      <div className="pw-stop">
        <div className="pw-stop__head">
          <IconButton icon="back" label="Back to directions" onClick={p.onBack} />
          <span className="pw-stop__count">
            Stop {p.stopNumber} of {p.stopTotal}
          </span>
          <div className="pw-stop__headright">
            <IconButton icon="heart" label="Save to favourites" onClick={p.onFavourite} className={p.favourite ? 'pw-stop__fav--on' : ''} />
            <IconButton icon="list" label="Itinerary" onClick={p.onItinerary} />
          </div>
        </div>
        <div className="pw-stop__body">
          <div className="pw-stop__titlerow">
            <div className="pw-stop__titles">
              <Pill>{isUnit ? 'Unit' : 'Amenity'}</Pill>
              <div className="pw-stop__name">{stop.name}</div>
              <div className="pw-stop__where">{where}</div>
            </div>
            <div className="pw-stop__headline">
              <div>{isUnit && facts ? facts.price : `~${stop.duration} min`}</div>
              <div>{isUnit && facts ? facts.avail : stop.amenity?.hours ? `Open ${stop.amenity.hours}${p.mark}` : 'Open to visitors'}</div>
            </div>
          </div>
          <div className="pw-stop__facts">
            {isUnit && facts ? (
              <>
                <span>{facts.beds}</span>
                {facts.sqft ? <span>{facts.sqft}</span> : null}
                {stop.unit?.model ? <span className="pw-stop__fact--hi">Model unit</span> : null}
              </>
            ) : (
              <>
                <span>{realLock ? (realLock.method === 'pin' ? 'Door code' : 'Mobile key') : 'Open access'}</span>
                {stop.amenity?.hours ? <span>{stop.amenity.hours}{p.mark}</span> : null}
              </>
            )}
          </div>

          {locked && realLock ? (
            <div className="pw-stop__lockcard">
              <div className="pw-stop__lockhead">
                <span className="pw-stop__lockicon">
                  <Icon name="lock" size={14} strokeWidth={2.2} />
                </span>
                <div>
                  <div className="pw-stop__locktitle">{realLock.method === 'pin' ? 'Enter the door code' : 'Unlock the door'}</div>
                  <div className="pw-stop__locksub">{realLock.method === 'pin' ? 'Get the code, then type it on the keypad next to the door.' : 'Hold your phone near the lock, then unlock.'}</div>
                </div>
              </div>
              <LockAccessCard lock={realLock} pin={p.lockPin} busy={p.lockBusy} error={p.lockError} onRequest={p.onRequestPin} bluetooth={p.lockBluetooth} />
              <button type="button" className="pw-textlink pw-textlink--muted" onClick={p.onSkip}>
                Lock not working? Get help or skip
              </button>
            </div>
          ) : null}

          {locked && demoSlide ? (
            <div className="pw-stop__lockcard">
              <div className="pw-stop__lockhead">
                <span className="pw-stop__lockicon">
                  <Icon name="lock" size={14} strokeWidth={2.2} />
                </span>
                <div>
                  <div className="pw-stop__locktitle">Unlock the door{DEMO}</div>
                  <div className="pw-stop__locksub">Hold your phone near the lock, then slide to unlock.</div>
                </div>
              </div>
              <div ref={track} className="pw-slide" role="slider" aria-label="Slide to unlock" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                <div className="pw-slide__fill" style={{ width: `calc((100% - 52px) * ${(pct / 100).toFixed(3)} + 48px)`, transition: drag ? 'none' : undefined }} />
                <div className="pw-slide__label">{unlocking ? 'Unlocking…' : 'Slide to unlock'}</div>
                <div className="pw-slide__thumb" style={{ left: `calc(4px + (100% - 52px) * ${(pct / 100).toFixed(3)})`, transition: drag ? 'none' : undefined }}>
                  <Icon name="chevronRight" size={18} color="#fff" strokeWidth={2.4} />
                </div>
              </div>
              <button type="button" className="pw-textlink pw-textlink--muted" onClick={p.onSkip}>
                Lock not working? Get help or skip
              </button>
            </div>
          ) : null}

          {open ? (
            <div className={`pw-stop__strip${unsupported ? ' pw-stop__strip--muted' : ''}`}>
              <span>
                <Icon name={unsupported ? 'lock' : 'check'} size={12} color="#fff" strokeWidth={3} />
              </span>
              <div>
                <div className="pw-stop__striptitle">{stripTitle}</div>
                <div className="pw-stop__stripsub">{stripSub}</div>
              </div>
            </div>
          ) : null}

          {!locked && realLock && !realLock.supported ? <LockAccessCard lock={realLock} pin={p.lockPin} busy={p.lockBusy} error={p.lockError} onRequest={p.onRequestPin} bluetooth={p.lockBluetooth} /> : null}

          {isUnit ? (
            <div className="pw-stop__section">
              <Eyebrow>Floor plan</Eyebrow>
              <div className="pw-stop__plan">
                <Icon name="bed" size={36} color="var(--pw-text-subtle)" />
                <div>
                  {facts?.beds}
                  {facts?.sqft ? ` · ${facts.sqft}` : ''}
                </div>
                <div className="pw-stop__plannote">{stop.unit?.floorplanName ? `${stop.unit.floorplanName} plan` : 'Floor plan image not published yet'}</div>
              </div>
            </div>
          ) : stop.amenity?.description ? (
            <div className="pw-stop__about">{stop.amenity.description}</div>
          ) : null}

          <div className="pw-stop__section">
            <div className="pw-stop__sectionhead">
              <Eyebrow>Photos</Eyebrow>
              <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onGallery}>
                See all
              </button>
            </div>
            <div className="pw-stop__photos">
              {Array.from({ length: p.photos }, (_, i) => (
                <span key={i} className="pw-stop__photo">
                  <Icon name="camera" size={18} color="var(--pw-primary)" />
                </span>
              ))}
              <button type="button" className="pw-stop__photo pw-stop__photo--add" onClick={p.onPhoto}>
                <Icon name="plus" size={16} />
                <span>Add</span>
              </button>
            </div>
          </div>

          <div className="pw-stop__narr">
            <button type="button" aria-label={narrPlaying ? 'Pause narration' : 'Play narration'} onClick={toggleNarr}>
              <Icon name={narrPlaying ? 'pause' : 'play'} size={13} color="#fff" />
            </button>
            <div>
              <div className="pw-stop__narrhead">
                <span>{isUnit ? 'Unit narration' : 'About this space'}{DEMO}</span>
                <span>
                  0:{String(Math.floor(cur)).padStart(2, '0')} / 0:{NARRATION_S}
                </span>
              </div>
              <div className="pw-stop__narrbar">
                <div style={{ width: `${Math.round((cur / NARRATION_S) * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="pw-stop__reactions">
            {(
              [
                ['love', 'Love'],
                ['like', 'Like'],
                ['no', 'Not for me']
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className={`pw-stop__reaction${p.reaction === id ? ' pw-stop__reaction--on' : ''}`} onClick={() => p.onReaction(id)} aria-pressed={p.reaction === id}>
                {label}
              </button>
            ))}
          </div>

          <div className="pw-stop__actions">
            {!isUnit && (stop.amenity?.videoUrl || p.demo) ? (
              <button type="button" onClick={p.onVideo}>
                <span>
                  <Icon name="play" size={14} />
                </span>
                Video
              </button>
            ) : null}
            {p.demo ? (
              <button type="button" onClick={p.onPano}>
                <span className="pw-stop__action360">360°</span>
                360° view
              </button>
            ) : null}
            <button type="button" onClick={p.onNote}>
              <span>
                <Icon name="pencil" size={15} />
              </span>
              Notes
            </button>
            <button type="button" onClick={p.onPhoto}>
              <span>
                <Icon name="camera" size={15} />
              </span>
              Photo
            </button>
          </div>
          {p.note.trim() ? <div className="pw-stop__note">{p.note}</div> : null}

          <button type="button" className="pw-stop__ai" onClick={p.onAi}>
            <span className="pw-stop__aiicon">
              <Icon name="sparkle" size={15} color="var(--pw-label-yellow)" />
            </span>
            <span className="pw-stop__aitext">
              <span>Ask the AI Concierge</span>
              <span>{isUnit ? 'Ask about pricing, pets, parking or this unit' : 'Ask anything about this space or the property'}</span>
            </span>
          </button>

          {isUnit && facts ? (
            <div className="pw-stop__section pw-stop__unit">
              {facts.terms ? (
                <>
                  <Eyebrow>Price by lease term{DEMO}</Eyebrow>
                  <div className="pw-stop__terms">
                    {([3, 6, 9, 12] as const).map((t) => (
                      <Chip key={t} on={p.leaseTerm === t} onClick={() => p.onLeaseTerm(t)} className="pw-stop__term">
                        <span>{t} mo</span>
                        <b>{money(facts.terms![t])}</b>
                      </Chip>
                    ))}
                  </div>
                </>
              ) : null}
              <Eyebrow>Finishes{DEMO}</Eyebrow>
              <div className="pw-stop__finishes">
                {FINISHES.map((f) => (
                  <div key={f}>
                    <Icon name="check" size={14} color="var(--pw-primary)" strokeWidth={2.6} />
                    {f}
                  </div>
                ))}
              </div>
              {termRent != null ? (
                <div className="pw-stop__movein">
                  <div className="pw-stop__moveinhead">Move-in cost estimate{DEMO}</div>
                  <div className="pw-stop__moveinbody">
                    <div>
                      <span>First month rent</span>
                      <b>{money(termRent)}</b>
                    </div>
                    {MOVE_IN_FEES.map((f) => (
                      <div key={f.label}>
                        <span>{f.label}</span>
                        <b>{money(f.amount)}</b>
                      </div>
                    ))}
                    <div className="pw-stop__moveintotal">
                      <span>Total due at move-in</span>
                      <b>{money(termRent + feeTotal)}</b>
                    </div>
                    <div className="pw-stop__moveinnote">Based on a {p.leaseTerm}-month lease. Final amounts are confirmed in your lease.</div>
                  </div>
                </div>
              ) : null}
              <div className="pw-stop__unitactions">
                <Button variant="secondary" height={46} onClick={p.onCompare} style={{ fontSize: 13 }}>
                  {p.compared ? '✓ In compare' : 'Add to compare'}
                </Button>
                <Button variant="secondary" height={46} onClick={p.onHold} style={{ fontSize: 13 }} disabled={p.held}>
                  {p.held ? `Held for ${HOLD_HOURS}h` : `Hold this unit (${HOLD_HOURS}h)`}
                </Button>
              </div>
            </div>
          ) : null}
          <span className="pw-stop__glyph" aria-hidden>
            <Icon name={isUnit ? 'bed' : stopIconOf(stop.icon)} size={14} />
          </span>
        </div>
      </div>
    </LightShell>
  );
};
