import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { DEMO, DEMO_LISTINGS, type DemoListing } from '~/content/demoFixtures';
import { TabBar } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton } from '~/components/ui';
import { Chip, Eyebrow } from '~/components/ui2';
import type { PropertyListing } from '~/models';
import type { AppState } from '~/store/appState';
import { matchesQuery, visibleRows } from './searchFilter';
import { LightShell } from './shared';

interface Props {
  /** Loading / error state of the property list. */
  status?: 'idle' | 'loading' | 'ready' | 'error';
  guest: boolean;
  onRetry?: () => void;
  query: string;
  onQuery: (value: string) => void;
  beds: AppState['searchBeds'];
  price: AppState['searchPrice'];
  onBeds: (value: AppState['searchBeds']) => void;
  onPrice: (value: AppState['searchPrice']) => void;
  properties: PropertyListing[];
  onProperty: (listing: PropertyListing) => void;
  onDemoListing: (listing: DemoListing) => void;
  onBack: () => void;
  onTab: (tab: 'home' | 'search' | 'profile') => void;
}

const BED_CHIPS: { id: AppState['searchBeds']; label: string }[] = [
  { id: 'any', label: 'Any beds' },
  { id: '0', label: 'Studio' },
  { id: '1', label: '1 bed' },
  { id: '2', label: '2 bed' },
  { id: '3', label: '3 bed' }
];
const PRICE_CHIPS: { id: AppState['searchPrice']; label: string }[] = [
  { id: 'any', label: 'Any price' },
  { id: 'lt2000', label: 'Under $2,000' },
  { id: 'mid', label: '$2,000–$2,500' },
  { id: 'gt2500', label: '$2,500+' }
];

export const bedOk = (n: DemoListing, beds: AppState['searchBeds']) => beds === 'any' || (Number(beds) >= n.minBed && Number(beds) <= n.maxBed);
export const priceOk = (n: DemoListing, price: AppState['searchPrice']) => price === 'any' || (price === 'lt2000' ? n.from < 2000 : price === 'mid' ? n.from >= 2000 && n.from <= 2500 : n.from > 2500);

/**
 * Properties: for a signed-in visitor the real property list of their
 * account (one request at sign-in, filtered locally, capped at 120 rows);
 * for a guest the demo featured communities with the design's bed and price
 * chips (the real listing carries no bedroom or price data, so the chips are
 * shown only where they can filter something).
 */
