import { describe, expect, it } from 'vitest';
import type { RouteStep } from '~/models';
import { audioGuide, estimateMs } from '~/services/audioGuide';
import { availableNow } from './BuildTourScreen';
import { nextStepToRead, stepSpeech } from './GuidedScreen';
import type { TourStopView } from '~/store/selectors';

describe('the audio guide reads a direction once as the walker reaches it', () => {
  it('reads forward steps only, so a replay of the route does not re-read what was heard', () => {
    let maxRead = -1;
    const read: number[] = [];
    [0, 1, 1, 2, 0, 1, 3].forEach((stepIndex) => {
      const next = nextStepToRead(stepIndex, maxRead);
      if (next >= 0) {
        read.push(next);
        maxRead = next;
      }
    });
    expect(read).toEqual([0, 1, 2, 3]);
  });
  it('speaks the real direction, its detail and the stop instruction without demo marks', () => {
    const step: RouteStep = { kind: 'elevator', leg: 1, title: 'Take Elevator A to Floor 16 *', sub: 'Up 15 floors', instruction: 'Tap your pass at the reader' };
    expect(stepSpeech(step)).toBe('Take Elevator A to Floor 16. Up 15 floors. Tap your pass at the reader');
    expect(stepSpeech({ kind: 'arrive', leg: 2, title: 'Arrive at 1604', sub: 'Floor 16 · Knock first', instruction: 'Knock first' })).toBe('Arrive at 1604. Floor 16 · Knock first');
  });
  it('is a no-op without speech synthesis (the test runtime) and still reports a state', () => {
    expect(audioGuide.available).toBe(false);
    audioGuide.speak('a', 'Walk on Floor 1');
    expect(audioGuide.status()).toMatchObject({ key: 'a', status: 'done' });
    expect(audioGuide.resume()).toBe(false);
    audioGuide.stop();
    expect(audioGuide.status()).toMatchObject({ key: null, status: 'idle' });
    expect(estimateMs('one two three four five six seven eight nine ten eleven twelve thirteen')).toBe(5000);
  });
});

describe('the "Available now" filter of Add Stops', () => {
  const stop = (unit: Partial<NonNullable<TourStopView['unit']>>): TourStopView => ({
    node: 'unit:1',
    kind: 'unit',
    name: '101',
    floorLabel: '',
    floor: 'Floor 1',
    icon: 'bed',
    duration: 4,
    amenity: null,
    arPin: null,
    lock: null,
    unit: { id: 1, node: 'unit:1', name: '101', building: null, floor: 1, level: null, bedrooms: 1, bathrooms: 1, sqft: null, rent: null, available: true, model: false, description: null, polygon: null, showInStopsList: true, ...unit }
  });
  it('passes only a unit the feed marks available today; a missing value never passes', () => {
    expect(availableNow(stop({ available: true, availabilityKnown: true }))).toBe(true);
    expect(availableNow(stop({ available: false, availabilityKnown: true }))).toBe(false);
    expect(availableNow(stop({ available: true, availabilityKnown: false }))).toBe(false);
    expect(availableNow(stop({ available: true, availabilityKnown: true, availableDate: '2099-01-01' }))).toBe(false);
    expect(availableNow(stop({ available: true, availabilityKnown: false, availableDate: '2020-01-01' }))).toBe(true);
  });
});
