import communityPhoto from '~/assets/images/community-pool.jpg';
import { distanceLabel } from '~/store/scenarios';
import type { PropertyListing } from '~/models';
import { DEMO, DEMO_LISTINGS, HOW_SELF_TOURING_WORKS, type DemoListing } from '~/content/demoFixtures';
import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { LinkRow, NumberedStep, RoundAction } from '~/components/ui2';
import type { Property } from '~/models';
import type { LocationModel, TourCardModel } from '~/store/scenarios';
import { LightShell } from './shared';

interface Props {
  firstName: string;
  guest: boolean;
  /** The guest found a property (how), or null while the "Find a property" card shows. */
  guestProperty: 'near' | 'qr' | 'link' | null;
  property: Property | null;
  propertyInitials: string;
  location: LocationModel;
  locating: boolean;
  tourCard: TourCardModel | null;
  verified: boolean;
  tourSource: string;
  upcomingCount: number;
  moreUpcoming: string | null;
  agent: { name: string; initials: string } | null;
  /** A tour is in progress (so the visitor can pick it up where they left it). */
  resumable: { stopName: string; index: number; total: number } | null;
  showDirections: boolean;
  tourEnabled: boolean;
  onHelp: () => void;
  onLocationAsk: () => void;
  onLocationManage: () => void;
  onNearby: (listing: DemoListing) => void;
  /** The real properties near the phone (empty without a reading), and whether the row shows demo listings instead. */
  nearby: PropertyListing[];
  nearbyDemo: boolean;
  onNearbyProperty: (listing: PropertyListing) => void;
  onSeeAll: () => void;
  onGuestSignIn: () => void;
  onFind: (option: 'here' | 'qr' | 'book' | 'booked' | 'link') => void;
  onChangeGuestProperty: () => void;
  onTourPrimary: () => void;
  onDirections: () => void;
  onCall: () => void;
  onChat: () => void;
  onVerify: () => void;
  onStartTour: () => void;
  onResumeTour: () => void;
  onBook: () => void;
  onUpcoming: () => void;
  onHistory: () => void;
  onWayfinding: () => void;
  onArMode: () => void;
  onChangeProperty: () => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

const TONE_CLASS: Record<TourCardModel['tone'], string> = { primary: 'primary', live: 'live', warn: 'warn', muted: 'muted', danger: 'danger' };

/**
 * Home, as the October 2026 design draws it: the location row (seven
 * scenarios), the tour status card (seven scenarios), the guest's "Find a
 * property" card or the property card, the links card (upcoming tours, book
 * a tour, completed tours — plus Find Shortest Path and the AR demo, which
 * the app already had), and "How self-touring works".
 */
export const HomeScreen = (p: Props) => {
  const loc = p.location;
  const showNearby = !p.tourCard && (p.guest || !p.property);
  const showProperty = (!p.guest || !!p.guestProperty) && !p.tourCard && !!p.property;
  return (
    <LightShell footer={<TabBar active="home" onSelect={p.onTab} />}>
      <div className="pw-home">
        <div className="pw-home__top">
          <div className="pw-home__welcome">Welcome, {p.guest ? 'Guest' : p.firstName}</div>
          <IconButton icon="help" label="Help" onClick={p.onHelp} />
        </div>

        <div className="pw-home__loc">
          {p.locating ? (
            <div className="pw-home__locating">
              <span className="pw-home__locspin" />
              Finding your location…{DEMO}
            </div>
          ) : loc.perm === 'on' ? (
            <button type="button" className="pw-home__locline" onClick={p.onLocationManage}>
              <Icon name="pin" size={14} color={loc.warn ? 'var(--pw-warn-soft-text)' : 'var(--pw-primary)'} strokeWidth={2.2} />
              <span className={`pw-home__loctext${loc.warn ? ' pw-home__loctext--warn' : ''}`}>{loc.line}</span>
              {loc.lineSub ? <span className="pw-home__locsub">{loc.lineSub}</span> : null}
              <Icon name="chevronDown" size={12} color="var(--pw-text-subtle)" strokeWidth={2.4} />
            </button>
          ) : (
            <button type="button" className="pw-home__locask" onClick={p.onLocationAsk}>
              <span className="pw-home__locicon">
                <Icon name="pin" size={14} />
              </span>
              <span className="pw-home__locasktext">
                <span>{loc.offTitle}</span>
                <span>{loc.offSub}</span>
              </span>
              <span className="pw-home__loccta">{loc.offCta}</span>
            </button>
          )}
        </div>

        {showNearby ? (
          <div className="pw-home__nearby">
            <div className="pw-home__nearbyhead">
              <div>
                <div className="pw-home__nearbytitle">{loc.nearTitle}{p.nearbyDemo ? DEMO : ''}</div>
                {loc.nearNeedsLocation ? <div className="pw-home__nearbysub">Turn on location above to sort by distance</div> : null}
              </div>
              <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onSeeAll}>
                See all
              </button>
            </div>
            <div className="pw-home__nearbyscroll">
              {p.nearbyDemo
                ? DEMO_LISTINGS.slice(0, 5).map((n) => (
                    <button key={n.id} type="button" className="pw-home__nearbycard" onClick={() => p.onNearby(n)}>
                      <img src={n.img} alt="" />
                      <span>
                        <span className="pw-home__nearbyname">{n.name}</span>
                        <span className="pw-home__nearbymeta">{loc.perm === 'on' ? `${n.beds} · ${n.dist}` : `${n.beds} · ${n.address.split(',')[1]?.trim() ?? ''}`}</span>
                        <span className="pw-home__nearbyprice">From ${n.from.toLocaleString('en-US')}/mo</span>
                      </span>
                    </button>
                  ))
                : p.nearby.map((n) => (
                    <button key={n.id} type="button" className="pw-home__nearbycard" onClick={() => p.onNearbyProperty(n)}>
                      <img src={communityPhoto} alt="" />
                      <span>
                        <span className="pw-home__nearbyname">{n.name}</span>
                        <span className="pw-home__nearbymeta">{n.distanceM != null ? `${distanceLabel(n.distanceM)} away` : n.address}</span>
                        <span className="pw-home__nearbyprice">{n.tourable ? 'Self-guided tours' : 'Tours by appointment'}</span>
                      </span>
                    </button>
                  ))}
              {!p.nearbyDemo && !p.nearby.length && loc.perm === 'on' ? <div className="pw-home__nearbysub">No properties within reach of your location yet.</div> : null}
            </div>
          </div>
        ) : null}

        {p.guest ? (
          <div className="pw-home__guest">
            <div>
              <div className="pw-home__guesttitle">You&rsquo;re browsing as a guest</div>
              <div className="pw-home__guestsub">Look around the property and nearby listings. Sign in to book a tour, unlock doors and keep your tour history.</div>
            </div>
            <Button height={38} block={false} onClick={p.onGuestSignIn} style={{ fontSize: 13, padding: '0 16px' }}>
              Sign In or Create Account
            </Button>
          </div>
        ) : null}

        {p.agent ? (
          <div className="pw-home__agent">
            <div className="pw-home__agentavatar">
              <span>{p.agent.initials}</span>
              <i />
            </div>
            <div>
              <div className="pw-home__agentname">{p.agent.name} is assisting your tour</div>
              <div className="pw-home__agentsub">Your on-site leasing specialist is online now.</div>
            </div>
          </div>
        ) : null}

        {p.tourCard && p.property ? (
          <div className={`pw-tourcard pw-tourcard--${TONE_CLASS[p.tourCard.tone]}`}>
            <div className="pw-tourcard__head">
              <span>{p.tourCard.label}{DEMO}</span>
              <span className="pw-tourcard__count">{p.tourCard.countdown}</span>
            </div>
            <div className="pw-tourcard__body">
              <div className="pw-tourcard__row">
                <div className="pw-tourcard__logo" aria-label={`${p.property.name} logo`}>
                  {p.propertyInitials}
                </div>
                <div className="pw-tourcard__text">
                  <div className="pw-tourcard__name">{p.property.name}</div>
                  <div className="pw-tourcard__when">
                    {p.tourCard.dateLabel} · {p.tourCard.timeLabel}
                  </div>
                  <div className="pw-tourcard__unit">Self-tour · {p.tourSource}</div>
                </div>
                <div className="pw-tourcard__actions">
                  <RoundAction icon="phone" label="Call leasing" onClick={p.onCall} />
                  <RoundAction icon="chat" label="Chat" onClick={p.onChat} />
                </div>
              </div>
              {p.tourCard.meta ? (
                <div className="pw-tourcard__meta">
                  {p.verified ? (
                    <span className="pw-tourcard__verified">
                      <Icon name="check" size={11} color="#fff" strokeWidth={3} />
                      Verified
                    </span>
                  ) : (
                    <button type="button" className="pw-tourcard__verify" onClick={p.onVerify}>
                      Verify now →
                    </button>
                  )}
                  <span className="pw-tourcard__via">Booked via the app{DEMO}</span>
                </div>
              ) : null}
              {p.tourCard.note ? <div className="pw-tourcard__note">{p.tourCard.note}</div> : null}
              <div className="pw-tourcard__cta">
                {p.showDirections ? (
                  <Button variant="secondary" height={46} icon="navigation" onClick={p.onDirections} className="pw-tourcard__dir" style={{ fontSize: 15 }}>
                    Directions
                  </Button>
                ) : null}
                <Button height={46} onClick={p.onTourPrimary}>
                  {p.tourCard.cta}
                </Button>
              </div>
              {p.moreUpcoming ? (
                <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onUpcoming}>
                  {p.moreUpcoming}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {p.guest && !p.guestProperty ? (
          <div className="pw-home__find">
            <div className="pw-home__findtitle">Find a property to tour</div>
            <div className="pw-home__findlist">
              <LinkRow icon="pin" title="I'm at the property" sub="Detect the property from your location" onClick={() => p.onFind('here')} />
              <LinkRow icon="qr" title="Scan the QR code" sub="Find it on the entry sign or office door" onClick={() => p.onFind('qr')} />
              <LinkRow icon="search" title="Book a tour" sub="Browse properties, then pick a time" onClick={() => p.onFind('book')} />
              <LinkRow icon="calendar" title="I already scheduled a tour" sub="Sign in to see your booking" onClick={() => p.onFind('booked')} />
              <LinkRow icon="file" title="Open a tour link" sub="From a listing or the leasing team's email" onClick={() => p.onFind('link')} />
            </div>
          </div>
        ) : null}

        {showProperty && p.property ? (
          <>
            {p.guest && p.guestProperty ? (
              <div className="pw-home__guestfound">
                <span>{p.guestProperty === 'qr' ? 'Found by scanning the property QR code' : p.guestProperty === 'near' ? 'Closest to you · 0.2 mi' : 'Opened from a listing link'}{DEMO}</span>
                <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onChangeGuestProperty}>
                  Change property
                </button>
              </div>
            ) : null}
            <div className="pw-home__property">
              <img
                src={p.property.heroImage}
                alt=""
                className="pw-home__hero"
                onError={(e) => {
                  // A floor image the device cannot fetch (a private bucket) falls back to the bundled photo.
                  if (e.currentTarget.src !== communityPhoto) e.currentTarget.src = communityPhoto;
                }}
              />
              <div className="pw-home__propertybody">
                <div>
                  <div className="pw-home__propertyname">{p.property.name}</div>
                  <div className="pw-home__propertyaddress">{p.property.address}</div>
                  {!p.guest ? (
                    <button type="button" className="pw-textlink pw-textlink--sm" onClick={p.onChangeProperty}>
                      Change property
                    </button>
                  ) : null}
                </div>
                <Button height={48} onClick={p.onStartTour} disabled={!p.tourEnabled}>
                  Start Self-Tour
                </Button>
                <Button variant="secondary" height={46} icon="calendar" onClick={p.onBook}>
                  Book a Live Tour With Staff
                </Button>
                {!p.tourEnabled ? <div className="pw-home__disabled">The Self-Guided Tour is not turned on for this property yet.</div> : null}
              </div>
            </div>
          </>
        ) : null}

        {p.resumable ? (
          <button type="button" className="pw-home__resume" onClick={p.onResumeTour}>
            <span className="pw-home__resumeicon">
              <Icon name="walk" size={18} />
            </span>
            <span className="pw-home__resumetext">
              <span className="pw-home__resumetitle">Resume your tour</span>
              <span className="pw-home__resumesub">
                Stop {p.resumable.index} of {p.resumable.total} · {p.resumable.stopName}
              </span>
            </span>
            <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
          </button>
        ) : null}

        {!p.guest || p.guestProperty ? (
          <div className="pw-home__links">
            {!p.guest ? <LinkRow icon="calendar" title="Upcoming tours" sub="Check in, reschedule or cancel" badge={p.upcomingCount} onClick={p.onUpcoming} /> : null}
            <LinkRow icon="search" title="Book a tour" sub="Browse properties, then pick a time" onClick={p.onSeeAll} />
            {!p.guest ? <LinkRow icon="check" title="Completed tours" sub="Your photos, notes and saved units" onClick={p.onHistory} /> : null}
            {p.property ? <LinkRow icon="route" title="Find Shortest Path" sub="Pick where you are and where you're going" onClick={p.onWayfinding} /> : null}
            {p.property ? <LinkRow icon="eye" title="See the property in AR" sub={`Scan the lobby QR code to launch augmented reality${DEMO}`} onClick={p.onArMode} /> : null}
          </div>
        ) : null}

        {!p.tourCard ? (
          <div className="pw-home__how">
            <div className="pw-home__howtitle">How self-touring works</div>
            {HOW_SELF_TOURING_WORKS.map((s) => (
              <NumberedStep key={s.n} n={s.n} title={s.title} sub={s.sub} />
            ))}
          </div>
        ) : null}
        <div style={{ height: 24 }} />
      </div>
    </LightShell>
  );
};
