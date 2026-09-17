'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { activeNavId, generateNavigation } from '~/core/utils/generator/navigation.generator';
import { initials } from '~/core/utils/connect/format';
import { i18n } from '~/resources/i18n';
import type { CurrentUser } from '~/core/models/data/session.data';

/** The design's back-office sidebar: brand, grouped nav, signed-in user. */
export const Sidebar = ({ currentUser }: { currentUser: CurrentUser | null }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const active = activeNavId(pathname);

  const signOut = async () => {
    setSigningOut(true);
    await fetch('/api/auth/sign-out', { method: 'POST' });
    router.replace(APP_ROUTES.signIn);
    router.refresh();
  };

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
        <button
          type="button"
          className="bo-iconbutton"
          aria-label={i18n.t(CORE_STRINGS.shared.signOut)}
          disabled={signingOut}
          onClick={signOut}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </nav>
  );
};
