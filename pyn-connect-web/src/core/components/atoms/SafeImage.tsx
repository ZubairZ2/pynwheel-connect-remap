'use client';

import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  /** Shown instead of a broken-image icon when the file cannot be loaded. */
  fallback: string;
  className?: string;
}

/**
 * A plain <img> for the CMS's own files (S3 hosts next/image is not configured
 * for) that shows a label, not a broken image, when the file is missing.
 */
export const SafeImage = ({ src, alt, fallback, className }: Props) => {
  const [failed, setFailed] = useState<string | null>(null);

  if (failed === src) return <span className="bo-safeimg__missing">{fallback}</span>;

  return <img className={className} src={src} alt={alt} loading="lazy" onError={() => setFailed(src)} />;
};
