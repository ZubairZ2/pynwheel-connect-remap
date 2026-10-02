'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { activeNavId, generateNavigation } from '~/core/utils/generator/navigation.generator';
import { DemoMark } from '~/core/components/atoms/DemoMark';

/**
 * The design's back-office sidebar: brand and grouped nav. The signed-in
 * user and sign out live in the top bar (`Navbar`).
 */
export const Sidebar = () => {
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
                  {item.badge && (
                    <span className="bo-navbadge">
                      {item.badge}
                      <DemoMark />
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
};
