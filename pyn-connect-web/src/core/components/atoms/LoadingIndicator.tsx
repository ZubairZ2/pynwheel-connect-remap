import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';

/**
 * - `page`: the content area of a route while its data loads (`loading.tsx`).
 * - `block`: a section or panel body.
 * - `inline`: a row next to text (a button's pending state, a wizard note).
 * - `cover`: a stage the indicator lays over with its caption (the image viewer, the map canvas).
 * - `overlay`: a small thumbnail; the animation only, over a translucent veil.
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
 * unchanged GIF shown small on a white disc with a short caption. It fades in
 * after a brief delay so a load that finishes at once never flashes it, and it
 * is announced as a live status region.
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
