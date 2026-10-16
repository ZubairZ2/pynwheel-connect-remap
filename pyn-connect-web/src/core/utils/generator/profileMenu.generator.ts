import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';

export interface ProfileMenuItem {
  id: string;
  label: string;
  sub: string;
  icon: string;
  /** Where the item goes. Items without one are not available in Connect yet, and say so. */
  href?: string;
}

const P = CORE_STRINGS.profileMenu;

/**
 * The top bar's profile menu (Back Office design, Oct 13, 2026). The CMS has
 * no account pages Connect can open for these yet, so every item except Help
 * & Support announces that it is not available here rather than pretending.
 */
export const generateProfileMenu = (): ProfileMenuItem[] => [
  { id: 'profile', label: i18n.t(P.myProfile), sub: i18n.t(P.myProfileSub), icon: 'users' },
  { id: 'account', label: i18n.t(P.accountSettings), sub: i18n.t(P.accountSettingsSub), icon: 'pages' },
  { id: 'security', label: i18n.t(P.security), sub: i18n.t(P.securitySub), icon: 'shield' },
  { id: 'notifications', label: i18n.t(P.notifications), sub: i18n.t(P.notificationsSub), icon: 'mail' },
  { id: 'sessions', label: i18n.t(P.sessions), sub: i18n.t(P.sessionsSub), icon: 'clock' },
  { id: 'help', label: i18n.t(P.help), sub: i18n.t(P.helpSub), icon: 'help', href: CONNECT_ROUTES.help }
];

/** The toast an unavailable item shows: "{label} isn't available in Connect yet." */
export const profileMenuUnavailable = (label: string): string => i18n.t(P.unavailable).replace('{label}', label);
