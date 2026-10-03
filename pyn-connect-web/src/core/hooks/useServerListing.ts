'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import type { ListingMeta } from '~/core/models/data/session.data';
import type { ListingParamsBase } from '~/core/utils/generator/listingParams';

/** One page of a listing: its rows and the envelope's meta (paging, totals, filter options). */
export interface ListingData<TRow> {
  rows: TRow[];
  meta: ListingMeta;
}

/** `loading` while the latest request is on its way (the previous rows stay on screen), `failed` until the next request. */
export type ListingStatus = 'idle' | 'loading' | 'failed';

/** Typing in the search box waits this long for a pause before it asks the server. */
export const SEARCH_TYPING_DELAY = 300;

interface Options<TRow, TParams extends ListingParamsBase> {
  /** What the server rendered for `params` (the first paint, or a fresh navigation). */
  initial: ListingData<TRow>;
  params: TParams;
  /** This app's route handler for the listing (`APP_API.companiesListing`). */
  endpoint: string;
  /** The canonical query string of a state (listingParams.ts): the URL and the request both use it. */
  search: (params: TParams) => string;
  /** The state a URL's query string describes, for back / forward. */
  parse: (search: URLSearchParams) => TParams;
  typingDelay?: number;
}

/**
 * A server-paged listing driven from the browser: the search, filters, sort,
 * page and rows per page are one state; every change of it is one request to
 * this app's listing route handler for exactly that page, and the URL is kept
 * in step so a refresh, a shared link or Back lands on the same view.
 *
 * Three things keep the results and the search box honest when the user is
 * quicker than the network:
 *
 * 1. **Debounce.** Typing commits after a pause (`typingDelay`), so "h", "ha",
 *    "haz" become one request for "haz" once the user stops.
 * 2. **Cancellation.** A new request aborts the previous one (`AbortController`),
 *    so a slow "ha" is not even waited for once "haz" has gone out.
 * 3. **Latest-request protection.** Every request carries a sequence number;
 *    a response is applied only if it is still the latest, checked before and
 *    after its body is read. A response that lands late — or after the search
 *    was cleared — changes nothing: not the rows, not the status, not the box.
 *
 * The search box itself is local state that only the user (or a URL the user
 * navigated to) writes; a response never writes it back, so it cannot revert.
 * Paging and filters always request with the current search folded in (even
 * one still waiting for its pause), so a page is never one of another search.
 */
export const useServerListing = <TRow, TParams extends ListingParamsBase>({
  initial,
  params,
  endpoint,
  search,
  parse,
  typingDelay = SEARCH_TYPING_DELAY
}: Options<TRow, TParams>) => {
  const pathname = usePathname();
  const urlSearch = useSearchParams();
  const [data, setData] = useState<ListingData<TRow>>(initial);
  const [current, setCurrent] = useState<TParams>(params);
  const [status, setStatus] = useState<ListingStatus>('idle');
  const [query, setQueryState] = useState(params.q);
  const latest = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const committed = useRef<TParams>(params);
  const typed = useRef(params.q);
  const timer = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current != null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  /** Requests one state: the newest request is the only one whose answer counts. */
  const load = useCallback(
    (next: TParams, { push }: { push: boolean }) => {
      clearTimer();
      committed.current = next;
      typed.current = next.q;
      setQueryState(next.q);
      setCurrent(next);
      const id = ++latest.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      setStatus('loading');
      const qs = search(next);
      if (push) window.history.pushState(null, '', qs ? `${pathname}?${qs}` : pathname);
      fetch(`${endpoint}?${qs}`, { signal: abort.signal, headers: { Accept: 'application/json' }, cache: 'no-store' })
        .then(async (response) => {
          if (id !== latest.current) return;
          if (response.status === 401) {
            window.location.assign(APP_ROUTES.signIn);
            return;
          }
          const body = (await response.json()) as { ok: boolean; listing?: ListingData<TRow> };
          if (id !== latest.current) return;
          if (!response.ok || !body.ok || !body.listing) throw new Error(`listing answered ${response.status}`);
          setData(body.listing);
          setStatus('idle');
        })
        .catch((error: unknown) => {
          if ((error as { name?: string } | null)?.name === 'AbortError' || id !== latest.current) return;
          setStatus('failed');
        });
    },
    [clearTimer, endpoint, pathname, search]
  );

  // Back, Forward, or a link to this listing with other parameters: the URL
  // moved without us. Our own pushState leaves it equal to what we committed.
  const urlKey = urlSearch.toString();
  useEffect(() => {
    const fromUrl = parse(new URLSearchParams(urlKey));
    if (search(fromUrl) === search(committed.current)) return;
    load(fromUrl, { push: false });
  }, [urlKey, load, parse, search]);

  // Unmount: nothing left in flight writes anywhere.
  useEffect(
    () => () => {
      latest.current++;
      controller.current?.abort();
      clearTimer();
    },
    [clearTimer]
  );

  /** The search box: shown at once, requested after a pause, always from page 1. */
  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      typed.current = value;
      clearTimer();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        const q = value.trim();
        if (q === committed.current.q) return;
        load({ ...committed.current, q, page: 1 }, { push: true });
      }, typingDelay);
    },
    [clearTimer, load, typingDelay]
  );

  /** A filter, sort, page or size change: requested at once, with whatever is typed folded in. From page 1 unless `keepPage`. */
  const update = useCallback(
    (patch: Partial<TParams>, { keepPage = false }: { keepPage?: boolean } = {}) => {
      const base = { ...committed.current, q: typed.current.trim() };
      const page = keepPage ? (patch.page ?? base.page) : 1;
      load({ ...base, ...patch, page } as TParams, { push: true });
    },
    [load]
  );

  return {
    rows: data.rows,
    meta: data.meta,
    params: current,
    status,
    query,
    setQuery,
    update,
    retry: () => load(committed.current, { push: false })
  };
};
