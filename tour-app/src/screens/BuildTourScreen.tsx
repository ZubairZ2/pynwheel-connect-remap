import { useMemo, useState } from 'react';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, ErrorBanner, IconButton, Sheet, stopIconOf } from '~/components/ui';
import { Chip, Eyebrow, Segmented } from '~/components/ui2';
import { floorOptions } from '~/map/FloorPills';
import { MapView } from '~/map/MapView';
import type { PropertyBundle, StopDistance } from '~/repositories/tourRepository';
import type { AppState, BuildLayout, MapView as MapViewState } from '~/store/appState';
import { distanceLabel, type TourStopView } from '~/store/selectors';
import { groupStops, levelOfStop, unitFacts } from '~/store/views';
import { LightShell } from './shared';

interface Props {
  bundle: PropertyBundle;
  stops: TourStopView[];
  distances: Record<string, StopDistance>;
  selected: Record<string, boolean>;
  layout: BuildLayout;
  view: AppState['build'];
  mapView: MapViewState | null;
  startNode: string | null;
  virtual: boolean;
  calculating: boolean;
  error: string | null;
  mark: string;
  onView: (patch: Partial<AppState['build']>) => void;
  onMapView: (view: MapViewState) => void;
  onBack: () => void;
  onToggle: (node: string) => void;
  onGenerate: () => void;
}

/** The thumbnail of a stop: the app has no stop photos from the backend, so a glyph tile stands in. */
const StopThumb = ({ stop, size = 'md' }: { stop: TourStopView; size?: 'sm' | 'md' | 'lg' }) => (
  <span className={`pw-thumb pw-thumb--${size}${stop.kind === 'unit' ? ' pw-thumb--unit' : ''}`} aria-hidden>
    <Icon name={stop.kind === 'unit' ? 'bed' : stopIconOf(stop.icon)} size={size === 'lg' ? 40 : size === 'md' ? 22 : 18} />
  </span>
);

const metaOf = (s: TourStopView, distances: Record<string, StopDistance>, mark: string) => {
  if (s.kind === 'unit' && s.unit) {
    const f = unitFacts(s.unit, mark);
    return `${f.beds} · ${f.price} · ${f.availShort}`;
  }
  return `${s.floor || s.floorLabel} · ~${s.duration} min · ${distanceLabel(distances[s.node])}`;
};

/**
 * Build Your Tour: the property map (the real levels, with a pin on every
 * chosen stop), "Your Tour" grouped by building and floor, Add Stops, a stop
 * preview, and "Let's go!" which asks the backend for the tour route. The
 * four layouts of the design's `buildLayout` tweak: list + map (default),
 * map + cards, list / map tabs, and the floating list / map switch.
 */
