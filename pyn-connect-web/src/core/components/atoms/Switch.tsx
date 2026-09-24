interface Props {
  on: boolean;
  /** What screen readers hear, e.g. "Pynwheel Touch: Enabled". */
  label: string;
}

/**
 * The design's toggle, showing a state it cannot change: Connect has no write
 * path for these flags yet, so it is an indicator, not a control.
 */
export const Switch = ({ on, label }: Props) => (
  <span className={`bo-switch${on ? ' bo-switch--on' : ''}`} role="img" aria-label={label}>
    <span className="bo-switch__knob" />
  </span>
);
