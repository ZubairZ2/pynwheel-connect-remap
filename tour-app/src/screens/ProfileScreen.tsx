import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import type { Visitor } from '~/models';
import { LightShell } from './shared';

interface Props {
  visitor: Visitor;
  propertyName: string;
  journey: { toured: boolean; booked: boolean; applied: boolean; followup: boolean };
  onHistory: () => void;
  onNotifications: () => void;
  onSettings: () => void;
  onSignOut: () => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

export const ProfileScreen = ({ visitor, propertyName, journey, onHistory, onNotifications, onSettings, onSignOut, onTab }: Props) => {
  const steps = [
    { label: 'Toured the property', done: journey.toured },
    { label: 'Booked a live tour', done: journey.booked },
    { label: 'Applied online', done: journey.applied },
    { label: 'Follow-up from leasing team', done: journey.followup }
  ];
  return (
    <LightShell footer={<TabBar active="profile" onSelect={onTab} />}>
      <div className="pw-profile">
        <div className="pw-profile__head">
          <div className="pw-profile__avatar">{visitor.initials}</div>
          <div>
            <div className="pw-profile__name">{visitor.name}</div>
            <div className="pw-profile__email">{visitor.email}</div>
          </div>
        </div>
        <div className="pw-profile__journey">
          <div className="pw-profile__journeytitle">Your Journey at {propertyName}</div>
          {steps.map((step) => (
            <div key={step.label} className="pw-profile__step">
              <span className={`pw-profile__stepdot${step.done ? ' pw-profile__stepdot--done' : ''}`} />
              <span className="pw-profile__steplabel">{step.label}</span>
              {step.done ? <Icon name="check" size={16} color="var(--pw-primary)" strokeWidth={2.4} /> : <span className="pw-profile__pending">Pending</span>}
            </div>
          ))}
        </div>
        <div className="pw-profile__menu">
          <button type="button" onClick={onHistory}>
            Tour History
            <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
          </button>
          <button type="button" onClick={onNotifications}>
            Notifications
            <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
          </button>
          <button type="button" onClick={onSettings}>
            Settings
            <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
          </button>
          <button type="button" className="pw-profile__signout" onClick={onSignOut}>
            Sign Out
          </button>
        </div>
      </div>
    </LightShell>
  );
};
