import { dayKey } from './appState';

/**
 * Property-zone time (October 25, 2026). A booking is the property's wall
 * clock (`tour_date` + `tour_time`, no zone): read in the phone's zone it is
 * a different instant, so a visitor in another zone saw "Today" for a tour
 * the CMS called "Tomorrow" and a countdown twelve hours short. Everything
 * here works from the property's IANA zone (the CMS's `time_zone`); without
 * one (demo data, an old answer) it falls back to the phone's own calendar,
 * which is what the app did before.
 */

const DAY_MS = 86400000;
const pad = (n: number): string => String(n).padStart(2, '0');

const formatters = new Map<string, Intl.DateTimeFormat | null>();
const formatterFor = (tz: string): Intl.DateTimeFormat | null => {
  if (formatters.has(tz)) return formatters.get(tz) ?? null;
  let f: Intl.DateTimeFormat | null = null;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' });
  } catch {
    f = null;
  }
  formatters.set(tz, f);
  return f;
};

/** Whether the zone name is one this phone can convert. */
export const zoneKnown = (tz: string | null | undefined): tz is string => !!tz && formatterFor(tz) !== null;

interface WallClock {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  s: number;
}

const wallClock = (f: Intl.DateTimeFormat, ms: number): WallClock => {
  const parts: Record<string, number> = {};
  f.formatToParts(new Date(ms)).forEach((p) => {
    if (p.type !== 'literal') parts[p.type] = Number(p.value);
  });
  return { y: parts.year, mo: parts.month, d: parts.day, h: parts.hour === 24 ? 0 : parts.hour, mi: parts.minute, s: parts.second };
};

/** The zone's offset from UTC at an instant, in ms (positive east of Greenwich); null for an unknown zone. */
export const zoneOffsetMs = (tz: string, ms: number): number | null => {
  const f = formatterFor(tz);
  if (!f) return null;
  const w = wallClock(f, ms);
  return Date.UTC(w.y, w.mo - 1, w.d, w.h, w.mi, w.s) - Math.floor(ms / 1000) * 1000;
};

/** `YYYY-MM-DD` of an instant in the zone, plus whole days; the phone's own calendar when the zone is unknown. */
export const dayKeyInZone = (ms: number, tz: string | null | undefined, offsetDays = 0): string => {
  const f = tz ? formatterFor(tz) : null;
  if (!f) return dayKey(offsetDays, new Date(ms));
  const w = wallClock(f, ms);
  const d = new Date(Date.UTC(w.y, w.mo - 1, w.d + offsetDays));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
};

/** "6:00 PM", "18:00" or "18:00:00" → [hour, minute]; null when it is not a clock. */
export const parseClock = (time: string): [number, number] | null => {
  const ampm = /^\s*(\d{1,2}):(\d{2})\s*(AM|PM)\s*$/i.exec(time || '');
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (ampm[3].toUpperCase() === 'PM') h += 12;
    return [h, Number(ampm[2])];
  }
  const h24 = /^\s*(\d{1,2}):(\d{2})(?::\d{2})?\s*$/.exec(time || '');
  return h24 ? [Number(h24[1]), Number(h24[2])] : null;
};

/** The instant (ms) of a wall clock (`YYYY-MM-DD`, "6:00 PM" / "18:00") in the zone; the phone's zone when none is known. */
export const zonedSlotMs = (date: string, time: string, tz: string | null | undefined): number => {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = parseClock(time) ?? [0, 0];
  if (!zoneKnown(tz)) return new Date(y, (m ?? 1) - 1, d ?? 1, h, mi, 0, 0).getTime();
  // The wall clock read as UTC, corrected by the zone's offset at that moment (twice: the first guess may sit on the other side of a DST change).
  const guess = Date.UTC(y, (m ?? 1) - 1, d ?? 1, h, mi);
  const first = guess - (zoneOffsetMs(tz, guess) ?? 0);
  return guess - (zoneOffsetMs(tz, first) ?? 0);
};

/** Whole days from the zone's today to a day key (negative in the past). */
export const dayOffsetInZone = (dateKey: string, tz: string | null | undefined, now: number): number => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const [ty, tm, td] = dayKeyInZone(now, tz).split('-').map(Number);
  return Math.round((Date.UTC(y, (m ?? 1) - 1, d ?? 1) - Date.UTC(ty, (tm ?? 1) - 1, td ?? 1)) / DAY_MS);
};
