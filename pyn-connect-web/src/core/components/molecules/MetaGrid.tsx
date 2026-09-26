import { SourceTag } from '~/core/components/atoms/SourceTag';

export interface MetaItem {
  label: string;
  value: string;
  /** Where the value comes from, when the CMS tracks it. */
  source?: { kind: 'feed' | 'manual'; label: string; title: string };
  /** Render the value as the design's (read-only) select rather than text. */
  control?: 'select';
  /** The value is a link that opens this URL in a new tab (a stored video link). */
  href?: string;
  /** Accessible name of that link. */
  hrefLabel?: string;
}

interface Props {
  items: MetaItem[];
  /** Columns at full width; `plates` is the floorplate card's 4 + 1 wide layout. The grid narrows on small screens. */
  columns?: 4 | 5 | 'plates';
}

/** The label-over-value grid of a record card. */
export const MetaGrid = ({ items, columns = 5 }: Props) => (
  <dl className={`bo-meta bo-meta--${columns}`}>
    {items.map((item) => (
      <div key={item.label} className="bo-meta__item">
        <dt className="bo-meta__label">
          {item.label}
          {item.source && <SourceTag source={item.source.kind} label={item.source.label} title={item.source.title} />}
        </dt>
        {item.control === 'select' ? (
          <dd className="bo-meta__value">
            <select className="bo-field bo-meta__select" value={item.value} aria-label={item.label} disabled>
              <option value={item.value}>{item.value}</option>
            </select>
          </dd>
        ) : item.href ? (
          <dd className="bo-meta__value" title={item.href}>
            <a className="bo-meta__link" href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.hrefLabel ?? item.value}>
              {item.value}
            </a>
          </dd>
        ) : (
          <dd className="bo-meta__value" title={item.value}>
            {item.value}
          </dd>
        )}
      </div>
    ))}
  </dl>
);
