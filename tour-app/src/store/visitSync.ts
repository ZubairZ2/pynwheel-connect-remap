import type { Dispatch } from 'react';
import { ApiError, isRetryable } from '~/repositories/pynwheelApi/apiClient';
import type { TourRepository } from '~/repositories/tourRepository';
import { visitQueue, type VisitQueue } from '~/services/visitQueue';
import type { AppState, VisitState } from './appState';
import type { Action } from './reducer';

/**
 * Brings the CMS up to date with the visit in progress, in order:
 *
 *   1. a visit the CMS has not answered yet (`id` null: the check-in was made
 *      offline) is started again with the same `clientVisitId` (idempotent);
 *   2. the outbox is flushed, up to 100 events a request;
 *   3. a visit the visitor finished is ended (`POST /end`) and forgotten.
 *
 * A request that may succeed later (offline, 5xx, 429) stops the pass; the
 * next one (the next action, app resume, the `online` event, a heartbeat)
 * picks up where it left. A refusal for good (a 4xx) marks the visit
 * phone-only and drops its events, so nothing loops forever.
 *
 * The decision *whether* a visit is recorded is made once, at check-in
 * (`useAppActions.checkIn`): without a `visit` in the state nothing here
 * sends anything, so demo data and forced demo scenarios never reach the API.
 */

export interface VisitSyncDeps {
  repository: TourRepository;
  dispatch: Dispatch<Action>;
  queue?: VisitQueue;
}

/** Whether the tour's lifecycle is being recorded server-side right now (events are worth appending). */
export const visitRecording = (visit: VisitState | null): visit is VisitState => !!visit && visit.status !== 'local' && !visit.end;

export const accessEndsAtMs = (iso: string | null): number | null => {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
};

const inflight = new Map<string, Promise<void>>();

/** One sync per visit at a time; a second caller waits for the running one. */
export const syncVisit = (deps: VisitSyncDeps, visit: VisitState | null): Promise<void> => {
  if (!visit || visit.status === 'local') return Promise.resolve();
  const running = inflight.get(visit.clientVisitId);
  if (running) return running;
  const run = pass(deps, visit).finally(() => {
    if (inflight.get(visit.clientVisitId) === run) inflight.delete(visit.clientVisitId);
  });
  inflight.set(visit.clientVisitId, run);
  return run;
};

const pass = async (deps: VisitSyncDeps, initial: VisitState): Promise<void> => {
  const { repository, dispatch } = deps;
  const queue = deps.queue ?? visitQueue;
  let visit = initial;
  // The repository must be on the same property as the visit, or the requests would go to the wrong one.
  if (repository.currentPropertyId() !== visit.propertyId) return;

  if (visit.id == null) {
    try {
      const record = await repository.startVisit({ clientVisitId: visit.clientVisitId, bookingId: visit.bookingId, tourType: visit.tourType, startedAt: visit.startedAt, tourUserId: visit.tourUserId });
      visit = { ...visit, id: record.id };
      dispatch({ type: 'visitStarted', clientVisitId: visit.clientVisitId, id: record.id, accessEndsAt: visit.end ? null : accessEndsAtMs(record.accessEndsAt) });
    } catch (error) {
      if (isRetryable(error) || !(error instanceof ApiError)) return;
      // Refused for good: the tour stays a phone-only one; its events have nowhere to go.
      dispatch({ type: 'visitLocal', clientVisitId: visit.clientVisitId });
      await queue.drop(visit.clientVisitId);
      return;
    }
  }
  const visitId = visit.id;
  if (visitId == null) return;

  const outcome = await queue.flush(visit.clientVisitId, (batch) => repository.sendVisitEvents(visitId, batch));
  if (outcome.retry) return;

  if (visit.end) {
    try {
      await repository.endVisit(visitId, { endedAt: visit.end.endedAt, reason: visit.end.reason, abandonedAtStop: visit.end.abandonedAtStop });
    } catch (error) {
      if (isRetryable(error) || !(error instanceof ApiError)) return;
      // Already ended, gone, or refused: nothing more to send for it either way.
    }
    await queue.drop(visit.clientVisitId);
    dispatch({ type: 'visitClosed', clientVisitId: visit.clientVisitId });
  }
};

/** The visit of the state when its events should still be sent, for the provider's resume / online / heartbeat hooks. */
export const syncableVisit = (state: Pick<AppState, 'visit' | 'signedIn'>): VisitState | null => (state.signedIn && state.visit && state.visit.status !== 'local' ? state.visit : null);
