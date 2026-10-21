import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DEMO, FINISHES } from '~/content/demoFixtures';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Pill, stopIconOf } from '~/components/ui';
import { Chip, Eyebrow } from '~/components/ui2';
import type { AccessMethod, LockBluetoothKey, LockPin } from '~/models';
import { audioGuide } from '~/services/audioGuide';
import type { AppState, Reaction } from '~/store/appState';
import { aboutSpace, moveInEstimate, rentForTerm, usableUnitType } from '~/store/access';
import type { TourStopView } from '~/store/selectors';
import { money, unitFacts } from '~/store/views';
import { LightShell } from './shared';
import { UnlockPanel } from './UnlockPanel';

/** The smart-lock state of the stop on screen (the store's door code, key and request for this stop). */
export interface StopLockProps {
  lockPin: LockPin | null;
  lockKey: LockBluetoothKey | null;
  lockRequest: AppState['lockRequest'];
  bluetoothAvailable: boolean;
  method: AccessMethod;
  alternates: AccessMethod[];
  provider: string | null;
  codeEntered: boolean;
  onPickMethod: (method: AccessMethod) => void;
  onRequestPin: () => void;
  onBluetoothUnlock: () => void;
  onBluetoothCancel: () => void;
  onCodeEntered: () => void;
}

interface Props extends StopLockProps {
  stop: TourStopView;
  propertyName: string;
  stopNumber: number;
  stopTotal: number;
  isLast: boolean;
  virtual: boolean;
  demo: boolean;
  mark: string;
  unlocked: boolean;
  /** Milliseconds of door access left on an in-person tour, null otherwise. */
  accessLeftMs: number | null;
  reaction: Reaction | null;
  favourite: boolean;
  shots: string[];
  note: string;
  leaseTerm: number;
  held: boolean;
  compared: boolean;
  now: number;
  onBack: () => void;
  onItinerary: () => void;
  onFavourite: () => void;
  onReaction: (r: Reaction) => void;
  onDemoUnlock: () => void;
  onVideo: () => void;
  onPano: () => void;
  onNote: () => void;
  onPhoto: (dataUrl: string | null) => void;
  onGallery: (index: number) => void;
  onLocate: () => void;
  onAi: () => void;
  onLeaseTerm: (t: number) => void;
  onHold: () => void;
  onCompare: () => void;
  onExtend: (() => void) | null;
  onReport: () => void;
  onCall: () => void;
  onNext: () => void;
  onSkip: () => void;
  onToast: (message: string) => void;
}

/** A captured photo, downscaled to a small JPEG data URL so a few of them fit in memory. */
const readPhoto = (file: File): Promise<string | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const max = 640;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * k));
        canvas.height = Math.max(1, Math.round(img.height * k));
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });

/**
 * The Stop screen: one screen for units and amenities, the design's
 * "Stop" artboard. The unlock block is the shared Unlock frame for the
 * stop's own access method (or "Open access" / "Virtual tour"); below it
 * the stop's facts from the inventory, the real floor plan with zoom and
 * "On map", About this space generated from the record, the CMS photos
 * and the visitor's own, the narration (read from that text), reactions,
 * Video / 360° only where the CMS holds a link, Notes and Photo, the
 * concierge, and for units the published lease pricing and the move-in
 * estimate built from published figures only.
 */
