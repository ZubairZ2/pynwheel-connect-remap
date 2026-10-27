import { describe, expect, it } from 'vitest';
import { ApiError } from '~/repositories/pynwheelApi/apiClient';
import { MAX_BATCH, MAX_REJECTIONS, VisitQueue, applyFlushResult, memoryStore, shouldRetry, uuid, type FlushResult, type QueuedVisitEvent, type VisitEventInput } from './visitQueue';

/**
 * The visit outbox: events are appended with their own id and time, flushed
 * in order up to 100 a request, removed once the CMS kept them (duplicates
 * included), dropped when it refused them for good, kept for another try
 * when the request failed, and they survive a relaunch.
 */

const VISIT = 'c0ffee00-0000-4000-8000-000000000001';

const accept = (batch: VisitEventInput[]): FlushResult => ({ accepted: batch.map((e, index) => ({ index, clientEventId: e.clientEventId, duplicate: false })), rejected: [] });

describe('the visit outbox', () => {
  it('appends events with a UUID and a time, in order', async () => {
    const queue = new VisitQueue(memoryStore());
    const a = await queue.append({ clientVisitId: VISIT, propertyId: 1618, kind: 'arrived', stopId: 'unit:1', payload: { code: '1234' } });
    const b = await queue.append({ clientVisitId: VISIT, propertyId: 1618, kind: 'skipped', stopId: 'unit:2', payload: { reason: 'lock' } });
    expect(a.clientEventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a.clientEventId).not.toBe(b.clientEventId);
    expect(Date.parse(a.occurredAt)).toBeGreaterThan(0);
    expect((await queue.pending(VISIT)).map((e) => e.kind)).toEqual(['arrived', 'skipped']);
    expect(uuid()).not.toBe(uuid());
  });

  it('flushes in order, 100 a request, and removes what the CMS kept', async () => {
    const queue = new VisitQueue(memoryStore());
    for (let i = 0; i < 130; i += 1) await queue.append({ clientVisitId: VISIT, propertyId: 1618, kind: 'heartbeat', stopId: null, occurredAt: new Date(1_700_000_000_000 + i).toISOString() });
    const batches: VisitEventInput[][] = [];
    const outcome = await queue.flush(VISIT, async (batch) => {
      batches.push(batch);
      return accept(batch);
    });
    expect(batches.map((b) => b.length)).toEqual([MAX_BATCH, 30]);
    expect(batches[0][0].occurredAt < batches[0][99].occurredAt && batches[0][99].occurredAt < batches[1][0].occurredAt).toBe(true);
    expect(outcome).toMatchObject({ sent: 130, dropped: 0, remaining: 0, retry: false });
    expect(await queue.size()).toBe(0);
  });

  it('a duplicate counts as kept; invalid_stop and validation_error are dropped; another refusal is retried, then dropped', async () => {
    const batch: QueuedVisitEvent[] = ['a', 'b', 'c', 'd', 'e'].map((id, i) => ({ clientEventId: id, clientVisitId: VISIT, propertyId: 1, kind: 'arrived', stopId: `unit:${i}`, occurredAt: 't', rejections: i === 4 ? MAX_REJECTIONS - 1 : 0 }));
    const { sent, dropped, kept } = applyFlushResult(batch, {
      accepted: [
        { index: 0, clientEventId: 'A', duplicate: true },
        { index: 1, clientEventId: 'b', duplicate: false }
      ],
      rejected: [
        { index: 2, clientEventId: 'c', code: 'invalid_stop', message: 'This stop is not on the tour.' },
        { index: 3, clientEventId: 'd', code: 'visit_ended', message: 'later' },
        { index: 4, clientEventId: 'e', code: 'visit_ended', message: 'later' }
      ]
    });
    expect(sent.map((e) => e.clientEventId)).toEqual(['a', 'b']);
    expect(dropped.map((e) => e.clientEventId)).toEqual(['c', 'e']);
    expect(kept.map((e) => [e.clientEventId, e.rejections])).toEqual([['d', 1]]);
    expect(applyFlushResult(batch.slice(0, 1), { accepted: [], rejected: [{ index: 0, clientEventId: null, code: 'validation_error', message: 'bad' }] }).dropped).toHaveLength(1);
    // Not mentioned at all: kept, never lost.
    expect(applyFlushResult(batch.slice(0, 1), { accepted: [], rejected: [] }).kept).toHaveLength(1);
  });

  it('keeps everything when the request failed for a reason a retry can fix, drops the batch otherwise', async () => {
    expect(shouldRetry(new ApiError('network', 'offline', 0))).toBe(true);
    expect(shouldRetry(new ApiError('internal_error', 'boom', 500))).toBe(true);
    expect(shouldRetry(new ApiError('rate_limit_exceeded', 'slow down', 429))).toBe(true);
    expect(shouldRetry(new TypeError('programming error'))).toBe(true);
    expect(shouldRetry(new ApiError('not_found', 'No such visit at this property.', 404))).toBe(false);

    const queue = new VisitQueue(memoryStore());
    await queue.append({ clientVisitId: VISIT, propertyId: 1, kind: 'arrived', stopId: 'unit:1' });
    const offline = await queue.flush(VISIT, async () => {
      throw new ApiError('network', 'offline', 0);
    });
    expect(offline).toMatchObject({ sent: 0, dropped: 0, remaining: 1, retry: true });
    expect(await queue.size()).toBe(1);
    const gone = await queue.flush(VISIT, async () => {
      throw new ApiError('not_found', 'No such visit at this property.', 404);
    });
    expect(gone).toMatchObject({ sent: 0, dropped: 1, remaining: 0, retry: false });
    expect(await queue.size()).toBe(0);
  });

  it('prunes a kind to its newest few for one visit, leaving the rest alone', async () => {
    const queue = new VisitQueue(memoryStore());
    for (let i = 0; i < 5; i += 1) await queue.append({ clientVisitId: 'v1', propertyId: 1, kind: 'location', stopId: null, occurredAt: `2026-10-28T10:0${i}:00Z`, payload: { lat: 49, lng: -122, accuracy_m: 20 } });
    await queue.append({ clientVisitId: 'v1', propertyId: 1, kind: 'heartbeat', stopId: null });
    await queue.append({ clientVisitId: 'v2', propertyId: 1, kind: 'location', stopId: null, payload: { lat: 49, lng: -122 } });
    expect(await queue.prune('v1', 'location', 2)).toBe(3);
    const v1 = await queue.pending('v1');
    expect(v1.map((e) => e.kind)).toEqual(['location', 'location', 'heartbeat']);
    expect(v1.map((e) => e.occurredAt).slice(0, 2)).toEqual(['2026-10-28T10:03:00Z', '2026-10-28T10:04:00Z']);
    expect((await queue.pending('v2')).length).toBe(1);
    expect(await queue.prune('v1', 'location', 2)).toBe(0);
  });

  it('only sends the visit asked for and leaves another visit\'s events alone', async () => {
    const queue = new VisitQueue(memoryStore());
    await queue.append({ clientVisitId: VISIT, propertyId: 1, kind: 'arrived', stopId: 'unit:1' });
    await queue.append({ clientVisitId: 'other', propertyId: 1, kind: 'arrived', stopId: 'unit:1' });
    const outcome = await queue.flush(VISIT, async (batch) => accept(batch));
    expect(outcome.sent).toBe(1);
    expect((await queue.pending()).map((e) => e.clientVisitId)).toEqual(['other']);
    await queue.drop('other');
    expect(await queue.size()).toBe(0);
  });

  it('survives a relaunch: a new queue over the same store finds the events, with their ids', async () => {
    const store = memoryStore();
    const first = new VisitQueue(store);
    const queued = await first.append({ clientVisitId: VISIT, propertyId: 1618, kind: 'note', stopId: 'unit:1', payload: { text: 'nice light' } });
    const second = new VisitQueue(store);
    const pending = await second.pending(VISIT);
    expect(pending).toEqual([queued]);
    await second.clear();
    expect(await new VisitQueue(store).size()).toBe(0);
  });

  it('two flushes at once do not send the same event twice', async () => {
    const queue = new VisitQueue(memoryStore());
    await queue.append({ clientVisitId: VISIT, propertyId: 1, kind: 'arrived', stopId: 'unit:1' });
    const sent: string[] = [];
    const send = async (batch: VisitEventInput[]) => {
      await new Promise((r) => setTimeout(r, 5));
      sent.push(...batch.map((e) => e.clientEventId));
      return accept(batch);
    };
    await Promise.all([queue.flush(VISIT, send), queue.flush(VISIT, send)]);
    expect(sent).toHaveLength(1);
  });
});
