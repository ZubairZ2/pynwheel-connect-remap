import type { AccessMethod, LeaseTerm, StopLock, Unit } from '~/models';
import type { AvailabilitySlot, BookingSettings } from '~/repositories/tourRepository';
import type { BookingState } from './appState';
import { dayKey } from './appState';
import { slotTime } from './scenarios';
import type { TourStopView } from './selectors';

/**
 * The Start Tour experience's pure helpers (October 21, 2026):
 *
 *   - which of the design's Unlock variants a stop shows, from the lock the
 *     CMS assigned (never from a demo scenario on real data);
 *   - the alternate methods a stop genuinely supports;
 *   - "About this space", assembled from the unit's / amenity's own data;
 *   - the unit's move-in estimate, only from published figures;
 *   - the agent-guided slots of a day, for Book a Live Tour.
 */

/**
 * How the stop's door opens on screen. A real lock answers from what the
 * backend can do with it: a door code (`pin`), the igloohome v1 Bluetooth
 * key (`ble`), or nothing this app can open (`unsupported`). The design's
 * remote and gate variants only exist on demo data: no cloud-unlock or gate
 * integration is wired in the backend, so a real stop never shows them.
 * `override` is the Demo · Method switch and applies to demo data alone.
 */
export const accessMethodOf = (lock: StopLock | null | undefined, demo: boolean, override: AccessMethod | null = null): AccessMethod => {
  if (!lock) return 'none';
  if (demo) {
    if (override && override !== 'none' && override !== 'unsupported') return override;
    return lock.demoMethod ?? 'ble';
  }
  if (!lock.supported) return 'unsupported';
  if (lock.method === 'pin') return 'pin';
  if (lock.method === 'bluetooth') return 'ble';
  return 'unsupported';
};

/** The vendor the Unlock frame names ("Powered by …"). */
export const providerOf = (lock: StopLock | null | undefined): string | null => {
  if (!lock) return null;
  if (lock.provider === 'Igloohome') return lock.mode === 'iglooworks' ? 'Iglooworks' : 'igloohome';
  return lock.provider;
};

/**
 * "Didn't work? Try another method": only what the stop's lock really
 * offers. An igloohome v1 door issues a backup keypad PIN with its Bluetooth
 * key, so it can fall back to the keypad once that key was fetched; a
 * door-code lock has no second way in; demo stops cycle the design's
 * variants (a gate between gate and PIN, the rest between the other three).
 */
export const alternateMethods = (lock: StopLock | null | undefined, current: AccessMethod, demo: boolean, hasBackupPin: boolean): AccessMethod[] => {
  if (!lock) return [];
  if (demo) {
    const cycle: AccessMethod[] = (lock.demoMethod ?? 'ble') === 'gate' ? ['gate', 'pin'] : ['ble', 'pin', 'remote'];
    return cycle.filter((m) => m !== current);
  }
  if (current === 'ble' && hasBackupPin) return ['pin'];
  return [];
};

