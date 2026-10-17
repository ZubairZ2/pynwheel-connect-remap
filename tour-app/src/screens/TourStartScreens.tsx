import { ACCESS_MINUTES } from '~/content/demoFixtures';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import type { StartPoint } from '~/store/views';
import { LightShell } from './shared';

interface StartProps {
  virtual: boolean;
  startPoints: StartPoint[];
  startPointId: string | null;
  stats: { v: string; l: string }[];
  onPick: (id: string) => void;
  onGo: () => void;
  onBack: () => void;
  onCall: () => void;
  onChat: () => void;
}

/**
 * Before You Start: what the tour is (in person with door access, or
 * virtual), how it works, the starting point (one, or a choice with the
 * Multiple scenario), help, and "I'm at …" / "Start Virtual Tour".
 */
export const TourStartScreen = ({ virtual, startPoints, startPointId, stats, onPick, onGo, onBack, onCall, onChat }: StartProps) => {
  const multi = startPoints.length > 1;
  const cur = startPoints.find((s) => s.id === startPointId) ?? startPoints[0];
  const how = virtual
    ? [
        ['eye', 'Tour on your schedule', 'Anytime, anywhere. No need to be on site.'],
        ['map', 'See how a self-tour works', 'Same route and stops as an in-person tour.'],
        ['heart', 'Decide if it fits you', 'Explore first, then visit if you like it.']
      ]
    : [
        ['unlock', 'Unlock doors from your phone', 'Tap Unlock at each door. No keys needed.'],
        ['route', 'Follow the route stop by stop', 'The app guides you to every unit and amenity.'],
        ['flag', 'Finish where you started', 'Return here and tap Finish to check out.']
      ];
  return (
    <LightShell
      footer={
        <div className="pw-tstart__foot">
          <div className="pw-tstart__helptitle">Need help during the tour?</div>
          <div className="pw-tstart__help">
            <button type="button" onClick={onCall}>
              <Icon name="phone" size={15} color="var(--pw-primary)" strokeWidth={2.1} />
              Call Leasing
            </button>
            <button type="button" onClick={onChat}>
              <Icon name="chat" size={15} color="var(--pw-primary)" strokeWidth={2.1} />
              Chat with Us
            </button>
          </div>
          <Button onClick={onGo}>{virtual ? 'Start Virtual Tour' : `I'm at ${cur?.name.replace(/ \*$/, '') ?? 'the entrance'}`}</Button>
        </div>
      }
    >
      <div className="pw-tstart">
        <div className="pw-tstart__head">
          <IconButton icon="back" label="Back" onClick={onBack} />
          <div>
            <div className="pw-tstart__title">Before You Start</div>
            <div className="pw-tstart__meta">
              <Icon name="check" size={12} strokeWidth={2.6} />
              {virtual ? 'Virtual tour · No check-in or ID needed' : `Checked in · Door access active for ${ACCESS_MINUTES} min`}
            </div>
          </div>
        </div>
        <div className="pw-tstart__stats">
          {stats.map((s) => (
            <div key={s.l}>
              <b>{s.v}</b>
              <span>{s.l}</span>
            </div>
          ))}
        </div>
        <div className="pw-tstart__how">
          <div className="pw-tstart__howtitle">How your tour works</div>
          {how.map(([icon, title, sub]) => (
            <div key={title} className="pw-tstart__howrow">
              <span className="pw-tstart__howicon">
                <Icon name={icon as 'eye'} size={14} strokeWidth={2.1} />
              </span>
              <span>
                <span className="pw-tstart__howname">{title}</span>
                <span className="pw-tstart__howsub">{sub}</span>
              </span>
            </div>
          ))}
        </div>
        <div className="pw-tstart__startlabel">
          <div>{multi ? 'Choose where to start' : 'Your starting point'}</div>
          <div>{virtual ? (multi ? 'Pick an entrance. The virtual tour follows the route from there.' : 'Your virtual tour follows the route from here.') : multi ? "Pick the entrance you're closest to. You'll finish there too." : 'Your tour starts and finishes here.'}</div>
        </div>
        <div className="pw-tstart__points">
          {startPoints.map((sp) => {
            const on = sp.id === cur?.id;
            return (
              <button key={sp.id} type="button" className={`pw-tstart__point${multi && on ? ' pw-tstart__point--on' : ''}`} onClick={() => onPick(sp.id)} aria-pressed={multi ? on : undefined}>
                <img src={sp.img} alt="" style={{ width: multi ? 40 : 56, height: multi ? 40 : 56 }} />
                <span className="pw-tstart__pointtext">
                  <span className="pw-tstart__pointname">{sp.name}</span>
                  <span className="pw-tstart__pointwhere">{sp.where}</span>
                </span>
                {multi ? <span className={`pw-radio${on ? ' pw-radio--on' : ''}`} /> : null}
              </button>
            );
          })}
        </div>
        {multi ? <div className="pw-tstart__hint">{cur?.hint}</div> : null}
      </div>
    </LightShell>
  );
};

interface ReturnProps {
  startPoint: StartPoint;
  onFinish: () => void;
  onBack: () => void;
  onHelp: () => void;
}

/** Return to Start: all stops done, head back to the starting point and check out. */
export const TourReturnScreen = ({ startPoint, onFinish, onBack, onHelp }: ReturnProps) => (
  <LightShell>
    <div className="pw-treturn">
      <div className="pw-tstart__head">
        <IconButton icon="back" label="Back" onClick={onBack} />
        <div className="pw-tstart__title">All Stops Done</div>
      </div>
      <div className="pw-treturn__hero">
        <span className="pw-treturn__badge">
          <Icon name="flag" size={28} color="var(--pw-primary)" />
        </span>
        <div className="pw-treturn__title">Head back to {startPoint.name.replace(/ \*$/, '')}</div>
        <div className="pw-treturn__sub">Your tour ends where it started. When you&rsquo;re back, tap below to finish and check out.</div>
      </div>
      <div className="pw-treturn__point">
        <img src={startPoint.img} alt="" />
        <span>
          <span className="pw-tstart__pointname">{startPoint.name}</span>
          <span className="pw-tstart__pointwhere">{startPoint.where}</span>
        </span>
      </div>
      <div className="pw-treturn__note">
        <Icon name="clock" size={16} color="var(--pw-primary)" strokeWidth={2.2} />
        Door access stays active until you finish, so you can still revisit a stop on the way.
      </div>
      <div className="pw-treturn__actions">
        <Button height={50} onClick={onFinish}>
          I&rsquo;m Back at {startPoint.name.replace(/ \*$/, '')}
        </Button>
        <button type="button" className="pw-textlink" onClick={onHelp}>
          Can&rsquo;t find it? Get help
        </button>
      </div>
    </div>
  </LightShell>
);
