import type { PayloadAction } from '@reduxjs/toolkit';

import type { AvailKey, SourceKind } from '~/core/models/data/connect/inventory.data';
import { plural, uid } from '~/core/utils/connect/format';
import { AMENITY_CATEGORIES } from '~/data/mock/core.mock';

import { curInv, curTour, levels } from '../demo.selectors';
import type { DemoState } from '../demo.state';

type Collection = 'units' | 'amenities' | 'floorplans' | 'elevators';

const ensureInv = (state: DemoState) => {
  if (!state.inv[state.propId]) {
    state.inv[state.propId] = { floorplans: [], units: [], amenities: [], elevators: [] };
  }
  return state.inv[state.propId];
};

/** Removes every tour stop promoted from an inventory record of this name. */
const dropStopsNamed = (state: DemoState, name: string) => {
  const tour = state.tours[state.propId];
  if (!tour) return false;
  const gone = tour.stops.filter((s) => s.name === name).map((s) => s.id);
  if (!gone.length) return false;
  tour.stops = tour.stops.filter((s) => gone.indexOf(s.id) < 0);
  tour.edges = tour.edges.filter((e) => gone.indexOf(e[0]) < 0 && gone.indexOf(e[1]) < 0);
  tour.published = false;
  return true;
};

/** Floorplans, units, amenities, elevators, floorplates and their galleries. */
export const inventoryReducers = {
  /* ---------- PMS source flags ---------- */

  toggleUnitSrc(
    state: DemoState,
    action: PayloadAction<{ id: string; field: 'price' | 'sqft' | 'avail' }>
  ) {
    const unit = ensureInv(state).units.find((u) => u.id === action.payload.id);
    if (!unit) return;
    const next: SourceKind = unit.src[action.payload.field] === 'manual' ? 'pms' : 'manual';
    unit.src[action.payload.field] = next;
    state.toast =
      next === 'manual'
        ? `${unit.name} · ${action.payload.field} is now a manual override and will survive the next PMS sync.`
        : `${unit.name} · ${action.payload.field} returns to provider control and will update on the next sync.`;
  },

  toggleFpSrc(
    state: DemoState,
    action: PayloadAction<{ id: string; field: 'rent' | 'deposit' | 'sqft' }>
  ) {
    const fp = ensureInv(state).floorplans.find((f) => f.id === action.payload.id);
    if (!fp) return;
    const next: SourceKind = fp.src[action.payload.field] === 'manual' ? 'pms' : 'manual';
    fp.src[action.payload.field] = next;
    const label = { rent: 'Rent', deposit: 'Deposit', sqft: 'Sq Ft' }[action.payload.field];
    state.toast =
      next === 'manual'
        ? `${label} is now a manual override — protected from the next sync.`
        : `${label} follows the PMS feed again.`;
  },

  resyncPms(state: DemoState) {
    const inv = ensureInv(state);
    const protectedCount = inv.units.reduce(
      (total, u) => total + Object.values(u.src).filter((v) => v === 'manual').length,
      0
    );
    inv.units.forEach((u) => {
      if (u.src.price === 'pms') u.price = Math.round((u.price * (1 + (Math.random() * 0.04 - 0.015))) / 5) * 5;
      if (u.src.avail === 'pms' && Math.random() < 0.2) u.avail = 'almost';
    });
    state.lastSync = 'just now';
    state.toast = `Sync complete · ${plural(protectedCount, 'override')} preserved.`;
  },

  setTermRate(
    state: DemoState,
    action: PayloadAction<{ fpId: string; term: number; value: number }>
  ) {
    const fp = ensureInv(state).floorplans.find((f) => f.id === action.payload.fpId);
    if (fp) fp.terms[action.payload.term] = action.payload.value;
  },

  /* ---------- unit fields ---------- */

  setUnitField(
    state: DemoState,
    action: PayloadAction<{ id: string; field: 'name' | 'price' | 'sqft' | 'floor' | 'building'; value: string }>
  ) {
    const unit = ensureInv(state).units.find((u) => u.id === action.payload.id);
    if (!unit) return;
    const { field, value } = action.payload;
    if (field === 'price' || field === 'sqft') {
      unit[field] = parseInt(value.replace(/[^0-9]/g, ''), 10) || 0;
      unit.src[field] = 'manual';
    } else {
      unit[field] = value;
    }
  },

  setUnitAvail(state: DemoState, action: PayloadAction<{ id: string; value: AvailKey }>) {
    const unit = ensureInv(state).units.find((u) => u.id === action.payload.id);
    if (!unit) return;
    unit.avail = action.payload.value;
    unit.src.avail = 'manual';
    state.toast = 'Availability overridden manually — the next PMS sync will not change it.';
  },

  /* ---------- galleries ---------- */

  moveGalleryPhoto(
    state: DemoState,
    action: PayloadAction<{ kind: Collection; id: string; index: number; dir: number }>
  ) {
    const { kind, id, index, dir } = action.payload;
    const item = ensureInv(state)[kind].find((x) => x.id === id);
    if (!item) return;
    const to = index + dir;
    if (to < 0 || to >= item.gallery.length) return;
    const tmp = item.gallery[index];
    item.gallery[index] = item.gallery[to];
    item.gallery[to] = tmp;
    state.toast = 'Photo order updated.';
  },

  addGalleryPhoto(state: DemoState, action: PayloadAction<{ kind: Collection; id: string }>) {
    const item = ensureInv(state)[action.payload.kind].find((x) => x.id === action.payload.id);
    if (!item) return;
    item.gallery.push(item.gallery.length % 2 ? 'pool' : 'thumb');
    state.toast = 'Photo added to gallery.';
  },

  removeGalleryPhoto(
    state: DemoState,
    action: PayloadAction<{ kind: Collection; id: string; index: number }>
  ) {
    const item = ensureInv(state)[action.payload.kind].find((x) => x.id === action.payload.id);
    if (!item) return;
    item.gallery = item.gallery.filter((_, i) => i !== action.payload.index);
    state.toast = 'Photo removed.';
  },

  /* ---------- floorplans ---------- */

  saveFloorplan(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a floor plan name.';
      return;
    }
    const inv = ensureInv(state);
    const beds = parseInt(form.beds, 10) || 0;
    const baths = parseInt(form.baths, 10) || 1;
    const sqft = parseInt(form.sqft, 10) || 0;
    const rent = parseInt(form.price, 10) || 0;
    const terms = { 6: Math.round(rent * 1.09), 12: rent, 18: Math.round(rent * 0.965) };

    if (state.editingId) {
      const fp = inv.floorplans.find((x) => x.id === state.editingId);
      if (fp) {
        Object.assign(fp, {
          name: form.name,
          beds,
          baths,
          sqft,
          rent,
          status: form.fstatus as AvailKey,
          terms
        });
      }
      state.toast = `${form.name} updated.`;
    } else {
      const id = uid('fp');
      inv.floorplans.push({
        id,
        name: form.name,
        beds,
        baths,
        sqft,
        rent,
        deposit: 0,
        status: (form.fstatus as AvailKey) ?? 'available',
        tourUrl: form.btnUrl || `tours.pynwheel.com/${id}`,
        terms,
        gallery: [],
        src: { rent: 'manual', deposit: 'manual', sqft: 'manual' }
      });
      state.toast = `${form.name} added — all fields are manual until a PMS sync matches it.`;
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  removeFloorplan(state: DemoState, action: PayloadAction<string>) {
    const inv = ensureInv(state);
    const fp = inv.floorplans.find((x) => x.id === action.payload);
    inv.floorplans = inv.floorplans.filter((x) => x.id !== action.payload);
    state.toast = `${fp?.name ?? 'Floorplan'} deleted.`;
  },

  /* ---------- units ---------- */

  saveUnit(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter a unit number.';
      return;
    }
    const inv = ensureInv(state);
    const fp = inv.floorplans.find((x) => x.name === form.ufp);
    const level =
      levels(state).find((l) => `${l.floor} · ${l.building}` === form.ulevel) ?? levels(state)[0];
    const price = parseInt(form.price, 10) || 0;
    const sqft = parseInt(form.sqft, 10) || 0;

    if (state.editingId) {
      const unit = inv.units.find((u) => u.id === state.editingId);
      if (unit) {
        Object.assign(unit, {
          name: form.name,
          fpId: fp ? fp.id : unit.fpId,
          price,
          sqft,
          floor: form.ufloor,
          building: form.ubuilding,
          avail: form.uavail as AvailKey,
          level: level ? level.id : unit.level
        });
      }
      state.toast = `${form.name} updated.`;
    } else {
      inv.units.push({
        id: uid('u'),
        name: form.name,
        fpId: fp ? fp.id : '',
        price,
        sqft,
        floor: form.ufloor,
        building: form.ubuilding,
        avail: (form.uavail as AvailKey) ?? 'available',
        level: level ? level.id : '',
        plotted: false,
        gallery: [],
        src: { price: 'manual', sqft: 'manual', avail: 'manual' }
      });
      state.toast = `${form.name} added — plot it on Map & Plotting to put it on the map.`;
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  removeUnit(state: DemoState, action: PayloadAction<string>) {
    const inv = ensureInv(state);
    const unit = inv.units.find((x) => x.id === action.payload);
    if (!unit) return;
    inv.units = inv.units.filter((x) => x.id !== action.payload);
    const stopped = dropStopsNamed(state, unit.name);
    if (state.unitId === action.payload) state.unitId = null;
    state.toast = `${unit.name} deleted${stopped ? ' · its tour stop was removed too.' : '.'}`;
  },

  massOverrideUnits(state: DemoState, action: PayloadAction<{ ids: string[]; action: string }>) {
    const inv = ensureInv(state);
    const { ids, action: act } = action.payload;
    inv.units.forEach((u) => {
      if (ids.indexOf(u.id) < 0) return;
      if (act === 'protect') u.src.price = 'manual';
      if (act === 'release') u.src.price = 'pms';
      if (act === 'availYes') {
        u.avail = 'available';
        u.src.avail = 'manual';
      }
      if (act === 'availNo') {
        u.avail = 'sold';
        u.src.avail = 'manual';
      }
    });
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `Applied to ${plural(ids.length, 'unit')}.`;
  },

  /* ---------- amenities ---------- */

  saveAmenity(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.name ?? '').trim()) {
      state.toast = 'Enter an amenity name.';
      return;
    }
    const inv = ensureInv(state);
    const level =
      levels(state).find((l) => `${l.floor} · ${l.building}` === form.alevel) ?? levels(state)[0];

    if (state.editingId) {
      const amenity = inv.amenities.find((a) => a.id === state.editingId);
      if (amenity) {
        amenity.name = form.name;
        amenity.category = form.acat;
        amenity.level = level ? level.id : amenity.level;
      }
      state.toast = `${form.name} updated.`;
    } else {
      inv.amenities.push({
        id: uid('am'),
        name: form.name,
        category: form.acat || AMENITY_CATEGORIES[0],
        level: level ? level.id : '',
        gallery: [],
        plotted: false
      });
      state.toast = `${form.name} added — plot it on Map & Plotting to put it on the map.`;
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  removeAmenity(state: DemoState, action: PayloadAction<string>) {
    const inv = ensureInv(state);
    const amenity = inv.amenities.find((x) => x.id === action.payload);
    if (!amenity) return;
    inv.amenities = inv.amenities.filter((x) => x.id !== action.payload);
    const stopped = dropStopsNamed(state, amenity.name);
    state.toast = `${amenity.name} deleted${stopped ? ' · its tour stop was removed too.' : '.'}`;
  },

  setAmenityCategory(state: DemoState, action: PayloadAction<{ id: string; value: string }>) {
    const amenity = ensureInv(state).amenities.find((a) => a.id === action.payload.id);
    if (!amenity) return;
    amenity.category = action.payload.value;
    state.toast = `Category updated to ${action.payload.value}.`;
  },

  /* ---------- elevators ---------- */

  saveElevator(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.ename ?? '').trim()) {
      state.toast = 'Enter a bank name.';
      return;
    }
    const gated = form.egated === 'Yes';
    ensureInv(state).elevators.push({
      id: uid('ev'),
      name: form.ename,
      building: form.ebuilding,
      floorFrom: form.efrom || 'Lobby',
      floorTo: form.eto || 'Top Floor',
      gallery: [],
      lockGated: gated,
      vendor: gated ? 'Latch' : ''
    });
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.ename} added.`;
  },

  removeElevator(state: DemoState, action: PayloadAction<string>) {
    const inv = ensureInv(state);
    const elevator = inv.elevators.find((x) => x.id === action.payload);
    if (!elevator) return;
    inv.elevators = inv.elevators.filter((x) => x.id !== action.payload);
    state.toast = `${elevator.name} removed.`;
  },

  toggleElevatorLock(state: DemoState, action: PayloadAction<string>) {
    const elevator = ensureInv(state).elevators.find((x) => x.id === action.payload);
    if (!elevator) return;
    const wasGated = elevator.lockGated;
    elevator.lockGated = !wasGated;
    elevator.vendor = wasGated ? '' : elevator.vendor || 'Latch';
    state.toast = wasGated
      ? `${elevator.name} no longer requires a smart-lock grant.`
      : `${elevator.name} now requires a smart-lock grant during tours.`;
  },

  /* ---------- floorplates (levels) ---------- */

  saveFloorplate(state: DemoState, action: PayloadAction<{ label: string }>) {
    const form = state.form as Record<string, string>;
    const manual = form.fpOverride === 'Yes';
    const id = state.editingId ?? uid('lv');
    const patch = {
      building: form.fbuilding,
      floor: action.payload.label,
      range: form.fpRange,
      manualName: manual,
      showFloorName: !!state.form.fpAddName
    };

    state.lvBg[id] = form.fpImg || '';
    state.lvSvg[id] = form.fpSvg || '';

    if (state.editingId) {
      state.levelEdits[id] = patch;
      state.toast = `${action.payload.label} updated.`;
    } else {
      const list = state.extraLevels[state.propId] ?? [];
      list.push({ id, plan: 'None', file: '', ...patch });
      state.extraLevels[state.propId] = list;
      state.toast = `${action.payload.label} added to ${form.fbuilding}.`;
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  removeFloorplate(state: DemoState, action: PayloadAction<string>) {
    const level = levels(state).find((l) => l.id === action.payload);
    const inv = ensureInv(state);
    const affected = [...inv.units, ...inv.amenities].filter(
      (o) => (o.plevel ?? o.level) === action.payload
    ).length;
    const fallback = levels(state).find((l) => l.id !== action.payload)?.id ?? '';

    const release = <T extends { plevel?: string; level: string; plotted?: boolean; px?: number; py?: number }>(
      item: T
    ) => {
      if ((item.plevel ?? item.level) !== action.payload) return;
      item.plotted = false;
      item.px = undefined;
      item.py = undefined;
      item.plevel = undefined;
      item.level = fallback;
    };
    inv.units.forEach(release);
    inv.amenities.forEach(release);

    const hidden = state.hiddenLevels[state.propId] ?? [];
    hidden.push(action.payload);
    state.hiddenLevels[state.propId] = hidden;

    state.toast = `${level?.floor ?? 'Floorplate'} deleted · ${plural(affected, 'item')} returned to the unplotted list.`;
  },

  /* ---------- tour stops promoted from inventory ---------- */

  saveStop(state: DemoState, action: PayloadAction<{ icon: string; floorLabel: string; levelId: string; beds?: number }>) {
    const form = state.form as Record<string, string>;
    const tour = state.tours[state.propId];
    if (!tour) return;

    if (state.editingId) {
      if (!(form.name ?? '').trim()) {
        state.toast = 'Enter a stop name.';
        return;
      }
      const stop = tour.stops.find((s) => s.id === state.editingId);
      if (stop) {
        stop.name = form.name;
        stop.floorLabel = form.floorLabel;
        stop.distance = parseInt(form.distance, 10) || 0;
        stop.duration = parseInt(form.duration, 10) || 0;
        stop.talkingPoint = form.talkingPoint;
      }
      tour.published = false;
      state.toast = 'Stop updated.';
    } else {
      const inv = curInv(state);
      const unit = inv.units.find((u) => u.name === form.source);
      const amenity = inv.amenities.find((a) => a.name === form.source);
      const item = unit ?? amenity;
      if (!item) {
        state.toast = 'Pick a unit or amenity to promote.';
        return;
      }
      tour.stops.push({
        id: uid('s'),
        name: item.name,
        type: unit ? 'unit' : 'amenity',
        icon: action.payload.icon,
        level: action.payload.levelId,
        beds: action.payload.beds,
        floorLabel: action.payload.floorLabel,
        distance: 40 + Math.round(Math.random() * 180),
        duration: parseInt(form.duration, 10) || 3,
        talkingPoint: form.talkingPoint || '',
        x: typeof item.px === 'number' ? item.px : 20 + Math.random() * 60,
        y: typeof item.py === 'number' ? item.py : 20 + Math.random() * 55
      });
      tour.published = false;
      state.toast = item.plotted
        ? `${item.name} added as a tour stop.`
        : `${item.name} added — plot it on Map & Plotting to fix its position.`;
    }

    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  setStopTalkingPoint(state: DemoState, action: PayloadAction<{ id: string; value: string }>) {
    const tour = curTour(state);
    const stop = state.tours[state.propId]?.stops.find((s) => s.id === action.payload.id);
    if (!stop || !tour) return;
    stop.talkingPoint = action.payload.value;
    state.tours[state.propId].published = false;
  },

  removeStop(state: DemoState, action: PayloadAction<string>) {
    const tour = state.tours[state.propId];
    if (!tour) return;
    tour.stops = tour.stops.filter((s) => s.id !== action.payload);
    tour.edges = tour.edges.filter((e) => e[0] !== action.payload && e[1] !== action.payload);
    tour.published = false;
    state.toast = 'Stop removed.';
  },

  moveStop(state: DemoState, action: PayloadAction<{ id: string; dir: number }>) {
    const tour = state.tours[state.propId];
    if (!tour) return;
    const from = tour.stops.findIndex((s) => s.id === action.payload.id);
    const to = from + action.payload.dir;
    if (from < 0 || to < 0 || to >= tour.stops.length) return;
    const tmp = tour.stops[from];
    tour.stops[from] = tour.stops[to];
    tour.stops[to] = tmp;
    tour.published = false;
  }
};
