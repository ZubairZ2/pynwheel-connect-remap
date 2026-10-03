'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

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
  /**
   * A search box above the options. Left out, a list with more than
   * `SEARCHABLE_FROM` options gets one; a short list of a few states does not.
   */
  searchable?: boolean;
}

/** Opening one filter closes any other that is open, as in the design. */
const OPEN_EVENT = 'bo-multifilter:open';
const PANEL_MIN_WIDTH = 250;
const VIEWPORT_GUTTER = 16;
/** Lists at least this long are searchable unless the caller says otherwise. */
export const SEARCHABLE_FROM = 6;

const fill = (key: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((text, [name, value]) => text.replace(`{${name}}`, value), i18n.t(key));

/**
 * The design's MultiFilter (MultiFilter.dc.html): a toolbar button that opens a
 * checklist. Each tick applies straight away; **Done** only closes the panel.
 * A long list carries a search box: typing narrows the options at once
 * (case-insensitive, anywhere in the label), Enter ticks the first match, and
 * what is already ticked stays ticked whether or not it matches.
 */
export const MultiFilter = ({ label, allLabel, options, selected, onToggle, onClear, searchable }: Props) => {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const [search, setSearch] = useState('');
  const withSearch = searchable ?? options.length >= SEARCHABLE_FROM;

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

  // The search box starts empty every time the panel opens, with the caret in it.
  useEffect(() => {
    if (!open) return;
    setSearch('');
    if (withSearch) searchRef.current?.focus();
  }, [open, withSearch]);

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

  const needle = search.trim().toLowerCase();
  const visible = useMemo(
    () => (needle ? options.filter((option) => option.label.toLowerCase().includes(needle)) : options),
    [needle, options]
  );

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

          {withSearch && (
            <div className="bo-multifilter__searchrow">
              <svg className="bo-multifilter__searchicon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                className="bo-multifilter__search"
                value={search}
                placeholder={fill(CORE_STRINGS.filter.search, { label: label.toLowerCase() })}
                aria-label={fill(CORE_STRINGS.filter.search, { label: label.toLowerCase() })}
                autoComplete="off"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  // Enter ticks the first option that matches; Escape is the panel's (above).
                  if (event.key === 'Enter' && visible.length > 0) {
                    event.preventDefault();
                    onToggle(visible[0].id);
                  }
                }}
              />
              {search && (
                <button type="button" className="bo-multifilter__searchclear" aria-label={i18n.t(CORE_STRINGS.filter.clearSearch)} onClick={() => searchRef.current?.focus()} onMouseDown={() => setSearch('')}>
                  ×
                </button>
              )}
            </div>
          )}

          <div className="bo-multifilter__list" role="list">
            {visible.map((option) => {
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
            {visible.length === 0 && (
              <div className="bo-multifilter__empty" role="status">
                {fill(CORE_STRINGS.filter.noMatches, { query: search.trim() })}
              </div>
            )}
          </div>

          <div className="bo-multifilter__foot">
            <span className="bo-multifilter__summary">
              {summary}
              {needle && visible.length !== options.length && ` · ${fill(CORE_STRINGS.filter.matching, { shown: String(visible.length), total: String(options.length) })}`}
            </span>
            <button type="button" className="bo-multifilter__done" onClick={() => setOpen(false)}>
              {i18n.t(CORE_STRINGS.filter.done)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