export const BuildTourScreen = (p: Props) => {
  const { bundle, stops, distances, selected, layout, view, mark } = p;
  const chosen = stops.filter((s) => selected[s.node]);
  const minutes = chosen.reduce((sum, s) => sum + s.duration, 0);
  const canGenerate = chosen.length > 0;
  const groups = useMemo(() => groupStops(chosen), [chosen]);
  const tabbed = layout === 'tabs' || layout === 'switch';
  const tabMap = view.tab === 'map';
  const showMap = !tabbed || tabMap;
  const showList = layout !== 'mapCards' && !(tabbed && tabMap);
  const showCards = layout === 'mapCards' || (tabbed && tabMap);
  const mapHeight = layout === 'mapCards' ? (view.expanded ? 440 : 300) : tabbed ? (view.expanded ? 420 : 250) : view.expanded ? 300 : 170;
  const [addOpen, setAddOpen] = useState(false);
  const [floorMenu, setFloorMenu] = useState(false);

  const options = floorOptions(bundle.levels);
  const level = bundle.levels.find((l) => l.id === p.mapView?.level) ?? bundle.levels.find((l) => l.kind === 'sitemap') ?? bundle.levels[0];
  const floor = p.mapView?.level === level.id ? (p.mapView.floor ?? level.floors[0] ?? null) : (level.floors[0] ?? null);
  const curLabel = options.find((o) => o.level === level.id && (o.floor ?? null) === (floor ?? null))?.label ?? level.name.replace(/ \*$/, '');
  const focus = view.focusNode ? stops.find((s) => s.node === view.focusNode) : null;
  const preview = view.previewNode ? stops.find((s) => s.node === view.previewNode) : null;

  const locate = (node: string) => {
    const at = levelOfStop(bundle, node);
    if (at && (at.level !== level.id || (at.floor != null && at.floor !== floor))) p.onMapView({ level: at.level, floor: at.floor });
    p.onView({ focusNode: node, previewNode: null, tab: 'map' });
  };

  const pins = useMemo(() => stops.filter((s) => selected[s.node] || s.node === view.focusNode).map((s) => ({ node: s.node, on: !!selected[s.node], focus: s.node === view.focusNode, label: s.name })), [stops, selected, view.focusNode]);

  const map = showMap ? (
    <div className="pw-build__mapwrap" style={{ zIndex: 4 }}>
      <div className="pw-build__map" style={{ height: mapHeight }}>
        <MapView level={level} floor={floor} nodes={bundle.graph.nodes} edges={bundle.graph.edges} units={bundle.units} amenities={bundle.amenities} highlight={{ from: p.startNode }} pins={pins} focusNode={view.focusNode} fitTo="all" fitKey={`build-${level.id}-${floor ?? ''}`} onTapNode={(n) => p.onView({ focusNode: view.focusNode === n.id ? null : n.id })}>
          <button type="button" className="pw-build__size" aria-label={view.expanded ? 'Smaller map' : 'Bigger map'} onPointerDown={(e) => e.stopPropagation()} onClick={() => p.onView({ expanded: !view.expanded })}>
            <Icon name={view.expanded ? 'shrink' : 'expand'} size={13} strokeWidth={2.4} />
          </button>
          {options.length > 1 ? (
            <div className="pw-build__floor" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="pw-build__floorbtn" onClick={() => setFloorMenu((v) => !v)} aria-expanded={floorMenu}>
                <Icon name="layers" size={12} strokeWidth={2.2} />
                {curLabel}
                <Icon name="chevronDown" size={11} strokeWidth={2.6} style={{ transform: floorMenu ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
              </button>
              {floorMenu ? (
                <div className="pw-build__floormenu" role="menu">
                  {options.map((o) => {
                    const on = o.level === level.id && (o.floor ?? null) === (floor ?? null);
                    const count = chosen.filter((s) => {
                      const at = levelOfStop(bundle, s.node);
                      return at?.level === o.level && (o.floor == null || at.floor == null || at.floor === o.floor);
                    }).length;
                    return (
                      <button key={`${o.level}@${o.floor ?? ''}`} type="button" role="menuitem" className={`pw-build__flooritem${on ? ' pw-build__flooritem--on' : ''}`} onClick={() => {
                        p.onMapView({ level: o.level, floor: o.floor });
                        p.onView({ focusNode: null });
                        setFloorMenu(false);
                      }}>
                        <span>{o.building ? `${o.building} · ${o.label}` : o.label}</span>
                        {count ? <b>{count}</b> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
        </MapView>
      </div>
      {focus ? (
        <div className="pw-build__focus">
          <StopThumb stop={focus} size="sm" />
          <span className="pw-build__focustext">
            <span className="pw-build__focusname">{focus.name}</span>
            <span className="pw-build__focusmeta">{metaOf(focus, distances, mark)}</span>
          </span>
          <button type="button" className={`pw-build__focusbtn${selected[focus.node] ? ' pw-build__focusbtn--remove' : ''}`} onClick={() => p.onToggle(focus.node)}>
            {selected[focus.node] ? 'Remove' : '+ Add'}
          </button>
          <IconButton icon="close" label="Close" tone="round" onClick={() => p.onView({ focusNode: null })} />
        </div>
      ) : null}
    </div>
  ) : null;

  const item = (s: TourStopView) => (
    <div key={s.node} className={`pw-build__item${view.focusNode === s.node ? ' pw-build__item--focus' : ''}`}>
      <button type="button" className="pw-build__itemthumb" aria-label={`Preview ${s.name}`} onClick={() => p.onView({ previewNode: s.node })}>
        <StopThumb stop={s} />
        <span className="pw-build__itemzoom">
          <Icon name="expand" size={10} color="#fff" strokeWidth={2.4} />
        </span>
      </button>
      <span className="pw-build__itemtext">
        <span className="pw-build__itemname">{s.name}</span>
        <span className="pw-build__itemmeta">{metaOf(s, distances, mark)}</span>
      </span>
      <IconButton icon="pin" label={`Show ${s.name} on map`} onClick={() => locate(s.node)} className="pw-build__iconbtn--primary" />
      <IconButton icon="trash" label={`Remove ${s.name}`} onClick={() => p.onToggle(s.node)} className="pw-build__iconbtn--danger" />
    </div>
  );

  const footer = (
    <div className="pw-buildfoot">
      {p.error ? (
        <div className="pw-buildfoot__error">
          <ErrorBanner title="Route not available" body={p.error} />
        </div>
      ) : null}
      <div className="pw-buildfoot__row">
        <div className="pw-buildfoot__count">
          {chosen.length} Stops · ~{minutes} min
        </div>
        <Button height={44} block={false} disabled={!canGenerate} busy={p.calculating} onClick={p.onGenerate} style={{ fontSize: 14 }}>
          {chosen.length === stops.length ? "Let's go!" : 'Generate My Route'}
        </Button>
      </div>
    </div>
  );

  return (
    <LightShell footer={footer}>
      <div className="pw-build">
        <ScreenHeader
          left={<IconButton icon="back" label="Back" onClick={p.onBack} />}
          title={
            <span className="pw-build__titles">
              <span>Build Your Tour</span>
              <span>{p.virtual ? 'Virtual tour · Remove or add stops, or start now.' : 'Recommended route. Remove or add stops, or start now.'}</span>
            </span>
          }
        />
        {layout === 'tabs' ? (
          <div className="pw-build__tabs">
            <Segmented options={[{ id: 'list', label: 'List' }, { id: 'map', label: 'Map' }]} value={view.tab} onChange={(tab) => p.onView({ tab })} />
          </div>
        ) : null}
        {map}
        <div className="pw-build__yourtour">
          <div>
            <div className="pw-build__yourtitle">Your Tour</div>
            <div className="pw-build__yoursub">
              {chosen.length} stops · ~{minutes} min
            </div>
          </div>
          <button type="button" className="pw-build__add" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={14} strokeWidth={2.6} />
            Add Stops
          </button>
        </div>
        {showCards ? (
          <div className="pw-build__cards">
            {chosen.map((s) => (
              <div key={s.node} className={`pw-build__card${view.focusNode === s.node ? ' pw-build__card--focus' : ''}`}>
                <button type="button" className="pw-build__cardthumb" aria-label={`Preview ${s.name}`} onClick={() => p.onView({ previewNode: s.node })}>
                  <StopThumb stop={s} size="lg" />
                  <span className="pw-build__cardlevel">{s.floor || s.floorLabel}</span>
                </button>
                <div className="pw-build__cardbody">
                  <div className="pw-build__itemname">{s.name}</div>
                  <div className="pw-build__itemmeta">{s.kind === 'unit' && s.unit ? `${unitFacts(s.unit, mark).beds} · ${unitFacts(s.unit, mark).price}` : `~${s.duration} min · ${distanceLabel(distances[s.node])}`}</div>
                  <div className="pw-build__cardactions">
                    <button type="button" onClick={() => locate(s.node)}>
                      <Icon name="pin" size={13} strokeWidth={2.2} />
                      On map
                    </button>
                    <button type="button" aria-label={`Remove ${s.name}`} className="pw-build__cardremove" onClick={() => p.onToggle(s.node)}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {showList ? <div className="pw-build__groups">{groups.map((g) => (
          <div key={g.label} className="pw-build__group">
            <div className="pw-build__grouplabel">
              {g.label}
              <span />
            </div>
            {g.items.map(item)}
          </div>
        ))}</div> : null}
        {!chosen.length ? <div className="pw-build__empty">Your tour is empty. Add at least one stop to start.</div> : null}
        {layout === 'switch' ? (
          <div className="pw-build__switchwrap">
            <div className="pw-build__switch">
              {(['list', 'map'] as const).map((t) => (
                <button key={t} type="button" className={view.tab === t ? 'pw-build__switch--on' : ''} onClick={() => p.onView({ tab: t })}>
                  <Icon name={t === 'list' ? 'list' : 'map'} size={14} strokeWidth={2.2} />
                  {t === 'list' ? 'List' : 'Map'}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <AddStopsSheet open={addOpen} stops={stops} selected={selected} distances={distances} mark={mark} onToggle={p.onToggle} onPreview={(node) => p.onView({ previewNode: node })} onClose={() => setAddOpen(false)} />
      {preview ? (
        <div className="pw-preview" onClick={() => p.onView({ previewNode: null })} role="presentation">
          <button type="button" className="pw-preview__close" aria-label="Close preview" onClick={() => p.onView({ previewNode: null })}>
            <Icon name="close" size={14} color="#fff" strokeWidth={2.4} />
          </button>
          <div className="pw-preview__pic" onClick={(e) => e.stopPropagation()} role="presentation">
            <StopThumb stop={preview} size="lg" />
            {preview.kind === 'amenity' && preview.amenity?.description ? <p>{preview.amenity.description}</p> : preview.kind === 'unit' && preview.unit?.description ? <p>{preview.unit.description}</p> : <p className="pw-preview__nophoto">No photo for this stop yet.</p>}
          </div>
          <div className="pw-preview__text" onClick={(e) => e.stopPropagation()} role="presentation">
            <div className="pw-preview__name">{preview.name}</div>
            <div className="pw-preview__meta">{metaOf(preview, distances, mark)}</div>
          </div>
          <div className="pw-preview__actions" onClick={(e) => e.stopPropagation()} role="presentation">
            <button type="button" className="pw-preview__ghost" onClick={() => {
              locate(preview.node);
              setAddOpen(false);
            }}>
              Show on Map
            </button>
            <button type="button" className={`pw-preview__toggle${selected[preview.node] ? ' pw-preview__toggle--remove' : ''}`} onClick={() => p.onToggle(preview.node)}>
              {selected[preview.node] ? 'Remove from Tour' : 'Add to Tour'}
            </button>
          </div>
        </div>
      ) : null}
    </LightShell>
  );
};

interface AddProps {
  open: boolean;
  stops: TourStopView[];
  selected: Record<string, boolean>;
  distances: Record<string, StopDistance>;
  mark: string;
  onToggle: (node: string) => void;
  onPreview: (node: string) => void;
  onClose: () => void;
}

/** Add stops: search, All / Units / Amenities, building & floor chips, unit preferences, grouped rows with Add / Added. */
/** Mounted only while open, so the "already in your tour" baseline is taken fresh each time the sheet opens. */
const AddStopsSheet = (p: AddProps) => (p.open ? <AddStopsBody {...p} /> : null);

const AddStopsBody = ({ open, stops, selected, distances, mark, onToggle, onPreview, onClose }: AddProps) => {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'units' | 'amenities'>('all');
  const [floor, setFloor] = useState('all');
  const [beds, setBeds] = useState<'any' | '0' | '1' | '2' | '3'>('any');
  const [availNow, setAvailNow] = useState(false);
  const [base] = useState<Record<string, boolean>>(() => ({ ...selected }));
  if (!open) return null;
  const floors = [...new Set(stops.map((s) => s.floor).filter(Boolean))];
  const pool = stops.filter((s) => !base[s.node]);
  const query = q.trim().toLowerCase();
  const matches = (s: TourStopView) => {
    if (tab === 'units' && s.kind !== 'unit') return false;
    if (tab === 'amenities' && s.kind !== 'amenity') return false;
    if (floor !== 'all' && s.floor !== floor) return false;
    if (query && !`${s.name} ${s.floor} ${s.floorLabel}`.toLowerCase().includes(query)) return false;
    if (s.kind === 'unit' && s.unit) {
      if (beds !== 'any' && (s.unit.bedrooms ?? -1) !== Number(beds)) return false;
      if (availNow && !s.unit.available) return false;
    }
    return true;
  };
  const shown = pool.filter(matches);
  const groups = groupStops(shown);
  const added = pool.filter((s) => selected[s.node]).length;
  const filtered = !!query || tab !== 'all' || floor !== 'all' || beds !== 'any' || availNow;
  const hasBedData = stops.some((s) => s.unit?.bedrooms != null);
  return (
    <Sheet open onClose={onClose} size="tall" zIndex={320} className="pw-addstops" headerPadding="tight">
      <div className="pw-addstops__head">
        <div>
          <div className="pw-addstops__title">Add stops</div>
          <div className="pw-addstops__sub">{added ? `${added} ${added === 1 ? 'stop' : 'stops'} added · tap ✓ Added to undo` : 'Search or filter, then tap Add.'}</div>
        </div>
        <IconButton icon="close" label="Close" tone="round" onClick={onClose} />
      </div>
      <div className="pw-addstops__search">
        <Icon name="search" size={16} color="var(--pw-text-subtle)" strokeWidth={2.2} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search units or amenities" aria-label="Search stops" />
        {q ? (
          <button type="button" aria-label="Clear search" onClick={() => setQ('')}>
            <Icon name="close" size={12} strokeWidth={2.4} />
          </button>
        ) : null}
      </div>
      <Segmented options={[{ id: 'all', label: 'All' }, { id: 'units', label: 'Units' }, { id: 'amenities', label: 'Amenities' }]} value={tab} onChange={setTab} />
      {floors.length > 1 ? (
        <div className="pw-addstops__filters">
          <Eyebrow>Building &amp; floor</Eyebrow>
          <div className="pw-addstops__chips">
            <Chip size="sm" on={floor === 'all'} onClick={() => setFloor('all')}>
              All
            </Chip>
            {floors.map((f) => (
              <Chip key={f} size="sm" on={floor === f} onClick={() => setFloor(f)}>
                {f}
              </Chip>
            ))}
          </div>
        </div>
      ) : null}
      {tab !== 'amenities' && hasBedData ? (
        <div className="pw-addstops__filters">
          <Eyebrow>Unit preferences</Eyebrow>
          <div className="pw-addstops__chips">
            {(['any', '0', '1', '2', '3'] as const).map((b) => (
              <Chip key={b} size="sm" on={beds === b} onClick={() => setBeds(b)}>
                {b === 'any' ? 'Any beds' : b === '0' ? 'Studio' : `${b} Bed`}
              </Chip>
            ))}
            <Chip size="sm" on={availNow} onClick={() => setAvailNow((v) => !v)}>
              Available now
            </Chip>
          </div>
        </div>
      ) : null}
      <div className="pw-addstops__list">
        {groups.map((g) => (
          <div key={g.label} className="pw-build__group">
            <div className="pw-build__grouplabel">
              {g.label} · {g.items.length}
              <span />
            </div>
            {g.items.map((s) => {
              const on = !!selected[s.node];
              return (
                <div key={s.node} className={`pw-build__item${on ? ' pw-build__item--focus' : ''}`}>
                  <button type="button" className="pw-build__itemthumb" aria-label={`Preview ${s.name}`} onClick={() => onPreview(s.node)}>
                    <StopThumb stop={s} />
                  </button>
                  <span className="pw-build__itemtext">
                    <span className="pw-build__itemname">{s.name}</span>
                    <span className="pw-build__itemmeta">{metaOf(s, distances, mark)}</span>
                  </span>
                  <button type="button" className={`pw-addstops__addbtn${on ? ' pw-addstops__addbtn--on' : ''}`} onClick={() => onToggle(s.node)} aria-pressed={on}>
                    {on ? '✓ Added' : 'Add'}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {!shown.length ? (
          <div className="pw-addstops__none">
            <div>{pool.length && filtered ? 'No matches' : tab === 'units' ? 'All available units are already in your tour' : tab === 'amenities' ? 'All amenities are already in your tour' : 'Everything is already in your tour'}</div>
            <div>{pool.length && filtered ? 'Try a different search or clear your filters.' : tab === 'all' ? 'Remove a stop first if you want to swap something.' : 'Switch tabs to add something else.'}</div>
            {pool.length && filtered ? (
              <button type="button" className="pw-addstops__clear" onClick={() => {
                setQ('');
                setTab('all');
                setFloor('all');
                setBeds('any');
                setAvailNow(false);
              }}>
                Clear filters
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <Button height={48} onClick={onClose}>
        {added ? `Done · ${added} added` : 'Done'}
      </Button>
    </Sheet>
  );
};
