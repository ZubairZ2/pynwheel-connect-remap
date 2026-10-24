import { describe, expect, it } from 'vitest';

import type { TourPublication } from '~/core/models/data/tourModules.data';
import { generateTourChecklist } from './tourModule.generator';

const publication = (patch: Partial<TourPublication> = {}): TourPublication => ({
  tourEnabled: true,
  publishedAt: '2026-10-25T10:00:00Z',
  publishedBy: { id: 1, name: 'Zubair' },
  publishedVersion: 'cfg-1618-a',
  currentVersion: 'cfg-1618-a',
  everPublished: true,
  changedSincePublish: false,
  ...patch
});

const step = (pub: TourPublication | null | undefined) =>
  generateTourChecklist({ propId: '1618', stops: [], elevators: [], startPointsMissing: false, locks: null, items: [], publication: pub }).steps.find((s) => s.id === 'publish')!;

describe('the overview checklist publish step (October 25, 2026)', () => {
  it('is not done until the tour was published from Connect', () => {
    expect(step(undefined)).toMatchObject({ done: false, state: 'Not published yet' });
    expect(step(publication({ everPublished: false, publishedAt: null }))).toMatchObject({ done: false, state: 'Not published yet' });
  });
  it('is done while nothing changed since, stale once something was saved', () => {
    expect(step(publication())).toMatchObject({ done: true, state: 'Published · up to date' });
    expect(step(publication({ changedSincePublish: true, currentVersion: 'cfg-1618-b' }))).toMatchObject({ done: false, state: 'Changed since the last publish' });
  });
});
