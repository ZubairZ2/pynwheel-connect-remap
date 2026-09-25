import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';

/**
 * The placeholder marker: a small superscript asterisk on any information or
 * setting that is NOT read from the Pynwheel CMS database (demo seed data,
 * hard-coded counts, mock search results).
 *
 * Rule: when a screen or setting starts reading real data through a Rails
 * controller, delete its `<DemoMark />` (and the template's `demo` flag once
 * the whole screen is real). See context.md §15.
 */
export const DemoMark = () => (
  <sup className="bo-demomark" title={i18n.t(CORE_STRINGS.shared.placeholderTitle)} aria-label={i18n.t(CORE_STRINGS.shared.placeholderTitle)}>
    *
  </sup>
);
