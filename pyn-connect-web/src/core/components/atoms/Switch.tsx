interface Props {
  on: boolean;
  /** What screen readers hear, e.g. "Pynwheel Touch: Enabled". */
  label: string;
  /**
   * Makes the switch a control (a form field in a dialog). Without it the
   * switch only shows a state.
   */
  onToggle?: () => void;
  disabled?: boolean;
}

/**
 * The design's toggle. On a record's page it shows a state it cannot change —
 * Connect has no write path for those flags yet, so there it is an indicator,
 * not a control. Inside a dialog's form it takes `onToggle`.
 */
export const Switch = ({ on, label, onToggle, disabled }: Props) =>
  onToggle ? (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      className={`bo-switch bo-switch--control${on ? ' bo-switch--on' : ''}`}
      onClick={onToggle}
    >
      <span className="bo-switch__knob" />
    </button>
  ) : (
    <span className={`bo-switch${on ? ' bo-switch--on' : ''}`} role="img" aria-label={label}>
      <span className="bo-switch__knob" />
    </span>
  );