export const SearchScreen = ({ status = 'ready', guest, onRetry, query, onQuery, beds, price, onBeds, onPrice, properties, onProperty, onDemoListing, onBack, onTab }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const q = query.trim();
  const deferredQ = useDeferredValue(q);
  const real = properties.filter((n) => matchesQuery(deferredQ, n.name, n.address)).sort((a, b) => Number(!!b.current) - Number(!!a.current));
  const { shown, hidden } = visibleRows(real);
  const demo = DEMO_LISTINGS.filter((n) => matchesQuery(deferredQ, n.name, n.address) && bedOk(n, beds) && priceOk(n, price));
  const demoAnyQ = DEMO_LISTINGS.filter((n) => matchesQuery(deferredQ, n.name, n.address));
  const showCancel = focused || query.length > 0;
  const nothing = guest ? !!deferredQ && !demoAnyQ.length : status === 'ready' && !!deferredQ && !real.length;

  const cancel = () => {
    onQuery('');
    setFocused(false);
    input.current?.blur();
  };

  useEffect(() => {
    if (input.current && input.current.value !== query) input.current.value = query;
  }, [query]);

  return (
    <LightShell footer={<TabBar active="search" onSelect={onTab} />}>
      <div className="pw-search">
        <div className="pw-search__head">
          <IconButton icon="back" label="Back" onClick={onBack} />
          <div className="pw-search__title">Properties</div>
        </div>
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

        {nothing ? (
          <div className="pw-search__empty">
            No properties match &ldquo;{deferredQ}&rdquo;.
            <br />
            Try a different city or property name.
          </div>
        ) : null}

        {guest ? (
          <div className="pw-search__section">
            <Eyebrow>Featured properties{DEMO}</Eyebrow>
            <div className="pw-search__chips">
              {BED_CHIPS.map((c) => (
                <Chip key={c.id} size="sm" on={beds === c.id} onClick={() => onBeds(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
            <div className="pw-search__chips">
              {PRICE_CHIPS.map((c) => (
                <Chip key={c.id} size="sm" on={price === c.id} onClick={() => onPrice(c.id)}>
                  {c.label}
                </Chip>
              ))}
            </div>
            <div className="pw-search__list">
              {demo.map((n) => (
                <button key={n.id} type="button" className="pw-listing pw-listing--photo" onClick={() => onDemoListing(n)}>
                  <img src={n.img} alt="" />
                  <span className="pw-listing__text">
                    <span className="pw-listing__name">{n.name}</span>
                    <span className="pw-listing__address">{n.address}</span>
                    <span className="pw-listing__meta">
                      {n.beds} · from ${n.from.toLocaleString('en-US')} · {n.dist}
                    </span>
                  </span>
                  <Icon name="chevronRight" size={16} color="var(--pw-text-subtle)" />
                </button>
              ))}
              {!demo.length && demoAnyQ.length ? <div className="pw-search__nomatch">No communities match these filters.</div> : null}
            </div>
            <div className="pw-search__guestnote">Sign in to see the properties of your Pynwheel account.</div>
          </div>
        ) : (
          <div className="pw-search__section">
            {status === 'loading' ? <div className="pw-search__empty">Loading your properties…</div> : null}
            {status === 'error' ? (
              <div className="pw-search__empty">
                The properties could not be loaded.
                {onRetry ? (
                  <div style={{ marginTop: 10 }}>
                    <Button variant="secondary" height={36} block={false} onClick={onRetry} style={{ fontSize: 13 }}>
                      Try again
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            {status === 'ready' && !properties.length && !q ? <div className="pw-search__empty">No properties are available to your account.</div> : null}
            {shown.length ? (
              <>
                <Eyebrow>All properties</Eyebrow>
                <div className="pw-search__list">
                  {shown.map((item) => (
                    <button key={item.id} type="button" className={`pw-listing${item.current ? ' pw-listing--current' : ''}`} onClick={() => onProperty(item)}>
                      <span className="pw-listing__text">
                        <span className="pw-listing__name">{item.name}</span>
                        <span className="pw-listing__address">{item.address}</span>
                        {!item.tourable ? <span className="pw-listing__meta">No Self-Guided Tour</span> : null}
                      </span>
                      {item.current ? <span className="pw-listing__current">● Current</span> : <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />}
                    </button>
                  ))}
                </div>
                {hidden ? (
                  <div className="pw-search__more">
                    Showing {shown.length.toLocaleString('en-US')} of {real.length.toLocaleString('en-US')} properties · keep typing to narrow the list
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        )}
      </div>
    </LightShell>
  );
};

interface ExploreProps {
  name: string;
  address: string;
  img: string;
  /** Demo fields of a featured community; a real property shows what its listing carries. */
  demo: DemoListing | null;
  tourable: boolean;
  current: boolean;
  accessMinutes: number;
  onBack: () => void;
  onSchedule: () => void;
  onLive: () => void;
}

/** Explore Property: the listing's photo, name and address, Schedule a Self-Tour / Book a Live Tour, and (for a demo community) its plans and amenities. */
export const ExploreScreen = ({ name, address, img, demo, tourable, current, accessMinutes, onBack, onSchedule, onLive }: ExploreProps) => {
  const plans = demo ? [0, 1, 2, 3].filter((b) => b >= demo.minBed && b <= demo.maxBed).map((b, i) => ({ label: b ? `${b} Bed · ${b > 1 ? 2 : 1} Bath` : 'Studio · 1 Bath', price: `from $${(demo.from + i * 375).toLocaleString('en-US')}/mo` })) : [];
  return (
    <LightShell>
      <div className="pw-explore">
        <div className="pw-explore__hero">
          <img src={img} alt="" />
          <IconButton icon="back" label="Back" onClick={onBack} className="pw-explore__back" />
        </div>
        <div className="pw-explore__body">
          <div>
            <div className="pw-explore__name">{name}</div>
            <div className="pw-explore__address">
              {address}
              {demo ? ` · ${demo.dist} away` : ''}
            </div>
            {demo ? (
              <div className="pw-explore__pills">
                <span>{demo.beds}</span>
                <span>From ${demo.from.toLocaleString('en-US')}/mo</span>
              </div>
            ) : null}
            {!tourable ? <div className="pw-explore__pills"><span className="pw-explore__pill--muted">No Self-Guided Tour yet</span></div> : null}
            {current ? <div className="pw-explore__pills"><span>Your current property</span></div> : null}
          </div>
          <div className="pw-explore__actions">
            <Button height={48} onClick={onSchedule} disabled={!tourable}>
              Schedule a Self-Tour
            </Button>
            <Button variant="secondary" height={46} onClick={onLive}>
              Book a Live Tour With Staff
            </Button>
            <div className="pw-explore__info">
              Self-tours run daily, 9 AM to 7 PM. You get {accessMinutes} minutes of door access once you check in.{DEMO}
            </div>
          </div>
          {demo ? (
            <>
              <div className="pw-explore__section">
                <div className="pw-explore__h2">Floor plans{DEMO}</div>
                <div className="pw-explore__plans">
                  {plans.map((pl) => (
                    <div key={pl.label} className="pw-explore__plan">
                      <div className="pw-explore__planimg">
                        <Icon name="bed" size={28} color="var(--pw-text-subtle)" />
                      </div>
                      <div>
                        <div className="pw-explore__planlabel">{pl.label}</div>
                        <div className="pw-explore__planprice">{pl.price}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pw-explore__section">
                <div className="pw-explore__h2">Amenities{DEMO}</div>
                <div className="pw-explore__amenities">
                  {['Fitness center', 'Rooftop pool', 'Package lockers', 'Dog park', 'Co-working lounge', 'Garage parking'].map((a) => (
                    <span key={a}>{a}</span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="pw-explore__info">Choose this property to see its units, amenities and floor plans in the app.</div>
          )}
        </div>
      </div>
    </LightShell>
  );
};