export const StopScreen = (p: Props) => {
  const { stop, method } = p;
  const isUnit = stop.kind === 'unit';
  const facts = stop.unit ? unitFacts(stop.unit, p.mark) : null;
  const media = stop.unit?.media ?? stop.amenity?.media ?? null;
  const hasLock = method !== 'none';
  // Locked = a lock the visitor still has to open on an in-person tour. A door this app cannot open never blocks the tour.
  const locked = !p.virtual && hasLock && method !== 'unsupported' && !(method === 'pin' ? p.codeEntered : p.unlocked);
  const open = !locked;
  const about = aboutSpace(stop, p.propertyName);

  // Narration: the generated "About this space", read by the audio guide; Play resumes a paused reading.
  const narrKey = `stop:${stop.node}`;
  const [audio, setAudio] = useState(audioGuide.status());
  useEffect(() => audioGuide.subscribe(setAudio), []);
  useEffect(
    () => () => {
      // Leaving the stop stops its narration (the guide's directions have their own).
      if (audioGuide.status().key === narrKey) audioGuide.stop();
    },
    [narrKey]
  );
  const mine = audio.key === narrKey;
  const narrPlaying = mine && audio.status === 'speaking';
  const progress = mine ? audioGuide.progress(p.now) : 0;
  const toggleNarr = () => {
    if (!audioGuide.available) {
      p.onToast('Narration is not available on this device.');
      return;
    }
    if (narrPlaying) audioGuide.pause();
    else if (mine && audio.status === 'paused') audioGuide.resume();
    else audioGuide.speak(narrKey, about);
  };
  const narrLength = Math.max(1, Math.round((mine && audio.estimatedMs ? audio.estimatedMs : Math.max(1200, (about.split(/\s+/).length / 2.6) * 1000)) / 1000));
  const narrAt = Math.round(progress * narrLength);
  const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // The floor plan: the real image with zoom, else the honest placeholder.
  const [planZoom, setPlanZoom] = useState(1);
  const plan = media?.floorplanImage ?? null;
  const unitImage = media?.image ?? null;
  const cmsPhotos = [...(media?.image && !isUnit ? [{ id: -1, name: stop.name, url: media.image }] : []), ...(unitImage && isUnit ? [{ id: -2, name: stop.name, url: unitImage }] : []), ...(media?.photos ?? [])];
  const photoInput = useRef<HTMLInputElement>(null);
  const onPickPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    p.onPhoto(await readPhoto(file));
  };

  const where = stop.floor || stop.floorLabel;
  const termRent = facts ? rentForTerm(facts.terms, p.leaseTerm) : null;
  const estimate = stop.unit && !facts?.termsDemo ? moveInEstimate(stop.unit, termRent ?? stop.unit.rent) : null;
  const hasVideo = !!stop.amenity?.videoUrl;
  const has360 = !!media?.virtualTourUrl;
  const stripTitle = p.virtual ? 'Virtual tour' : !hasLock ? 'Open access' : method === 'unsupported' ? 'Staff-assisted door' : method === 'pin' ? 'Code entered — push the door to enter' : method === 'gate' ? 'Gate open — walk through' : 'Door unlocked — push the door to enter';
  const stripSub = p.virtual ? 'Doors stay locked. Explore everything below.' : !hasLock ? (isUnit ? 'No smart lock on this door. Ask the leasing office if it is locked.' : 'Walk right in. No unlock needed.') : method === 'unsupported' ? 'This lock cannot be opened from the app. The leasing office can let you in; you can still continue.' : method === 'pin' ? 'If the door did not open, get a new code from the unlock card.' : 'Lock the door behind you when you leave.';

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
              <div>{isUnit && facts ? facts.avail : stop.amenity?.hours ? `Open ${stop.amenity.hours}` : 'Open to visitors'}</div>
            </div>
          </div>
          <div className="pw-stop__facts">
            {isUnit && facts ? (
              <>
                <span>{facts.beds}</span>
                {facts.sqft ? <span>{facts.sqft}</span> : null}
                {stop.unit && usableUnitType(stop.unit) ? <span>{usableUnitType(stop.unit)}</span> : null}
                {stop.unit?.model ? <span className="pw-stop__fact--hi">Model unit</span> : null}
              </>
            ) : (
              <>
                <span>{method === 'none' ? 'Open access' : method === 'pin' ? 'Door code' : method === 'ble' ? 'Mobile key' : method === 'remote' ? 'Remote unlock' : method === 'gate' ? 'Gate' : 'Staff-assisted'}</span>
                {stop.amenity?.hours ? <span>{stop.amenity.hours}</span> : null}
              </>
            )}
          </div>

          {hasLock && !p.virtual ? (
            <div className="pw-stop__lockcard">
              <UnlockPanel
                stopName={stop.name}
                stopKind={stop.kind}
                lock={stop.lock}
                method={method}
                alternates={p.alternates}
                provider={p.provider}
                demo={p.demo}
                demoSwitch={p.demo}
                accessLeftMs={p.accessLeftMs}
                unlocked={p.unlocked}
                codeEntered={p.codeEntered}
                pin={p.lockPin}
                key={`${stop.node}:${method}`}
                bleKey={p.lockKey}
                request={p.lockRequest && p.lockRequest.node === stop.node ? { status: p.lockRequest.status, error: p.lockRequest.error } : null}
                bluetoothAvailable={p.bluetoothAvailable}
                isLast={p.isLast}
                onPickMethod={p.onPickMethod}
                onRequestPin={p.onRequestPin}
                onBluetoothUnlock={p.onBluetoothUnlock}
                onBluetoothCancel={p.onBluetoothCancel}
                onDemoUnlock={p.onDemoUnlock}
                onCodeEntered={p.onCodeEntered}
                onExtend={p.onExtend}
                onReport={p.onReport}
                onCall={p.onCall}
                onSkip={p.onSkip}
                onNext={p.onNext}
                onToast={p.onToast}
              />
            </div>
          ) : null}

          {open && (p.virtual || !hasLock || method === 'unsupported') ? (
            <div className={`pw-stop__strip${method === 'unsupported' ? ' pw-stop__strip--muted' : ''}`}>
              <span>
                <Icon name={method === 'unsupported' ? 'lock' : 'check'} size={12} color="#fff" strokeWidth={3} />
              </span>
              <div>
                <div className="pw-stop__striptitle">{stripTitle}</div>
                <div className="pw-stop__stripsub">{stripSub}</div>
              </div>
            </div>
          ) : null}

          {isUnit ? (
            <div className="pw-stop__section">
              <div className="pw-stop__sectionhead">
                <Eyebrow>Floor plan</Eyebrow>
                <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onLocate}>
                  <Icon name="pin" size={12} strokeWidth={2.2} /> On map
                </button>
              </div>
              {plan ? (
                <div className="pw-stop__planimg" data-testid="floor-plan">
                  <div className="pw-stop__planscroll">
                    <img src={plan} alt={`${stop.name} floor plan`} style={{ width: `${planZoom * 100}%` }} />
                  </div>
                  <div className="pw-stop__planzoom" aria-label="Floor plan zoom">
                    <button type="button" aria-label="Zoom in" onClick={() => setPlanZoom((z) => Math.min(3, +(z + 0.5).toFixed(1)))} disabled={planZoom >= 3}>
                      <Icon name="plus" size={13} />
                    </button>
                    <button type="button" aria-label="Zoom out" onClick={() => setPlanZoom((z) => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={planZoom <= 1}>
                      <Icon name="minus" size={13} />
                    </button>
                    <button type="button" aria-label="Full screen" onClick={() => p.onGallery(cmsPhotos.findIndex((x) => x.url === plan) >= 0 ? cmsPhotos.findIndex((x) => x.url === plan) : 0)}>
                      <Icon name="expand" size={13} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pw-stop__plan">
                  <Icon name="bed" size={36} color="var(--pw-text-subtle)" />
                  <div>
                    {facts?.beds}
                    {facts?.sqft ? ` · ${facts.sqft}` : ''}
                  </div>
                  <div className="pw-stop__plannote">{stop.unit?.floorplanName ? `${stop.unit.floorplanName} plan · image not published yet` : 'Floor plan image not published yet'}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="pw-stop__section">
              <div className="pw-stop__sectionhead">
                <Eyebrow>Where it is</Eyebrow>
                <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onLocate}>
                  <Icon name="pin" size={12} strokeWidth={2.2} /> On map
                </button>
              </div>
              {media?.image ? <img className="pw-stop__hero" src={media.image} alt={stop.name} /> : null}
            </div>
          )}

          <div className="pw-stop__section">
            <Eyebrow>About this space</Eyebrow>
            <div className="pw-stop__about" data-testid="about-space">
              {about}
            </div>
          </div>

          <div className="pw-stop__section">
            <div className="pw-stop__sectionhead">
              <Eyebrow>Photos</Eyebrow>
              {cmsPhotos.length + p.shots.length ? (
                <button type="button" className="pw-textlink pw-textlink--sm" onClick={() => p.onGallery(0)}>
                  See all · {cmsPhotos.length + p.shots.length}
                </button>
              ) : null}
            </div>
            <div className="pw-stop__photos">
              {plan && isUnit ? (
                <button type="button" className="pw-stop__photo pw-stop__photo--img" onClick={() => p.onGallery(0)} aria-label="Floor plan">
                  <img src={plan} alt="" />
                </button>
              ) : null}
              {cmsPhotos.map((ph, i) => (
                <button key={ph.id} type="button" className="pw-stop__photo pw-stop__photo--img" onClick={() => p.onGallery((plan && isUnit ? 1 : 0) + i)} aria-label={ph.name ?? `Photo ${i + 1}`}>
                  <img src={ph.url} alt="" loading="lazy" />
                </button>
              ))}
              {p.shots.map((src, i) => (
                <button key={`shot-${i}`} type="button" className="pw-stop__photo pw-stop__photo--img pw-stop__photo--mine" onClick={() => p.onGallery((plan && isUnit ? 1 : 0) + cmsPhotos.length + i)} aria-label={`Your photo ${i + 1}`}>
                  <img src={src} alt="" />
                  <span>Yours</span>
                </button>
              ))}
              <button type="button" className="pw-stop__photo pw-stop__photo--add" onClick={() => photoInput.current?.click()}>
                <Icon name="plus" size={16} />
                <span>Add</span>
              </button>
              <input ref={photoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void onPickPhoto(e)} aria-label="Add a photo" />
            </div>
            {!cmsPhotos.length && !p.shots.length ? <div className="pw-stop__plannote">No photos published for this stop yet. Add your own for reference; they stay on this phone.</div> : null}
          </div>

          <div className="pw-stop__narr">
            <button type="button" aria-label={narrPlaying ? 'Pause narration' : mine && audio.status === 'paused' ? 'Resume narration' : 'Play narration'} onClick={toggleNarr}>
              <Icon name={narrPlaying ? 'pause' : 'play'} size={13} color="#fff" />
            </button>
            <div>
              <div className="pw-stop__narrhead">
                <span>{isUnit ? 'Unit narration' : 'About this space'}</span>
                <span>
                  {clock(narrAt)} / {clock(narrLength)}
                </span>
              </div>
              <div className="pw-stop__narrbar">
                <div style={{ width: `${Math.round(progress * 100)}%` }} />
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
            {hasVideo ? (
              <button type="button" onClick={p.onVideo}>
                <span>
                  <Icon name="play" size={14} />
                </span>
                Video
              </button>
            ) : null}
            {has360 ? (
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
            <button type="button" onClick={() => photoInput.current?.click()}>
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
              <Eyebrow>Unit facts</Eyebrow>
              <div className="pw-stop__factlist">
                <div>
                  <span>Rent</span>
                  <b>{facts.price}</b>
                </div>
                <div>
                  <span>Beds · baths</span>
                  <b>{facts.beds}</b>
                </div>
                {facts.sqft ? (
                  <div>
                    <span>Size</span>
                    <b>{facts.sqft}</b>
                  </div>
                ) : null}
                <div>
                  <span>Move-in</span>
                  <b>{facts.avail}</b>
                </div>
                {stop.unit && (usableUnitType(stop.unit) || stop.unit.floorplanName) ? (
                  <div>
                    <span>Type</span>
                    <b>{usableUnitType(stop.unit) ?? stop.unit.floorplanName}</b>
                  </div>
                ) : null}
              </div>
              {facts.terms.length ? (
                <>
                  <Eyebrow>Price by lease term{facts.termsDemo ? DEMO : ''}</Eyebrow>
                  <div className="pw-stop__terms">
                    {facts.terms.map((t) => (
                      <Chip key={t.months} on={p.leaseTerm === t.months} onClick={() => p.onLeaseTerm(t.months)} className="pw-stop__term">
                        <span>{t.months} mo</span>
                        <b>{money(t.rent)}</b>
                      </Chip>
                    ))}
                  </div>
                </>
              ) : (
                <div className="pw-stop__plannote">Lease-term pricing is not published for this unit.</div>
              )}
              {p.demo ? (
                <>
                  <Eyebrow>Finishes{DEMO}</Eyebrow>
                  <div className="pw-stop__finishes">
                    {FINISHES.map((f) => (
                      <div key={f}>
                        <Icon name="check" size={14} color="var(--pw-primary)" strokeWidth={2.6} />
                        {f}
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
              {estimate ? (
                <div className="pw-stop__movein">
                  <div className="pw-stop__moveinhead">Move-in cost estimate</div>
                  <div className="pw-stop__moveinbody">
                    {estimate.lines.map((l) => (
                      <div key={l.label}>
                        <span>{l.label}</span>
                        <b>{money(l.amount)}</b>
                      </div>
                    ))}
                    <div className="pw-stop__moveintotal">
                      <span>Total due at move-in</span>
                      <b>{money(estimate.total)}</b>
                    </div>
                    {estimate.feeNote ? <div className="pw-stop__moveinnote">Additional fees: {estimate.feeNote}</div> : null}
                    <div className="pw-stop__moveinnote">{termRent != null ? `Based on a ${p.leaseTerm}-month lease. ` : ''}An estimate from the published figures, not a quote. Final amounts are confirmed in your lease.</div>
                  </div>
                </div>
              ) : null}
              <div className="pw-stop__unitactions">
                <Button variant="secondary" height={46} onClick={p.onCompare} style={{ fontSize: 13 }}>
                  {p.compared ? '✓ In compare' : 'Add to compare'}
                </Button>
                <Button variant="secondary" height={46} onClick={p.onHold} style={{ fontSize: 13 }} disabled={p.held}>
                  {p.held ? 'Held' : `Hold this unit${p.mark}`}
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
