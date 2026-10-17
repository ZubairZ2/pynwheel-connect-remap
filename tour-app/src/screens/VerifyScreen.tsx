import checkpointLogo from '~/assets/images/checkpointid.png';
import { DEMO } from '~/content/demoFixtures';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Eyebrow } from '~/components/ui2';
import type { VerifyFlow } from '~/store/appState';
import { LightShell } from './shared';

interface Props {
  propertyName: string;
  flow: VerifyFlow;
  requireCard: boolean;
  /** The demo toggle "Property requires card" (only on demo data: a real property's rule comes from the CMS later). */
  showCardDemo: boolean;
  onBack: () => void;
  onConsent: () => void;
  onNext: () => void;
  onCapture: (next: 'selfie' | 'card' | 'done') => void;
  onCard: (field: 'number' | 'expiry' | 'zip', value: string) => void;
  onSaveCard: () => void;
  onToggleRequireCard: () => void;
  onFinish: () => void;
}

/**
 * Verify Identity: intro (steps, consent, CheckpointID), Scan ID, Selfie,
 * Card on file, Done. The capture is simulated — CheckpointID is not
 * integrated in this phase — and the screen says so; the result lives on
 * this phone only. The CheckpointID wordmark is the legacy Pynwheel Tour
 * app's asset.
 */
