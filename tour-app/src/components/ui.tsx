import { useEffect, useRef, useState, type ButtonHTMLAttributes, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * The reference's building blocks, each with the design's exact sizes:
 * buttons (50 / 48 / 46 / 44 px), the 34 px bordered icon button, the 30 px
 * round close button, pills, the 48 × 28 toggle, the selectable stop card,
 * the bottom sheet, the centred modal, the toast, and the loading / empty /
 * error states. The dummy-data marker is the literal ` *` the data carries.
 */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'dark' | 'soft' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  height?: 50 | 48 | 46 | 44 | 40 | 36 | 34;
  icon?: IconName;
  iconSize?: number;
  block?: boolean;
  busy?: boolean;
}

export const Button = ({ variant = 'primary', height = 50, icon, iconSize = 16, block = true, busy = false, className, children, disabled, style, ...rest }: ButtonProps) => (
  <button
    type="button"
    className={`pw-btn pw-btn--${variant}${block ? ' pw-btn--block' : ''}${busy ? ' pw-btn--busy' : ''}${className ? ` ${className}` : ''}`}
    style={{ height, ...style }}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    {...rest}
  >
    {busy ? <span className="pw-btn__spinner" aria-hidden /> : icon ? <Icon name={icon} size={iconSize} /> : null}
    <span>{children}</span>
  </button>
);

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  label: string;
  tone?: 'light' | 'dark' | 'round';
  size?: number;
}

/** 34 × 34, 6 px radius, 1 px stroke (`tone="dark"` over a photo); `tone="round"` is the 30 px close button of a sheet. */
export const IconButton = ({ icon, label, tone = 'light', size, className, ...rest }: IconButtonProps) => (
  <button type="button" className={`pw-iconbtn pw-iconbtn--${tone}${className ? ` ${className}` : ''}`} aria-label={label} title={label} {...rest}>
    <Icon name={icon} size={size ?? (tone === 'round' ? 14 : icon === 'list' ? 17 : icon === 'close' ? 16 : 18)} />
  </button>
);

export const Pill = ({ children, tone = 'primary', className, style }: { children: ReactNode; tone?: 'primary' | 'yellow' | 'dark' | 'light' | 'route' | 'danger'; className?: string; style?: CSSProperties }) => (
  <span className={`pw-pill pw-pill--${tone}${className ? ` ${className}` : ''}`} style={style}>
    {children}
  </span>
);

export const Toggle = ({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`pw-toggle${on ? ' pw-toggle--on' : ''}`} onClick={onChange}>
    <span className="pw-toggle__knob" />
  </button>
);

export const Checkbox = ({ on, onChange, children }: { on: boolean; onChange: () => void; children: ReactNode }) => (
  <button type="button" role="checkbox" aria-checked={on} className="pw-check" onClick={onChange}>
    <span className={`pw-check__box${on ? ' pw-check__box--on' : ''}`}>
      <Icon name="check" size={10} color="#fff" strokeWidth={3.6} />
    </span>
    <span className="pw-check__label">{children}</span>
  </button>
);

interface SelectableRowProps {
  selected: boolean;
  onToggle: () => void;
  title: ReactNode;
  meta: ReactNode;
  icon?: IconName | null;
  iconSize?: number;
  trailing?: 'check' | 'chevron' | 'plus' | ReactNode;
  disabled?: boolean;
}

/** The stop card of Build Your Tour / Choose AR Stops / the itinerary: 14 px padding, 10 px radius, primary border + tint when selected. */
export const SelectableRow = ({ selected, onToggle, title, meta, icon, iconSize = 20, trailing = 'check', disabled }: SelectableRowProps) => (
  <button type="button" className={`pw-row${selected ? ' pw-row--on' : ''}${disabled ? ' pw-row--disabled' : ''}`} onClick={onToggle} aria-pressed={trailing === 'check' ? selected : undefined} disabled={disabled}>
    {icon ? (
      <span className="pw-row__icon">
        <Icon name={icon} size={icon === 'star' ? 18 : iconSize} />
      </span>
    ) : null}
    <span className="pw-row__text">
      <span className="pw-row__title">{title}</span>
      <span className="pw-row__meta">{meta}</span>
    </span>
    {trailing === 'check' ? (
      <span className={`pw-row__check${selected ? ' pw-row__check--on' : ''}`}>{selected ? <Icon name="check" size={14} color="#fff" strokeWidth={3} /> : null}</span>
    ) : trailing === 'chevron' ? (
      <Icon name="chevronRight" size={18} color="var(--pw-text-subtle)" />
    ) : trailing === 'plus' ? (
      <Icon name="plus" size={18} color="var(--pw-primary)" />
    ) : (
      trailing
    )}
  </button>
);

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  /** `tall` = 86% (the concierge), `scroll` = up to 80% with its own scrolling (itinerary, history). */
  size?: 'auto' | 'scroll' | 'tall';
  zIndex?: number;
  /** Extra bottom padding for the keyboard (px). */
  keyboardInset?: number;
  headerPadding?: 'default' | 'tight';
  className?: string;
  testId?: string;
}

