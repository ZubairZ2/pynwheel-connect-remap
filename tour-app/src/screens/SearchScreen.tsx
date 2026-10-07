import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import type { Listing, PropertyListing } from '~/models';
import { matchesQuery, visibleRows } from './searchFilter';
import { LightShell, SectionLabel } from './shared';

interface Props {
  /** Loading / error state of the property list. */
  status?: 'idle' | 'loading' | 'ready' | 'error';
  onRetry?: () => void;
  query: string;
  onQuery: (value: string) => void;
  nearby: PropertyListing[];
  hiRise: Listing[];
  onNearby: (listing: PropertyListing) => void;
  onListing: (listing: Listing) => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

/**
 * The property picker. The list is in memory (one request at sign-in), so
 * the search is a local filter and never waits on the network. The field has
 * its own Cancel (shown while typing or focused): it clears the text, closes
 * the keyboard and shows the full list again. A plain text input is used on
 * purpose: the native clear button of `type="search"` does not reach React's
 * `onChange` on every web view, which left stale text and a filtered list.
 */
export const SearchScreen = ({ status = 'ready', onRetry, query, onQuery, nearby, hiRise, onNearby, onListing, onTab }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const q = query.trim();
  // The list follows the typed text with a deferred value: the field itself never waits on a long list render.
  const deferredQ = useDeferredValue(q);
  // The current property leads the list, so it is visible even when the list is capped.
  const nearbyAll = nearby.filter((n) => matchesQuery(deferredQ, n.name, n.address)).sort((a, b) => Number(!!b.current) - Number(!!a.current));
  const { shown: nearbyMatches, hidden: nearbyHidden } = visibleRows(nearbyAll);
  const hiRiseMatches = hiRise.filter((l) => matchesQuery(deferredQ, l.name, l.address, l.meta));
  const nothing = status === 'ready' && !!deferredQ && !nearbyAll.length && !hiRiseMatches.length;
  const showCancel = focused || query.length > 0;

  const cancel = () => {
    onQuery('');
    setFocused(false);
    input.current?.blur();
  };

  // A query the screen was reopened with is kept visible; the field itself is never left stale.
  useEffect(() => {
    if (input.current && input.current.value !== query) input.current.value = query;
  }, [query]);

  return (
    <LightShell footer={<TabBar active="search" onSelect={onTab} />}>
      <div className="pw-search">
        <div className="pw-search__title">Search Properties</div>
        <div className="pw-search__row">
          <div className="pw-search__field">
            <Icon name="search" size={18} color="var(--pw-text-subtle)" className="pw-search__icon" />
            <input
              ref={input}
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onInput={(e) => onQuery(e.currentTarget.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancel();
                if (e.key === 'Enter') input.current?.blur();
              }}
              placeholder="Search by property, city, or address"
              className="pw-input pw-input--search"
              type="text"
              inputMode="search"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="search"
              aria-label="Search properties"
            />
            {query ? (
              <button type="button" className="pw-search__clear" aria-label="Clear search" onMouseDown={(e) => e.preventDefault()} onClick={() => onQuery('')}>
                <Icon name="close" size={12} color="#fff" strokeWidth={3} />
              </button>
            ) : null}
          </div>
          {showCancel ? (
            <button type="button" className="pw-search__cancel" onMouseDown={(e) => e.preventDefault()} onClick={cancel}>
              Cancel
            </button>
          ) : null}
        </div>
        {status === 'loading' ? <div className="pw-search__empty">Loading your properties…</div> : null}
        {status === 'error' ? (
          <div className="pw-search__empty">
            The properties could not be loaded.
            {onRetry ? (
              <>
                <br />
                <button type="button" className="pw-search__retry" onClick={onRetry}>
                  Try again
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {status === 'ready' && !nearby.length && !q ? <div className="pw-search__empty">No properties are available to your account.</div> : null}
        {nothing ? (
          <div className="pw-search__empty">
            No properties match &ldquo;{deferredQ}&rdquo;.
            <br />
            Try a different city or property name.
          </div>
        ) : null}
        {nearbyMatches.length ? (
          <div>
            <SectionLabel className="pw-search__label">Properties</SectionLabel>
            <div className="pw-search__list">
              {nearbyMatches.map((item) => (
                <button key={item.id} type="button" className={`pw-listing${item.current ? ' pw-listing--current' : ''}`} onClick={() => onNearby(item)}>
                  <span className="pw-listing__text">
                    <span className="pw-listing__name">{item.name}</span>
                    <span className="pw-listing__address">{item.address}</span>
                    {!item.tourable ? <span className="pw-listing__meta">No Self-Guided Tour</span> : null}
                  </span>
                  {item.current ? <span className="pw-listing__current">● Current</span> : <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />}
                </button>
              ))}
            </div>
            {nearbyHidden ? (
              <div className="pw-search__more">
                Showing {nearbyMatches.length.toLocaleString('en-US')} of {nearbyAll.length.toLocaleString('en-US')} properties · keep typing to narrow the list
              </div>
            ) : null}
          </div>
        ) : null}
        {hiRiseMatches.length ? (
          <div>
            <SectionLabel className="pw-search__label">US Hi-Rise Listings</SectionLabel>
            <div className="pw-search__list">
              {hiRiseMatches.map((item) => (
                <button key={item.name} type="button" className="pw-listing" onClick={() => onListing(item)}>
                  <span className="pw-listing__text">
                    <span className="pw-listing__name">{item.name}</span>
                    <span className="pw-listing__address">{item.address}</span>
                    <span className="pw-listing__meta">{item.meta}</span>
                  </span>
                  <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </LightShell>
  );
};
