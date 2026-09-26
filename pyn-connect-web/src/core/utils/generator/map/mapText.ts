import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { t } from '../inventory/inventoryText';

/** Wording shared by the Map & Plotting generators. */
export const M = CORE_STRINGS.mapPlotting;

export { t };

/** "1 pin", "12 pins". */
export const plural = (count: number, one: string, many: string): string =>
  `${count.toLocaleString('en-US')} ${i18n.t(count === 1 ? one : many)}`;

/** "Studio" / "2 Bed", from a floor plan's bedroom count. */
export const bedsLabel = (beds: number | null): string =>
  beds == null || beds <= 0 ? i18n.t(M.pin.studio) : t(M.pin.beds, { count: Math.trunc(beds) });

/** "48%, 48%", the way the design and the Unit Detail page print a pin. */
export const coordText = (xPct: number, yPct: number): string => `${Math.round(xPct)}%, ${Math.round(yPct)}%`;
