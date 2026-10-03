'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  /** Whether the panel is shown. The caller owns the state (a menu's open flag lives with the screen's other state). */
  open: boolean;
  /** Asked to close: the pointer left the menu, a click landed outside it, or Escape was pressed. */
  onClose: () => void;
  /** The button (or field) that opens the panel. Rendered as given. */
  trigger: ReactNode;
  /** The panel's content. */
  children: ReactNode;
  /** Extra classes on the wrapper (sizing / flex placement). */
  className?: string;
  /** Extra classes on the panel (its width and look). */
  panelClassName?: string;
  /** Which edge of the trigger the panel hangs from. `stretch` spans the trigger's width (a select-like menu). */
  align?: 'left' | 'right' | 'stretch';
  role?: 'menu' | 'listbox' | 'dialog';
  /** The ARIA label of the panel, when its content has no heading. */
  label?: string;
  testId?: string;
}

/**
 * A trigger with a floating panel that stays open while the pointer is over
 * either of them. Every floating menu that closes on hover-out goes through
 * this, so the gap between the trigger and its panel is never a dead zone:
 * the panel sits `--bo-menu-gap` below the trigger and a transparent strip
 * (`::before`) bridges that gap, so React's `onMouseLeave` on the wrapper
 * only fires once the pointer has really left the menu, in any direction. A
 * click outside and Escape close it too, for keyboard and touch.
 */
export const HoverMenu = ({ open, onClose, trigger, children, className, panelClassName, align = 'right', role = 'menu', label, testId }: Props) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  return (
    <div ref={rootRef} className={`bo-hovermenu${className ? ` ${className}` : ''}`} onMouseLeave={open ? onClose : undefined} data-testid={testId}>
      {trigger}
      {open && (
        <div className={`bo-hovermenu__panel bo-hovermenu__panel--${align}${panelClassName ? ` ${panelClassName}` : ''}`} role={role} aria-label={label}>
          {children}
        </div>
      )}
    </div>
  );
};
