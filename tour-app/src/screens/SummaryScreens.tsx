import { useState } from 'react';
import { DEMO, DEMO_SISTER_PROPERTIES, HOLD_HOURS, SKIP_REASONS } from '~/content/demoFixtures';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Chip, RoundAction, TonePill } from '~/components/ui2';
import type { Unit } from '~/models';
import type { AppState, Reaction } from '~/store/appState';
import { fmtTime } from '~/store/scenarios';
import type { TourStopView } from '~/store/selectors';
import { unitLabel, unitMeta } from '~/store/selectors';
import { unitFacts } from '~/store/views';
import { LightShell } from './shared';

interface CompleteProps {
  propertyName: string;
  stops: number;
  minutes: number;
  inPerson: boolean;
  survey: AppState['survey'];
  surveyUnits: { id: string; label: string }[];
  onSurvey: (patch: Partial<AppState['survey']>) => void;
  onCall: () => void;
  onEmail: () => void;
  onSummary: () => void;
  onHome: () => void;
}

/** Tour Complete: thanks, call / email leasing, the access pass note and the three-question survey (kept locally). */
export const TourCompleteScreen = ({ propertyName, stops, minutes, inPerson, survey, surveyUnits, onSurvey, onCall, onEmail, onSummary, onHome }: CompleteProps) => (
  <LightShell>
    <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onHome} />} title="Back to Home" />
    <div className="pw-complete">
      <div className="pw-complete__hero">
        <div className="pw-complete__badge">
          <Icon name="check" size={30} color="var(--pw-primary)" strokeWidth={2.5} />
        </div>
        <div className="pw-complete__title">Thank you for visiting {propertyName}</div>
        <div className="pw-complete__sub">
          You visited {stops} {stops === 1 ? 'stop' : 'stops'} in about {minutes} minutes.
        </div>
      </div>
      <div className="pw-complete__pair">
        <Button variant="secondary" height={46} icon="phone" iconSize={15} onClick={onCall} style={{ fontSize: 13.5 }}>
          Call leasing
        </Button>
        <Button variant="secondary" height={46} icon="mail" iconSize={15} onClick={onEmail} style={{ fontSize: 13.5 }}>
          Email leasing
        </Button>
      </div>
      {inPerson ? (
        <div className="pw-complete__pass">
          <Icon name="lock" size={16} color="var(--pw-primary)" />
          Your access pass has ended and all doors are locked.
        </div>
      ) : null}
      <div className="pw-complete__survey">
        <div className="pw-complete__surveytitle">Quick survey · 3 questions{DEMO}</div>
        <div className="pw-complete__q">
          <div>1. How was your tour overall?</div>
          <div className="pw-complete__stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} stars`} onClick={() => onSurvey({ stars: n })} className={n <= survey.stars ? 'pw-complete__star--on' : ''}>
                <Icon name="star" size={30} />
              </button>
            ))}
          </div>
        </div>
        <div className="pw-complete__q">
          <div>2. Which unit stood out?</div>
          <div className="pw-complete__chips">
            {[...surveyUnits, { id: 'none', label: 'Not sure yet' }].map((u) => (
              <Chip key={u.id} on={survey.unit === u.id} onClick={() => onSurvey({ unit: u.id })}>
                {u.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="pw-complete__q">
          <div>3. How likely are you to apply?</div>
          <div className="pw-complete__nps">
            {Array.from({ length: 11 }, (_, n) => (
              <button key={n} type="button" className={survey.nps === n ? 'pw-complete__nps--on' : ''} onClick={() => onSurvey({ nps: n })}>
                {n}
              </button>
            ))}
          </div>
          <div className="pw-complete__npslabels">
            <span>Not likely</span>
            <span>Very likely</span>
          </div>
        </div>
      </div>
      <Button onClick={onSummary}>View Tour Summary</Button>
    </div>
  </LightShell>
);

interface SummaryProps {
  propertyName: string;
  visited: TourStopView[];
  /** Stops the visitor skipped (node → reason): listed, but not counted as visited. */
  skipped: Record<string, string>;
  notes: Record<string, string>;
  reactions: Record<string, Reaction>;
  photos: Record<string, number>;
  visitedAt: Record<string, number>;
  favourites: Record<string, boolean>;
  compare: Record<string, boolean>;
  holds: Record<string, boolean>;
  minutes: number;
  unlocked: number;
  bestMatch: Unit | null;
  bestMatchPercent: number;
  bestMatchReasons: string[];
  units: Unit[];
  followup: boolean;
  agent: { name: string; initials: string } | null;
  onApplyBest: () => void;
  onApply: (node?: string) => void;
  onHold: (node: string) => void;
  onAi: () => void;
  onShare: () => void;
  onSend: (name: string, contact: string) => void;
  onSister: (name: string) => void;
  onSecondVisit: () => void;
  onCall: () => void;
  onHome: () => void;
  /** ` *` on demo data, so derived text is marked; empty on real data. */
  mark?: string;
}

const REACTION_LABEL: Record<Reaction, string> = { love: 'Love', like: 'Like', no: 'Not for me' };

const recapOf = (propertyName: string, visited: TourStopView[], minutes: number, notes: Record<string, string>, best: Unit | null, mark: string): string => {
  const names = visited.map((v) => v.name);
  let recap = `You explored ${visited.length} stops at ${propertyName} in about ${minutes} minutes`;
  recap += names.length ? `, including ${names.slice(0, 3).join(', ')}${names.length > 3 ? ', and more' : ''}.` : '.';
  const noted = visited.find((v) => notes[v.node]?.trim());
  if (noted) recap += ` You saved a note on ${noted.name}, which suggests it stood out to you.`;
  if (best) recap += ` Based on your route, a ${unitLabel(best).toLowerCase()} home like ${best.name} is your strongest fit${best.available ? ' — it is available now' : ''}.`;
  return `${recap}${mark}`;
};

/**
 * Tour Summary: stats, the recap, the best match, every stop with its note,
 * favourites, the compare table, the highlights timeline (time, reaction,
 * photos, note per stop), the follow-up card, the concierge and the actions
 * (apply, email, share, second visit, home).
 */
export const TourSummaryScreen = (p: SummaryProps) => {
  const mark = p.mark ?? '';
  const [shareOpen, setShareOpen] = useState(false);
  const [shareName, setShareName] = useState('');
  const [shareMode, setShareMode] = useState<'phone' | 'email'>('phone');
  const [shareContact, setShareContact] = useState('');
  const [sisters, setSisters] = useState<Record<string, boolean>>({});
  const seen = p.visited.filter((v) => !p.skipped[v.node]);
  const favs = p.visited.filter((v) => p.favourites[v.node]);
  let compareList = p.units.filter((u) => seen.some((v) => v.node === u.node) || p.compare[u.node]);
  if (!compareList.length) compareList = p.units.slice(0, 2);
  const notesCount = Object.values(p.notes).filter((v) => v && v.trim()).length;
  const photosCount = Object.values(p.photos).reduce((a, b) => a + (b || 0), 0);
  const fuName = p.agent?.name ?? `Jordan Lee${DEMO}`;
  const fuInitials = p.agent?.initials ?? 'JL';
  return (
    <LightShell>
      <div className="pw-summary">
        <div>
          <div className="pw-summary__title">Tour Summary</div>
          <div className="pw-summary__sub">{p.propertyName} · Completed Today</div>
        </div>
        <div className="pw-summary__stats">
          <div>
            <b>{seen.length}</b>
            <span>{seen.length === 1 ? 'Stop' : 'Stops'}</span>
          </div>
          <div>
            <b>{p.minutes}</b>
            <span>Minutes</span>
          </div>
          <div>
            <b className="pw-summary__primary">{p.unlocked}</b>
            <span>Unlocked</span>
          </div>
        </div>
        <div className="pw-summary__recap">
          <div className="pw-summary__recaphead">
            <Icon name="sparkle" size={18} color="var(--pw-label-yellow)" />
            <span>AI Tour Recap</span>
          </div>
          <div className="pw-summary__recaptext">{recapOf(p.propertyName, seen, p.minutes, p.notes, p.bestMatch, mark)}</div>
          <div className="pw-summary__recapfoot">{mark ? 'Generated by Pynwheel AI' : 'Summary of your route'}</div>
        </div>
        {p.bestMatch ? (
          <div className="pw-summary__best">
            <div className="pw-summary__besthead">
              <span>
                <Icon name="sparkle" size={16} color="var(--pw-primary)" />
                Your Best Match
              </span>
              {p.bestMatchPercent > 0 ? (
                <b>
                  {p.bestMatchPercent}% Fit{mark}
                </b>
              ) : null}
            </div>
            <div className="pw-summary__bestbody">
              <div>
                <div className="pw-summary__bestname">{p.bestMatch.name}</div>
                <div className="pw-summary__bestmeta">
                  {unitMeta(p.bestMatch, mark)}
                  {p.bestMatch.available ? ' · Available Now' : ''}
                </div>
              </div>
              <div className="pw-summary__reasons">
                {p.bestMatchReasons.map((r) => (
                  <span key={r}>{r}</span>
                ))}
              </div>
              <Button height={46} style={{ fontSize: 14 }} onClick={p.onApplyBest}>
                Apply For {p.bestMatch.name}
              </Button>
            </div>
          </div>
        ) : null}
        <div className="pw-summary__visited">
          <div className="pw-summary__h3">Stops You Visited</div>
          {p.visited.map((v) => (
            <div key={v.node} className="pw-summary__stop">
              <div className="pw-summary__stophead">
                <div className="pw-summary__stopname">{v.name}</div>
                <div className="pw-summary__stopfloor">{v.kind === 'unit' ? v.floorLabel : v.floor}</div>
              </div>
              {p.skipped[v.node] ? <TonePill tone="muted">Skipped · {SKIP_REASONS.find((r) => r.id === p.skipped[v.node])?.label ?? p.skipped[v.node]}</TonePill> : null}
              {p.notes[v.node]?.trim() ? (
                <div className="pw-summary__note">
                  <Icon name="pencil" size={13} color="var(--pw-warn-soft-text)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <span>{p.notes[v.node]}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
        {favs.length ? (
          <div className="pw-summary__visited">
            <div className="pw-summary__h3">Favourites</div>
            <div className="pw-summary__favs">
              {favs.map((v) => (
                <span key={v.node}>
                  <Icon name="heart" size={12} color="var(--pw-label-coral)" />
                  {v.name}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {compareList.length ? (
          <div className="pw-summary__visited">
            <div className="pw-summary__h3">Compare units</div>
            <div className="pw-summary__compare" style={{ ['--cols' as string]: compareList.length }}>
              <div className="pw-summary__crow pw-summary__crow--head">
                <div />
                {compareList.map((u) => (
                  <div key={u.node}>{u.name}</div>
                ))}
              </div>
              {(
                [
                  ['Price', (u: Unit) => unitFacts(u, mark).price],
                  ['Beds / baths', (u: Unit) => unitFacts(u, mark).beds],
                  ['Size', (u: Unit) => unitFacts(u, mark).sqft ?? '—'],
                  ['Available', (u: Unit) => unitFacts(u, mark).availShort],
                  ['Reaction', (u: Unit) => (p.reactions[u.node] ? REACTION_LABEL[p.reactions[u.node]] : '—')],
                  ['Your note', (u: Unit) => p.notes[u.node]?.trim() || '—']
                ] as const
              ).map(([label, cell]) => (
                <div key={label} className="pw-summary__crow">
                  <div className="pw-summary__clabel">{label}</div>
                  {compareList.map((u) => (
                    <div key={u.node}>{cell(u)}</div>
                  ))}
                </div>
              ))}
              <div className="pw-summary__crow pw-summary__crow--actions">
                <div />
                {compareList.map((u) => (
                  <div key={u.node}>
                    <button type="button" className="pw-summary__hold" onClick={() => p.onHold(u.node)} disabled={!!p.holds[u.node]}>
                      {p.holds[u.node] ? `Held ${HOLD_HOURS}h` : 'Hold'}
                    </button>
                    <button type="button" className="pw-summary__applysm" onClick={() => p.onApply(u.node)}>
                      Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        <div className="pw-summary__visited">
          <div className="pw-summary__h3">Tour highlights</div>
          <div className="pw-summary__timeline">
            {p.visited.map((v) => {
              const r = p.reactions[v.node];
              const note = (p.notes[v.node] ?? '').trim();
              const photos = p.photos[v.node] ?? 0;
              return (
                <div key={v.node} className="pw-summary__hl">
                  <i />
                  <div className="pw-summary__hlhead">
                    <span>{v.name}</span>
                    <span>{p.visitedAt[v.node] ? fmtTime(p.visitedAt[v.node]) : '—'}</span>
                  </div>
                  {r ? <TonePill tone="primary">{REACTION_LABEL[r]}</TonePill> : null}
                  {photos ? (
                    <div className="pw-summary__hlphotos">
                      {Array.from({ length: photos }, (_, i) => (
                        <span key={i}>
                          <Icon name="camera" size={16} color="var(--pw-primary)" />
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {note ? <div className="pw-summary__note pw-summary__note--plain">{note}</div> : null}
                  {!r && !photos && !note ? <div className="pw-summary__hlempty">No photos or notes</div> : null}
                </div>
              );
            })}
          </div>
        </div>
        <div className="pw-summary__follow">
          <div className="pw-summary__followhead">
            <span>Follow-up status{DEMO}</span>
            <TonePill tone={p.followup ? 'live' : 'warn'}>{p.followup ? 'Replied' : 'Awaiting reply'}</TonePill>
          </div>
          <div className="pw-summary__followwho">
            <span className="pw-summary__avatar">{fuInitials}</span>
            <div>
              <div className="pw-summary__followname">{fuName}</div>
              <div className="pw-summary__followmeta">Leasing specialist · {p.propertyName}</div>
            </div>
            <RoundAction icon="phone" label="Call leasing" onClick={p.onCall} />
          </div>
          <div className="pw-summary__followeta">
            <Icon name="clock" size={14} color="var(--pw-primary)" />
            Reply expected within 1 business hour
          </div>
          <div className="pw-summary__sisters">
            {DEMO_SISTER_PROPERTIES.map((s) => (
              <div key={s.id} className="pw-summary__sister">
                <img src={s.img} alt="" />
                <div>
                  <div className="pw-summary__sistername">{s.name}{DEMO}</div>
                  <div className="pw-summary__sistermeta">{s.meta}</div>
                </div>
                <button
                  type="button"
                  className={`pw-summary__sisterbtn${sisters[s.id] ? ' pw-summary__sisterbtn--on' : ''}`}
                  onClick={() => {
                    setSisters((x) => ({ ...x, [s.id]: true }));
                    p.onSister(s.name);
                  }}
                >
                  {sisters[s.id] ? '✓ Requested' : 'Tour this one too'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="pw-summary__ai" onClick={p.onAi}>
          <span className="pw-summary__aiicon">
            <Icon name="sparkle" size={16} color="var(--pw-label-yellow)" />
          </span>
          <span className="pw-summary__aitext">
            <span>Ask The AI Concierge</span>
            <span>Pricing, pet policy, lease terms &amp; more</span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
        </button>
        <div className="pw-summary__actions">
          <Button onClick={() => p.onApply()}>Apply For A Unit</Button>
          <Button variant="secondary" style={{ fontSize: 15 }} onClick={p.onShare}>
            Email Me This Summary
          </Button>
          <Button variant="secondary" style={{ fontSize: 15 }} icon="share" onClick={() => setShareOpen((v) => !v)}>
            Share this summary
          </Button>
          {shareOpen ? (
            <div className="pw-share">
              <div className="pw-share__sub">Send it to a partner, roommate or family member.{DEMO}</div>
              <input value={shareName} onChange={(e) => setShareName(e.target.value)} placeholder="Their name" className="pw-input" aria-label="Their name" />
              <div className="pw-seg" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <button type="button" className={`pw-seg__btn${shareMode === 'phone' ? ' pw-seg__btn--on' : ''}`} onClick={() => setShareMode('phone')}>
                  Text
                </button>
                <button type="button" className={`pw-seg__btn${shareMode === 'email' ? ' pw-seg__btn--on' : ''}`} onClick={() => setShareMode('email')}>
                  Email
                </button>
              </div>
              <input value={shareContact} onChange={(e) => setShareContact(e.target.value)} placeholder={shareMode === 'phone' ? '(303) 555-0199' : 'sam@example.com'} className="pw-input" aria-label={shareMode === 'phone' ? 'Phone number' : 'Email address'} inputMode={shareMode === 'phone' ? 'tel' : 'email'} />
              <div className="pw-share__includes">
                <Icon name="file" size={15} color="var(--pw-primary)" />
                Includes AI recap · {notesCount} {notesCount === 1 ? 'note' : 'notes'} · {photosCount} {photosCount === 1 ? 'photo' : 'photos'}
              </div>
              <Button
                onClick={() => {
                  if (!shareContact.trim()) {
                    p.onSend('', '');
                    return;
                  }
                  p.onSend(shareName, shareContact);
                  setShareOpen(false);
                  setShareName('');
                  setShareContact('');
                }}
                disabled={!shareContact.trim()}
              >
                Send summary
              </Button>
            </div>
          ) : null}
          <Button variant="soft" onClick={p.onSecondVisit}>
            Schedule a second visit
          </Button>
          <Button variant="ghost" height={44} onClick={p.onHome}>
            Back To Home
          </Button>
        </div>
      </div>
    </LightShell>
  );
};
