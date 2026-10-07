import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * The device chrome of every screen: the status-bar area at the top (the
 * reference draws "9:41" and the signal / battery glyphs; the real device
 * draws its own, so the app only reserves the height), the home-indicator
 * area at the bottom, the 34 px screen header and the Home / Search /
 * Profile tab bar.
 */

export const StatusArea = ({ dark = false }: { dark?: boolean }) => (
  <div className={`pw-status${dark ? ' pw-status--dark' : ''}`} aria-hidden>
    <span className="pw-status__time">9:41</span>
    <span className="pw-status__glyphs">
      <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
        <rect x="0" y="6" width="3" height="5" rx="0.5" />
        <rect x="5" y="4" width="3" height="7" rx="0.5" />
        <rect x="10" y="2" width="3" height="9" rx="0.5" />
        <rect x="15" y="0" width="2" height="11" rx="0.5" />
      </svg>
      <svg width="25" height="11" viewBox="0 0 25 11" fill="none" stroke="currentColor" strokeWidth="1">
        <rect x="0.5" y="0.5" width="20" height="10" rx="2" />
        <rect x="2" y="2" width="17" height="7" rx="1" fill="currentColor" />
      </svg>
    </span>
  </div>
);

export const HomeIndicator = ({ dark = false }: { dark?: boolean }) => (
  <div className="pw-homebar" aria-hidden>
    <div className={`pw-homebar__pill${dark ? ' pw-homebar__pill--dark' : ''}`} />
  </div>
);

interface HeaderProps {
  left?: ReactNode;
  title?: ReactNode;
  right?: ReactNode;
  /** `row` = back + title side by side (Build Your Tour); `split` = buttons at both ends (Stop detail); `center` = title centred between two buttons (Self-Guided Tour). */
  layout?: 'row' | 'split' | 'center';
  className?: string;
}

export const ScreenHeader = ({ left, title, right, layout = 'row', className }: HeaderProps) => (
  <div className={`pw-header pw-header--${layout}${className ? ` ${className}` : ''}`}>
    {left}
    {title ? <div className="pw-header__title">{title}</div> : null}
    {layout !== 'row' ? right : null}
  </div>
);

export type Tab = 'home' | 'search' | 'profile';

export const TabBar = ({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) => {
  const tabs: { id: Tab; label: string; icon: IconName }[] = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'profile', label: 'Profile', icon: 'user' }
  ];
  return (
    <nav className="pw-tabs" aria-label="Main">
      {tabs.map((tab) => (
        <button key={tab.id} type="button" className={`pw-tab${active === tab.id ? ' pw-tab--on' : ''}`} onClick={() => onSelect(tab.id)} aria-current={active === tab.id ? 'page' : undefined}>
          <Icon name={tab.icon} size={20} />
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
