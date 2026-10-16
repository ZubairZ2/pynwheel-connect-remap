'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { ChevronDownIcon, SignOutIcon } from '~/core/components/atoms/Icons';
import type { CurrentUser } from '~/core/models/data/session.data';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { initials } from '~/core/utils/connect/format';
import { generateProfileMenu, profileMenuUnavailable } from '~/core/utils/generator/profileMenu.generator';
import { i18n } from '~/resources/i18n';

interface Props {
  user: CurrentUser | null;
  onSignOut: () => void;
  signingOut: boolean;
}

/**
 * The design's profile pill in the top bar: avatar, name and role, and a
 * dropdown with the account items and Sign Out. The name, email and role are
 * the signed-in user's (the Rails session); the items that have no page in
 * Connect yet say so when clicked.
 */
export const ProfileMenu = ({ user, onSignOut, signingOut }: Props) => {
  const id = useId();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const name = user?.name?.trim() || 'Pynwheel';
  const items = generateProfileMenu();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const pick = (item: ReturnType<typeof generateProfileMenu>[number]) => {
    setOpen(false);
    if (item.href) router.push(item.href);
    else dispatch(demoActions.showToast(profileMenuUnavailable(item.label)));
  };

  return (
    <div className="bo-userpill__wrap" ref={rootRef}>
      <button
        type="button"
        className={`bo-userpill${open ? ' bo-userpill--open' : ''}`}
        data-testid="topbar-user"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`${id}-menu`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="bo-avatar bo-userpill__avatar" aria-hidden="true">
          {initials(name)}
        </span>
        <span className="bo-topbar__usertext">
          <span className="bo-topbar__username">{user?.name ?? '—'}</span>
          <span className="bo-topbar__role">{user?.role ?? ''}</span>
        </span>
        <span className="bo-userpill__chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div className="bo-usermenu" id={`${id}-menu`} role="menu" aria-label={i18n.t(CORE_STRINGS.profileMenu.label)}>
          <div className="bo-usermenu__head">
            <span className="bo-avatar bo-usermenu__avatar" aria-hidden="true">
              {initials(name)}
            </span>
            <div className="bo-usermenu__who">
              <div className="bo-usermenu__name">{user?.name ?? '—'}</div>
              <div className="bo-usermenu__email">{user?.email ?? ''}</div>
              {user?.role && <span className="bo-usermenu__role">{user.role}</span>}
            </div>
          </div>
          <div className="bo-usermenu__items">
            {items.map((item) => (
              <button key={item.id} type="button" role="menuitem" className="bo-usermenu__item" onClick={() => pick(item)}>
                <span className="bo-usermenu__icon" aria-hidden="true">
                  <Icon name={item.icon} />
                </span>
                <span className="bo-usermenu__text">
                  <span className="bo-usermenu__label">{item.label}</span>
                  <span className="bo-usermenu__sub">{item.sub}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="bo-usermenu__foot">
            <button type="button" role="menuitem" className="bo-usermenu__signout" disabled={signingOut} onClick={onSignOut}>
              <SignOutIcon />
              {i18n.t(CORE_STRINGS.shared.signOut)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
