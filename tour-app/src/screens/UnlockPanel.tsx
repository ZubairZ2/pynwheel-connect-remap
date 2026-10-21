import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { DEMO } from '~/content/demoFixtures';
import { Icon } from '~/components/Icon';
import { Button, ErrorBanner } from '~/components/ui';
import type { AccessMethod, LockBluetoothKey, LockPin, StopLock } from '~/models';
import { success, tap } from '~/services/native';
import type { LockRequestStatus } from '~/store/appState';
import { pinExpired } from './LockAccess';

/**
 * The design's Unlock screen as one shared frame with a swappable method
 * block (the `Demo · Method` tweak: BLE · PIN · Remote · Gate), rendered in
 * the Stop screen for the stop's own access method.
 *
 *   - `ble`: the igloohome v1 Bluetooth key through the native plugin: the
 *     real Bluetooth availability, the SDK's phases while it scans / connects
 *     / unlocks, slide to unlock, cancel, the failure with Try again.
 *   - `pin`: the real door code the backend issues (igloohome API /
 *     Iglooworks), Copy, the keypad hint, when it expires, "I've entered the
 *     code" (the visitor's confirmation, never a claim that the door opened),
 *     an expired or refused code with "Get a new code".
 *   - `remote` / `gate`: on demo data only, the design's flows; on a real
 *     lock these appear only when a backend integration exists (none does
 *     today), so a real stop says so instead.
 *   - `unsupported`: a vendor this app cannot open (Latch, Zerv, Dwelo …):
 *     the honest note, no button that always succeeds.
 *
 * Below the method block: the success panel (Extend · Report · Next), and
 * the footer every variant shares (Try another method when the lock really
 * offers one, Report an issue, Call leasing, Skip this stop).
 */

export interface UnlockPanelProps {
  stopName: string;
  stopKind: 'unit' | 'amenity';
  lock: StopLock | null;
  method: AccessMethod;
  /** The alternates the lock genuinely supports (empty = no "Try another method"). */
  alternates: AccessMethod[];
  provider: string | null;
  demo: boolean;
  /** The design's Demo · Method switch (demo data only). */
  demoSwitch: boolean;
  /** Milliseconds of door access left (the in-person access window), null when not on an in-person tour. */
  accessLeftMs: number | null;
  unlocked: boolean;
  codeEntered: boolean;
  pin: LockPin | null;
  /** The Bluetooth key already fetched for the stop (its backup PIN is the PIN alternate). */
  bleKey: LockBluetoothKey | null;
  request: { status: LockRequestStatus; error: string | null } | null;
  bluetoothAvailable: boolean;
  isLast: boolean;
  onPickMethod: (method: AccessMethod) => void;
  onRequestPin: () => void;
  onBluetoothUnlock: () => void;
  onBluetoothCancel: () => void;
  onDemoUnlock: () => void;
  onCodeEntered: () => void;
  onExtend: (() => void) | null;
  onReport: () => void;
  onCall: () => void;
  onSkip: () => void;
  onNext: () => void;
  onToast: (message: string) => void;
}

const METHOD_LABEL: Record<AccessMethod, string> = { ble: 'BLE', pin: 'PIN', remote: 'Remote', gate: 'Gate', unsupported: 'Staff', none: 'Open' };
const METHOD_LONG: Record<AccessMethod, string> = { ble: 'tap / slide to unlock', pin: 'PIN code', remote: 'remote unlock', gate: 'gate opener', unsupported: 'staff-assisted door', none: 'open access' };
const PHASE_LABEL: Record<Exclude<LockRequestStatus, 'error'>, string> = { loading: 'Getting your key…', scanning: 'Looking for the lock…', connecting: 'Connecting to the lock…', unlocking: 'Unlocking…' };
const KEYPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];

