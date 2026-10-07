/**
 * DUMMY DATA — the single entry point. Only `DummyTourRepository` imports
 * this module; screens and hooks never do (they depend on the repository
 * interface), so swapping in the real API provider touches no UI code.
 *
 * `*` on a value shown to the visitor means "dummy / demo data, not read
 * from the Pynwheel backend".
 */

export { buildDummyProperty, type DummyProperty } from './buildGraph';
export {
  APP_VERSION,
  AR_INIT_LABELS,
  BEST_MATCH_PERCENT,
  BEST_MATCH_REASONS,
  BOOKING_DAYS,
  BOOKING_TIMES,
  CONCIERGE_ANSWERS,
  CONCIERGE_FALLBACK,
  CONCIERGE_GREETING_GENERAL,
  CONCIERGE_GREETING_STOP,
  CONCIERGE_HUMAN_REPLY,
  CONCIERGE_PROMPTS,
  FIRST_NAME,
  HELP_ITEMS,
  HI_RISE_LISTINGS,
  NEARBY_PROPERTIES,
  ONBOARDING_SLIDES,
  SUPPORT_EMAIL,
  TOUR_HISTORY,
  VISITOR
} from './content.dummy';
