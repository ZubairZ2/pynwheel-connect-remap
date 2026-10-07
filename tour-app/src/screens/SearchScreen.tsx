import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import type { Listing, PropertyListing } from '~/models';
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

const matches = (query: string, ...parts: string[]) => !query || parts.join(' ').toLowerCase().includes(query.toLowerCase());

export const SearchScreen = ({ status = 'ready', onRetry, query, onQuery, nearby, hiRise, onNearby, onListing, onTab }: Props) => {
  const q = query.trim();
  const nearbyMatches = nearby.filter((n) => matches(q, n.name, n.address));
  const hiRiseMatches = hiRise.filter((l) => matches(q, l.name, l.address, l.meta));
  const nothing = status === 'ready' && !!q && !nearbyMatches.length && !hiRiseMatches.length;

  return (
    <LightShell footer={<TabBar active="search" onSelect={onTab} />}>
      <div className="pw-search">
        <div className="pw-search__title">Search Properties</div>
        <div className="pw-search__field">
          <Icon name="search" size={18} color="var(--pw-text-subtle)" className="pw-search__icon" />
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search by property, city, or address" className="pw-input pw-input--search" type="search" enterKeyHint="search" aria-label="Search properties" />
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
            No properties match &ldquo;{q}&rdquo;.
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