const timeOf = (iso: string | null): string | null => {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const minutesLeft = (ms: number | null): number | null => (ms == null ? null : Math.max(0, Math.ceil(ms / 60000)));

export const UnlockPanel = (p: UnlockPanelProps) => {
  const { method, lock, demo } = p;
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<number | null>(null);
  const note = (text: string) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 2400);
  };
  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  // Demo remote / gate flows: a two-second "Unlocking…" then done, nothing sent anywhere.
  const [demoPhase, setDemoPhase] = useState<'idle' | 'loading'>('idle');
  const [relock, setRelock] = useState(0);
  useEffect(() => {
    if (!relock) return;
    const id = window.setInterval(() => setRelock((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearInterval(id);
  }, [relock]);
  useEffect(() => {
    setDemoPhase('idle');
    setRelock(0);
  }, [method, p.stopName]);

  // Slide to unlock (BLE): 56 px thumb on a 64 px track, released past 85 %.
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ startX: number; pct: number } | null>(null);
  const busy = !!p.request && p.request.status !== 'error';
  const phase = p.request && p.request.status !== 'error' ? p.request.status : null;
  const error = p.request?.status === 'error' ? p.request.error : null;
  const pct = drag?.pct ?? (p.unlocked && !phase ? 100 : 0);
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (busy || (p.unlocked && !demo)) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ startX: e.clientX, pct: 0 });
    void tap();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const w = Math.max(1, (track.current?.clientWidth ?? 313) - 64);
    setDrag({ ...drag, pct: Math.max(0, Math.min(100, ((e.clientX - drag.startX) / w) * 100)) });
  };
  const onUp = () => {
    if (!drag) return;
    const done = drag.pct >= 85;
    setDrag(null);
    if (!done) return;
    if (demo) {
      setDemoPhase('loading');
      window.setTimeout(() => {
        setDemoPhase('idle');
        p.onDemoUnlock();
        void success();
      }, 1200);
    } else p.onBluetoothUnlock();
  };

  const demoAction = () => {
    setDemoPhase('loading');
    window.setTimeout(() => {
      setDemoPhase('idle');
      setRelock(method === 'remote' ? 30 : 0);
      p.onDemoUnlock();
      void success();
    }, 2000);
  };

  const pin = p.pin;
  const expired = pin ? pinExpired(pin) : false;
  const backupPin = method === 'pin' && !pin && p.bleKey?.guestPin ? { pin: p.bleKey.guestPin, validFrom: p.bleKey.validFrom, validUntil: p.bleKey.validUntil, issuedAt: p.bleKey.issuedAt } : null;
  const shownPin = pin && !expired ? pin : backupPin;
  const left = minutesLeft(p.accessLeftMs);
  const typeLabel = p.stopKind === 'unit' ? 'Unit' : 'Amenity door';
  // "Done" for this panel: the door reported open (Bluetooth / demo), or the visitor confirmed typing the code.
  const done = method === 'pin' ? p.codeEntered && !!shownPin : method === 'unsupported' || method === 'none' ? false : p.unlocked && !phase;
  const successTitle = method === 'ble' ? 'Unlocked — push door to enter' : method === 'pin' ? 'Code entered — push the door to enter' : method === 'remote' ? 'Door unlocked — push to enter' : 'Gate open — walk through';

  const copyPin = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      note('Code copied');
    } catch {
      note('Copy is not available here');
    }
  };

  const tryAnother = () => {
    const next = p.alternates[0];
    if (!next) return;
    p.onPickMethod(next);
    note(`Switched to ${METHOD_LONG[next]}`);
  };

  const methodBlock = () => {
    switch (method) {
      case 'ble': {
        const available = demo || p.bluetoothAvailable;
        const pill = !available ? { tone: 'off', text: 'Bluetooth unlock not available on this device' } : phase === 'scanning' ? { tone: 'live', text: 'Bluetooth on · Looking for the lock' } : phase === 'connecting' || phase === 'unlocking' ? { tone: 'live', text: 'Bluetooth on · Lock in range' } : phase === 'loading' ? { tone: 'live', text: 'Bluetooth on · Getting your key' } : { tone: 'live', text: demo ? `Bluetooth on · Lock in range${DEMO}` : 'Bluetooth on · Hold near the lock' };
        return (
          <>
            <div className="pw-ul__row">
              <span className="pw-ul__blocktitle">Mobile key</span>
              <span className={`pw-ul__pill pw-ul__pill--${pill.tone}`}>
                <Icon name="bluetooth" size={11} strokeWidth={2.4} />
                {pill.text}
              </span>
            </div>
            {!available ? (
              <div className="pw-lockcode__note" role="status">
                This lock opens over Bluetooth through the igloohome app plugin, which this build of the app does not include. Ask the leasing office for access.
              </div>
            ) : (
              <>
                {error ? <ErrorBanner title="The door did not open" body={error} /> : null}
                <div ref={track} className={`pw-ul__track${busy || demoPhase === 'loading' ? ' pw-ul__track--busy' : ''}`} role="slider" aria-label="Slide to unlock" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
                  <div className="pw-ul__fill" style={{ width: `calc((100% - 64px) * ${(pct / 100).toFixed(3)} + 60px)`, transition: drag ? 'none' : undefined }} />
                  <div className="pw-ul__slidelabel">{phase ? PHASE_LABEL[phase] : demoPhase === 'loading' ? 'Unlocking…' : p.unlocked ? (demo ? 'Unlocked' : 'Unlocked · slide again if it closed') : error ? 'Slide to try again' : 'Slide to unlock'}</div>
                  <div className="pw-ul__thumb" style={{ left: `calc(4px + (100% - 64px) * ${(pct / 100).toFixed(3)})`, transition: drag ? 'none' : undefined }}>
                    <Icon name={p.unlocked && !phase ? 'unlock' : 'lock'} size={20} color="#fff" strokeWidth={2} />
                  </div>
                </div>
                <div className="pw-ul__hint">{phase ? 'Hold your phone near the reader' : 'Hold your phone near the reader, then slide'}</div>
                {phase ? (
                  <button type="button" className="pw-lockcode__retry" onClick={p.onBluetoothCancel}>
                    Cancel
                  </button>
                ) : null}
              </>
            )}
          </>
        );
      }
      case 'pin': {
        if (demo && !shownPin) {
          // The design's example code, marked as demo: never a real credential.
          const demoCode = '482913';
          return pinBlock(demoCode, `${timeOf(new Date(Date.now() + 38 * 60000).toISOString()) ?? ''}${DEMO}`, true);
        }
        if (shownPin) return pinBlock(shownPin.pin, timeOf(shownPin.validUntil), false);
        return (
          <>
            <div className="pw-ul__sub">{pin && expired ? 'The previous door code has expired.' : 'A temporary code is issued for this door while you are here.'}</div>
            {error ? <ErrorBanner title="No door code yet" body={error} /> : null}
            <Button onClick={p.onRequestPin} busy={busy} icon="unlock">
              {pin && expired ? 'Get A New Door Code' : error ? 'Try Again' : 'Get Door Code'}
            </Button>
          </>
        );
      }
      case 'remote':
        return (
          <>
            <div className="pw-ul__sub">Unlocks over the building network. No Bluetooth needed.{demo ? DEMO : ''}</div>
            {!demo ? (
              <div className="pw-lockcode__note" role="status">
                Remote unlocking for {p.provider ?? 'this'} locks is not connected to the app yet. Ask the leasing office for access.
              </div>
            ) : demoPhase === 'loading' ? (
              <Button busy>Unlocking…</Button>
            ) : p.unlocked ? (
              <div className="pw-ul__relock">
                <span>Door unlocked — push to enter</span>
                <b>{relock > 0 ? `Re-locks in 0:${String(relock).padStart(2, '0')}` : 'Re-locked'}</b>
              </div>
            ) : (
              <Button onClick={demoAction} icon="unlock">
                Unlock door
              </Button>
            )}
          </>
        );
      case 'gate':
        return (
          <>
            <div className="pw-ul__gate">
              <span className="pw-ul__gateicon">
                <Icon name="gate" size={24} strokeWidth={2} />
              </span>
              <div>
                <div className="pw-ul__blocktitle">{p.stopName.replace(/ \*$/, '')} gate</div>
                <div className="pw-ul__sub">Gate closes automatically{demo ? DEMO : ''}</div>
              </div>
            </div>
            {!demo ? (
              <div className="pw-lockcode__note" role="status">
                Gate opening for {p.provider ?? 'this'} is not connected to the app yet. Ask the leasing office for access.
              </div>
            ) : demoPhase === 'loading' ? (
              <Button busy>Opening gate…</Button>
            ) : p.unlocked ? (
              <div className="pw-ul__relock">
                <span>Gate open — walk through</span>
              </div>
            ) : (
              <Button onClick={demoAction}>Open gate</Button>
            )}
            {demo ? <div className="pw-ul__instructions"><b>Instructions:</b> wait for the gate to fully open, then follow the signs to the visitor entrance.{DEMO}</div> : null}
          </>
        );
      case 'unsupported':
        return (
          <div className="pw-lockcode__note" role="status">
            {lock?.provider === 'Igloohome' && !lock.deviceId ? 'This stop has no igloohome lock assigned to it yet. Ask the leasing office for access.' : `This ${p.provider ?? lock?.provider ?? ''} lock cannot be opened from this app yet. The leasing office can let you in; you can still continue the tour.`}
          </div>
        );
      default:
        return null;
    }
  };

  const pinBlock = (code: string, expires: string | null, isDemo: boolean) => (
    <>
      <div className="pw-ul__sub">{isDemo ? `A temporary PIN code has been issued${DEMO}` : backupPin && !pin ? 'Your backup keypad code, issued with the mobile key' : 'A temporary PIN code has been issued'}</div>
      <div className="pw-ul__pinrow">
        <div className="pw-ul__pin" role="status" aria-label={`Door code ${code.split('').join(' ')}`}>
          {code.length > 4 ? `${code.slice(0, 3)} ${code.slice(3)}` : code}
        </div>
        <button type="button" className="pw-ul__copy" onClick={() => void copyPin(code)}>
          Copy
        </button>
      </div>
      <div className="pw-ul__keypadrow">
        <div className="pw-ul__keypad" aria-hidden>
          {KEYPAD.map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
        <div>
          <div className="pw-ul__keypadtitle">Enter on the keypad, then press the unlock key</div>
          <div className="pw-ul__sub">{expires ? `Code expires at ${expires}` : 'Valid for the next few hours'}</div>
        </div>
      </div>
      {error ? <ErrorBanner title="A new code could not be issued" body={error} /> : null}
      {!p.codeEntered ? (
        <Button onClick={p.onCodeEntered}>I&rsquo;ve entered the code</Button>
      ) : null}
      {!isDemo ? (
        <button type="button" className="pw-lockcode__retry" onClick={p.onRequestPin} disabled={busy}>
          {busy ? 'Getting a new code…' : 'Not working? Get a new code'}
        </button>
      ) : null}
    </>
  );

  return (
    <div className="pw-ul" data-testid="unlock-panel" data-method={method}>
      {p.demoSwitch && demo ? (
        <div className="pw-ul__demo">
          <span>Demo · Method</span>
          <div>
            {(['ble', 'pin', 'remote', 'gate'] as const).map((m) => (
              <button key={m} type="button" className={m === method ? 'pw-ul__demo--on' : ''} onClick={() => p.onPickMethod(m)} aria-pressed={m === method}>
                {METHOD_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="pw-ul__meta">
        <span className="pw-ul__type">{typeLabel}</span>
        {p.provider ? (
          <span className="pw-ul__provider">
            <Icon name="lock" size={11} strokeWidth={2.2} />
            Powered by {p.provider}
          </span>
        ) : null}
      </div>
      {shownPin?.validUntil && method === 'pin' && !demo ? (
        <div className="pw-ul__valid">
          <Icon name="clock" size={14} strokeWidth={2} />
          Code valid until {timeOf(shownPin.validUntil)}
        </div>
      ) : left != null ? (
        // The check-in access window is kept on the phone (no backend holds one), so the line is marked as such.
        <div className="pw-ul__valid">
          <Icon name="clock" size={14} strokeWidth={2} />
          {left > 0 ? `Access valid for ${left} more min` : 'Your access window has ended'}
          {DEMO}
        </div>
      ) : null}
      <div className="pw-ul__block">{methodBlock()}</div>
      {done ? (
        <div className="pw-ul__done">
          <div className="pw-ul__donehead">
            <span className="pw-ul__donecheck">
              <Icon name="check" size={15} color="#fff" strokeWidth={3} />
            </span>
            <div>
              <div className="pw-ul__donetitle">{successTitle}</div>
              <div className="pw-ul__sub">{method === 'pin' ? 'If the door did not open, get a new code below.' : 'Lock the door behind you when you leave.'}</div>
            </div>
          </div>
          <div className="pw-ul__donegrid">
            {p.onExtend ? (
              <button type="button" onClick={p.onExtend}>
                Extend access
              </button>
            ) : null}
            <button type="button" onClick={p.onReport}>
              Report an issue
            </button>
          </div>
          <Button onClick={p.onNext}>{p.stopKind === 'unit' ? 'View unit details' : p.isLast ? 'Finish tour' : 'Next stop'}</Button>
        </div>
      ) : null}
      {notice ? <div className="pw-ul__notice">{notice}</div> : null}
      <div className="pw-ul__foot">
        {p.alternates.length ? (
          <button type="button" className="pw-textlink" onClick={tryAnother}>
            Didn&rsquo;t work? Try another method
          </button>
        ) : method !== 'none' ? (
          <div className="pw-ul__noalt">{method === 'unsupported' ? 'No other way in is set up for this door.' : 'This door has no other unlock method.'}</div>
        ) : null}
        <div className="pw-ul__footgrid">
          <button type="button" onClick={p.onReport}>
            Report an issue
          </button>
          <button type="button" onClick={p.onCall}>
            Call leasing
          </button>
        </div>
        <button type="button" className="pw-textlink pw-textlink--muted pw-ul__skip" onClick={p.onSkip}>
          Skip this stop and continue
        </button>
      </div>
    </div>
  );
};
