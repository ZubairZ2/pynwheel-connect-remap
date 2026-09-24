interface Props {
  /** `manual`: set by hand, so the PMS feed leaves it alone. `feed`: the feed keeps it current. */
  source: 'feed' | 'manual';
  label: string;
  /** What the tag means, for the tooltip and screen readers. */
  title: string;
}

/** The design's Feed / Manual marker beside a field's label. */
export const SourceTag = ({ source, label, title }: Props) => (
  <span className={`bo-srctag bo-srctag--${source}`} title={title} aria-label={title}>
    {label}
  </span>
);
