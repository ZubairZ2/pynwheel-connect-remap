import type { PayloadAction } from '@reduxjs/toolkit';

import type { PageTypeKey } from '~/core/models/data/connect/content.data';
import { uid } from '~/core/utils/connect/format';
import { STARTER_THEMES } from '~/data/mock/branding.mock';

import { curCfg } from '../demo.selectors';
import type { CropRect, DemoState } from '../demo.state';

const PAGE_TYPE_OF: Record<string, PageTypeKey> = {
  'Embedded Page': 'embed',
  'External Link': 'link',
  'Image Gallery': 'gallery',
  Slideshow: 'slideshow'
};

/** Branding, logo cropping, kickoff, content pages, tiles, brochure, neighborhood. */
export const contentReducers = {
  /* ---------- theme ---------- */

  patchTheme(state: DemoState, action: PayloadAction<Record<string, string | number | boolean>>) {
    const theme = state.themes[state.propId];
    if (!theme) return;
    Object.assign(theme, action.payload);
  },

  applyStarterTheme(state: DemoState, action: PayloadAction<string>) {
    const starter = STARTER_THEMES.find((t) => t.id === action.payload);
    const theme = state.themes[state.propId];
    if (!starter || !theme) return;
    theme.theme = starter.id;
    theme.primary = starter.primary;
    theme.secondary = starter.secondary;
    theme.markerColor = starter.primary;
    state.toast = `${starter.name} applied.`;
  },

  /* ---------- logo crop ---------- */

  openCrop(state: DemoState, action: PayloadAction<{ which: string; alreadySet: boolean }>) {
    state.cropOpen = true;
    state.cropWhich = action.payload.which;
    state.cropRect = state.logoCrops[state.propId]?.[action.payload.which] ?? {
      x: 12,
      y: 18,
      w: 76,
      h: 58
    };
    state.toast = action.payload.alreadySet
      ? `Re-crop ${action.payload.which} logo.`
      : `${state.propId}-${action.payload.which}-logo.png uploaded — set the crop area.`;
  },

  closeCrop(state: DemoState) {
    state.cropOpen = false;
    state.cropWhich = '';
  },

  setCropRect(state: DemoState, action: PayloadAction<CropRect>) {
    state.cropRect = action.payload;
  },

  confirmCrop(state: DemoState) {
    const which = state.cropWhich;
    const rect = state.cropRect;
    const crops = state.logoCrops[state.propId] ?? {};
    crops[which] = rect;
    state.logoCrops[state.propId] = crops;

    const theme = state.themes[state.propId];
    if (theme) {
      if (which === 'primary') theme.logoPrimary = true;
      else theme.logoSecondary = true;
    }

    state.cropOpen = false;
    state.cropWhich = '';
    state.toast = `${which === 'primary' ? 'Primary' : 'Secondary'} logo cropped to ${Math.round(
      rect.w
    )}% × ${Math.round(rect.h)}% — live on every surface.`;
  },

  clearLogo(state: DemoState, action: PayloadAction<string>) {
    const theme = state.themes[state.propId];
    if (!theme) return;
    if (action.payload === 'primary') theme.logoPrimary = false;
    else theme.logoSecondary = false;
    state.toast = 'Logo removed.';
  },

  /* ---------- design kickoff ---------- */

  openKickoff(state: DemoState) {
    state.kickoffOpen = true;
  },

  closeKickoff(state: DemoState) {
    state.kickoffOpen = false;
  },

  setKickoffPalette(state: DemoState, action: PayloadAction<string>) {
    state.koPalette = action.payload;
  },

  setKickoffDirection(state: DemoState, action: PayloadAction<string>) {
    state.koDirection = action.payload;
  },

  uploadMoodboard(state: DemoState) {
    state.koMood = true;
    state.toast = 'Moodboard uploaded.';
  },

  submitKickoff(state: DemoState) {
    const starter = STARTER_THEMES.find((t) => t.primary === state.koPalette) ?? STARTER_THEMES[0];
    const theme = state.themes[state.propId];
    if (theme) {
      theme.kickoff = true;
      theme.primary = state.koPalette;
      theme.markerColor = state.koPalette;
      theme.theme = starter.id;
    }
    state.kickoffOpen = false;
    state.koMood = false;
    state.koDirection = '';
    state.toast = 'Design direction submitted — the theme is ready to build out.';
  },

  /* ---------- content pages ---------- */

  savePage(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.title ?? '').trim()) {
      state.toast = 'Enter a page title.';
      return;
    }
    const list = state.pages[state.propId] ?? [];
    const record = {
      title: form.title,
      type: PAGE_TYPE_OF[form.ptype] ?? 'embed',
      detail: form.detail || '—',
      onHome: form.onHome === 'Yes'
    };

    if (state.editingId) {
      const index = list.findIndex((p) => p.id === state.editingId);
      if (index >= 0) list[index] = { ...list[index], ...record };
      state.toast = 'Page updated.';
    } else {
      list.push({ id: uid('p'), ...record });
      state.toast = `"${form.title}" added.`;
    }

    state.pages[state.propId] = list;
    state.modal = null;
    state.form = {};
    state.editingId = null;
  },

  removePage(state: DemoState, action: PayloadAction<string>) {
    const list = state.pages[state.propId] ?? [];
    const page = list.find((p) => p.id === action.payload);
    state.pages[state.propId] = list.filter((p) => p.id !== action.payload);
    state.toast = `${page?.title ?? 'Page'} deleted.`;
  },

  togglePageHome(state: DemoState, action: PayloadAction<string>) {
    const page = state.pages[state.propId]?.find((p) => p.id === action.payload);
    if (page) page.onHome = !page.onHome;
  },

  movePage(state: DemoState, action: PayloadAction<{ id: string; dir: number }>) {
    const list = state.pages[state.propId];
    if (!list) return;
    const from = list.findIndex((p) => p.id === action.payload.id);
    const to = from + action.payload.dir;
    if (from < 0 || to < 0 || to >= list.length) return;
    const tmp = list[from];
    list[from] = list[to];
    list[to] = tmp;
  },

  /* ---------- homepage tiles ---------- */

  saveTile(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.label ?? '').trim()) {
      state.toast = 'Enter a tile label.';
      return;
    }
    const list = state.tiles[state.propId] ?? [];
    list.push({ id: uid('t'), label: form.label, icon: form.icon, cropped: false });
    state.tiles[state.propId] = list;
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.label} tile added — crop its artwork to publish it.`;
  },

  removeTile(state: DemoState, action: PayloadAction<string>) {
    const list = state.tiles[state.propId] ?? [];
    const tile = list.find((t) => t.id === action.payload);
    state.tiles[state.propId] = list.filter((t) => t.id !== action.payload);
    state.toast = `${tile?.label ?? 'Tile'} tile removed.`;
  },

  moveTile(state: DemoState, action: PayloadAction<{ id: string; dir: number }>) {
    const list = state.tiles[state.propId];
    if (!list) return;
    const from = list.findIndex((t) => t.id === action.payload.id);
    const to = from + action.payload.dir;
    if (from < 0 || to < 0 || to >= list.length) return;
    const tmp = list[from];
    list[from] = list[to];
    list[to] = tmp;
  },

  cropTile(state: DemoState, action: PayloadAction<string>) {
    const tile = state.tiles[state.propId]?.find((t) => t.id === action.payload);
    if (tile) tile.cropped = true;
    state.toast = 'Tile artwork cropped.';
  },

  /* ---------- eBrochure link buttons ---------- */

  saveLinkButton(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.label ?? '').trim()) {
      state.toast = 'Enter a button label.';
      return;
    }
    const list = state.brochure[state.propId] ?? [];
    list.push({ id: uid('l'), label: form.label, url: form.url || '—', on: true });
    state.brochure[state.propId] = list;
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.label} button added to the brochure.`;
  },

  removeLinkButton(state: DemoState, action: PayloadAction<string>) {
    const list = state.brochure[state.propId] ?? [];
    const link = list.find((l) => l.id === action.payload);
    state.brochure[state.propId] = list.filter((l) => l.id !== action.payload);
    state.toast = `${link?.label ?? 'Button'} button deleted.`;
  },

  toggleLinkButton(state: DemoState, action: PayloadAction<string>) {
    const link = state.brochure[state.propId]?.find((l) => l.id === action.payload);
    if (link) link.on = !link.on;
  },

  /* ---------- neighborhood ---------- */

  patchHood(state: DemoState, action: PayloadAction<Record<string, string | number | string[]>>) {
    const hood = state.hood[state.propId];
    if (!hood) return;
    Object.assign(hood, action.payload);
  },

  toggleHoodCategory(state: DemoState, action: PayloadAction<string>) {
    const hood = state.hood[state.propId];
    if (!hood) return;
    hood.cats = hood.cats.includes(action.payload)
      ? hood.cats.filter((c) => c !== action.payload)
      : [...hood.cats, action.payload];
  },

  refreshPoi(state: DemoState) {
    const hood = state.hood[state.propId];
    if (!hood) return;
    if (hood.calls >= 400) {
      state.toast = 'Quota exceeded (400 calls) — neighborhood lookups are throttled for this property.';
      return;
    }
    hood.calls += 12;
    state.toast = 'Refreshed points of interest — 12 API calls used.';
  },

  /* ---------- eBrochure copy ---------- */

  patchBrochureConfig(state: DemoState, action: PayloadAction<Record<string, string | string[]>>) {
    const cfg = state.brochureCfg[state.propId];
    if (!cfg) return;
    Object.assign(cfg, action.payload);
  },

  addBcc(state: DemoState, action: PayloadAction<string>) {
    const cfg = state.brochureCfg[state.propId];
    if (!cfg) return;
    cfg.bcc.push(action.payload);
    state.toast = 'BCC recipient added.';
  },

  saveBccModal(state: DemoState) {
    const form = state.form as Record<string, string>;
    if (!(form.email ?? '').includes('@')) {
      state.toast = 'Enter a valid email address.';
      return;
    }
    const cfg = curCfg(state);
    if (cfg) cfg.bcc.push(form.email);
    state.modal = null;
    state.form = {};
    state.editingId = null;
    state.toast = `${form.email} added as a BCC recipient.`;
  },

  removeBcc(state: DemoState, action: PayloadAction<string>) {
    const cfg = state.brochureCfg[state.propId];
    if (!cfg) return;
    cfg.bcc = cfg.bcc.filter((address) => address !== action.payload);
  }
};
