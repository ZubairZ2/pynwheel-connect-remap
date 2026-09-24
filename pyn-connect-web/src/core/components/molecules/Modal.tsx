'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { CloseIcon } from '~/core/components/atoms/Icons';

interface Props {
  open: boolean;
  title: string;
  subtitle?: ReactNode;
  /** Panel width in px; the panel never exceeds the viewport. */
  width?: number;
  onClose: () => void;
  /** Accessible name of the × button. */
  closeLabel: string;
  children: ReactNode;
  footer?: ReactNode;
  /** A click outside the panel closes it (the image viewer). Forms keep it off, as in the design. */
  dismissOnBackdrop?: boolean;
  className?: string;
}

/** Open dialogs, innermost last, so Escape only closes the one on top. */
const stack: string[] = [];

/**
 * The design's dialog shell: a dimmed overlay and a white panel with a title,
 * an optional subtitle, a close button, a scrolling body and a footer.
 * Rendered into `document.body`, so a card's layout never clips it.
 */
export const Modal = ({
  open,
  title,
  subtitle,
  width = 760,
  onClose,
  closeLabel,
  children,
  footer,
  dismissOnBackdrop = false,
  className
}: Props) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // Read through a ref so a parent's inline handler does not re-run the effect
  // (which would steal focus from the field being typed in).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    stack.push(id);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || stack[stack.length - 1] !== id) return;
      event.preventDefault();
      closeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(id), 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, id]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="bo-modal"
      onMouseDown={
        dismissOnBackdrop
          ? (event) => {
              if (event.target === event.currentTarget) closeRef.current();
            }
          : undefined
      }
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        tabIndex={-1}
        className={`bo-modal__panel${className ? ` ${className}` : ''}`}
        style={{ width }}
      >
        <div className="bo-modal__head">
          <div className="bo-modal__heading">
            <h2 id={`${id}-title`} className="bo-modal__title">
              {title}
            </h2>
            {subtitle && <p className="bo-modal__subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="bo-modal__close" aria-label={closeLabel} onClick={() => closeRef.current()}>
            <CloseIcon />
          </button>
        </div>
        <div className="bo-modal__body">{children}</div>
        {footer && <div className="bo-modal__foot">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};
