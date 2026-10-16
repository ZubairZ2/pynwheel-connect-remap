import 'server-only';

import { parsePropertyDetail } from '~/core/repository/parser/property.parser';
import { fetchPropertyDetail } from '~/core/repository/remote/api/properties.api';
import { SEED_PROPS } from '~/data/mock/core.mock';

export type PropertyCrumbLoad =
  | { status: 'found'; name: string; demo: boolean }
  | { status: 'missing' }
  | { status: 'unauthorized' }
  | { status: 'failed' };

const REAL_ID = /^\d+$/;

/**
 * The property's name for a property-scoped page's breadcrumb. A numeric id
 * is a community (communities#edit.json, the same read Property Detail
 * makes); a slug is one of the demo data set's properties.
 */
export const loadPropertyCrumb = async (cookie: string | null, propId: string): Promise<PropertyCrumbLoad> => {
  if (!REAL_ID.test(propId)) {
    const demo = SEED_PROPS.find((prop) => prop.id === propId);
    return demo ? { status: 'found', name: demo.name, demo: true } : { status: 'missing' };
  }

  const response = await fetchPropertyDetail(cookie, Number(propId));
  if (response.status === 401 || response.status === 302) return { status: 'unauthorized' };
  if (response.status === 404) return { status: 'missing' };
  if (!response.ok) return { status: 'failed' };
  const property = parsePropertyDetail(response.body);
  return property ? { status: 'found', name: property.name, demo: false } : { status: 'failed' };
};
