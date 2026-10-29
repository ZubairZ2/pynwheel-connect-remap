import { Preferences } from '@capacitor/preferences';
import { ApiError, isRetryable } from '~/repositories/pynwheelApi/apiClient';

/**
 * The outbox of a visit: every lifecycle event of the tour (arrived, skipped,
 * note, photo, issue, unlocked, unlock_failed, heartbeat) is appended here
 * first, persisted, and flushed to `POST /properties/{id}/visits/{visit}/events`
 * in order, up to 100 at a time. An event has a `clientEventId` (UUID) the
 * CMS keys on, so a retried batch is acknowledged as duplicates, never written
 * twice.
 *
 *   accepted (duplicates included)         → removed
 *   rejected `invalid_stop` / `validation_error` → dropped (it can never be kept)
 *   any other rejection                     → kept, up to a few more tries
 *   the request failed (offline, 5xx, 429)  → everything kept; retried later
 *
 * The queue is keyed by `clientVisitId`, so events written before the CMS
 * answered the visit's id wait for it. Nothing here decides *whether* to
 * record: the store only appends when the visit is a real, server-side one.
 */

export type VisitEventKind = 'arrived' | 'skipped' | 'note' | 'photo' | 'issue' | 'unlocked' | 'unlock_failed' | 'heartbeat' | 'location';

/** An event as the API takes it. */
export interface VisitEventInput {
  clientEventId: string;
  kind: VisitEventKind;
  /** `unit:N` | `amenity:N` | `elevator:N`; required except for a heartbeat or a location sample. */
  stopId: string | null;
  /** ISO 8601 */
  occurredAt: string;
  payload?: Record<string, unknown>;
}

export interface QueuedVisitEvent extends VisitEventInput {
  /** The check-in the event belongs to. */
  clientVisitId: string;
  propertyId: number;
  /** How many times the CMS refused this one event with a code other than the fatal two. */
  rejections: number;
}

export interface NewVisitEvent {
  clientVisitId: string;
  propertyId: number;
  kind: VisitEventKind;
  stopId: string | null;
  payload?: Record<string, unknown>;
  /** Defaults to now. */
  occurredAt?: string;
}

export interface FlushResult {
  accepted: { index: number; clientEventId: string | null; duplicate: boolean }[];
  rejected: { index: number; clientEventId: string | null; code: string; message: string }[];
}

export interface FlushOutcome {
  /** Events the CMS kept (duplicates included). */
  sent: number;
  /** Events dropped for good. */
  dropped: number;
  /** Events still waiting (after a failed request, or refused but retryable). */
  remaining: number;
  /** True when the request itself failed and the batch should be retried later. */
  retry: boolean;
  error: unknown;
}

export const MAX_BATCH = 100;
/** A per-event rejection with a code we do not understand is retried this many times, then dropped. */
export const MAX_REJECTIONS = 5;
const FATAL_CODES = new Set(['invalid_stop', 'validation_error']);

const KEY = 'pynwheel_tour_visit_queue_v1';

export const uuid = (): string => {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  // The web view without `crypto.randomUUID` (very old Android System WebViews): a v4 from `getRandomValues`, else Math.random.
  const bytes = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export interface VisitQueueStore {
  load(): Promise<QueuedVisitEvent[]>;
  save(items: QueuedVisitEvent[]): Promise<void>;
}

/** `@capacitor/preferences`, every call guarded: a storage failure never breaks the tour. */
export const preferencesStore: VisitQueueStore = {
  async load() {
    try {
      const { value } = await Preferences.get({ key: KEY });
      if (!value) return [];
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as QueuedVisitEvent[]).filter((e) => e && typeof e.clientEventId === 'string' && typeof e.clientVisitId === 'string') : [];
    } catch {
      return [];
    }
  },
  async save(items) {
    try {
      if (items.length) await Preferences.set({ key: KEY, value: JSON.stringify(items) });
      else await Preferences.remove({ key: KEY });
    } catch {
      /* storage unavailable: the outbox lives in memory for this launch */
    }
  }
};

export const memoryStore = (): VisitQueueStore => {
  let saved: QueuedVisitEvent[] = [];
  return {
    async load() {
      return saved.map((e) => ({ ...e }));
    },
    async save(items) {
      saved = items.map((e) => ({ ...e }));
    }
  };
};

/**
 * What a flush answer does to the batch: which events to remove (kept by the
 * CMS, or refused for good) and which to keep for another try. Pure.
 */
export const applyFlushResult = (batch: QueuedVisitEvent[], result: FlushResult): { sent: QueuedVisitEvent[]; dropped: QueuedVisitEvent[]; kept: QueuedVisitEvent[] } => {
  const sent: QueuedVisitEvent[] = [];
  const dropped: QueuedVisitEvent[] = [];
  const kept: QueuedVisitEvent[] = [];
  const acceptedIds = new Set(result.accepted.map((a) => a.clientEventId?.toLowerCase()).filter(Boolean));
  const acceptedIndexes = new Set(result.accepted.map((a) => a.index));
  const rejectedById = new Map(result.rejected.map((r) => [r.clientEventId?.toLowerCase() ?? `#${r.index}`, r]));
  batch.forEach((event, index) => {
    const id = event.clientEventId.toLowerCase();
    if (acceptedIds.has(id) || acceptedIndexes.has(index)) {
      sent.push(event);
      return;
    }
    const rejection = rejectedById.get(id) ?? rejectedById.get(`#${index}`);
    if (!rejection) {
      // Neither listed: the CMS did not say. Keep it for the next flush rather than lose it.
      kept.push(event);
      return;
    }
    if (FATAL_CODES.has(rejection.code) || event.rejections + 1 >= MAX_REJECTIONS) dropped.push(event);
    else kept.push({ ...event, rejections: event.rejections + 1 });
  });
  return { sent, dropped, kept };
};

