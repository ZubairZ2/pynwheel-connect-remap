import { describe, expect, it } from 'vitest';
import type { StopLock, Unit } from '~/models';
import { aboutSpace, accessMethodOf, alternateMethods, availabilityText, guidedSlots, moveInEstimate, providerOf, rentForTerm } from './access';
import type { TourStopView } from './selectors';

const unit = (over: Partial<Unit> = {}): Unit => ({
  id: 1,
  node: 'unit:1',
  name: '1604',
  building: 'Tower A',
  floor: 16,
  level: 'floorplate:9',
  bedrooms: 2,
  bathrooms: 2,
  sqft: 1050,
  rent: 2750,
  available: true,
  availabilityKnown: true,
  model: false,
  description: null,
  polygon: null,
  showInStopsList: true,
  leaseTerms: [],
  deposit: null,
  additionalFee: null,
  ...over
});

const view = (u: Unit): TourStopView => ({ node: u.node, kind: 'unit', name: u.name, floorLabel: '2 Bed · 2 Bath', floor: 'Tower A · Floor 16', icon: 'bed', duration: 4, unit: u, amenity: null, arPin: null, lock: u.lock ?? null });

const igloo = (over: Partial<StopLock> = {}): StopLock => ({ provider: 'Igloohome', mode: 'igloohome', method: 'pin', deviceId: 'IGK3E', supported: true, ...over });

describe('the access method of a stop (the Unlock variant)', () => {
  it('is none without a lock, pin for a door-code igloohome lock, ble for a v1 lock', () => {
    expect(accessMethodOf(null, false)).toBe('none');
    expect(accessMethodOf(igloo(), false)).toBe('pin');
    expect(accessMethodOf(igloo({ mode: 'v1', method: 'bluetooth' }), false)).toBe('ble');
  });
  it('is unsupported for a vendor the app cannot open, and for an igloohome lock the backend cannot issue for', () => {
    expect(accessMethodOf({ provider: 'Zerv', mode: null, method: 'bluetooth', deviceId: null, supported: false }, false)).toBe('unsupported');
    expect(accessMethodOf({ provider: 'Latch', mode: null, method: 'bluetooth', deviceId: null, supported: false }, false)).toBe('unsupported');
    expect(accessMethodOf(igloo({ supported: false }), false)).toBe('unsupported');
  });
  it('never lets the Demo · Method switch change a real lock', () => {
    expect(accessMethodOf(igloo(), false, 'gate')).toBe('pin');
    expect(accessMethodOf(igloo({ mode: 'v1', method: 'bluetooth' }), false, 'remote')).toBe('ble');
    expect(accessMethodOf(null, false, 'ble')).toBe('none');
  });
  it('on demo data follows the demo lock and the switch', () => {
    const demoLock: StopLock = { provider: 'dormakaba *', mode: null, method: 'bluetooth', deviceId: null, supported: false, demoMethod: 'ble' };
    expect(accessMethodOf(demoLock, true)).toBe('ble');
    expect(accessMethodOf(demoLock, true, 'gate')).toBe('gate');
    expect(accessMethodOf(demoLock, true, 'unsupported')).toBe('ble');
  });
  it('names the vendor as the frame shows it', () => {
    expect(providerOf(igloo())).toBe('igloohome');
    expect(providerOf(igloo({ mode: 'iglooworks' }))).toBe('Iglooworks');
    expect(providerOf({ provider: 'Latch', mode: null, method: 'bluetooth', deviceId: null, supported: false })).toBe('Latch');
    expect(providerOf(null)).toBeNull();
  });
});

describe('alternate methods ("Try another method")', () => {
  it('offers the keypad only to a Bluetooth door whose key came with a backup PIN', () => {
    const v1 = igloo({ mode: 'v1', method: 'bluetooth' });
    expect(alternateMethods(v1, 'ble', false, false)).toEqual([]);
    expect(alternateMethods(v1, 'ble', false, true)).toEqual(['pin']);
  });
  it('offers nothing to a door-code lock, an unsupported lock or no lock', () => {
    expect(alternateMethods(igloo(), 'pin', false, true)).toEqual([]);
    expect(alternateMethods({ provider: 'Zerv', mode: null, method: 'bluetooth', deviceId: null, supported: false }, 'unsupported', false, false)).toEqual([]);
    expect(alternateMethods(null, 'none', false, false)).toEqual([]);
  });
  it('cycles the design variants on demo data', () => {
    const demoLock: StopLock = { provider: 'myQ *', mode: null, method: 'bluetooth', deviceId: null, supported: false, demoMethod: 'gate' };
    expect(alternateMethods(demoLock, 'gate', true, false)).toEqual(['pin']);
    expect(alternateMethods({ ...demoLock, demoMethod: 'ble' }, 'pin', true, false)).toEqual(['ble', 'remote']);
  });
});

