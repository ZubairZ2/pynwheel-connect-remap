'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

import { OrgsIcon, PropertiesIcon, SignOutIcon } from '~/core/components/atoms/Icons';
import { CORE_STRINGS } from '~/config/app/strings';
import { APP_ROUTES } from '~/config/app/urls';
import { i18n } from '~/resources/i18n';
import { generateNavigation, type NavItem } from '~/core/utils/generator/navigation.generator';
import type { CurrentUser } from '~/core/models/data/session.data';

const ICONS: Record<NavItem['icon'], () => React.JSX.Element> = {
  orgs: OrgsIcon,
  properties: PropertiesIcon
};

const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const Sidebar = ({ currentUser }: { currentUser: CurrentUser | null }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

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
              const Icon = ICONS[item.icon];
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`bo-navitem ${active ? 'bo-navitem--active' : ''}`}
                >
                  <span className="bo-navitem__icon">
                    <Icon />
                  </span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      <div className="bo-sidebar__user">
        <span className="bo-avatar" aria-hidden="true">
          {initialsOf(currentUser?.name ?? 'Pynwheel')}
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
          <SignOutIcon />
        </button>
      </div>
    </nav>
  );
};
