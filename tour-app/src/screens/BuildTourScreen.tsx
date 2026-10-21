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
  /** Minutes of the whole route the backend calculated for exactly these stops, when it has (null otherwise). */
  routeMinutes: number | null;
  mark: string;
  onView: (patch: Partial<AppState['build']>) => void;
  onMapView: (view: MapViewState) => void;
  onBack: () => void;
  onToggle: (node: string) => void;
  onGenerate: () => void;
}

/** The thumbnail of a stop: its CMS image or floor plan when published, else a glyph tile. */
const StopThumb = ({ stop, size = 'md' }: { stop: TourStopView; size?: 'sm' | 'md' | 'lg' }) => {
  const media = stop.unit?.media ?? stop.amenity?.media;
  const src = stop.kind === 'unit' ? (media?.floorplanImage ?? media?.image ?? null) : (media?.image ?? null);
  if (src) {
    return (
      <span className={`pw-thumb pw-thumb--${size} pw-thumb--img${stop.kind === 'unit' ? ' pw-thumb--unit' : ''}`} aria-hidden>
        <img src={src} alt="" loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`pw-thumb pw-thumb--${size}${stop.kind === 'unit' ? ' pw-thumb--unit' : ''}`} aria-hidden>
      <Icon name={stop.kind === 'unit' ? 'bed' : stopIconOf(stop.icon)} size={size === 'lg' ? 40 : size === 'md' ? 22 : 18} />
    </span>
  );
};

/** Whether the CMS has plotted the stop and joined it to a path (else no route can reach it and the map cannot show it). */
const onMap = (s: TourStopView): boolean => (s.unit ?? s.amenity)?.routable !== false;

const metaOf = (s: TourStopView, distances: Record<string, StopDistance>, mark: string) => {
  const tail = onMap(s) ? '' : ' · not on the map yet';
  if (s.kind === 'unit' && s.unit) {
    const f = unitFacts(s.unit, mark);
    return `${f.beds} · ${f.price} · ${f.availShort}${tail}`;
  }
  return `${s.floor || s.floorLabel} · ~${s.duration} min · ${distanceLabel(distances[s.node])}${tail}`;
};

/** The label of the "All floors" entry: the site plan when the property has one, else the whole stacked plate. */
const ALL = 'all';

/**
 * Build Your Tour: the property map (the real levels, with a pin on every
 * chosen stop), the All floors / floor selector, maximize, locate, "Your
 * Tour" grouped by building and floor, Add Stops with its filters, a stop
 * preview, and "Let's go!" which asks the backend for the tour route. The
 * four layouts of the design's `buildLayout` tweak: list + map (default),
 * map + cards, list / map tabs, and the floating list / map switch.
 */
