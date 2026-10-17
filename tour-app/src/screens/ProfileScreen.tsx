import { DEMO, GUEST_PERKS } from '~/content/demoFixtures';
import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Eyebrow } from '~/components/ui2';
import type { Profile } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  guest: boolean;
  profile: Profile;
  propertyName: string | null;
  verified: boolean;
  verifiedLabel: string;
  savedCount: number;
  passesCount: number;
  journey: { verified: boolean; toured: boolean; booked: boolean; applied: boolean; followup: boolean };
  onBack: () => void;
  onVerify: () => void;
  onSaved: () => void;
  onPasses: () => void;
  onHistory: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  onGuestSignIn: () => void;
  onFindProperty: () => void;
  onVirtualTour: () => void;
  onHelp: () => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

const Row = ({ label, value, onClick, primary = false }: { label: string; value?: React.ReactNode; onClick: () => void; primary?: boolean }) => (
  <button type="button" className={`pw-profile__row${primary ? ' pw-profile__row--primary' : ''}`} onClick={onClick}>
    <span>{label}</span>
    {value != null ? <span className="pw-profile__rowvalue">{value}</span> : null}
    {!primary ? <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" /> : null}
  </button>
);

/** Profile: the member's journey and account rows, or the guest's invitation to sign in. */
export const ProfileScreen = (p: Props) => {
  const steps = [
    { label: 'Verified identity', done: p.journey.verified },
    { label: 'Toured the property', done: p.journey.toured },
    { label: 'Booked a live tour', done: p.journey.booked },
    { label: 'Applied online', done: p.journey.applied },
    { label: 'Follow-up from leasing team', done: p.journey.followup }
  ];
  return (
    <LightShell footer={<TabBar active="profile" onSelect={p.onTab} />}>
      <div className="pw-profile">
        <div className="pw-profile__head2">
          <IconButton icon="back" label="Back" onClick={p.onBack} />
          <div className="pw-profile__screentitle">Profile</div>
        </div>
        {p.guest ? (
          <>
            <div className="pw-profile__guest">
              <span className="pw-profile__guestavatar">
                <Icon name="user" size={28} />
              </span>
              <div className="pw-profile__guesttitle">You&rsquo;re browsing as a guest</div>
              <div className="pw-profile__guestsub">Sign in or create an account to book tours and unlock doors.</div>
            </div>
            <Button onClick={p.onGuestSignIn}>Sign In or Create Account</Button>
            <div className="pw-profile__perks">
              <Eyebrow>With an account you can</Eyebrow>
              {GUEST_PERKS.map((perk) => (
                <div key={perk}>
                  <Icon name="check" size={16} color="var(--pw-primary)" strokeWidth={2.6} />
                  {perk}
                </div>
              ))}
            </div>
            <div className="pw-profile__menu">
              <Row label="Find a property" onClick={p.onFindProperty} />
              <Row label="Take a virtual tour" onClick={p.onVirtualTour} />
              <Row label="Help" onClick={p.onHelp} />
              <Row label="Settings" onClick={p.onSettings} />
            </div>
          </>
        ) : (
          <>
            <div className="pw-profile__head">
              <div className="pw-profile__avatar">{p.profile.initial}</div>
              <div>
                <div className="pw-profile__nameline">
                  <div className="pw-profile__name">
                    {p.profile.first} {p.profile.last}
                  </div>
                  {p.verified ? (
                    <span className="pw-profile__verified">
                      <Icon name="check" size={10} color="#fff" strokeWidth={3.2} />
                      Verified
                    </span>
                  ) : (
                    <button type="button" className="pw-profile__verifynow" onClick={p.onVerify}>
                      Verify now →
                    </button>
                  )}
                </div>
                <div className="pw-profile__email">{p.profile.email}</div>
              </div>
            </div>
            <div className="pw-profile__journey">
              <div className="pw-profile__journeytitle">Your Journey{p.propertyName ? ` at ${p.propertyName}` : ''}</div>
              {steps.map((step) => (
                <div key={step.label} className="pw-profile__step">
                  <span className={`pw-profile__stepdot${step.done ? ' pw-profile__stepdot--done' : ''}`} />
                  <span className="pw-profile__steplabel">{step.label}</span>
                  {step.done ? <Icon name="check" size={16} color="var(--pw-primary)" strokeWidth={2.4} /> : <span className="pw-profile__pending">Pending</span>}
                </div>
              ))}
            </div>
            <div className="pw-profile__menu">
              <Row label="Verification" value={<span className={p.verified ? '' : 'pw-profile__warn'}>{p.verifiedLabel}</span>} onClick={p.onVerify} />
              <Row label="Saved units" value={`${p.savedCount} saved`} onClick={p.onSaved} />
              <Row label="Tour passes" value={`${p.passesCount} ${p.passesCount === 1 ? 'pass' : 'passes'}`} onClick={p.onPasses} />
              <Row label="Tour History" onClick={p.onHistory} />
              <Row label="Notifications" onClick={p.onNotifications} />
              <Row label="Settings" onClick={p.onSettings} />
              <Row label="Sign Out" onClick={p.onSignOut} primary />
            </div>
            <div className="pw-profile__note">Verification, saved units and tour passes are kept on this phone in this build.{DEMO}</div>
          </>
        )}
      </div>
    </LightShell>
  );
};
