import { useEffect, useRef, useState } from 'react';
import checkpointLogo from '~/assets/images/checkpointid.png';
import { DEMO } from '~/content/demoFixtures';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton, SelectableRow, Spinner } from '~/components/ui';
import { Callout, Eyebrow, LinkRow } from '~/components/ui2';
import type { IdDocumentType } from '~/repositories/tourRepository';
import { cameraSupported, captureFrame, fileToDataUrl, openCamera, stopStream } from '~/services/idCapture';
import { CARD_ELEMENT_STYLE, loadStripeJs, tokenizeCard, type StripeCardElement, type StripeInstance } from '~/services/stripeCard';
import { DOCUMENT_NEEDS_BACK, type VerificationInfo, type VerifyCapture, type VerifyFlow } from '~/store/appState';
import { LightShell } from './shared';

interface Props {
  propertyName: string;
  flow: VerifyFlow;
  /** The server's status as last read (null until `GET /verification` answered). */
  verification: VerificationInfo | null;
  /** Settings › Demo scenarios "ID verified": the sheet treats the visitor as verified; this screen says so instead of pretending. */
  demoVerified: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onConsent: () => void;
  onNext: () => void;
  onChooseDocument: (type: IdDocumentType) => void;
  onCaptured: (kind: VerifyCapture, image: string) => void;
  onRetake: (kind: VerifyCapture) => void;
  onRetry: () => void;
  onSaveCard: (token: string) => void;
  onCall: () => void;
  onFinish: () => void;
}

const FALLBACK_DOCUMENTS: { key: IdDocumentType; label: string; back: boolean }[] = [
  { key: 'drivers_license', label: "Driver's license", back: true },
  { key: 'id_card', label: 'ID card', back: true },
  { key: 'passport', label: 'Passport', back: false },
  { key: 'passport_card', label: 'Passport card', back: false },
  { key: 'international_id', label: 'International ID', back: false }
];

const fmtDate = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

/**
 * Verify Identity (October 28, 2026): the real CheckpointID check, run by
 * the Pynwheel server. Intro (steps, consent, the CheckpointID wordmark),
 * the document type, the camera for the document's front (and back) and a
 * selfie, the pending state while the server asks the provider, the result
 * (a pass moves on; a mismatch, an unreadable document or a rejection is
 * shown with the reason and a retry), the card on file through Stripe.js
 * where the property asks, and Done. Nothing here marks the visitor
 * verified: every step forward follows the server's status.
 */
