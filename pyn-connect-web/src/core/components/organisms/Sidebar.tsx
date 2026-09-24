'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { activeNavId, generateNavigation } from '~/core/utils/generator/navigation.generator';
import { initials } from '~/core/utils/connect/format';
import type { CurrentUser } from '~/core/models/data/session.data';

/**
 * The design's back-office sidebar: brand, grouped nav, signed-in user. Sign
 * out lives in the top bar (`Navbar`), as the 22-Sep design moved it.
 */
export const Sidebar = ({ currentUser }: { currentUser: CurrentUser | null }) => {
  const pathname = usePathname();
  const active = activeNavId(pathname);

  return (
    <nav className="bo-sidebar" aria-label="Primary">
      <div className="bo-sidebar__brand">
        <Image
          src="/images/pynwheel-connect-logo.png"
          alt="Pynwheel Connect"
          width={103}
          height={24}
          priority
          className="bo-sidebar__logo"
        />
        <span className="bo-chip">PLATFORM</span>
      </div>

      <div className="bo-sidebar__nav">
        {generateNavigation().map((group) => (
          <div key={group.header}>
            <div className="bo-sidebar__header">{group.header}</div>
            {group.items.map((item) => {
              const isActive = active === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`bo-navitem ${isActive ? 'bo-navitem--active' : ''}`}
                >
                  <Icon name={item.icon} className="bo-navitem__icon" />
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && <span className="bo-navbadge">{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="bo-sidebar__user">
        <span className="bo-avatar" aria-hidden="true">
          {initials(currentUser?.name ?? 'Pynwheel')}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bo-sidebar__username">{currentUser?.name ?? '—'}</div>
          <div className="bo-sidebar__role">{currentUser?.role ?? ''}</div>
        </div>
      </div>
    </nav>
  );
};