/**
 * The bottom sheet: a 40% black backdrop (tap to close), a white panel with
 * 16 px top radii and the modal shadow, dragged down to dismiss. The
 * reference closes with its ×; Android Back and the backdrop close it too.
 */
export const Sheet = ({ open, onClose, title, children, size = 'auto', zIndex = 300, keyboardInset = 0, headerPadding = 'default', className, testId }: SheetProps) => {
  const [drag, setDrag] = useState<{ startY: number; dy: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setDrag(null);
  }, [open]);

  if (!open) return null;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const scroller = panel.current;
    if (scroller && scroller.scrollTop > 0) return;
    setDrag({ startY: e.clientY, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ ...drag, dy: Math.max(0, e.clientY - drag.startY) });
  };
  const onUp = () => {
    if (!drag) return;
    const dismiss = drag.dy > 90;
    setDrag(null);
    if (dismiss) onClose();
  };

  return (
    <div className="pw-overlay" style={{ zIndex }} onClick={onClose} role="presentation">
      <div
        ref={panel}
        className={`pw-sheet pw-sheet--${size}${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{ transform: drag ? `translateY(${drag.dy}px)` : undefined, transition: drag ? 'none' : undefined, paddingBottom: keyboardInset ? `calc(var(--pw-home-indicator) + ${keyboardInset}px)` : undefined }}
        data-testid={testId}
      >
        <div className={`pw-sheet__grab pw-sheet__grab--${headerPadding}`} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {title ? (
            <div className="pw-sheet__head">
              <div className="pw-sheet__title">{title}</div>
              <IconButton icon="close" label="Close" tone="round" onClick={onClose} />
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
};

export const Modal = ({ open, onClose, children, zIndex = 300 }: { open: boolean; onClose: () => void; children: ReactNode; zIndex?: number }) => {
  if (!open) return null;
  return (
    <div className="pw-overlay pw-overlay--center" style={{ zIndex }} onClick={onClose} role="presentation">
      <div className="pw-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const Toast = ({ message }: { message: string | null }) =>
  message ? (
    <div className="pw-toastwrap" role="status" aria-live="polite">
      <div className="pw-toast">{message}</div>
    </div>
  ) : null;

/** The reference's 26 px spinner ring (primary on light primary). */
export const Spinner = ({ size = 26, light = false }: { size?: number; light?: boolean }) => (
  <span className={`pw-spinner${light ? ' pw-spinner--light' : ''}`} style={{ width: size, height: size }} aria-hidden />
);

export const LoadingState = ({ label, veil = false, dark = false }: { label: string; veil?: boolean; dark?: boolean }) => (
  <div className={`pw-loading${veil ? ' pw-loading--veil' : ''}${dark ? ' pw-loading--dark' : ''}`} role="status" aria-live="polite" aria-label={label}>
    <Spinner light={dark} />
    <span className="pw-loading__label">{label}</span>
  </div>
);

export const EmptyState = ({ icon = 'search', title, body, action }: { icon?: IconName; title: ReactNode; body?: ReactNode; action?: ReactNode }) => (
  <div className="pw-empty">
    <span className="pw-empty__icon">
      <Icon name={icon} size={22} color="var(--pw-text-subtle)" />
    </span>
    <div className="pw-empty__title">{title}</div>
    {body ? <div className="pw-empty__body">{body}</div> : null}
    {action ? <div className="pw-empty__action">{action}</div> : null}
  </div>
);

export const ErrorBanner = ({ title, body, action }: { title: ReactNode; body?: ReactNode; action?: ReactNode }) => (
  <div className="pw-error" role="alert">
    <div className="pw-error__title">{title}</div>
    {body ? <div className="pw-error__body">{body}</div> : null}
    {action ? <div className="pw-error__action">{action}</div> : null}
  </div>
);

/** The amenity / unit icon as the reference maps it. */
export const stopIconOf = (icon: string): IconName => {
  switch (icon) {
    case 'dumbbell':
    case 'wave':
    case 'star':
    case 'bed':
    case 'briefcase':
    case 'dog':
    case 'yoga':
    case 'leaf':
    case 'coffee':
      return icon;
    default:
      return 'star';
  }
};
