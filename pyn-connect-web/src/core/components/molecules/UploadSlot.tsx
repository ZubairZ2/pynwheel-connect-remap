'use client';

import { useRef, useState } from 'react';

import { CubeIcon, EyeIcon, ReplaceIcon, TrashIcon, UploadIcon } from '~/core/components/atoms/Icons';

export interface UploadSlotFile {
  name: string;
  /** Where to preview it: the stored file's URL, or a picked file's local object URL. */
  src: string | null;
  /** The line under the name ("SVG · 1412 × 912"). */
  meta: string;
  isSvg?: boolean;
}

interface Props {
  file: UploadSlotFile | null;
  /** Accepted types, for the file picker. */
  accept: string;
  hint: string;
  labels: {
    /** "Drag and drop, or". */
    prompt: string;
    /** "browse files". */
    browse: string;
    preview: string;
    replace: string;
    remove: string;
  };
  onPreview?: () => void;
  /** The file the user picked or dropped. Nothing is uploaded: the dialog only shows it. */
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** The design's ImageUploader (ImageUploader.dc.html): an empty drop zone, or the current file. */
export const UploadSlot = ({ file, accept, hint, labels, onPreview, onPick, onRemove }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const picker = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      hidden
      onChange={(event) => {
        const picked = event.target.files?.[0];
        if (picked) onPick(picked);
        event.target.value = '';
      }}
    />
  );

  if (!file) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`bo-upload bo-upload--empty${dragging ? ' bo-upload--drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const dropped = event.dataTransfer.files?.[0];
          if (dropped) onPick(dropped);
        }}
      >
        {picker}
        <span className="bo-upload__icon" aria-hidden="true">
          <UploadIcon size={20} />
        </span>
        <span className="bo-upload__text">
          <span className="bo-upload__prompt">
            {labels.prompt} <span className="bo-upload__browse">{labels.browse}</span>
          </span>
          <span className="bo-upload__hint">{hint}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="bo-upload">
      {picker}
      <button type="button" className="bo-upload__preview" onClick={onPreview} aria-label={labels.preview} disabled={!onPreview}>
        {file.isSvg || !file.src ? (
          <CubeIcon />
        ) : (
          // A plain <img>: a CMS file on S3, or a local object URL.
          <img src={file.src} alt="" />
        )}
      </button>
      <span className="bo-upload__text">
        <span className="bo-upload__name">{file.name}</span>
        <span className="bo-upload__hint">{file.meta}</span>
      </span>
      <span className="bo-upload__actions">
        {onPreview && (
          <button type="button" className="bo-iconbtn bo-iconbtn--md" title={labels.preview} aria-label={labels.preview} onClick={onPreview}>
            <EyeIcon size={15} />
          </button>
        )}
        <button
          type="button"
          className="bo-iconbtn bo-iconbtn--md"
          title={labels.replace}
          aria-label={labels.replace}
          onClick={() => inputRef.current?.click()}
        >
          <ReplaceIcon size={15} />
        </button>
        <button
          type="button"
          className="bo-iconbtn bo-iconbtn--md bo-iconbtn--danger"
          title={labels.remove}
          aria-label={labels.remove}
          onClick={onRemove}
        >
          <TrashIcon size={15} />
        </button>
      </span>
    </div>
  );
};
