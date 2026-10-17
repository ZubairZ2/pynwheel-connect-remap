import { useEffect, useState } from 'react';
import communityPhoto from '~/assets/images/community-pool.jpg';
import { DEMO, DEMO_SAVED_ELSEWHERE, LEASING_PHONE, LINK_STEPS, REPORT_OPTIONS, SKIP_REASONS, type DemoExtraTour } from '~/content/demoFixtures';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Sheet } from '~/components/ui';
import { Callout, Eyebrow, LinkRow, RoundAction, TonePill } from '~/components/ui2';
import type { ScheduledTour, TourPass } from '~/store/appState';
import type { CheckinModel, LocationModel } from '~/store/scenarios';
import { dayLabel, fmtClock } from '~/store/scenarios';
import type { TourStopView } from '~/store/selectors';
import { unitFacts } from '~/store/views';

/* ───────── The sheets of the design refresh (October 17, 2026) ───────── */

interface CheckinProps {
  open: boolean;
  model: CheckinModel;
  onPrimary: () => void;
  onOption: (action: CheckinModel['options'][number]['action']) => void;
  onWarn: (action: 'qr' | 'retry' | 'settings') => void;
  onVirtual: () => void;
  onClose: () => void;
}

/** The check-in sheet: seven variants from the check-in model (ready, verify first, away, active, uncertain location, pending request, early). */
export const CheckinSheet = ({ open, model, onPrimary, onOption, onWarn, onVirtual, onClose }: CheckinProps) => (
  <Sheet open={open} onClose={onClose} zIndex={333} className="pw-ci" headerPadding="tight" testId="checkin-sheet">
    <div className="pw-ci__head">
      <span className={`pw-ci__icon pw-ci__icon--${model.tone}`}>
        <Icon name="pin" size={20} />
      </span>
      <div>
        <div className="pw-ci__title">{model.title}</div>
        <div className="pw-ci__sub">{model.sub}</div>
      </div>
    </div>
    {model.warn ? (
      <Callout
        title={model.warn.title}
        body={model.warn.body}
        action={
          <button type="button" className="pw-ci__warnbtn" onClick={() => onWarn(model.warn!.action)}>
            {model.warn.cta}
          </button>
        }
      />
    ) : null}
    {model.steps ? (
      <div className="pw-ci__steps">
        {model.steps.map((s) => (
          <div key={s.n + s.text} className="pw-ci__step">
            <span className={`pw-ci__stepn pw-ci__stepn--${s.tone}`}>{s.n}</span>
            <span>{s.text}</span>
            <b className={`pw-ci__stepstate--${s.tone}`}>{s.state}</b>
          </div>
        ))}
      </div>
    ) : null}
    <Button height={52} onClick={onPrimary}>
      {model.primary}
    </Button>
    {model.scenario !== 'active' ? (
      <button type="button" className="pw-ci__virtual" onClick={onVirtual}>
        <span>Take a Virtual Tour</span>
        <span>See every stop now. No check-in or ID needed.</span>
      </button>
    ) : null}
    <div className="pw-ci__options">
      {model.options.map((o) => (
        <LinkRow key={o.title} title={o.title} sub={o.sub} danger={o.danger} onClick={() => onOption(o.action)} />
      ))}
    </div>
  </Sheet>
);