const money = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`;

/** The feed's unit type when it is a type ("Apartment", "Townhome"), not the unit's own number repeated (some feeds put "1001" there). */
export const usableUnitType = (u: Pick<Unit, 'unitType' | 'name'>): string | null => {
  const t = u.unitType?.trim();
  if (!t) return null;
  if (/^[\d\s.-]+$/.test(t)) return null;
  if (t.toLowerCase() === u.name.replace(/ \*$/, '').trim().toLowerCase()) return null;
  return t;
};

const dateLabel = (iso: string): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/** "Available now" / "Available from Nov 15, 2026" / "Leased" / null when the feed says nothing. */
export const availabilityText = (unit: Unit): string | null => {
  if (unit.availabilityKnown === false && !unit.availableDate && !unit.availability) return null;
  if (unit.availableDate) {
    const label = dateLabel(unit.availableDate);
    const soon = Date.parse(unit.availableDate) <= Date.now();
    if (label) return unit.available ? (soon ? 'Available now' : `Available from ${label}`) : `Available from ${label}`;
  }
  if (unit.availabilityKnown === false) return unit.availability ?? null;
  return unit.available ? 'Available now' : 'Leased';
};

/**
 * "About this space", generated from the record's own fields (section 11.2
 * of the brief): never a user-entered description, nothing fabricated. A
 * field the CMS does not hold is simply left out.
 */
export const aboutSpace = (stop: TourStopView, propertyName: string): string => {
  const parts: string[] = [];
  const where = stop.floor ? ` on ${stop.floor.replace(/ \*$/, '')}` : '';
  if (stop.kind === 'unit' && stop.unit) {
    const u = stop.unit;
    const type = usableUnitType(u) ? usableUnitType(u)!.toLowerCase() : u.floorplanName ? `${u.floorplanName} plan` : 'home';
    const beds = u.bedrooms != null ? (u.bedrooms === 0 ? 'studio' : `${u.bedrooms}-bedroom`) : null;
    const baths = u.bathrooms != null ? `${u.bathrooms}-bath` : null;
    const size = u.sqft != null ? `${u.sqft.toLocaleString('en-US')} sq ft` : null;
    const first = [beds, baths].filter(Boolean).join(', ');
    parts.push(`${stop.name.replace(/ \*$/, '')} is a ${first ? `${first} ` : ''}${type}${size ? ` of ${size}` : ''}${where} at ${propertyName.replace(/ \*$/, '')}.`);
    const avail = availabilityText(u);
    if (avail) parts.push(`${avail}${u.rent != null ? ` at ${money(u.rent)} a month` : ''}.`);
    else if (u.rent != null) parts.push(`Listed at ${money(u.rent)} a month.`);
    if (u.leaseTerms?.length) parts.push(`Lease terms from ${Math.min(...u.leaseTerms.map((t) => t.months))} to ${Math.max(...u.leaseTerms.map((t) => t.months))} months are offered.`);
    if (u.model) parts.push('This is the furnished model home.');
    if (u.description) parts.push(u.description);
  } else if (stop.amenity) {
    const a = stop.amenity;
    const kind = a.icon === 'dumbbell' ? 'a fitness amenity' : a.icon === 'wave' && /pool/i.test(stop.name) ? 'a pool amenity' : a.icon === 'briefcase' ? 'a work and meeting space' : a.icon === 'dog' || /pet/i.test(stop.name) ? 'a pet amenity' : a.icon === 'yoga' ? 'a wellness space' : a.icon === 'coffee' ? 'a social space' : a.icon === 'leaf' ? 'an outdoor space' : 'a shared amenity';
    parts.push(`${stop.name.replace(/ \*$/, '')} is ${kind}${where} at ${propertyName.replace(/ \*$/, '')}.`);
    if (a.hours) parts.push(`Open ${a.hours.replace(/ \*$/, '')}.`);
    if (a.description) parts.push(a.description);
    if (a.instruction) parts.push(a.instruction);
  }
  return parts.join(' ');
};

export interface MoveInEstimate {
  lines: { label: string; amount: number }[];
  total: number;
  /** The fee text the property shows when it does not publish an amount. */
  feeNote: string | null;
}

/**
 * The move-in estimate from published figures only: the rent of the chosen
 * term and the floor plan's deposit when the CMS holds one; the property's
 * additional-fee text is shown as a note, never as an invented amount.
 * Null when nothing beyond the rent is published.
 */
export const moveInEstimate = (unit: Unit, rent: number | null): MoveInEstimate | null => {
  if (rent == null) return null;
  const lines: { label: string; amount: number }[] = [{ label: 'First month rent', amount: rent }];
  if (unit.deposit != null && unit.deposit > 0) lines.push({ label: 'Security deposit', amount: unit.deposit });
  const feeNote = unit.additionalFee ?? null;
  if (lines.length === 1 && !feeNote) return null;
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0), feeNote };
};

/** The rent of a lease term the property publishes, else null (no demo factors on real data). */
export const rentForTerm = (terms: LeaseTerm[] | undefined, months: number): number | null => terms?.find((t) => t.months === months)?.rent ?? null;

/** The agent-guided slots of a day for Book a Live Tour: the type open and not full, and not already passed today. */
export const guidedSlots = (booking: Pick<BookingState, 'days'>, date: string, now = Date.now()): AvailabilitySlot[] =>
  (booking.days[date]?.slots ?? []).filter((s) => s.types.includes('guided_tour') && !s.full.includes('guided_tour') && (date !== dayKey(0, new Date(now)) || slotTime(date, s.label) > now));

/** Whether the property offers agent-guided tours at all (the CMS tour types). */
export const guidedToursOffered = (settings: BookingSettings | null): boolean => !settings || settings.tourTypes.guidedTour;