export const VerifyScreen = ({ propertyName, flow, requireCard, showCardDemo, onBack, onConsent, onNext, onCapture, onCard, onSaveCard, onToggleRequireCard, onFinish }: Props) => {
  const order: VerifyFlow['step'][] = ['scan', 'selfie', 'card', 'done'];
  const idx = order.indexOf(flow.step);
  const steps = [
    ['scan', 'Scan ID'],
    ['selfie', 'Selfie'],
    ['card', requireCard ? 'Card' : 'Card · n/a'],
    ['done', 'Done']
  ] as const;

  const demoToggle = showCardDemo ? (
    <button type="button" className="pw-verify__demo" onClick={onToggleRequireCard}>
      <span>
        <b>Demo</b> · Property requires card: {requireCard ? 'On' : 'Off'}
      </span>
      <span className={`pw-verify__demotrack${requireCard ? ' pw-verify__demotrack--on' : ''}`}>
        <i />
      </span>
    </button>
  ) : null;

  return (
    <LightShell>
      <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Verify Identity" />
      {flow.step !== 'intro' ? (
        <div className="pw-verify__progress">
          {steps.map(([id, label], i) => {
            const skipped = id === 'card' && !requireCard;
            const done = i < idx || flow.step === 'done';
            const cur = i === idx;
            return (
              <div key={id} className="pw-verify__seg" style={{ opacity: skipped ? 0.5 : 1 }}>
                <div className={`pw-verify__bar${!skipped && (done || cur) ? ' pw-verify__bar--on' : ''}`} />
                <div className={`pw-verify__seglabel${cur ? ' pw-verify__seglabel--on' : ''}`}>{label}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      {flow.step === 'intro' ? (
        <div className="pw-verify pw-verify--intro">
          <span className="pw-verify__badge">
            <Icon name="shield" size={30} color="var(--pw-primary)" />
          </span>
          <div className="pw-verify__title">Before we can proceed, we need to verify your identity</div>
          <div className="pw-verify__list">
            <div>
              <span>1</span>Scan the front of your government ID
            </div>
            <div>
              <span>2</span>Take a quick selfie
            </div>
            <div style={{ opacity: requireCard ? 1 : 0.45 }}>
              <span>3</span>Card on file · {requireCard ? 'required here' : 'not required'}
            </div>
          </div>
          {demoToggle}
          <button type="button" className="pw-verify__consent" onClick={onConsent} aria-pressed={flow.consent}>
            <span className={`pw-verify__box${flow.consent ? ' pw-verify__box--on' : ''}`}>
              <Icon name="check" size={13} color="#fff" strokeWidth={3.2} />
            </span>
            <span>
              I agree to the <u>self-tour terms</u>
            </span>
          </button>
          <div className="pw-verify__spacer" />
          <div className="pw-verify__introfoot">
            <div className="pw-verify__powered">
              <Eyebrow>Powered by</Eyebrow>
              <span className="pw-verify__brand"><img src={checkpointLogo} alt="CheckpointID" height={14} /></span>
            </div>
            <button type="button" className="pw-verify__next" aria-label="Next" onClick={onNext} style={{ opacity: flow.consent ? 1 : 0.4 }}>
              <Icon name="chevronRight" size={22} color="#fff" strokeWidth={2.4} />
            </button>
          </div>
          <div className="pw-verify__simnote">The scan is simulated in this build: no document or photo leaves your phone.{DEMO}</div>
        </div>
      ) : null}

      {flow.step === 'scan' ? (
        <div className="pw-verify">
          <div>
            <div className="pw-verify__h2">Scan your ID</div>
            <div className="pw-verify__sub">Scan the front of your government ID</div>
          </div>
          <div className="pw-verify__cardframe" aria-hidden>
            <i className="pw-verify__corner pw-verify__corner--tl" />
            <i className="pw-verify__corner pw-verify__corner--tr" />
            <i className="pw-verify__corner pw-verify__corner--bl" />
            <i className="pw-verify__corner pw-verify__corner--br" />
            <span className="pw-verify__photo" />
            <span className="pw-verify__lines">
              <i />
              <i />
              <i />
            </span>
            {flow.scanning ? <span className="pw-verify__beam" /> : null}
          </div>
          <div className="pw-verify__tip">Flat, well-lit surface · avoid glare</div>
          <Button onClick={() => onCapture('selfie')} busy={flow.scanning}>
            {flow.scanning ? 'Scanning…' : 'Simulate scan'}
          </Button>
        </div>
      ) : null}

      {flow.step === 'selfie' ? (
        <div className="pw-verify pw-verify--center">
          <div className="pw-verify__left">
            <div className="pw-verify__h2">Take a selfie</div>
            <div className="pw-verify__sub">We&rsquo;ll match it to the photo on your ID.</div>
          </div>
          <div className={`pw-verify__selfie${flow.scanning ? ' pw-verify__selfie--live' : ''}`} aria-hidden>
            <i />
          </div>
          <div className="pw-verify__h3">Center your face</div>
          <div className="pw-verify__tip">Good lighting · remove sunglasses</div>
          <Button onClick={() => onCapture(requireCard ? 'card' : 'done')} busy={flow.scanning}>
            {flow.scanning ? 'Checking…' : 'Simulate selfie'}
          </Button>
        </div>
      ) : null}

      {flow.step === 'card' ? (
        <div className="pw-verify">
          <div>
            <div className="pw-verify__h2">Card on file</div>
            <div className="pw-verify__sub">{propertyName} requires a card for self-tours.</div>
          </div>
          <label className="pw-verify__field">
            <Eyebrow>Card number</Eyebrow>
            <input inputMode="numeric" value={flow.card.number} onChange={(e) => onCard('number', e.target.value)} placeholder="4242 4242 4242 4242" className="pw-input" />
          </label>
          <div className="pw-verify__pair">
            <label className="pw-verify__field">
              <Eyebrow>Expiry</Eyebrow>
              <input value={flow.card.expiry} onChange={(e) => onCard('expiry', e.target.value)} placeholder="MM / YY" className="pw-input" />
            </label>
            <label className="pw-verify__field">
              <Eyebrow>ZIP</Eyebrow>
              <input inputMode="numeric" value={flow.card.zip} onChange={(e) => onCard('zip', e.target.value)} placeholder="80205" className="pw-input" />
            </label>
          </div>
          <div className="pw-verify__note">
            <Icon name="lock" size={16} color="var(--pw-primary)" />
            No charge is made. The card is not sent anywhere in this build; a real card vault comes with the booking backend.{DEMO}
          </div>
          {demoToggle}
          <Button onClick={onSaveCard}>Save card</Button>
        </div>
      ) : null}

      {flow.step === 'done' ? (
        <div className="pw-verify pw-verify--done">
          <span className="pw-verify__donering">
            <span>
              <Icon name="check" size={30} color="#fff" strokeWidth={3} />
            </span>
          </span>
          <span className="pw-verify__verified">Verified</span>
          <div className="pw-verify__title pw-verify__title--center">The document and face have been verified{DEMO}</div>
          <div className="pw-verify__facts">
            <div>
              <Icon name="calendar" size={16} color="var(--pw-primary)" />
              Valid for all Pynwheel communities for 12 months
            </div>
            {requireCard ? (
              <div>
                <Icon name="creditcard" size={16} color="var(--pw-primary)" />
                Card ending {flow.card.number.replace(/\D/g, '').slice(-4) || '4242'} · held, not charged
              </div>
            ) : null}
          </div>
          <div className="pw-verify__spacer" />
          <Button onClick={onFinish}>{flow.then === 'start' ? 'Continue to Your Tour' : 'Continue'}</Button>
        </div>
      ) : null}
    </LightShell>
  );
};