export const VerifyScreen = (p: Props) => {
  const { flow, verification } = p;
  const order: VerifyStepId[] = ['scan', 'selfie', 'card', 'done'];
  const current: VerifyStepId = flow.step === 'intro' || flow.step === 'document' || flow.step === 'front' || flow.step === 'back' ? 'scan' : flow.step === 'selfie' || flow.step === 'submitting' || flow.step === 'result' ? 'selfie' : flow.step === 'card' ? 'card' : 'done';
  const idx = order.indexOf(current);
  const cardNeeded = verification?.card.needed ?? false;
  const steps = [
    ['scan', 'Scan ID'],
    ['selfie', 'Selfie'],
    ['card', cardNeeded ? 'Card' : 'Card · n/a'],
    ['done', 'Done']
  ] as const;

  // Back in the foreground (the visitor switched apps, the phone slept): the server's status is read again.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && (flow.step === 'intro' || flow.step === 'result' || flow.step === 'card')) p.onRefresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [flow.step, p]);

  return (
    <LightShell>
      <ScreenHeader left={flow.step === 'submitting' ? <span className="pw-verify__nobtn" /> : <IconButton icon="back" label="Back" onClick={p.onBack} />} title="Verify Identity" />
      {flow.step !== 'intro' ? (
        <div className="pw-verify__progress" aria-label="Progress">
          {steps.map(([id, label], i) => {
            const skipped = id === 'card' && !cardNeeded;
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

      {flow.step === 'intro' ? <Intro {...p} /> : null}
      {flow.step === 'document' ? <DocumentStep {...p} /> : null}
      {flow.step === 'front' || flow.step === 'back' || flow.step === 'selfie' ? <CaptureStep key={flow.step} kind={flow.step} documentType={flow.documentType} onCaptured={p.onCaptured} /> : null}
      {flow.step === 'submitting' ? <Pending /> : null}
      {flow.step === 'result' ? <ResultStep {...p} /> : null}
      {flow.step === 'card' ? <CardStep {...p} /> : null}
      {flow.step === 'done' ? <Done {...p} /> : null}
    </LightShell>
  );
};

type VerifyStepId = 'scan' | 'selfie' | 'card' | 'done';

// ───────── Intro: what will happen, the consent, the server's word ─────────
const Intro = ({ flow, verification, demoVerified, onBack, onRefresh, onConsent, onNext, onCall }: Props) => {
  const providerDown = verification ? !verification.providerAvailable : false;
  const mismatch = verification?.state === 'mismatch';
  const exhausted = verification ? verification.attemptsLeft <= 0 : false;
  const notRequired = verification ? !verification.propertyRequires : false;
  const blocked = flow.statusLoading || !!flow.statusError || providerDown || mismatch || exhausted || notRequired;
  const cardLine = !verification ? 'Card on file · where the property requires it' : verification.card.needed ? 'Card on file · required here' : verification.card.onFile ? `Card on file · ending ${verification.card.last4 ?? '••••'}` : 'Card on file · not required';
  return (
    <div className="pw-verify pw-verify--intro" data-testid="verify-intro">
      <span className="pw-verify__badge">
        <Icon name="shield" size={30} color="var(--pw-primary)" />
      </span>
      <div className="pw-verify__title">Before we can proceed, we need to verify your identity</div>
      <div className="pw-verify__list">
        <div>
          <span>1</span>Photograph your government ID
        </div>
        <div>
          <span>2</span>Take a quick selfie
        </div>
        <div style={{ opacity: verification && !verification.card.needed ? 0.45 : 1 }}>
          <span>3</span>
          {cardLine}
        </div>
      </div>
      {flow.statusLoading ? (
        <div className="pw-verify__status" role="status">
          <Spinner size={18} /> Checking what {`this property`} requires…
        </div>
      ) : null}
      {flow.statusError ? (
        <Callout
          tone={flow.statusError.unavailable ? 'info' : 'warn'}
          title={flow.statusError.unavailable ? 'Not available here' : "Couldn't reach Pynwheel"}
          body={flow.statusError.unavailable ? `${flow.statusError.message}${demoVerified ? ' The Demo scenarios switch already treats you as verified.' : ''}` : flow.statusError.message}
          action={
            flow.statusError.unavailable ? (
              <button type="button" className="pw-ci__warnbtn" onClick={onBack}>
                Back
              </button>
            ) : (
              <button type="button" className="pw-ci__warnbtn" onClick={onRefresh}>
                Try again
              </button>
            )
          }
        />
      ) : null}
      {notRequired ? <Callout tone="info" title="No ID check here" body="This property does not ask for ID verification before a tour." /> : null}
      {mismatch ? (
        <Callout
          title="The leasing team flagged an ID mismatch"
          body="A verification cannot be started on this account until the leasing team clears it. Please call the leasing office."
          action={
            <button type="button" className="pw-ci__warnbtn" onClick={onCall}>
              Call leasing
            </button>
          }
        />
      ) : null}
      {!mismatch && exhausted ? <Callout title="Too many attempts" body="Please wait an hour before trying again, or call the leasing office for help." /> : null}
      {!mismatch && !exhausted && providerDown ? <Callout title="ID verification is temporarily unavailable" body="The verification service is not reachable right now. Please try again in a few minutes." /> : null}
      <button type="button" className="pw-verify__consent" onClick={onConsent} aria-pressed={flow.consent} disabled={blocked}>
        <span className={`pw-verify__box${flow.consent ? ' pw-verify__box--on' : ''}`}>
          <Icon name="check" size={13} color="#fff" strokeWidth={3.2} />
        </span>
        <span>
          I agree to the <u>self-tour terms</u> and to my ID and selfie being checked by CheckpointID
        </span>
      </button>
      <div className="pw-verify__spacer" />
      <div className="pw-verify__introfoot">
        <div className="pw-verify__powered">
          <Eyebrow>Powered by</Eyebrow>
          <span className="pw-verify__brand">
            <img src={checkpointLogo} alt="CheckpointID" height={14} />
          </span>
        </div>
        <button type="button" className="pw-verify__next" aria-label="Next" onClick={onNext} disabled={blocked} style={{ opacity: flow.consent && !blocked ? 1 : 0.4 }}>
          <Icon name="chevronRight" size={22} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
      <div className="pw-verify__simnote">Your pictures go to Pynwheel's server once, for this check, and are not stored on this phone.</div>
    </div>
  );
};

// ───────── Document type ─────────
const DocumentStep = ({ flow, verification, onChooseDocument }: Props) => {
  const [choice, setChoice] = useState<IdDocumentType>(flow.documentType);
  const options = verification?.documentTypes.length ? verification.documentTypes : FALLBACK_DOCUMENTS;
  return (
    <div className="pw-verify" data-testid="verify-document">
      <div>
        <div className="pw-verify__h2">Which ID will you use?</div>
        <div className="pw-verify__sub">A licence or ID card is photographed on both sides; a passport only on its photo page.</div>
      </div>
      <div className="pw-verify__docs">
        {options.map((o) => (
          <SelectableRow key={o.key} selected={choice === o.key} onToggle={() => setChoice(o.key)} title={o.label} meta={o.back ? 'Front and back' : 'Photo page'} icon="file" trailing="check" />
        ))}
      </div>
      <div className="pw-verify__spacer" />
      <Button onClick={() => onChooseDocument(choice)}>Continue</Button>
    </div>
  );
};

// ───────── Camera: the document's front / back, the selfie ─────────
const CAPTURE_COPY: Record<VerifyCapture, { title: string; sub: string; tip: string }> = {
  front: { title: 'Scan the front of your ID', sub: 'Hold it flat inside the frame, every corner visible.', tip: 'Flat, well-lit surface · avoid glare' },
  back: { title: 'Now the back of your ID', sub: 'The barcode or machine-readable lines must be sharp.', tip: 'Flat, well-lit surface · avoid glare' },
  selfie: { title: 'Take a selfie', sub: "We'll match it to the photo on your ID.", tip: 'Good lighting · remove sunglasses and hats' }
};

const CaptureStep = ({ kind, documentType, onCaptured }: { kind: VerifyCapture; documentType: IdDocumentType; onCaptured: (kind: VerifyCapture, image: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [live, setLive] = useState(false);
  const [cameraError, setCameraError] = useState<'unsupported' | 'denied' | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const facing = kind === 'selfie' ? 'user' : 'environment';
  const copy = CAPTURE_COPY[kind];
  const stepNo = kind === 'front' ? 1 : kind === 'back' ? 2 : DOCUMENT_NEEDS_BACK[documentType] ? 3 : 2;
  const total = DOCUMENT_NEEDS_BACK[documentType] ? 3 : 2;

  useEffect(() => {
    let active = true;
    setLive(false);
    setCameraError(null);
    if (!cameraSupported()) {
      setCameraError('unsupported');
      return undefined;
    }
    openCamera(facing)
      .then((stream) => {
        if (!active) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.play().catch(() => undefined);
        }
        setLive(true);
      })
      .catch(() => {
        if (active) setCameraError('denied');
      });
    return () => {
      active = false;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [facing, kind]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !live) return;
    try {
      setPreview(captureFrame(video, { mirror: kind === 'selfie' }));
    } catch {
      setCameraError('denied');
    }
  };
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await fileToDataUrl(file));
    } catch {
      setCameraError('denied');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={`pw-verify${kind === 'selfie' ? ' pw-verify--center' : ''}`} data-testid={`verify-${kind}`}>
      <div className={kind === 'selfie' ? 'pw-verify__left' : undefined}>
        <Eyebrow>
          Step {stepNo} of {total}
        </Eyebrow>
        <div className="pw-verify__h2">{copy.title}</div>
        <div className="pw-verify__sub">{copy.sub}</div>
      </div>
      <div className={kind === 'selfie' ? 'pw-verify__selfieframe' : 'pw-verify__cardframe pw-verify__cardframe--live'} aria-live="polite">
        {preview ? (
          <img src={preview} alt={kind === 'selfie' ? 'Your selfie' : 'Your ID'} className="pw-verify__shot" />
        ) : (
          <video ref={videoRef} className={`pw-verify__video${kind === 'selfie' ? ' pw-verify__video--mirror' : ''}${live ? '' : ' pw-verify__video--off'}`} playsInline muted autoPlay />
        )}
        {!preview && kind !== 'selfie' ? (
          <>
            <i className="pw-verify__corner pw-verify__corner--tl" />
            <i className="pw-verify__corner pw-verify__corner--tr" />
            <i className="pw-verify__corner pw-verify__corner--bl" />
            <i className="pw-verify__corner pw-verify__corner--br" />
          </>
        ) : null}
        {!preview && !live && !cameraError ? (
          <span className="pw-verify__camwait">
            <Spinner size={22} light /> Starting the camera…
          </span>
        ) : null}
        {!preview && cameraError ? (
          <span className="pw-verify__camwait">
            <Icon name="camera" size={22} color="#fff" />
            {cameraError === 'unsupported' ? 'No camera is available here. Choose a photo instead.' : 'The camera was not allowed. Allow it in Settings, or choose a photo.'}
          </span>
        ) : null}
      </div>
      <div className="pw-verify__tip">{copy.tip}</div>
      {preview ? (
        <div className="pw-verify__pair">
          <Button variant="secondary" onClick={() => setPreview(null)}>
            Retake
          </Button>
          <Button onClick={() => onCaptured(kind, preview)}>Use photo</Button>
        </div>
      ) : (
        <>
          <Button onClick={shoot} disabled={!live} icon="camera" busy={busy}>
            {kind === 'selfie' ? 'Take selfie' : 'Take photo'}
          </Button>
          <button type="button" className="pw-verify__pick" onClick={() => fileRef.current?.click()}>
            {cameraError ? 'Choose a photo' : 'Use a photo instead'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture={facing} hidden onChange={(e) => void pick(e.target.files?.[0])} />
        </>
      )}
    </div>
  );
};

// ───────── Pending: the server is asking CheckpointID ─────────
const Pending = () => (
  <div className="pw-verify pw-verify--done" role="status" aria-live="polite" data-testid="verify-pending">
    <span className="pw-verify__pendingring">
      <Spinner size={34} />
    </span>
    <div className="pw-verify__h2">Verifying your ID…</div>
    <div className="pw-verify__sub pw-verify__sub--center">CheckpointID is checking your document and selfie. This usually takes under a minute. Keep the app open.</div>
  </div>
);

// ───────── Result: a failure, with the server's reason ─────────
const FAIL_TITLES: Record<string, string> = {
  face_mismatch: "We couldn't match your selfie to your ID",
  document_unreadable: "We couldn't read your ID",
  rejected: "Your ID couldn't be verified"
};

const ResultStep = ({ flow, verification, onRetry, onCall, onBack, onRefresh }: Props) => {
  const outcome = flow.result?.outcome ?? null;
  const error = flow.error;
  const exhausted = verification ? verification.attemptsLeft <= 0 : false;
  const title = error ? (error.code === 'attempt_limit' ? 'Too many attempts' : error.code === 'mismatch_flagged' ? 'The leasing team flagged an ID mismatch' : error.retryable ? 'Verification is unavailable right now' : "Your ID couldn't be verified") : (outcome && FAIL_TITLES[outcome]) || "Your ID couldn't be verified";
  const body = error ? error.message : flow.result?.reason || 'The verification provider did not accept the pictures.';
  const canRetry = error ? error.retryable || (error.code !== 'attempt_limit' && error.code !== 'mismatch_flagged' && error.code !== 'not_required' && error.code !== 'unavailable' && !exhausted) : !exhausted;
  return (
    <div className="pw-verify pw-verify--done" data-testid="verify-result">
      <span className="pw-verify__failring">
        <Icon name="warning" size={30} color="#fff" strokeWidth={2.4} />
      </span>
      <div className="pw-verify__title pw-verify__title--center">{title}</div>
      <div className="pw-verify__sub pw-verify__sub--center">{body}</div>
      {!error && outcome ? <div className="pw-verify__sub pw-verify__sub--center">Your tour stays on hold until a verification passes. Use good light, hold the ID flat and keep your face centred.</div> : null}
      {verification && !error ? <div className="pw-verify__attempts">{verification.attemptsLeft > 0 ? `${verification.attemptsLeft} ${verification.attemptsLeft === 1 ? 'attempt' : 'attempts'} left this hour` : 'No attempts left this hour'}</div> : null}
      <div className="pw-verify__spacer" />
      {canRetry ? <Button onClick={onRetry}>{error?.retryable ? 'Try again' : 'Scan again'}</Button> : null}
      {error?.retryable ? (
        <Button variant="secondary" height={46} onClick={onRefresh}>
          Check status
        </Button>
      ) : null}
      <div className="pw-ci__options">
        <LinkRow icon="phone" title="Call leasing" sub="Questions about verification" onClick={onCall} />
        <LinkRow icon="back" title="Not now" sub="Back to the tour overview" onClick={onBack} />
      </div>
    </div>
  );
};

// ───────── Card on file (Stripe.js) ─────────
const CardStep = ({ flow, verification, propertyName, onSaveCard, onCall, onBack }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<{ stripe: StripeInstance; element: StripeCardElement } | null>(null);
  const [ready, setReady] = useState(false);
  const [complete, setComplete] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const key = verification?.card.publishableKey ?? null;
  const available = !!(verification?.card.available && key);

  useEffect(() => {
    if (!available || !key) return undefined;
    let active = true;
    loadStripeJs()
      .then((factory) => {
        if (!active || !mountRef.current) return;
        const stripe = factory(key);
        const element = stripe.elements().create('card', { style: CARD_ELEMENT_STYLE, hidePostalCode: false });
        element.mount(mountRef.current);
        element.on('change', (event) => {
          setComplete(event.complete);
          setLocalError(event.error?.message ?? null);
        });
        stripeRef.current = { stripe, element };
        setReady(true);
      })
      .catch(() => {
        if (active) setLocalError('The card form could not be loaded. Check your connection and try again.');
      });
    return () => {
      active = false;
      try {
        stripeRef.current?.element.destroy();
      } catch {
        /* already gone */
      }
      stripeRef.current = null;
    };
  }, [available, key]);

  const save = async () => {
    if (!stripeRef.current || tokenizing) return;
    setTokenizing(true);
    setLocalError(null);
    try {
      const result = await tokenizeCard(stripeRef.current.stripe, stripeRef.current.element);
      if ('error' in result) setLocalError(result.error);
      else onSaveCard(result.token);
    } finally {
      setTokenizing(false);
    }
  };

  return (
    <div className="pw-verify" data-testid="verify-card">
      <div>
        <div className="pw-verify__h2">Card on file</div>
        <div className="pw-verify__sub">{propertyName} requires a card on file for self-tours. Your ID is verified; this is the last step.</div>
      </div>
      {available ? (
        <>
          <div className="pw-verify__field">
            <Eyebrow>Card details</Eyebrow>
            <div ref={mountRef} className={`pw-verify__stripe${ready ? '' : ' pw-verify__stripe--loading'}`} aria-busy={!ready} />
            {!ready && !localError ? (
              <div className="pw-verify__status" role="status">
                <Spinner size={16} /> Loading the secure card form…
              </div>
            ) : null}
          </div>
          {localError || flow.cardError ? <div className="pw-verify__error" role="alert">{localError ?? flow.cardError}</div> : null}
          <div className="pw-verify__note">
            <Icon name="lock" size={16} color="var(--pw-primary)" />
            No charge is made. The card is stored by Stripe; Pynwheel keeps only the last four digits.
          </div>
          <Button onClick={() => void save()} disabled={!ready || !complete} busy={tokenizing || flow.cardSaving}>
            Save card
          </Button>
        </>
      ) : (
        <>
          <Callout
            title="Card collection is not available right now"
            body="The property asks for a card on file, but the card service is not configured on the server. Please call the leasing office; your ID verification is kept."
            action={
              <button type="button" className="pw-ci__warnbtn" onClick={onCall}>
                Call leasing
              </button>
            }
          />
          <Button variant="secondary" height={46} onClick={onBack}>
            Back
          </Button>
        </>
      )}
    </div>
  );
};

// ───────── Done ─────────
const Done = ({ flow, verification, demoVerified, onFinish }: Props) => {
  const validUntil = verification?.validUntil ?? null;
  const days = verification?.validForDays ?? 30;
  return (
    <div className="pw-verify pw-verify--done" data-testid="verify-done">
      <span className="pw-verify__donering">
        <span>
          <Icon name="check" size={30} color="#fff" strokeWidth={3} />
        </span>
      </span>
      <span className="pw-verify__verified">Verified</span>
      <div className="pw-verify__title pw-verify__title--center">
        {flow.result?.outcome === 'already_verified' || (!flow.result && verification?.state === 'verified') ? 'Your ID is already verified' : 'Your document and selfie have been verified'}
        {!verification && demoVerified ? DEMO : ''}
      </div>
      <div className="pw-verify__facts">
        <div>
          <Icon name="calendar" size={16} color="var(--pw-primary)" />
          {validUntil ? `Valid for ${days} days · until ${fmtDate(validUntil)}` : `Valid for ${days} days`}
          {verification?.verifiedBy ? ` · ${verification.verifiedBy}` : ''}
        </div>
        {verification?.card.onFile ? (
          <div>
            <Icon name="creditcard" size={16} color="var(--pw-primary)" />
            Card ending {verification.card.last4 ?? '••••'} · held, not charged
          </div>
        ) : null}
      </div>
      <div className="pw-verify__spacer" />
      <Button onClick={onFinish}>{flow.then === 'start' ? 'Continue to Your Tour' : 'Continue'}</Button>
    </div>
  );
};