export const CallSheet = ({ open, propertyName, onCall, onClose }: { open: boolean; propertyName: string; onCall: () => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={333} headerPadding="tight" className="pw-call">
    <div className="pw-ci__head">
      <span className="pw-ci__icon pw-ci__icon--ok">
        <Icon name="phone" size={20} />
      </span>
      <div>
        <div className="pw-ci__title">Call {propertyName}</div>
        <div className="pw-ci__sub">Leasing office · open today until 6:00 PM{DEMO}</div>
      </div>
    </div>
    <div className="pw-call__number">{LEASING_PHONE}{DEMO}</div>
    <Button onClick={onCall}>Call Now</Button>
    <Button variant="secondary" height={46} onClick={onClose}>
      Cancel
    </Button>
  </Sheet>
);

export const ChatOptionsSheet = ({ open, agentOnline, onAi, onAgent, onClose }: { open: boolean; agentOnline: boolean; onAi: () => void; onAgent: () => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={333} headerPadding="tight" className="pw-chatopts">
    <div className="pw-chatopts__title">How can we help?</div>
    <button type="button" className="pw-chatopts__row" onClick={onAi}>
      <span className="pw-chatopts__ai">
        <Icon name="sparkle" size={17} color="var(--pw-label-yellow)" />
      </span>
      <span>
        <span className="pw-chatopts__name">Ask the AI assistant</span>
        <span className="pw-chatopts__sub">Instant answers about pricing, pets, parking and your tour. Available 24/7.</span>
      </span>
      <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
    </button>
    {agentOnline ? (
      <button type="button" className="pw-chatopts__row" onClick={onAgent}>
        <span className="pw-chatopts__agent">
          MC
          <i />
        </span>
        <span>
          <span className="pw-chatopts__name">Chat with Maya{DEMO}</span>
          <span className="pw-chatopts__sub">Leasing agent · Online now · replies in a few minutes</span>
        </span>
        <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
      </button>
    ) : (
      <div className="pw-chatopts__offline">
        <i />
        No leasing agents are online right now. The AI assistant can help, or call the office between 9 AM and 6 PM.{DEMO}
      </div>
    )}
    <button type="button" className="pw-textlink" onClick={onClose}>
      Cancel
    </button>
  </Sheet>
);

interface LocationProps {
  open: boolean;
  sheet: 'ask' | 'pick' | 'manage' | null;
  model: LocationModel;
  onAllow: () => void;
  onDeny: () => void;
  onOpenSettings: () => void;
  onPrimary: (action: 'refresh' | 'qr' | 'settings') => void;
  onQr: () => void;
  onSearch: () => void;
  onClose: () => void;
}

/** Location permission: the first ask, "location is off" with Open Settings, or the manage sheet of the current scenario. */
export const LocationSheet = ({ open, sheet, model, onAllow, onDeny, onOpenSettings, onPrimary, onQr, onSearch, onClose }: LocationProps) => {
  const denied = model.perm === 'off' && sheet !== 'manage';
  const manage = sheet === 'manage';
  return (
    <Sheet open={open} onClose={onClose} zIndex={334} headerPadding="tight" className="pw-locsheet">
      <span className="pw-ci__icon pw-ci__icon--ok">
        <Icon name="pin" size={20} />
      </span>
      {denied ? (
        <>
          <div className="pw-ci__title">Location is turned off</div>
          <div className="pw-locsheet__body">To turn it on, open your phone&rsquo;s Settings, go to Pynwheel, then Location, and choose &ldquo;While Using the App&rdquo;. You can still find a property without it.</div>
          <Button height={48} onClick={onOpenSettings}>
            Open Settings
          </Button>
        </>
      ) : manage ? (
        <>
          <div className="pw-ci__title">{model.line}</div>
          <div className="pw-locsheet__body">{model.manageSub}</div>
          <Button height={48} onClick={() => onPrimary(model.primaryAction)}>
            {model.primaryLabel}
          </Button>
        </>
      ) : (
        <>
          <div className="pw-ci__title">Turn on location</div>
          <div className="pw-locsheet__body">We use your location to find the property you&rsquo;re at and show nearby properties. It&rsquo;s only used while the app is open.{DEMO}</div>
          <Button height={48} onClick={onAllow}>
            Allow Location
          </Button>
          <Button variant="secondary" height={46} onClick={onDeny}>
            Not Now
          </Button>
        </>
      )}
      <div className="pw-locsheet__alt">
        <button type="button" onClick={onQr}>
          Scan QR Code
        </button>
        <button type="button" onClick={onSearch}>
          Search Properties
        </button>
      </div>
    </Sheet>
  );
};

/** Scan QR code: the camera frame (no camera in this phase: the code is "found" after a moment), then the property card. */
export const QrSheet = ({ open, propertyName, propertyAddress, onFound, onUseLocation, onClose }: { open: boolean; propertyName: string; propertyAddress: string; onFound: () => void; onUseLocation: () => void; onClose: () => void }) => {
  const [found, setFound] = useState(false);
  useEffect(() => {
    if (!open) {
      setFound(false);
      return;
    }
    const id = window.setTimeout(() => setFound(true), 2200);
    return () => window.clearTimeout(id);
  }, [open]);
  if (!open) return null;
  return (
    <div className="pw-qr" role="dialog" aria-modal="true" aria-label="Scan QR code">
      <div className="pw-qr__top">
        <button type="button" className="pw-qr__close" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={18} color="#fff" strokeWidth={2.2} />
        </button>
        <span>Scan QR code</span>
        <span style={{ width: 36 }} />
      </div>
      <div className="pw-qr__center">
        <div className="pw-qr__frame" aria-hidden>
          <i className="pw-qr__corner pw-qr__corner--tl" />
          <i className="pw-qr__corner pw-qr__corner--tr" />
          <i className="pw-qr__corner pw-qr__corner--bl" />
          <i className="pw-qr__corner pw-qr__corner--br" />
          {!found ? <span className="pw-qr__beam" /> : null}
          {found ? (
            <div className="pw-qr__found">
              <span>
                <Icon name="check" size={30} color="#fff" strokeWidth={3} />
              </span>
            </div>
          ) : null}
        </div>
        {!found ? (
          <div className="pw-qr__text">
            <div>Point your camera at the QR code</div>
            <div>It&rsquo;s on the entry sign or the leasing office door. The camera is simulated in this build.{DEMO}</div>
          </div>
        ) : (
          <>
            <div className="pw-qr__card">
              <img src={communityPhoto} alt="" />
              <div>
                <div className="pw-qr__cardname">{propertyName}</div>
                <div className="pw-qr__cardaddr">{propertyAddress}</div>
              </div>
            </div>
            <Button onClick={onFound}>Continue to property</Button>
          </>
        )}
      </div>
      <div className="pw-qr__foot">
        <button type="button" onClick={onUseLocation}>
          Can&rsquo;t find a code? Use my location
        </button>
      </div>
    </div>
  );
};

/** Open your tour link: paste a tour.pynwheel.com link (checked locally), then the property it belongs to. */
export const LinkSheet = ({ open, step, propertyName, propertyAddress, onCheck, onContinue, onSearch, onReset, onClose }: { open: boolean; step: 'enter' | 'checking' | 'found'; propertyName: string; propertyAddress: string; onCheck: (value: string) => string | null; onContinue: () => void; onSearch: () => void; onReset: () => void; onClose: () => void }) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) {
      setValue('');
      setError(null);
    }
  }, [open]);
  return (
    <Sheet open={open} onClose={onClose} zIndex={332} title="Open your tour link" headerPadding="tight" className="pw-linksheet">
      {step === 'enter' ? (
        <>
          <div className="pw-linksheet__steps">
            {LINK_STEPS.map((t, i) => (
              <div key={t}>
                <span>{i + 1}</span>
                {t}
              </div>
            ))}
          </div>
          <div>
            <Eyebrow>Tour link</Eyebrow>
            <div className="pw-linksheet__row">
              <input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                placeholder="tour.pynwheel.com/…"
                className="pw-input"
                aria-label="Tour link"
                inputMode="url"
                autoCapitalize="none"
              />
              <button type="button" onClick={() => setValue('https://tour.pynwheel.com/luxe-mile-high')}>
                Paste
              </button>
            </div>
            {error ? <div className="pw-linksheet__error">{error}</div> : null}
          </div>
          <Button height={48} onClick={() => setError(onCheck(value))}>
            Find property
          </Button>
          <button type="button" className="pw-textlink" onClick={onSearch}>
            No link? Search properties instead
          </button>
        </>
      ) : step === 'checking' ? (
        <div className="pw-linksheet__checking">
          <div>Checking your link…</div>
          <div>Finding the property it belongs to.</div>
        </div>
      ) : (
        <>
          <div className="pw-linksheet__for">This link is for:{DEMO}</div>
          <div className="pw-qr__card pw-qr__card--light">
            <img src={communityPhoto} alt="" />
            <div>
              <div className="pw-qr__cardname">{propertyName}</div>
              <div className="pw-qr__cardaddr">{propertyAddress}</div>
              <div className="pw-linksheet__avail">Self-tours available</div>
            </div>
          </div>
          <Button height={48} onClick={onContinue}>
            Continue to property
          </Button>
          <button type="button" className="pw-textlink" onClick={onReset}>
            Use a different link
          </button>
        </>
      )}
    </Sheet>
  );
};