export const BuildTourScreen = (p: Props) => {
  const { bundle, stops, distances, selected, layout, view, mark } = p;
  const chosen = stops.filter((s) => selected[s.node]);
  const unmapped = chosen.filter((s) => !onMap(s));
  const dwell = chosen.reduce((sum, s) => sum + s.duration, 0);
  // The estimate: the backend's route time for exactly these stops when it was calculated, else the dwell time alone.
  const minutes = p.routeMinutes != null ? p.routeMinutes : dwell;
  const canGenerate = chosen.length > 0;
  const groups = useMemo(() => groupStops(chosen), [chosen]);
  const tabbed = layout === 'tabs' || layout === 'switch';
  const tabMap = view.tab === 'map';
  const showMap = !tabbed || tabMap;
  const showList = layout !== 'mapCards' && !(tabbed && tabMap);
  const showCards = layout === 'mapCards' || (tabbed && tabMap);
  const mapHeight = view.expanded ? Math.max(360, Math.round((typeof window !== 'undefined' ? window.innerHeight : 800) * 0.62)) : layout === 'mapCards' ? 300 : tabbed ? 250 : 170;
  const [addOpen, setAddOpen] = useState(false);
  const [floorMenu, setFloorMenu] = useState(false);

  const options = floorOptions(bundle.levels);
  const sitemap = bundle.levels.find((l) => l.kind === 'sitemap') ?? null;
  const level = bundle.levels.find((l) => l.id === p.mapView?.level) ?? sitemap ?? bundle.levels[0];
  // `floor` null on a stacked plate = every floor of it ("All floors"); on the site plan there are no floors.
  const allFloors = p.mapView?.level === level.id ? p.mapView.floor == null : false;
  const floor = allFloors ? null : p.mapView?.level === level.id ? (p.mapView.floor ?? level.floors[0] ?? null) : (level.floors[0] ?? null);
  const offersAll = !!sitemap || bundle.levels.some((l) => l.floors.length > 1);
  const curLabel = allFloors && (level.kind === 'sitemap' || level.floors.length > 1) ? 'All floors' : (options.find((o) => o.level === level.id && (o.floor ?? null) === (floor ?? null))?.label ?? level.name.replace(/ \*$/, ''));
  const focus = view.focusNode ? stops.find((s) => s.node === view.focusNode) : null;
  const preview = view.previewNode ? stops.find((s) => s.node === view.previewNode) : null;

  const locate = (node: string) => {
    const at = levelOfStop(bundle, node);
    // The stop's own level and floor first (a stop on another floor switches the map), then centre and zoom.
    if (at && (at.level !== level.id || (at.floor != null && at.floor !== floor))) p.onMapView({ level: at.level, floor: at.floor });
    p.onView({ focusNode: node, previewNode: null, tab: 'map' });
  };

  const pickAll = () => {
    // "All floors": the site plan when the property has one; else the current stacked plate with every floor shown.
    const target = sitemap ?? (level.floors.length > 1 ? level : bundle.levels.find((l) => l.floors.length > 1) ?? level);
    p.onMapView({ level: target.id, floor: null });
    p.onView({ focusNode: null });
    setFloorMenu(false);
  };

  const pins = useMemo(() => stops.filter((s) => selected[s.node] || s.node === view.focusNode).map((s) => ({ node: s.node, on: !!selected[s.node], focus: s.node === view.focusNode, label: s.name })), [stops, selected, view.focusNode]);

  const map = showMap ? (
    <div className={`pw-build__mapwrap${view.expanded ? ' pw-build__mapwrap--big' : ''}`} style={{ zIndex: 4 }}>
      <div className="pw-build__map" style={{ height: mapHeight }}>
        <MapView level={level} floor={floor} nodes={bundle.graph.nodes} edges={bundle.graph.edges} units={bundle.units} amenities={bundle.amenities} highlight={{ from: p.startNode }} pins={pins} focusNode={view.focusNode} fitTo="all" fitKey={`build-${level.id}-${floor ?? 'all'}-${view.expanded ? 'big' : 'small'}`} onTapNode={(n) => p.onView({ focusNode: view.focusNode === n.id ? null : n.id })}>
          <button type="button" className="pw-build__size" aria-label={view.expanded ? 'Smaller map' : 'Bigger map'} onPointerDown={(e) => e.stopPropagation()} onClick={() => p.onView({ expanded: !view.expanded })}>
            <Icon name={view.expanded ? 'shrink' : 'expand'} size={13} strokeWidth={2.4} />
          </button>
          {options.length > 1 || offersAll ? (
            <div className="pw-build__floor" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="pw-build__floorbtn" onClick={() => setFloorMenu((v) => !v)} aria-expanded={floorMenu} aria-label="Choose floor">
                <Icon name="layers" size={12} strokeWidth={2.2} />
                {curLabel}
                <Icon name="chevronDown" size={11} strokeWidth={2.6} style={{ transform: floorMenu ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
              </button>
              {floorMenu ? (
                <div className="pw-build__floormenu" role="menu">
                  {offersAll ? (
                    <button type="button" role="menuitem" className={`pw-build__flooritem${allFloors ? ' pw-build__flooritem--on' : ''}`} onClick={pickAll}>
                      <span>All floors</span>
                      {chosen.length ? <b>{chosen.length}</b> : null}
                    </button>
                  ) : null}
                  {options.map((o) => {
                    const on = !allFloors && o.level === level.id && (o.floor ?? null) === (floor ?? null);
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
      {onMap(s) ? <IconButton icon="pin" label={`Show ${s.name} on map`} onClick={() => locate(s.node)} className="pw-build__iconbtn--primary" /> : null}
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
              {chosen.length} stops · ~{minutes} min{p.routeMinutes != null ? ' with walking' : ''}
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
        {unmapped.length ? <div className="pw-build__empty">{unmapped.map((s) => s.name).join(', ')} {unmapped.length === 1 ? 'is' : 'are'} not plotted on the map in Pynwheel yet, so the route will leave {unmapped.length === 1 ? 'it' : 'them'} out.</div> : null}
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
      <AddStopsSheet open={addOpen} bundle={bundle} stops={stops} selected={selected} distances={distances} mark={mark} onToggle={p.onToggle} onPreview={(node) => p.onView({ previewNode: node })} onClose={() => setAddOpen(false)} />
      {preview ? (
        <div className="pw-preview" onClick={() => p.onView({ previewNode: null })} role="presentation">
          <button type="button" className="pw-preview__close" aria-label="Close preview" onClick={() => p.onView({ previewNode: null })}>
            <Icon name="close" size={14} color="#fff" strokeWidth={2.4} />
          </button>
          <div className="pw-preview__pic" onClick={(e) => e.stopPropagation()} role="presentation">
            {(preview.kind === 'unit' ? (preview.unit?.media?.floorplanImage ?? preview.unit?.media?.image) : preview.amenity?.media?.image) ? (
              <img className="pw-preview__img" src={(preview.kind === 'unit' ? (preview.unit?.media?.floorplanImage ?? preview.unit?.media?.image) : preview.amenity?.media?.image) ?? undefined} alt={preview.name} />
            ) : (
              <StopThumb stop={preview} size="lg" />
            )}
            {preview.kind === 'amenity' && preview.amenity?.description ? <p>{preview.amenity.description}</p> : preview.kind === 'unit' && preview.unit?.description ? <p>{preview.unit.description}</p> : !(preview.unit?.media?.floorplanImage || preview.unit?.media?.image || preview.amenity?.media?.image) ? <p className="pw-preview__nophoto">No photo for this stop yet.</p> : null}
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
  bundle: PropertyBundle;
  stops: TourStopView[];
  selected: Record<string, boolean>;
  distances: Record<string, StopDistance>;
  mark: string;
  onToggle: (node: string) => void;
  onPreview: (node: string) => void;
  onClose: () => void;
}

/** The building a stop stands in, from its level (null on the site plan or when the level names none). */
const buildingOf = (bundle: PropertyBundle, s: TourStopView): string | null => {
  const at = levelOfStop(bundle, s.node);
  const level = at ? bundle.levels.find((l) => l.id === at.level) : null;
  return level?.building ?? s.unit?.building ?? s.amenity?.building ?? null;
};

/**
 * Whether a unit passes the "Available now" filter: only a unit the feed
 * marks available, and available today when it carries a date. A unit
 * without availability data never passes (a missing value is not "now").
 */
export const availableNow = (s: TourStopView): boolean => {
  const u = s.unit;
  if (!u) return false;
  if (u.availabilityKnown === false && !u.availableDate) return false;
  if (!u.available) return false;
  if (u.availableDate) return Date.parse(u.availableDate) <= Date.now();
  return true;
};

/** Add stops: search, All / Units / Amenities, building & floor chips, unit preferences, grouped rows with Add / Added. */
/** Mounted only while open, so the "already in your tour" baseline is taken fresh each time the sheet opens. */
const AddStopsSheet = (p: AddProps) => (p.open ? <AddStopsBody {...p} /> : null);

const AddStopsBody = ({ open, bundle, stops, selected, distances, mark, onToggle, onPreview, onClose }: AddProps) => {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'all' | 'units' | 'amenities'>('all');
  const [floor, setFloor] = useState(ALL);
  const [building, setBuilding] = useState(ALL);
  const [beds, setBeds] = useState<'any' | '0' | '1' | '2' | '3'>('any');
  const [availNow, setAvailNow] = useState(false);
  const [base] = useState<Record<string, boolean>>(() => ({ ...selected }));
  if (!open) return null;
  const buildings = [...new Set(stops.map((s) => buildingOf(bundle, s)).filter((b): b is string => !!b))];
  const floors = [...new Set(stops.filter((s) => building === ALL || buildingOf(bundle, s) === building).map((s) => s.floor).filter(Boolean))];
  const pool = stops.filter((s) => !base[s.node]);
  const query = q.trim().toLowerCase();
  const matches = (s: TourStopView) => {
    if (tab === 'units' && s.kind !== 'unit') return false;
    if (tab === 'amenities' && s.kind !== 'amenity') return false;
    if (building !== ALL && buildingOf(bundle, s) !== building) return false;
    if (floor !== ALL && s.floor !== floor) return false;
    if (query && !`${s.name} ${s.floor} ${s.floorLabel} ${s.unit?.unitType ?? ''} ${s.unit?.floorplanName ?? ''}`.toLowerCase().includes(query)) return false;
    if (s.kind === 'unit') {
      // A missing bedroom count never passes a bedroom filter; a missing availability never passes "Available now".
      if (beds !== 'any' && (s.unit?.bedrooms ?? -1) !== Number(beds)) return false;
      if (availNow && !availableNow(s)) return false;
    }
    return true;
  };
  const shown = pool.filter(matches);
  const groups = groupStops(shown);
  const added = pool.filter((s) => selected[s.node]).length;
  const filtered = !!query || tab !== 'all' || floor !== ALL || building !== ALL || beds !== 'any' || availNow;
  const hasBedData = stops.some((s) => s.unit?.bedrooms != null);
  const hasAvailData = stops.some((s) => s.unit && (s.unit.availabilityKnown !== false || s.unit.availableDate));
  const clear = () => {
    setQ('');
    setTab('all');
    setFloor(ALL);
    setBuilding(ALL);
    setBeds('any');
    setAvailNow(false);
  };
  return (
    <Sheet open onClose={onClose} size="tall" zIndex={320} className="pw-addstops" headerPadding="tight" testId="add-stops">
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
      {buildings.length > 1 || floors.length > 1 ? (
        <div className="pw-addstops__filters">
          <Eyebrow>Building &amp; floor</Eyebrow>
          <div className="pw-addstops__chips">
            <Chip size="sm" on={floor === ALL && building === ALL} onClick={() => {
              setFloor(ALL);
              setBuilding(ALL);
            }}>
              All
            </Chip>
            {buildings.length > 1
              ? buildings.map((b) => (
                  <Chip key={`b-${b}`} size="sm" on={building === b} onClick={() => {
                    setBuilding(building === b ? ALL : b);
                    setFloor(ALL);
                  }}>
                    {b}
                  </Chip>
                ))
              : null}
            {floors.length > 1
              ? floors.map((f) => (
                  <Chip key={f} size="sm" on={floor === f} onClick={() => setFloor(floor === f ? ALL : f)}>
                    {building !== ALL ? f.replace(`${building} · `, '') : f}
                  </Chip>
                ))
              : null}
          </div>
        </div>
      ) : null}
      {tab !== 'amenities' && (hasBedData || hasAvailData) ? (
        <div className="pw-addstops__filters">
          <Eyebrow>Unit preferences</Eyebrow>
          <div className="pw-addstops__chips">
            {hasBedData
              ? (['any', '0', '1', '2', '3'] as const).map((b) => (
                  <Chip key={b} size="sm" on={beds === b} onClick={() => setBeds(b)}>
                    {b === 'any' ? 'Any beds' : b === '0' ? 'Studio' : `${b} Bed`}
                  </Chip>
                ))
              : null}
            {hasAvailData ? (
              <Chip size="sm" on={availNow} onClick={() => setAvailNow((v) => !v)}>
                Available now
              </Chip>
            ) : null}
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
              <button type="button" className="pw-addstops__clear" onClick={clear}>
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
