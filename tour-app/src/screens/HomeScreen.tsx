import communityPhoto from '~/assets/images/community-pool.jpg';
import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Pill } from '~/components/ui';
import type { Property, TourHistoryEntry } from '~/models';
import { LightShell } from './shared';

interface Props {
  firstName: string;
  property: Property;
  tourHistory: TourHistoryEntry[];
  agent: { name: string; initials: string } | null;
  /** A tour is in progress (so the visitor can pick it up where they left it). */
  resumable: { stopName: string; index: number; total: number } | null;
  onHelp: () => void;
  onStartTour: () => void;
  onResumeTour: () => void;
  onBook: () => void;
  onArMode: () => void;
  onWayfinding: () => void;
  /** Opens the property picker (Search). */
  onChangeProperty: () => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

export const HomeScreen = ({ firstName, property, tourHistory, agent, resumable, onHelp, onStartTour, onResumeTour, onBook, onArMode, onWayfinding, onChangeProperty, onTab }: Props) => (
  <LightShell footer={<TabBar active="home" onSelect={onTab} />}>
    <div className="pw-home">
      <div className="pw-home__top">
        <div className="pw-home__welcome">Welcome, {firstName}</div>
        <IconButton icon="help" label="Help" onClick={onHelp} />
      </div>
      <button type="button" className="pw-home__location pw-home__location--button" onClick={onChangeProperty} aria-label="Change property">
        <Icon name="pin" size={12} />
        {property.city ? `${property.city} · ` : ''}Change property
        <Icon name="chevronDown" size={12} />
      </button>

      {agent ? (
        <div className="pw-home__agent">
          <div className="pw-home__agentavatar">
            <span>{agent.initials}</span>
            <i />
          </div>
          <div>
            <div className="pw-home__agentname">{agent.name} is assisting your tour</div>
            <div className="pw-home__agentsub">Your on-site leasing specialist is online now.</div>
          </div>
        </div>
      ) : null}

      <div className="pw-home__property">
        <img
          src={property.heroImage}
          alt=""
          className="pw-home__hero"
          onError={(e) => {
            // A floor image the device cannot fetch (a private bucket) falls back to the bundled photo.
            if (e.currentTarget.src !== communityPhoto) e.currentTarget.src = communityPhoto;
          }}
        />
        <div className="pw-home__propertybody">
          <div>
            <div className="pw-home__propertyname">{property.name}</div>
            <div className="pw-home__propertyaddress">{property.address}</div>
          </div>
          <Button height={48} onClick={onStartTour}>
            Start Self-Tour
          </Button>
          <Button variant="secondary" height={46} icon="calendar" onClick={onBook}>
            Book a Live Tour With Staff
          </Button>
        </div>
      </div>

      {resumable ? (
        <button type="button" className="pw-home__resume" onClick={onResumeTour}>
          <span className="pw-home__resumeicon">
            <Icon name="walk" size={18} />
          </span>
          <span className="pw-home__resumetext">
            <span className="pw-home__resumetitle">Resume your tour</span>
            <span className="pw-home__resumesub">
              Stop {resumable.index} of {resumable.total} · {resumable.stopName}
            </span>
          </span>
          <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
        </button>
      ) : null}

      <button type="button" className="pw-home__ar" onClick={onArMode}>
        <Pill tone="yellow">New · AR Mode</Pill>
        <span className="pw-home__artitle">See The Property In AR</span>
        <span className="pw-home__arsub">Scan the lobby QR code to launch augmented reality.</span>
      </button>

      <button type="button" className="pw-home__wayfind" onClick={onWayfinding}>
        <span className="pw-home__wayfindicon">
          <Icon name="route" size={20} />
        </span>
        <span className="pw-home__wayfindtext">
          <span className="pw-home__wayfindtitle">Find Shortest Path</span>
          <span className="pw-home__wayfindsub">Pick where you are and where you’re going — we route you floor to floor.</span>
        </span>
        <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
      </button>

      <div className="pw-home__history">
        <div className="pw-home__historytitle">Tour History</div>
        {tourHistory.length ? (
          tourHistory.map((item) => (
            <div key={item.id} className="pw-historycard">
              <div className="pw-historycard__head">
                <div className="pw-historycard__property">{item.property}</div>
                <div className="pw-historycard__date">{item.date}</div>
              </div>
              <div className="pw-historycard__tags">
                {item.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="pw-home__nohistory">No tours yet — your first self-tour will show here.</div>
        )}
      </div>
    </div>
  </LightShell>
);
