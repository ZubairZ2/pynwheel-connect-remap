import type { MapLevel, RouteStage } from '~/models';
import type { MapView as MapViewState } from '~/store/appState';

/**
 * The building / floor selector: one pill per floor of every level (a
 * stacked plate contributes one pill per floor), grouped by building, with
 * the site plan last. Floors the route passes are marked so the visitor can
 * jump between the legs of a cross-floor route.
 */
interface Props {
  levels: MapLevel[];
  value: MapViewState | null;
  onChange: (view: MapViewState) => void;
  /** Only these stages (a route's floors) when given; otherwise every floor. */
  stages?: RouteStage[] | null;
  compact?: boolean;
}

export interface FloorOption {
  level: string;
  floor: number | null;
  label: string;
  building: string | null;
}

export const floorOptions = (levels: MapLevel[]): FloorOption[] => {
  const out: FloorOption[] = [];
  levels
    .filter((l) => l.kind === 'floorplate')
    .forEach((l) => {
      const floors = l.floors.length ? l.floors : [null];
      floors.forEach((f) => out.push({ level: l.id, floor: f, label: f != null ? `Floor ${f}` : l.name.replace(/ \*$/, ''), building: l.building }));
    });
  levels.filter((l) => l.kind === 'sitemap').forEach((l) => out.push({ level: l.id, floor: null, label: 'Property map', building: null }));
  return out;
};

export const FloorPills = ({ levels, value, onChange, stages, compact = false }: Props) => {
  const options = floorOptions(levels);
  const onRoute = new Set((stages ?? []).map((s) => `${s.level}@${s.floor ?? ''}`));
  const shown = stages && stages.length ? options.filter((o) => onRoute.has(`${o.level}@${o.floor ?? ''}`)) : options;
  const buildings = [...new Set(shown.map((o) => o.building))];
  return (
    <div className={`pw-floors${compact ? ' pw-floors--compact' : ''}`} role="tablist" aria-label="Floor">
      {buildings.map((building) => (
        <div key={building ?? 'site'} className="pw-floors__group">
          {building ? <span className="pw-floors__building">{building}</span> : null}
          {shown
            .filter((o) => o.building === building)
            .map((o) => {
              const on = value?.level === o.level && (value.floor ?? null) === (o.floor ?? null);
              return (
                <button key={`${o.level}@${o.floor ?? ''}`} type="button" role="tab" aria-selected={on} className={`pw-floors__pill${on ? ' pw-floors__pill--on' : ''}${onRoute.has(`${o.level}@${o.floor ?? ''}`) ? ' pw-floors__pill--route' : ''}`} onClick={() => onChange({ level: o.level, floor: o.floor })}>
                  {o.label}
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
};
