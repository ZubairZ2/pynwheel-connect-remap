import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { levelDims, levelForUnit, type MapLevel } from './mapLevels.generator';
import { generatePinItems, unitLabel } from './mapNodes.generator';
import { pinKey, type AutoPlotReport, type LocalMapState, type PinOverride } from './mapState';
import { M, t } from './mapText';
import { i18n } from '~/resources/i18n';

/**
 * The legacy Auto Plot (`CommunitiesController#floorplate_auto_plot_units` →
 * `DwelloDevicesHelper#set_floorplate_markers_on_map`) sends the floor image
 * to AWS Textract, keeps the detected text boxes on the floorplate
 * (`map_ocr_data`), and then, for every box whose text is longer than two
 * characters, plots each still-unplotted unit whose marketing name contains
 * that text at `left × width, top × height` of the image. A later box that
 * also matches wins.
 *
 * This runs the same matching over the text boxes the CMS has already
 * stored, so the result is what the CMS would plot, without Textract and
 * without a write. Where a floorplate has no stored text the unit is
 * reported back; the CMS never auto-plots amenities.
 */
export const runLocalAutoPlot = (
  map: PropertyMap,
  levels: MapLevel[],
  state: LocalMapState
): { overrides: Record<string, PinOverride>; report: AutoPlotReport } => {
  const items = generatePinItems(map, levels, state).filter((item) => !item.placed);
  const overrides: Record<string, PinOverride> = {};
  const skipped: AutoPlotReport['skipped'] = [];

  items.forEach((item) => {
    if (item.kind === 'amenity') {
      skipped.push({ name: item.label, reason: i18n.t(M.autoPlot.reasonAmenity) });
      return;
    }
    const unit = map.inventory.units.find((row) => row.id === item.ref.id);
    if (!unit) return;
    const level = levelForUnit(levels, unit);
    if (!level) {
      skipped.push({ name: item.label, reason: t(M.autoPlot.reasonNoLevel, { floor: unit.floor ?? '—' }) });
      return;
    }
    const levelLabel = `${level.sub} · ${level.label}`;
    const boxes = map.graph.ocr[`${level.kind === 'sitemap' ? 'Sitemap' : 'Floorplate'}:${level.recordId}`] ?? [];
    const dims = levelDims(level, state);
    if (!boxes.length || !dims) {
      skipped.push({ name: item.label, reason: t(M.autoPlot.reasonNoOcr, { level: levelLabel }) });
      return;
    }
    const name = unit.marketingName ?? '';
    if (!name) {
      skipped.push({ name: item.label, reason: i18n.t(M.autoPlot.reasonNoName) });
      return;
    }
    let match: PinOverride | null = null;
    boxes.forEach((box) => {
      if (box.text.length > 2 && name.includes(box.text)) {
        match = { levelId: level.id, x: Math.round(box.left * dims.w), y: Math.round(box.top * dims.h) };
      }
    });
    if (match) overrides[pinKey(item.ref)] = match;
    else skipped.push({ name: unitLabel(unit), reason: t(M.autoPlot.reasonNoMatch, { name, level: levelLabel }) });
  });

  return { overrides, report: { placed: Object.keys(overrides).length, total: items.length, skipped } };
};