describe('availability text from the feed', () => {
  it('is null when the feed holds nothing, else the real state', () => {
    expect(availabilityText(unit({ availabilityKnown: false, availableDate: null, availability: null }))).toBeNull();
    expect(availabilityText(unit({ available: true }))).toBe('Available now');
    expect(availabilityText(unit({ available: false }))).toBe('Leased');
    expect(availabilityText(unit({ available: true, availableDate: '2099-01-15' }))).toBe('Available from Jan 15, 2099');
    expect(availabilityText(unit({ available: true, availableDate: '2020-01-15' }))).toBe('Available now');
    expect(availabilityText(unit({ availabilityKnown: false, availability: 'Unoccupied' }))).toBe('Unoccupied');
  });
});

describe('About this space is assembled from the record', () => {
  it('reads the unit facts and leaves out what the CMS does not hold', () => {
    const text = aboutSpace(view(unit({ unitType: 'Apartment', leaseTerms: [{ months: 6, rent: 2900 }, { months: 12, rent: 2750 }] })), 'Hazel');
    expect(text).toBe('1604 is a 2-bedroom, 2-bath apartment of 1,050 sq ft on Tower A · Floor 16 at Hazel. Available now at $2,750 a month. Lease terms from 6 to 12 months are offered.');
    expect(aboutSpace(view(unit({ unitType: '1604' })), 'Hazel')).toContain('is a 2-bedroom, 2-bath home of');
    const bare = aboutSpace(view(unit({ bedrooms: null, bathrooms: null, sqft: null, rent: null, unitType: null, availabilityKnown: false, available: true })), 'Hazel');
    expect(bare).toBe('1604 is a home on Tower A · Floor 16 at Hazel.');
    expect(bare).not.toContain('$');
  });
  it('describes an amenity from its hours, description and instruction', () => {
    const amenity: TourStopView = {
      node: 'amenity:2',
      kind: 'amenity',
      name: 'Fitness Centre',
      floorLabel: '1st Floor',
      floor: 'Floor 1',
      icon: 'dumbbell',
      duration: 3,
      unit: null,
      amenity: { id: 2, node: 'amenity:2', name: 'Fitness Centre', building: null, floor: 1, level: 'floorplate:1', icon: 'dumbbell', hours: null, description: 'Peloton bikes and free weights.', instruction: 'Past the mailroom.', polygon: null, showInStopsList: true },
      arPin: null,
      lock: null
    };
    expect(aboutSpace(amenity, 'Hazel')).toBe('Fitness Centre is a fitness amenity on Floor 1 at Hazel. Peloton bikes and free weights. Past the mailroom.');
    expect(aboutSpace({ ...amenity, name: 'The Lobby', amenity: { ...amenity.amenity!, icon: 'star', description: null, instruction: null } }, 'Hazel')).toBe('The Lobby is a shared amenity on Floor 1 at Hazel.');
  });
});

describe('the move-in estimate uses published figures only', () => {
  it('is null with only a rent, adds the deposit and the fee note when the CMS holds them', () => {
    expect(moveInEstimate(unit(), 2750)).toBeNull();
    expect(moveInEstimate(unit(), null)).toBeNull();
    expect(moveInEstimate(unit({ deposit: 500 }), 2750)).toEqual({ lines: [{ label: 'First month rent', amount: 2750 }, { label: 'Security deposit', amount: 500 }], total: 3250, feeNote: null });
    expect(moveInEstimate(unit({ additionalFee: 'Admin fee $250' }), 2750)).toEqual({ lines: [{ label: 'First month rent', amount: 2750 }], total: 2750, feeNote: 'Admin fee $250' });
  });
  it('prices a lease term only when the property publishes it', () => {
    expect(rentForTerm([{ months: 6, rent: 2900 }, { months: 12, rent: 2750 }], 12)).toBe(2750);
    expect(rentForTerm([{ months: 6, rent: 2900 }], 12)).toBeNull();
    expect(rentForTerm(undefined, 12)).toBeNull();
  });
});

describe('guided-tour slots for Book a Live Tour', () => {
  const day = (date: string) => ({ date, closed: false, beyondHorizon: false, closureLabel: null, slots: [
    { time: '10:00', label: '10:00 AM', types: ['self_tour', 'guided_tour'], full: [] },
    { time: '11:00', label: '11:00 AM', types: ['self_tour', 'guided_tour'], full: ['guided_tour'] },
    { time: '18:00', label: '6:00 PM', types: ['self_tour'], full: [] }
  ] });
  it('keeps the times where an agent tour is open and not full', () => {
    const booking = { days: { '2099-03-01': day('2099-03-01') } };
    expect(guidedSlots(booking, '2099-03-01', Date.parse('2099-02-01T00:00:00')).map((s) => s.label)).toEqual(['10:00 AM']);
    expect(guidedSlots(booking, '2099-03-02')).toEqual([]);
  });
});
