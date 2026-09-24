import { SourceTag } from '~/core/components/atoms/SourceTag';

export interface MetaItem {
  label: string;
  value: string;
  /** Where the value comes from, when the CMS tracks it. */
  source?: { kind: 'feed' | 'manual'; label: string; title: string };
}

interface Props {
  items: MetaItem[];
  /** Columns at full width; the grid narrows on small screens. */
  columns?: 4 | 5;
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
        <dd className="bo-meta__value" title={item.value}>
          {item.value}
        </dd>
      </div>
    ))}
  </dl>
);
