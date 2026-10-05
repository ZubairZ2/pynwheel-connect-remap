import { ScreenHeader } from '~/components/chrome';
import { Button, ErrorBanner, IconButton, SelectableRow, stopIconOf } from '~/components/ui';
import type { StopDistance } from '~/repositories/tourRepository';
import { distanceLabel, type TourStopView } from '~/store/selectors';
import { LightShell, SectionLabel } from './shared';

interface Props {
  stops: TourStopView[];
  distances: Record<string, StopDistance>;
  selected: Record<string, boolean>;
  calculating: boolean;
  error: string | null;
  onBack: () => void;
  onToggle: (node: string) => void;
  onGenerate: () => void;
}

/** Build Your Tour: amenities, then floor plans; the footer counts the stops and minutes and generates the route. */
export const BuildTourScreen = ({ stops, distances, selected, calculating, error, onBack, onToggle, onGenerate }: Props) => {
  const amenities = stops.filter((s) => s.kind === 'amenity');
  const units = stops.filter((s) => s.kind === 'unit');
  const chosen = stops.filter((s) => selected[s.node]);
  const minutes = chosen.reduce((sum, s) => sum + s.duration, 0);
  const canGenerate = chosen.length > 0;

  const footer = (
    <div className="pw-buildfoot">
      {error ? (
        <div className="pw-buildfoot__error">
          <ErrorBanner title="Route not available" body={error} />
        </div>
      ) : null}
      <div className="pw-buildfoot__row">
        <div className="pw-buildfoot__count">
          {chosen.length} Stops · ~{minutes} min
        </div>
        <Button height={44} block={false} disabled={!canGenerate} busy={calculating} onClick={onGenerate} style={{ fontSize: 14 }}>
          Generate My Route
        </Button>
      </div>
    </div>
  );

  return (
    <LightShell footer={footer}>
      <div className="pw-build">
        <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Build Your Tour" />
        <div className="pw-build__sub">Select stops — we&rsquo;ll route you automatically.</div>
        <SectionLabel className="pw-build__label">Amenities</SectionLabel>
        <div className="pw-build__list">
          {amenities.length ? (
            amenities.map((s) => <SelectableRow key={s.node} selected={!!selected[s.node]} onToggle={() => onToggle(s.node)} icon={stopIconOf(s.icon)} title={s.name} meta={`${s.floorLabel} · ${distanceLabel(distances[s.node])}`} />)
          ) : (
            <div className="pw-build__empty">No amenities are on the stops list yet.</div>
          )}
        </div>
        <SectionLabel className="pw-build__label pw-build__label--second">Floorplans</SectionLabel>
        <div className="pw-build__list">
          {units.length ? (
            units.map((s) => <SelectableRow key={s.node} selected={!!selected[s.node]} onToggle={() => onToggle(s.node)} icon="bed" title={s.name} meta={`${s.floorLabel} · ${distanceLabel(distances[s.node])}`} />)
          ) : (
            <div className="pw-build__empty">No units are on the stops list yet.</div>
          )}
        </div>
      </div>
    </LightShell>
  );
};
