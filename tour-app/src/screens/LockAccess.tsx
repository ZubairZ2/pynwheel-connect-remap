import { Icon } from '~/components/Icon';
import { Button, ErrorBanner } from '~/components/ui';
import type { LockPin, StopLock } from '~/models';
import type { LockRequestStatus } from '~/store/appState';

/**
 * The smart-lock card of a stop, the Capacitor app's port of the legacy
 * Pynwheel Tour app's lock screen for PIN locks: the lock's vendor, then
 * either the door code the backend issued (with its validity and how to use
 * it, and "get a new code" when it does not work, as the legacy "Retry"
 * did) or the button that asks for one.
 *
 * An igloohome v1 lock opens over Bluetooth through the native igloohome
 * SDK (the IgloohomeBle plugin): one "Unlock Door" button, the phase the
 * SDK is in, cancel, and the same "Unlocked — push door" state as the
 * reference. Where the plugin is not compiled in (the browser, iOS until
 * its SDK dependencies are wired) the card says so instead of pretending.
 * The other vendors' locks (Latch, Zerv, …) are reported as unsupported.
 */

export const lockLabel = (lock: StopLock): string => {
  if (lock.provider === 'Igloohome') return lock.mode === 'iglooworks' ? 'Iglooworks smart lock' : 'igloohome smart lock';
  return `${lock.provider} smart lock`;
};

export const unsupportedText = (lock: StopLock): string => {
  if (lock.provider === 'Igloohome' && !lock.deviceId) return 'This stop has no igloohome lock assigned to it yet. Ask the leasing office for access.';
  if (lock.provider === 'Igloohome' && lock.mode === 'v1') return 'This igloohome lock opens over Bluetooth, which this build of the app cannot do. Ask the leasing office for access.';
  if (lock.provider === 'Igloohome') return 'Door codes are not available for this property yet. Ask the leasing office for access.';
  return `This ${lock.provider} lock cannot be opened from this app yet. Ask the leasing office for access.`;
};

/** Whether the code's validity window has passed (the backend issues three-hour codes). */
export const pinExpired = (pin: LockPin, now = Date.now()): boolean => {
  if (!pin.validUntil) return false;
  const until = Date.parse(pin.validUntil);
  return !Number.isNaN(until) && until <= now;
};

const timeOf = (iso: string | null): string | null => {
  if (!iso) return null;
  const at = Date.parse(iso);
  return Number.isNaN(at) ? null : new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const PHASE_LABEL: Record<Exclude<LockRequestStatus, 'error'>, string> = {
  loading: 'Getting your key…',
  scanning: 'Looking for the lock…',
  connecting: 'Connecting to the lock…',
  unlocking: 'Unlocking…'
};

/** The Bluetooth flow (igloohome v1): whether this build can run it, its phase, whether the lock opened, and its controls. */
export interface BluetoothControls {
  available: boolean;
  phase: Exclude<LockRequestStatus, 'error'> | null;
  unlocked: boolean;
  onUnlock: () => void;
  onCancel: () => void;
}

interface Props {
  lock: StopLock;
  pin: LockPin | null;
  busy: boolean;
  error: string | null;
  onRequest: () => void;
  bluetooth?: BluetoothControls;
}

const BluetoothUnlock = ({ lock, error, bluetooth }: { lock: StopLock; error: string | null; bluetooth: BluetoothControls }) => {
  if (!bluetooth.available) {
    return (
      <div className="pw-lockcode__note" role="status">
        {unsupportedText({ ...lock, supported: false })}
      </div>
    );
  }
  if (bluetooth.unlocked && !bluetooth.phase) {
    return (
      <>
        <div className="pw-unlock__done pw-lockcode__done" role="status">
          <Icon name="check" size={18} color="var(--pw-primary)" />
          <span>Unlocked — Push Door To Enter</span>
        </div>
        <button type="button" className="pw-lockcode__retry" onClick={bluetooth.onUnlock}>
          Door closed again? Unlock once more
        </button>
      </>
    );
  }
  if (bluetooth.phase) {
    return (
      <>
        <Button busy>{PHASE_LABEL[bluetooth.phase]}</Button>
        <div className="pw-lockcode__how" role="status" aria-live="polite">
          Hold your phone near the lock.
        </div>
        <button type="button" className="pw-lockcode__retry" onClick={bluetooth.onCancel}>
          Cancel
        </button>
      </>
    );
  }
  return (
    <>
      {error ? <ErrorBanner title="The door did not open" body={error} /> : null}
      <Button onClick={bluetooth.onUnlock} icon="unlock">
        {error ? 'Try Again' : 'Unlock Door'}
      </Button>
      <div className="pw-lockcode__how">Stand next to the door with Bluetooth on.</div>
    </>
  );
};

export const LockAccessCard = ({ lock, pin, busy, error, onRequest, bluetooth }: Props) => {
  const expired = pin ? pinExpired(pin) : false;
  const until = pin ? timeOf(pin.validUntil) : null;
  const viaBluetooth = lock.supported && lock.method === 'bluetooth' && bluetooth != null;
  const open = viaBluetooth ? bluetooth.unlocked && !bluetooth.phase : !!pin && !expired;
  return (
    <div className="pw-lockcode" data-testid="lock-access">
      <div className="pw-unlock__lock">
        <Icon name={open ? 'unlock' : 'lock'} size={16} color="var(--pw-text-muted)" />
        <span>
          {lockLabel(lock)}
          {lock.supported ? (viaBluetooth ? ' · Bluetooth' : ' · Door code') : ''}
        </span>
      </div>
      {viaBluetooth ? (
        <BluetoothUnlock lock={lock} error={error} bluetooth={bluetooth} />
      ) : !lock.supported ? (
        <div className="pw-lockcode__note" role="status">
          {unsupportedText(lock)}
        </div>
      ) : pin && !expired ? (
        <>
          <div className="pw-lockcode__pin" role="status" aria-label={`Door code ${pin.pin.split('').join(' ')}`}>
            {pin.pin}
          </div>
          <div className="pw-lockcode__meta">{until ? `Valid until ${until}` : 'Valid for the next few hours'}</div>
          <div className="pw-lockcode__how">Enter the code on the lock&rsquo;s keypad, then press the unlock key.</div>
          {error ? <ErrorBanner title="A new code could not be issued" body={error} /> : null}
          <button type="button" className="pw-lockcode__retry" onClick={onRequest} disabled={busy}>
            {busy ? 'Getting a new code…' : 'Not working? Get a new code'}
          </button>
        </>
      ) : (
        <>
          {pin && expired ? <div className="pw-lockcode__meta">The previous door code has expired.</div> : null}
          {error ? <ErrorBanner title="No door code yet" body={error} /> : null}
          <Button onClick={onRequest} busy={busy} icon="unlock">
            {pin && expired ? 'Get A New Door Code' : error ? 'Try Again' : 'Get Door Code'}
          </Button>
        </>
      )}
    </div>
  );
};
