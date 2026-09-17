import {
  HERO_MEDIA,
  KICKOFF_PALETTE,
  MARKER_SIZES,
  NAV_BTN_STYLES,
  STARTER_THEMES
} from '~/data/mock/branding.mock';
import { FONT_FAMILIES, FONT_WEIGHTS } from '~/data/mock/branding.mock';
import { curTheme } from '~/core/store/demo/demo.selectors';
import type { DemoState } from '~/core/store/demo/demo.state';

/** The property theme, decorated with the labels the branding screen shows. */
export const generateThemeView = (state: DemoState) => {
  const theme = curTheme(state);
  const starter = STARTER_THEMES.find((t) => t.id === theme?.theme) ?? STARTER_THEMES[0];

  return {
    ...theme,
    themeName: starter.name,
    alignLabel: theme ? theme.align.charAt(0).toUpperCase() + theme.align.slice(1) : '',
    heroLabel: HERO_MEDIA.find((h) => h.id === theme?.hero)?.label ?? '',
    navLabel: NAV_BTN_STYLES.find((n) => n.id === theme?.navStyle)?.label ?? '',
    sizeLabel: `${theme?.size ?? 16}px`
  };
};

export const generateBrandTabs = (active: string) =>
  [
    { id: 'theme', label: 'Starter Theme' },
    { id: 'tokens', label: 'Token Editor' },
    { id: 'logos', label: 'Logo Manager' }
  ].map((tab) => ({
    ...tab,
    active: active === tab.id,
    bg: active === tab.id ? 'var(--bo-ink)' : '#fff',
    color: active === tab.id ? '#fff' : 'var(--bo-muted)',
    border: active === tab.id ? 'var(--bo-ink)' : 'var(--bo-line)'
  }));

export const generateStarterThemes = (state: DemoState) => {
  const theme = curTheme(state);
  return STARTER_THEMES.map((starter) => {
    const active = starter.id === theme?.theme;
    return {
      ...starter,
      active,
      border: active ? 'var(--bo-accent)' : 'var(--bo-line)',
      bg: active ? 'var(--bo-accent-soft)' : '#fff',
      check: active ? '1' : '0'
    };
  });
};

export const generateLogoCards = (state: DemoState) => {
  const theme = curTheme(state);

  return (
    [
      { which: 'primary', label: 'Primary Logo', note: 'Used on the kiosk home screen and the web embed', ratio: '3:1', set: !!theme?.logoPrimary },
      { which: 'secondary', label: 'Secondary Logo', note: 'Used in the emailed favorites brochure', ratio: '1:1', set: !!theme?.logoSecondary }
    ] as const
  ).map((card) => ({
    ...card,
    notSet: !card.set,
    statusLabel: card.set ? 'Uploaded & cropped' : 'Not uploaded',
    statusV: card.set ? 'ok' : 'neutral'
  }));
};

export const generateAlignOptions = (state: DemoState) => {
  const theme = curTheme(state);
  return (['left', 'center', 'right'] as const).map((align) => ({
    id: align,
    label: align.charAt(0).toUpperCase() + align.slice(1),
    active: theme?.align === align,
    bg: theme?.align === align ? 'var(--bo-accent-soft)' : '#fff',
    border: theme?.align === align ? 'var(--bo-accent)' : 'var(--bo-line)',
    color: theme?.align === align ? 'var(--bo-accent)' : 'var(--bo-muted)'
  }));
};

export const generateNavStyleOptions = (state: DemoState) => {
  const theme = curTheme(state);
  return NAV_BTN_STYLES.map((style) => ({
    ...style,
    active: theme?.navStyle === style.id,
    bg: theme?.navStyle === style.id ? 'var(--bo-accent-soft)' : '#fff',
    border: theme?.navStyle === style.id ? 'var(--bo-accent)' : 'var(--bo-line)',
    color: theme?.navStyle === style.id ? 'var(--bo-accent)' : 'var(--bo-muted)'
  }));
};

export const generateMarkerSizeOptions = (state: DemoState) => {
  const theme = curTheme(state);
  return MARKER_SIZES.map((size) => ({
    id: size,
    label: size,
    active: theme?.markerSize === size,
    bg: theme?.markerSize === size ? 'var(--bo-accent-soft)' : '#fff',
    border: theme?.markerSize === size ? 'var(--bo-accent)' : 'var(--bo-line)',
    color: theme?.markerSize === size ? 'var(--bo-accent)' : 'var(--bo-muted)'
  }));
};

export const generateHeroOptions = (state: DemoState) => {
  const theme = curTheme(state);
  return HERO_MEDIA.map((media) => ({
    ...media,
    active: theme?.hero === media.id,
    bg: theme?.hero === media.id ? 'var(--bo-accent-soft)' : '#fff',
    border: theme?.hero === media.id ? 'var(--bo-accent)' : 'var(--bo-line)',
    color: theme?.hero === media.id ? 'var(--bo-accent)' : 'var(--bo-muted)'
  }));
};

/** The preview dot's diameter — the design binds it to both width and height. */
export const generateMarkerDot = (state: DemoState): string => {
  const size = curTheme(state)?.markerSize;
  return size === 'Small' ? '14px' : size === 'Large' ? '26px' : '20px';
};

export const generateKickoffSwatches = (state: DemoState) =>
  KICKOFF_PALETTE.map((hex) => ({
    hex,
    sel: hex === state.koPalette,
    ring:
      hex === state.koPalette
        ? '0 0 0 3px var(--bo-accent-soft), 0 0 0 1px var(--bo-accent)'
        : '0 0 0 1px var(--bo-line)'
  }));

export const BRAND_FONT_OPTIONS = { fontFamilies: FONT_FAMILIES, fontWeights: FONT_WEIGHTS };
