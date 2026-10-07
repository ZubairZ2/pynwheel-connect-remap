import { useEffect, useMemo, useState } from 'react';
import { Icon } from '~/components/Icon';
import { EmptyState, Sheet } from '~/components/ui';
import { useKeyboardInset } from '~/hooks/useDevice';
import type { Place } from '~/models';
import type { PropertyBundle } from '~/repositories/tourRepository';
import { floorNameOf, placeSymbol } from '../WayfindingScreen';

interface Props {
  open: boolean;
  which: 'from' | 'to';
  bundle: PropertyBundle;
  places: Place[];
  current: string | null;
  currentFloor: number | null;
  onPick: (node: string, floor: number | null) => void;
  onClose: () => void;
}

type Kind = 'all' | 'unit' | 'amenity' | 'stop';

interface Option {
  place: Place;
  floor: number | null;
  group: string;
  hay: string;
}

/**
 * The From / To picker: search, kind chips, results grouped by building and
 * floor. A connector that serves several floors (an elevator) is listed once
 * per floor, since a route must know which floor it starts on. Places that
 * are not joined to a path stay choosable and say so, so the "not linked"
 * error can be seen.
 */
export const PlacePickerSheet = ({ open, which, bundle, places, current, currentFloor, onPick, onClose }: Props) => {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const inset = useKeyboardInset();

  // A fresh search every time the picker opens.
  useEffect(() => {
    if (open) {
      setQuery('');
      setKind('all');
    }
  }, [open, which]);

  const options = useMemo<Option[]>(() => {
    const out: Option[] = [];
    places
      .filter((p) => p.routable)
      .forEach((p) => {
        const floors = p.floor == null && p.floors.length > 1 ? p.floors : [p.floor];
        floors.forEach((floor) => {
          const level = floor != null && p.floor == null ? bundle.levels.find((l) => l.kind === 'floorplate' && l.building === p.building && l.floors.includes(floor))?.id ?? p.level : p.level;
          const group = floorNameOf(bundle, level, floor) || 'Property';
          out.push({ place: p, floor, group, hay: `${p.name} ${p.meta} ${group}`.toLowerCase() });
        });
      });
    return out;
  }, [places, bundle]);

  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const hits = options.filter((o) => (kind === 'all' || o.place.kind === kind) && tokens.every((t) => o.hay.includes(t)));
  const groups = [...new Set(hits.map((h) => h.group))];

  return (
    <Sheet open={open} onClose={onClose} title={which === 'from' ? 'Choose start' : 'Choose destination'} size="scroll" zIndex={330} keyboardInset={inset} className="pw-picker">
      <div className="pw-picker__search">
        <Icon name="search" size={14} color="var(--pw-text-subtle)" className="pw-picker__searchicon" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Type a unit, amenity, stop or floor" className="pw-input pw-input--picker" type="search" enterKeyHint="search" autoFocus aria-label="Search places" />
        <span className="pw-picker__count">
          {hits.length} of {options.length}
        </span>
      </div>
      <div className="pw-picker__kinds">
        {(
          [
            ['all', 'All'],
            ['unit', 'Units'],
            ['amenity', 'Amenities'],
            ['stop', 'Stops']
          ] as [Kind, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" className={`pw-picker__kind${kind === id ? ' pw-picker__kind--on' : ''}`} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="pw-picker__list">
        {groups.map((group) => (
          <div key={group} className="pw-picker__group">
            <div className="pw-picker__grouplabel">{group}</div>
            {hits
              .filter((h) => h.group === group)
              .map((h) => {
                const symbol = placeSymbol(h.place);
                const selected = h.place.node === current && (h.place.floor != null || h.floor === currentFloor);
                return (
                  <button key={`${h.place.node}@${h.floor ?? ''}`} type="button" className={`pw-picker__item${selected ? ' pw-picker__item--on' : ''}`} onClick={() => onPick(h.place.node, h.floor)}>
                    <span className="pw-picker__itemicon" style={{ background: symbol.soft, color: symbol.color }}>
                      <Icon name={symbol.icon} size={11} strokeWidth={2.4} />
                    </span>
                    <span className="pw-picker__itemtext">
                      <span className="pw-picker__itemname">{h.place.name}</span>
                      <span className="pw-picker__itemmeta">
                        {h.place.meta}
                        {!h.place.linked ? ' · not on a path yet' : ''}
                      </span>
                    </span>
                    {selected ? <Icon name="check" size={13} color="var(--pw-primary)" strokeWidth={3} /> : null}
                  </button>
                );
              })}
          </div>
        ))}
        {!hits.length ? <EmptyState title={query ? `No match for “${query.trim()}”` : 'Nothing of this type here'} body="Try another name, floor or type." /> : null}
      </div>
    </Sheet>
  );
};
