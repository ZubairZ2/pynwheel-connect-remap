'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { LoadingIndicator } from '~/core/components/atoms/LoadingIndicator';
import { useImageStatus } from '~/core/hooks/useImageStatus';

interface Props {
  src: string;
  alt: string;
  /** Shown instead of a broken-image icon when the file cannot be loaded. */
  fallback: string;
  className?: string;
}

/**
 * A plain <img> for the CMS's own files (S3 hosts next/image is not configured
 * for) that shows the loading indicator while the file is fetched and a label,
 * not a broken image, only when the request really failed. The indicator is
 * laid over the image's box, so the parent is the positioned element that
 * frames the image.
 */
export const SafeImage = ({ src, alt, fallback, className }: Props) => {
  const { ref, status, onLoad, onError } = useImageStatus(src);

  if (status === 'failed') return <span className="bo-safeimg__missing">{fallback}</span>;

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- a CMS file on S3, or a local object URL. */}
      <img key={src} ref={ref} className={className} src={src} alt={alt} loading="lazy" onLoad={onLoad} onError={onError} />
      {status === 'loading' && <LoadingIndicator variant="overlay" label={i18n.t(CORE_STRINGS.shared.loadingImage)} />}
    </>
  );
};
