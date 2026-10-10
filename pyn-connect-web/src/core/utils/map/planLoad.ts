import { i18n } from '~/resources/i18n';
import type { PlanLoadError, PlanLoadFailure } from '~/core/utils/generator/map/mapState';
import { parseViewBox, type SvgViewBox } from './floorSvg';
import { M, t } from '~/core/utils/generator/map/mapText';

/**
 * Reading a plan file (a floor SVG, the shared background) through this
 * app's `plan-svg` route, and saying what went wrong when it did not load.
 * The route answers a failure as JSON (`{ ok: false, error, status, file,
 * host }`); anything else that fails is the request itself.
 */

const FAILURES: PlanLoadFailure[] = ['missing', 'unauthorized', 'listing', 'upstream', 'timeout', 'network', 'not-svg', 'invalid', 'no-size', 'fetch'];

/** The reason behind a failed plan request: the route's own, else the bare HTTP status. */
export const planError = async (response: Response): Promise<PlanLoadError> => {
  try {
    const body = (await response.json()) as { error?: unknown; status?: unknown; file?: unknown; host?: unknown } | null;
    if (body && typeof body.error === 'string' && (FAILURES as string[]).includes(body.error)) {
      return {
        reason: body.error as PlanLoadFailure,
        status: typeof body.status === 'number' ? body.status : response.status,
        file: typeof body.file === 'string' ? body.file : null,
        host: typeof body.host === 'string' ? body.host : null
      };
    }
  } catch {
    // not JSON: the status alone says what happened
  }
  return { reason: 'fetch', status: response.status, file: null, host: null };
};

/** A failure of the browser's own reading of the file: parsing (`measureFloorSvg`), or the request. */
export const localPlanError = (error: unknown, file: string | null): PlanLoadError => {
  const message = error instanceof Error ? error.message : String(error);
  const reason: PlanLoadFailure = /no size/i.test(message) ? 'no-size' : /not an SVG/i.test(message) ? 'invalid' : 'fetch';
  return { reason, status: null, file, host: null };
};

/** The root viewBox (else width / height) of SVG text, or null when it declares none or is not an SVG document. */
export const svgViewBoxOf = (text: string): SvgViewBox | null => {
  const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = parsed.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || parsed.querySelector('parsererror')) return null;
  return parseViewBox(root);
};

/** The failure in words, for the canvas: which file, which store, what it answered. */
export const planErrorText = (error: PlanLoadError): string => {
  const file = error.file ?? i18n.t(M.plan.theFile);
  const host = error.host ?? i18n.t(M.plan.theStore);
  const status = error.status != null ? String(error.status) : '?';
  switch (error.reason) {
    case 'upstream':
      return t(M.plan.errorUpstream, { status, file, host });
    case 'not-svg':
      return t(M.plan.errorNotSvg, { file, host });
    case 'timeout':
      return t(M.plan.errorTimeout, { host });
    case 'network':
      return t(M.plan.errorNetwork, { host });
    case 'missing':
      return i18n.t(M.plan.errorMissing);
    case 'unauthorized':
      return i18n.t(M.plan.errorUnauthorized);
    case 'listing':
      return t(M.plan.errorListing, { status });
    case 'invalid':
      return t(M.plan.errorInvalid, { file });
    case 'no-size':
      return t(M.plan.errorNoSize, { file });
    default:
      return t(M.plan.errorFetch, { status });
  }
};
