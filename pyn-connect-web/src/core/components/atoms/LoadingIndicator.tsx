import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';

/**
 * - `page`: a route while its data loads (`loading.tsx`): a fixed veil that mildly dims the whole
 *   screen, the animation at its exact centre — what the legacy `.divLoading` overlay did.
 * - `block`: a section or panel body.
 * - `inline`: a row next to text (a button's pending state, a wizard note).
 * - `cover`: a stage the indicator lays over with the same veil and centring (the image viewer, the map canvas).
 * - `overlay`: a small thumbnail; the animation only, over a light veil.
 */
export type LoadingVariant = 'page' | 'block' | 'inline' | 'cover' | 'overlay';

interface Props {
  /** What is loading; read by screen readers and shown under the animation. */
  label?: string;
  variant?: LoadingVariant;
  className?: string;
}

/**
 * The CMS's own loading animation — the cat playing with a Pynwheel pinwheel
 * (`app/assets/images/loader.gif`, the file behind the legacy `.divLoading`,
 * `.mapLoading` and `.modal-loader` overlays) — presented the Connect way: the
 * unchanged GIF shown small on a white disc with a short caption. The in-place
 * variants fade in after a brief delay so a load that finishes at once never
 * flashes them; the page veil shows at once so it stays continuous while the
 * router swaps nested loading boundaries. It is announced as a live status
 * region.
 */
export const LoadingIndicator = ({ label, variant = 'block', className }: Props) => {
  const text = label ?? i18n.t(CORE_STRINGS.shared.loading);

  return (
    <div role="status" aria-live="polite" aria-label={text} className={`bo-loading bo-loading--${variant}${className ? ` ${className}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the animated GIF is served as-is; next/image would re-encode it. */}
      <img className="bo-loading__cat" src="/images/loader.gif" alt="" width={320} height={320} />
      <span className="bo-loading__label">{text}</span>
    </div>
  );
};
