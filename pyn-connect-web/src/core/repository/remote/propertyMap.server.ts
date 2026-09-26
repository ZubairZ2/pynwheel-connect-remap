import 'server-only';

import type { PropertyMap } from '~/core/models/data/propertyMap.data';
import { parseWayfindingGraph } from '~/core/repository/parser/wayfinding.parser';
import { loadPropertyInventory } from './propertyInventory.server';
import { fetchWayfindingGraph } from './api/wayfinding.api';

export type PropertyMapLoad =
  | { status: 'found'; map: PropertyMap }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

/**
 * Everything the Map & Plotting screen draws, fetched together: the property's
 * inventory (floor plates are the maps; units and amenities are the pins) and
 * the wayfinding graph the legacy Auto Wayfinding page reads.
 *
 * The statuses follow the inventory loader: 401 is a sign-out, a 302 or a 404
 * on any listing reads as "not found", anything else that is not a 200 is a
 * failure.
 */
export const loadPropertyMap = async (cookie: string | null, id: number): Promise<PropertyMapLoad> => {
  const [inventory, graph] = await Promise.all([loadPropertyInventory(cookie, id), fetchWayfindingGraph(cookie, id)]);

  if (inventory.status === 'unauthorized' || graph.status === 401) return { status: 'unauthorized' };
  if (inventory.status === 'missing' || graph.status === 302 || graph.status === 404) return { status: 'missing' };
  if (inventory.status !== 'found' || !graph.ok || graph.body == null) return { status: 'failed' };

  const parsed = parseWayfindingGraph(graph.body);
  if (!parsed) return { status: 'failed' };

  return { status: 'found', map: { inventory: inventory.inventory, graph: parsed } };
};