/** Whether a failed events request leaves the batch to retry (offline, 5xx, 429) or not. */
export const shouldRetry = (error: unknown): boolean => isRetryable(error) || !(error instanceof ApiError);

export class VisitQueue {
  private items: QueuedVisitEvent[] | null = null;

  private loading: Promise<void> | null = null;

  /** One flush at a time: a second caller waits for the first and then runs over what is left. */
  private flushing: Promise<FlushOutcome> | null = null;

  constructor(private readonly store: VisitQueueStore = preferencesStore) {}

  private async ready(): Promise<QueuedVisitEvent[]> {
    if (this.items) return this.items;
    if (!this.loading) {
      this.loading = this.store.load().then((loaded) => {
        this.items = this.items ?? loaded;
      });
    }
    await this.loading;
    return this.items ?? (this.items = []);
  }

  private async persist(): Promise<void> {
    await this.store.save(this.items ?? []);
  }

  async append(event: NewVisitEvent): Promise<QueuedVisitEvent> {
    const items = await this.ready();
    const queued: QueuedVisitEvent = {
      clientEventId: uuid(),
      clientVisitId: event.clientVisitId,
      propertyId: event.propertyId,
      kind: event.kind,
      stopId: event.stopId,
      occurredAt: event.occurredAt ?? new Date().toISOString(),
      ...(event.payload ? { payload: event.payload } : {}),
      rejections: 0
    };
    items.push(queued);
    await this.persist();
    return queued;
  }

  async pending(clientVisitId?: string): Promise<QueuedVisitEvent[]> {
    const items = await this.ready();
    return clientVisitId ? items.filter((e) => e.clientVisitId === clientVisitId) : [...items];
  }

  async size(): Promise<number> {
    return (await this.ready()).length;
  }

  /**
   * Keeps only the newest `keep` events of one kind for a visit (the older
   * ones are forgotten): a presence sample loses its worth within minutes,
   * so an hour offline must not replay a track when the phone is back.
   */
  async prune(clientVisitId: string, kind: VisitEventKind, keep: number): Promise<number> {
    const items = await this.ready();
    const ofKind = items.filter((e) => e.clientVisitId === clientVisitId && e.kind === kind);
    if (ofKind.length <= keep) return 0;
    const drop = new Set(ofKind.slice(0, ofKind.length - keep));
    this.items = items.filter((e) => !drop.has(e));
    await this.persist();
    return drop.size;
  }

  /**
   * Sends the visit's events in order, `MAX_BATCH` at a time, until none are
   * left or a request fails. `send` posts one batch and resolves with what
   * the CMS kept and refused; it rejects when the request itself failed.
   */
  async flush(clientVisitId: string, send: (batch: VisitEventInput[]) => Promise<FlushResult>): Promise<FlushOutcome> {
    if (this.flushing) await this.flushing.catch(() => undefined);
    const run = this.run(clientVisitId, send).finally(() => {
      if (this.flushing === run) this.flushing = null;
    });
    this.flushing = run;
    return run;
  }

  private async run(clientVisitId: string, send: (batch: VisitEventInput[]) => Promise<FlushResult>): Promise<FlushOutcome> {
    const outcome: FlushOutcome = { sent: 0, dropped: 0, remaining: 0, retry: false, error: null };
    for (;;) {
      const items = await this.ready();
      const batch = items.filter((e) => e.clientVisitId === clientVisitId).slice(0, MAX_BATCH);
      if (!batch.length) break;
      let result: FlushResult;
      try {
        result = await send(batch.map(({ clientEventId, kind, stopId, occurredAt, payload }) => ({ clientEventId, kind, stopId, occurredAt, ...(payload ? { payload } : {}) })));
      } catch (error) {
        if (shouldRetry(error)) {
          outcome.retry = true;
          outcome.error = error;
          break;
        }
        // A refusal of the whole request that no retry can fix (the visit is gone, the token is not a visitor's …): the batch is dropped.
        const ids = new Set(batch.map((e) => e.clientEventId));
        this.items = items.filter((e) => !ids.has(e.clientEventId));
        outcome.dropped += batch.length;
        outcome.error = error;
        await this.persist();
        break;
      }
      const { sent, dropped, kept } = applyFlushResult(batch, result);
      const keptById = new Map(kept.map((e) => [e.clientEventId, e]));
      const gone = new Set([...sent, ...dropped].map((e) => e.clientEventId));
      this.items = items.filter((e) => !gone.has(e.clientEventId)).map((e) => keptById.get(e.clientEventId) ?? e);
      outcome.sent += sent.length;
      outcome.dropped += dropped.length;
      await this.persist();
      // Everything in this batch was answered; a batch that was all kept would loop, so stop here and let the next flush retry.
      if (kept.length || batch.length < MAX_BATCH) break;
    }
    outcome.remaining = (await this.pending(clientVisitId)).length;
    return outcome;
  }

  /** Forgets a visit's events (the visit is over and the CMS will not take them). */
  async drop(clientVisitId: string): Promise<void> {
    const items = await this.ready();
    this.items = items.filter((e) => e.clientVisitId !== clientVisitId);
    await this.persist();
  }

  /** Forgets everything (sign-out). */
  async clear(): Promise<void> {
    await this.ready();
    this.items = [];
    await this.persist();
  }
}

/** The app's one outbox. */
export const visitQueue = new VisitQueue();
