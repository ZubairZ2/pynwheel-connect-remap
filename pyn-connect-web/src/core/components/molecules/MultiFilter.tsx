'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { CheckIcon, ChevronDownIcon } from '~/core/components/atoms/Icons';
import { i18n } from '~/resources/i18n';
import type { FilterOption } from '~/core/utils/generator/listing.types';

interface Props {
  /** The filter's name ("Status"): the panel heading, and the button once 2+ are picked. */
  label: string;
  /** The button when nothing is picked ("All Statuses"). */
  allLabel: string;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
  onClear: () => void;
}

/** Opening one filter closes any other that is open, as in the design. */
const OPEN_EVENT = 'bo-multifilter:open';
const PANEL_MIN_WIDTH = 250;
const VIEWPORT_GUTTER = 16;

/**
 * The design's MultiFilter (MultiFilter.dc.html): a toolbar button that opens a
 * checklist. Each tick applies straight away; **Done** only closes the panel.
 */
export const MultiFilter = ({ label, allLabel, options, selected, onToggle, onClear }: Props) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onPeerOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== id) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };

    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener(OPEN_EVENT, onPeerOpen);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener(OPEN_EVENT, onPeerOpen);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, id]);

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }

    // A filter near the right edge (a wrapped toolbar on a phone) opens
    // leftwards so the panel stays on screen.
    const left = rootRef.current?.getBoundingClientRect().left ?? 0;
    setAlignRight(left + PANEL_MIN_WIDTH > window.innerWidth - VIEWPORT_GUTTER);
    document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
    setOpen(true);
  };

  const count = selected.length;
  const display =
    count === 0
      ? allLabel
      : count === 1
        ? options.find((option) => option.id === selected[0])?.label ?? allLabel
        : label;
  const summary =
    count === 0
      ? i18n.t(CORE_STRINGS.filter.showingEverything)
      : `${count} ${i18n.t(CORE_STRINGS.filter.selected)}`;
  const panelId = `${id}-panel`;

  return (
    <div className="bo-multifilter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`bo-multifilter__button${count > 0 ? ' bo-multifilter__button--active' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${label}: ${display}`}
        onClick={toggleOpen}
      >
        <span>{display}</span>
        {count > 1 && <span className="bo-multifilter__count">{count}</span>}
        <span className="bo-multifilter__chevron" aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className={`bo-multifilter__panel${alignRight ? ' bo-multifilter__panel--right' : ''}`}
          role="group"
          aria-label={label}
        >
          <div className="bo-multifilter__head">
            <span className="bo-multifilter__title">{label}</span>
            <button type="button" className="bo-multifilter__clear" onClick={onClear}>
              {i18n.t(CORE_STRINGS.filter.clear)}
            </button>
          </div>

          <div className="bo-multifilter__list">
            {options.map((option) => {
              const on = selected.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  className={`bo-multifilter__option${on ? ' bo-multifilter__option--on' : ''}`}
                  onClick={() => onToggle(option.id)}
                >
                  <span className="bo-multifilter__box" aria-hidden="true">
                    {on && <CheckIcon />}
                  </span>
                  <span className="bo-multifilter__label">{option.label}</span>
                </button>
              );
            })}
          </div>

          <div className="bo-multifilter__foot">
            <span className="bo-multifilter__summary">{summary}</span>
            <button type="button" className="bo-multifilter__done" onClick={() => setOpen(false)}>
              {i18n.t(CORE_STRINGS.filter.done)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
