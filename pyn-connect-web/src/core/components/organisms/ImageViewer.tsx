'use client';

import { useEffect, useState } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from '~/core/components/atoms/Icons';
import { Modal } from '~/core/components/molecules/Modal';
import { SafeImage } from '~/core/components/atoms/SafeImage';

export interface ViewerImage {
  /** Caption: what the image is ("Floor SVG", "Interior 2 — Kitchen"). */
  name: string;
  src: string;
}

interface Props {
  /** The set being viewed; the viewer is closed when this is empty. */
  images: ViewerImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labels: {
    close: string;
    previous: string;
    next: string;
    /** "{position} of {total}" is built by the caller's generator. */
    position: (current: number, total: number) => string;
    unavailable: string;
  };
}

/**
 * The design's image preview (`imgPreviewOpen`) and gallery (`galleryOpen`) in
 * one lightbox: the real file, as large as the screen allows, with arrows and
 * thumbnails when there is more than one. It only ever reads the images.
 */
export const ImageViewer = ({ images, index, onIndexChange, onClose, labels }: Props) => {
  const open = images.length > 0;
  const current = images[Math.min(Math.max(index, 0), Math.max(images.length - 1, 0))];
  const many = images.length > 1;
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open || !many) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
      if (event.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, many, index, images.length, onIndexChange]);

  if (!open || !current) return null;

  return (
    <Modal
      open
      title={current.name}
      subtitle={many ? labels.position(index + 1, images.length) : undefined}
      width={880}
      onClose={onClose}
      closeLabel={labels.close}
      dismissOnBackdrop
      className="bo-viewer"
    >
      <div className="bo-viewer__stage">
        {many && (
          <button
            type="button"
            className="bo-viewer__step bo-viewer__step--prev"
            aria-label={labels.previous}
            onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
          >
            <ChevronLeftIcon />
          </button>
        )}

        {failed[current.src] ? (
          <p className="bo-viewer__missing" role="status">
            {labels.unavailable}
          </p>
        ) : (
          // A plain <img>: these are the CMS's own S3 files, on hosts next/image is not configured for.
          <img
            key={current.src}
            className="bo-viewer__image"
            src={current.src}
            alt={current.name}
            onError={() => setFailed((previous) => ({ ...previous, [current.src]: true }))}
          />
        )}

        {many && (
          <button
            type="button"
            className="bo-viewer__step bo-viewer__step--next"
            aria-label={labels.next}
            onClick={() => onIndexChange((index + 1) % images.length)}
          >
            <ChevronRightIcon />
          </button>
        )}
      </div>

      {many && (
        <div className="bo-viewer__thumbs">
          {images.map((image, position) => (
            <button
              key={`${image.src}-${position}`}
              type="button"
              className={`bo-viewer__thumb${position === index ? ' bo-viewer__thumb--active' : ''}`}
              aria-label={image.name}
              aria-current={position === index ? 'true' : undefined}
              onClick={() => onIndexChange(position)}
            >
              <SafeImage src={image.src} alt="" fallback={labels.unavailable} />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
};
