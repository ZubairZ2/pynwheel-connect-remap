import { Icon } from '~/components/Icon';
import { Button, ErrorBanner } from '~/components/ui';
import type { LockPin, StopLock } from '~/models';

/**
 * The smart-lock card of a stop, the Capacitor app's port of the legacy
 * Pynwheel Tour app's lock screen for PIN locks: the lock's vendor, then
 * either the door code the backend issued (with its validity and how to use
 * it, and "get a new code" when it does not work, as the legacy "Retry"
 * did) or the button that asks for one. A lock this app cannot open
 * (igloohome v1 and the other vendors' Bluetooth SDKs) says so instead of
 * pretending.
 */

export const lockLabel = (lock: StopLock): string => {
  if (lock.provider === 'Igloohome') return lock.mode === 'iglooworks' ? 'Iglooworks smart lock' : 'igloohome smart lock';
  return `${lock.provider} smart lock`;
};

export const unsupportedText = (lock: StopLock): string => {
  if (lock.provider === 'Igloohome' && lock.mode === 'v1') return 'This igloohome lock opens over Bluetooth in the Pynwheel Tour app and cannot be opened from this version yet. Ask the leasing office for access.';
  if (lock.provider === 'Igloohome' && !lock.deviceId) return 'This stop has no igloohome lock assigned to it yet. Ask the leasing office for access.';
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

interface Props {
  lock: StopLock;
  pin: LockPin | null;
  busy: boolean;
  error: string | null;
  onRequest: () => void;
}

export const LockAccessCard = ({ lock, pin, busy, error, onRequest }: Props) => {
  const expired = pin ? pinExpired(pin) : false;
  const until = pin ? timeOf(pin.validUntil) : null;
  return (
    <div className="pw-lockcode" data-testid="lock-access">
      <div className="pw-unlock__lock">
        <Icon name={pin && !expired ? 'unlock' : 'lock'} size={16} color="var(--pw-text-muted)" />
        <span>
          {lockLabel(lock)}
          {lock.supported ? ' · Door code' : ''}
        </span>
      </div>
      {!lock.supported ? (
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
