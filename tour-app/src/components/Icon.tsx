import type { CSSProperties } from 'react';

/**
 * The reference's inline SVG icons, one component. Every path is the
 * design's own (24×24, stroked unless noted); the stop and route glyphs are
 * the Map & Plotting design's, so the app's map reads like Connect's.
 */
export type IconName =
  | 'back'
  | 'minus'
  | 'close'
  | 'help'
  | 'pin'
  | 'list'
  | 'check'
  | 'play'
  | 'pause'
  | 'stop'
  | 'next'
  | 'prev'
  | 'pencil'
  | 'sparkle'
  | 'calendar'
  | 'search'
  | 'home'
  | 'user'
  | 'lock'
  | 'unlock'
  | 'dumbbell'
  | 'wave'
  | 'star'
  | 'bed'
  | 'briefcase'
  | 'dog'
  | 'yoga'
  | 'leaf'
  | 'coffee'
  | 'chevronRight'
  | 'chevronDown'
  | 'plus'
  | 'send'
  | 'people'
  | 'swap'
  | 'elevator'
  | 'stairs'
  | 'ramp'
  | 'walk'
  | 'flag'
  | 'parking'
  | 'mail'
  | 'restroom'
  | 'leasing'
  | 'waypoint'
  | 'door'
  | 'blocker'
  | 'outdoor'
  | 'entry'
  | 'exit'
  | 'layers'
  | 'route'
  | 'crosshair'
  | 'unit'
  | 'amenity'
  | 'warning'
  | 'refresh';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
  title?: string;
}

const STROKED: Record<string, string> = {
  back: 'M15 18l-6-6 6-6',
  close: 'M18 6L6 18M6 6l12 12',
  pin: 'M12 21s7-7.5 7-12a7 7 0 0 0-14 0c0 4.5 7 12 7 12ZM12 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0-5 0',
  minus: 'M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  check: 'M20 6L9 17l-5-5',
  pencil: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
  search: 'M11 11m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0M21 21l-4.35-4.35',
  home: 'M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6',
  user: 'M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4 20c0-4 4-6 8-6s8 2 8 6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  unlock: 'M3 11h18v10H3zM7 11V7a5 5 0 0 1 9.9-1',
  dumbbell: 'M7 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M17 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M10 12h4',
  wave: 'M2 15c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0M2 19c1.5-2 3.5-2 5 0s3.5 2 5 0 3.5-2 5 0 3.5 2 5 0',
  bed: 'M2 9V6a2 2 0 0 1 2-2h2M22 9V6a2 2 0 0 0-2-2h-2M2 18a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3H2v3ZM8 9h8a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4Z',
  briefcase: 'M3 7h18v13H3zM8 7V4h8v3M3 12h18',
  dog: 'M4 10l2-5 3 3h6l3-3 2 5-3 2v4a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3v-4zM10 13h.01M14 13h.01M11 16h2',
  yoga: 'M12 5m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M12 7v6M6 11l6 2 6-2M8 20l4-7 4 7',
  leaf: 'M5 19c0-8 5-13 14-14-1 9-6 14-14 14zM5 19c3-3 6-6 10-9',
  coffee: 'M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 9h2a2 2 0 0 1 0 4h-2M6 3v2M10 3v2',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
  people: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M23 21v-2a4 4 0 0 0-3-3.87',
  swap: 'M7 4v16M3 8l4-4 4 4M17 20V4M13 16l4 4 4-4',
  elevator: 'M5 3h14v18H5zM9 10l3-3 3 3M9 14l3 3 3-3',
  stairs: 'M3 20h5v-5h5v-5h5V5h3',
  ramp: 'M3 19h18V8z',
  walk: 'M13 4a1.5 1.5 0 1 0 0 .01M9 20l3-7 3 3v4M9 12l2-4 4 2 2 3',
  flag: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z',
  parking: 'M5 3h14v18H5zM10 17V7h3a3 3 0 0 1 0 6h-3',
  mail: 'M3 6h18v13H3zM3 6l9 7 9-7',
  restroom: 'M12 3v18M7 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM17 4.5a1.5 1.5 0 1 1 0 3a1.5 1.5 0 1 1 0-3zM5 11h4v10M15 11h4v10',
  leasing: 'M4 21V9l8-6 8 6v12M9 21v-6h6v6',
  waypoint: 'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11zM12 8a2 2 0 1 1 0 4a2 2 0 1 1 0-4z',
  door: 'M6 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17M3 21h18M14 12h.01',
  blocker: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM5.6 5.6l12.8 12.8',
  outdoor: 'M3 21h18M6 21V10l6-5 6 5v11',
  entry: 'M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4',
  exit: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  layers: 'M12 2l10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5',
  route: 'M6 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 13V8a2 2 0 0 1 2-2h4M18 11v5a2 2 0 0 1-2 2h-4',
  crosshair: 'M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0M12 2v4M12 18v4M2 12h4M18 12h4',
  unit: 'M3 21V8l9-5 9 5v13M9 21v-6h6v6',
  warning: 'M12 9v4M12 17h.01M10.3 3.9L2.5 17.5A2 2 0 0 0 4.2 20.5h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  next: 'M5 4l10 8-10 8zM19 4v16',
  prev: 'M19 4L9 12l10 8zM5 4v16',
  help: 'M12 12m-10 0a10 10 0 1 0 20 0a10 10 0 1 0-20 0M12 11v5'
};

const FILLED: Record<string, string> = {
  play: 'M7 4l13 8-13 8z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  stop: 'M6 6h12v12H6z',
  star: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z',
  sparkle: 'M12 2l2.2 6.3L20.5 9l-5 4 1.8 6.5L12 16l-5.3 3.5L8.5 13l-5-4 6.3-.7L12 2z',
  amenity: 'M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.6L6 22l1.5-7.2L2 10l7.1-1.1z'
};

export const Icon = ({ name, size = 18, color = 'currentColor', strokeWidth = 2, className, style, title }: Props) => {
  const filled = FILLED[name];
  const d = filled ?? STROKED[name] ?? '';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : 'none'}
      stroke={filled ? 'none' : color}
      strokeWidth={filled ? undefined : strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
      {name === 'help' ? <circle cx="12" cy="7.5" r="0.6" fill={color} stroke="none" /> : null}
    </svg>
  );
};