export const GuestGateSheet = ({ open, why, onSignIn, onVirtual, onClose }: { open: boolean; why: string; onSignIn: () => void; onVirtual: (() => void) | null; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={330} headerPadding="tight" className="pw-gate">
    <div className="pw-ci__title">Sign in or create an account to {why}</div>
    <div className="pw-locsheet__body">Already have an account? Sign in with your Pynwheel email and password. Either way, we&rsquo;ll bring you right back here.</div>
    <Button height={48} onClick={onSignIn}>
      Sign In
    </Button>
    {onVirtual ? (
      <>
        <div className="pw-auth__or">
          <span />
          or
          <span />
        </div>
        <button type="button" className="pw-ci__virtual pw-ci__virtual--left" onClick={onVirtual}>
          <span>Continue with a Virtual Tour</span>
          <span>No account or booking needed. Follow the same route and see every stop. Doors stay locked.</span>
        </button>
      </>
    ) : null}
    <button type="button" className="pw-textlink" onClick={onClose}>
      Keep Browsing
    </button>
  </Sheet>
);

export const SkipSheet = ({ open, stopName, nextName, reason, onReason, onConfirm, onCall, onClose }: { open: boolean; stopName: string; nextName: string; reason: string | null; onReason: (id: string) => void; onConfirm: () => void; onCall: () => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={336} headerPadding="tight" className="pw-skip">
    <div className="pw-skip__head">
      <div>
        <div className="pw-ci__title">Skip {stopName}?</div>
        <div className="pw-ci__sub">Your tour continues to {nextName}. Tell us why so the team can fix it.</div>
      </div>
      <IconButton icon="close" label="Close" tone="round" onClick={onClose} />
    </div>
    <div className="pw-skip__reasons">
      {SKIP_REASONS.map((r) => (
        <button key={r.id} type="button" className={`pw-skip__reason${reason === r.id ? ' pw-skip__reason--on' : ''}`} onClick={() => onReason(r.id)} aria-pressed={reason === r.id}>
          <span className={`pw-radio${reason === r.id ? ' pw-radio--on' : ''}`} />
          {r.label}
        </button>
      ))}
    </div>
    <Button onClick={onConfirm} disabled={!reason}>
      {reason ? 'Skip and Continue' : 'Choose a reason'}
    </Button>
    <button type="button" className="pw-textlink" onClick={onCall}>
      Call leasing for help instead
    </button>
  </Sheet>
);

export const SosSheet = ({ open, onCall911, onCallLeasing, onShareLocation, onClose }: { open: boolean; onCall911: () => void; onCallLeasing: () => void; onShareLocation: () => void; onClose: () => void }) => (
  <Sheet
    open={open}
    onClose={onClose}
    zIndex={335}
    title={
      <span className="pw-sos__title">
        <span className="pw-sos__icon">
          <Icon name="shield" size={17} color="#fff" strokeWidth={2.2} />
        </span>
        Safety &amp; SOS
      </span>
    }
    className="pw-sos"
  >
    <button type="button" className="pw-sos__911" onClick={onCall911}>
      Call 911
    </button>
    <Button variant="secondary" style={{ fontSize: 15 }} onClick={onCallLeasing}>
      Call leasing office
    </Button>
    <Button variant="secondary" style={{ fontSize: 15 }} icon="navigation" onClick={onShareLocation}>
      Share my live location with leasing
    </Button>
    <div className="pw-demonote">Calls are placed by your phone; nothing here is simulated except the leasing team&rsquo;s view of your location in this build.{DEMO}</div>
  </Sheet>
);

export const ReportSheet = ({ open, propertyName, onReport, onClose }: { open: boolean; propertyName: string; onReport: (label: string) => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={335} title="Report an issue">
    <div className="pw-ci__sub">The {propertyName} leasing team sees your report right away.{DEMO}</div>
    <div className="pw-report__options">
      {REPORT_OPTIONS.map((label) => (
        <button key={label} type="button" onClick={() => onReport(label)}>
          {label}
          <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
        </button>
      ))}
    </div>
  </Sheet>
);

interface UpcomingItem {
  id: string;
  name: string;
  when: string;
  img: string;
  pill: string;
  tone: 'primary' | 'live' | 'warn';
  cta: string;
  main: boolean;
}

export const upcomingItems = (tour: ScheduledTour | null, checkedIn: boolean, propertyName: string, heroImage: string, extras: DemoExtraTour[], now = Date.now()): UpcomingItem[] => {
  const list: UpcomingItem[] = [];
  if (tour && tour.status !== 'past' && tour.status !== 'cancelled' && tour.status !== 'missed') {
    const today = dayLabel(tour.date, new Date(now)).startsWith('Today');
    list.push({ id: 'main', name: propertyName, when: `${dayLabel(tour.date, new Date(now))} · ${tour.time} · ${tour.length} min`, img: heroImage, pill: checkedIn ? 'Checked in' : tour.status === 'pending' ? 'Waiting for approval' : today ? 'Today' : 'Scheduled', tone: checkedIn || today ? 'live' : tour.status === 'pending' ? 'warn' : 'primary', cta: checkedIn ? 'Continue Tour' : 'Start Tour', main: true });
  }
  extras.forEach((x) => list.push({ id: x.id, name: `${x.name}${DEMO}`, when: `${x.dayLabel} · ${x.time} · ${x.length} min`, img: x.img, pill: x.pill, tone: x.tone, cta: 'Start Tour', main: false }));
  return list;
};

export const UpcomingSheet = ({ open, items, onPrimary, onVirtual, onCall, onChat, onBook, onClose }: { open: boolean; items: UpcomingItem[]; onPrimary: (id: string) => void; onVirtual: (id: string) => void; onCall: () => void; onChat: () => void; onBook: () => void; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={320} title={items.length > 1 ? `${items.length} upcoming tours` : 'Upcoming tour'} size="scroll" className="pw-upcoming">
    {items.length ? (
      <>
        <div className="pw-upcoming__list">
          {items.map((t) => (
            <div key={t.id} className={`pw-upcoming__card${t.main ? ' pw-upcoming__card--main' : ''}`}>
              <div className="pw-upcoming__row">
                <img src={t.img} alt="" onError={(e) => (e.currentTarget.src = communityPhoto)} />
                <div className="pw-upcoming__text">
                  <div className="pw-upcoming__name">{t.name}</div>
                  <div className="pw-upcoming__when">{t.when}</div>
                  <TonePill tone={t.tone}>{t.pill}</TonePill>
                </div>
                <div className="pw-upcoming__actions">
                  <RoundAction icon="phone" label="Call leasing" onClick={onCall} />
                  <RoundAction icon="chat" label="Chat" onClick={onChat} />
                </div>
              </div>
              <div className="pw-upcoming__cta">
                <Button variant="secondary" height={42} onClick={() => onVirtual(t.id)} style={{ fontSize: 13, color: 'var(--pw-primary)', borderColor: 'var(--pw-primary)' }}>
                  Virtual Tour
                </Button>
                <Button variant={t.main ? 'primary' : 'secondary'} height={42} onClick={() => onPrimary(t.id)} style={{ fontSize: 13, ...(t.main ? {} : { color: 'var(--pw-primary)', borderColor: 'var(--pw-primary)' }) }}>
                  {t.cta}
                </Button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" className="pw-textlink" onClick={onBook}>
          + Book another tour
        </button>
      </>
    ) : (
      <>
        <div className="pw-ci__sub">No upcoming tours. Tours you book in the app, on the property website or at the lobby kiosk show up here.</div>
        <Button height={48} onClick={onBook}>
          Schedule Self-Tour
        </Button>
      </>
    )}
  </Sheet>
);

export const PanoSheet = ({ open, stopName, onClose }: { open: boolean; stopName: string; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={330} title={<span className="pw-sheet__title--18">360° view — {stopName}</span>} headerPadding="tight">
    <div className="pw-pano">
      <div className="pw-pano__scroll">
        <img src={communityPhoto} alt="Panoramic view placeholder" />
      </div>
      <span className="pw-pano__hint">Drag to look around</span>
      <span className="pw-pano__by">Powered by Seenic{DEMO}</span>
    </div>
    <div className="pw-ci__sub">Panoramic capture from the property&rsquo;s virtual tour. Look around before you walk in, or revisit it later from your summary.{DEMO}</div>
  </Sheet>
);

export const SavedSheet = ({ open, saved, propertyName, mark, onClose }: { open: boolean; saved: TourStopView[]; propertyName: string; mark: string; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={320} title="Saved units" size="scroll">
    <div className="pw-ci__sub">Favourites from every Pynwheel property you&rsquo;ve toured.</div>
    <div className="pw-saved">
      {saved.map((s) => (
        <div key={s.node} className="pw-saved__row">
          <span className="pw-thumb pw-thumb--md pw-thumb--unit">
            <Icon name="bed" size={22} />
          </span>
          <div>
            <div className="pw-saved__name">{s.name}</div>
            <div className="pw-saved__prop">{propertyName}</div>
            <div className="pw-saved__meta">{s.unit ? `${unitFacts(s.unit, mark).price} · ${unitFacts(s.unit, mark).beds}` : s.floorLabel}</div>
          </div>
          <Icon name="heart" size={16} color="var(--pw-label-coral)" />
        </div>
      ))}
      {DEMO_SAVED_ELSEWHERE.map((s) => (
        <div key={s.name} className="pw-saved__row pw-saved__row--demo">
          <span className="pw-thumb pw-thumb--md pw-thumb--unit">
            <Icon name="bed" size={22} />
          </span>
          <div>
            <div className="pw-saved__name">{s.name}{DEMO}</div>
            <div className="pw-saved__prop">{s.property}</div>
            <div className="pw-saved__meta">{s.meta}</div>
          </div>
          <Icon name="heart" size={16} color="var(--pw-label-coral)" />
        </div>
      ))}
      {!saved.length ? <div className="pw-demonote">Tap the heart on a stop to save it here.</div> : null}
    </div>
  </Sheet>
);

export const PassesSheet = ({ open, passes, active, now, onClose }: { open: boolean; passes: TourPass[]; active: { property: string; start: number; end: number } | null; now: number; onClose: () => void }) => (
  <Sheet open={open} onClose={onClose} zIndex={320} title="Tour passes" size="scroll">
    <div className="pw-ci__sub">Every access window issued to you.{DEMO}</div>
    <div className="pw-saved">
      {active ? (
        <div className="pw-pass">
          <div>
            <span>{active.property}</span>
            <TonePill tone="live">Active</TonePill>
          </div>
          <div>Today · {new Date(active.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – {new Date(active.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
          <div>{fmtClock(active.end - now)} left</div>
        </div>
      ) : null}
      {passes.map((p) => (
        <div key={p.id} className="pw-pass">
          <div>
            <span>{p.property}</span>
            <TonePill tone="muted">Ended</TonePill>
          </div>
          <div>
            {p.date} · {p.window}
          </div>
          <div>{p.doors}</div>
        </div>
      ))}
      {!passes.length && !active ? <div className="pw-demonote">Your first in-person tour will leave an access pass here.</div> : null}
    </div>
  </Sheet>
);

/** The gallery overlay of a stop: the visitor's own photos (placeholders in this build). */
export const GallerySheet = ({ open, stopName, count, onClose }: { open: boolean; stopName: string; count: number; onClose: () => void }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);
  if (!open) return null;
  const n = Math.max(1, count);
  return (
    <div className="pw-gallery" role="dialog" aria-modal="true" aria-label={`${stopName} photos`}>
      <div className="pw-gallery__top">
        <span>{stopName}</span>
        <button type="button" aria-label="Close gallery" onClick={onClose}>
          <Icon name="close" size={14} color="#fff" strokeWidth={2.4} />
        </button>
      </div>
      <div className="pw-gallery__stage">
        <div className="pw-gallery__placeholder">
          <Icon name="camera" size={40} color="rgba(255,255,255,0.6)" />
          <span>{count ? `Your photo ${index + 1}` : 'No photos yet'}</span>
        </div>
        {n > 1 ? (
          <>
            <button type="button" className="pw-gallery__prev" aria-label="Previous photo" onClick={() => setIndex((i) => (i - 1 + n) % n)}>
              <Icon name="back" size={16} color="#fff" strokeWidth={2.4} />
            </button>
            <button type="button" className="pw-gallery__next" aria-label="Next photo" onClick={() => setIndex((i) => (i + 1) % n)}>
              <Icon name="chevronRight" size={16} color="#fff" strokeWidth={2.4} />
            </button>
          </>
        ) : null}
      </div>
      <div className="pw-gallery__foot">
        <div>{count ? `${index + 1} of ${count} · photos stay on this phone${DEMO}` : 'Tap Photo on a stop to add one.'}</div>
        <div className="pw-gallery__thumbs">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" className={i === index ? 'pw-gallery__thumb--on' : ''} onClick={() => setIndex(i)} aria-label={`Photo ${i + 1}`}>
              <Icon name="camera" size={16} color="#fff" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The safety bar over the in-person tour: the access window left, Leasing, SOS and Report. */
export const SafetyBar = ({ remainingMs, onLeasing, onSos, onReport }: { remainingMs: number; onLeasing: () => void; onSos: () => void; onReport: () => void }) => (
  <div className="pw-safety" role="status">
    <div className="pw-safety__time">
      <Icon name="clock" size={14} />
      <span>{fmtClock(remainingMs)}</span>
      <i>left{DEMO}</i>
    </div>
    <button type="button" onClick={onLeasing}>
      <Icon name="phone" size={12} strokeWidth={2.2} />
      Leasing
    </button>
    <button type="button" className="pw-safety__sos" onClick={onSos}>
      <Icon name="shield" size={12} strokeWidth={2.4} />
      SOS
    </button>
    <button type="button" onClick={onReport}>
      <Icon name="flag" size={12} strokeWidth={2.2} />
      Report
    </button>
  </div>
);
