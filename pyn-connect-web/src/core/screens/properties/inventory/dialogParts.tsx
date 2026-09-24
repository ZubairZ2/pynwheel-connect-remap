'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

import { i18n } from '~/resources/i18n';
import { EyeIcon, UploadIcon } from '~/core/components/atoms/Icons';
import { SafeImage } from '~/core/components/atoms/SafeImage';
import { SourceTag } from '~/core/components/atoms/SourceTag';
import { Switch } from '~/core/components/atoms/Switch';
import type { UploadSlotFile } from '~/core/components/molecules/UploadSlot';
import type { ImageDescriptor } from '~/core/utils/generator/inventory/inventory.types';
import { S } from '~/core/utils/generator/inventory/inventoryText';

/**
 * Building blocks of the inventory dialogs (the 22-Sep design's Floorplate,
 * Floor Plan, Unit, Amenity and Mass Override forms). They only hold form
 * state: nothing here sends anything anywhere.
 */

/** Cancel, and the save button that — Connect being read-only — only closes. */
export const DialogFooter = ({ saveLabel, onClose, disabled }: { saveLabel: string; onClose: () => void; disabled?: boolean }) => (
  <>
    <p className="bo-dlg__readonly">{i18n.t(S.dialogs.readOnly)}</p>
    <button type="button" className="bo-btn bo-btn--secondary" onClick={onClose}>
      {i18n.t(S.dialogs.cancel)}
    </button>
    <button type="button" className="bo-btn bo-btn--primary" onClick={onClose} disabled={disabled}>
      {saveLabel}
    </button>
  </>
);

/** A labelled row: what the setting is on the left, its control on the right. */
export const FormRow = ({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) => (
  <div className="bo-dlg__row">
    <div className="bo-dlg__aside">
      <div className="bo-dlg__label">{label}</div>
      {hint && <div className="bo-dlg__hint">{hint}</div>}
    </div>
    <div className="bo-dlg__control">{children}</div>
  </div>
);

/** A heading for a group of fields (the unit dialog's sections). */
export const FormGroup = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
  <section className="bo-dlg__group">
    <h3 className="bo-dlg__grouptitle">{title}</h3>
    {hint && <p className="bo-dlg__hint">{hint}</p>}
    {children}
  </section>
);

type Source = 'feed' | 'manual' | undefined;

/** Feed / Manual beside a field, for a record the PMS feed maintains. */
export const FieldSource = ({ source }: { source: Source }) =>
  source ? (
    <SourceTag
      source={source}
      label={i18n.t(source === 'manual' ? S.source.manual : S.source.feed)}
      title={i18n.t(source === 'manual' ? S.source.manualTitle : S.source.feedTitle)}
    />
  ) : null;

export const Field = ({
  label,
  source,
  hint,
  children,
  wide
}: {
  label: string;
  source?: Source;
  hint?: string;
  children: ReactNode;
  wide?: boolean;
}) => (
  <label className={`bo-dlg__field${wide ? ' bo-dlg__field--wide' : ''}`}>
    <span className="bo-dlg__fieldlabel">
      {label}
      <FieldSource source={source} />
    </span>
    {children}
    {hint && <span className="bo-dlg__fieldhint">{hint}</span>}
  </label>
);

/** The design's Yes / No radio pair. */
export const YesNo = ({
  label,
  value,
  onChange,
  yesHint,
  noHint
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  yesHint?: string;
  noHint?: string;
}) => {
  const name = useId();

  return (
    <div className={`bo-choice${yesHint ? ' bo-choice--cards' : ''}`} role="radiogroup" aria-label={label}>
      {[true, false].map((option) => (
        <label key={String(option)} className={`bo-choice__option${value === option ? ' bo-choice__option--on' : ''}`}>
          <input type="radio" name={name} checked={value === option} onChange={() => onChange(option)} />
          <span className="bo-choice__text">
            <span className="bo-choice__label">{i18n.t(option ? S.dialogs.yes : S.dialogs.no)}</span>
            {(option ? yesHint : noHint) && <span className="bo-choice__hint">{option ? yesHint : noHint}</span>}
          </span>
        </label>
      ))}
    </div>
  );
};

/** "No [switch] Yes", as the design lays its toggles out. */
export const SwitchField = ({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) => (
  <span className="bo-dlg__switch">
    <span>{i18n.t(S.dialogs.no)}</span>
    <Switch on={on} label={label} onToggle={onToggle} />
    <span>{i18n.t(S.dialogs.yes)}</span>
  </span>
);

/**
 * A picked file shown in a dialog: a local object URL, released when the
 * dialog goes away. It is never uploaded.
 */
export const usePickedFiles = () => {
  const urls = useRef<string[]>([]);

  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  return (file: File): UploadSlotFile => {
    const src = URL.createObjectURL(file);
    urls.current.push(src);
    const extension = (file.name.split('.').pop() ?? '').toUpperCase();

    return { name: file.name, src, meta: extension, isSvg: extension === 'SVG' };
  };
};

export const uploadLabels = () => ({
  prompt: i18n.t(S.dialogs.upload.prompt),
  browse: i18n.t(S.dialogs.upload.browse),
  preview: i18n.t(S.dialogs.upload.preview),
  replace: i18n.t(S.dialogs.upload.replace),
  remove: i18n.t(S.dialogs.upload.remove)
});

/** Interior images: the real gallery, first image leading, each viewable. */
export const InteriorGrid = ({
  images,
  onView,
  onAdd,
  addLabel,
  viewAllLabel,
  leadLabel
}: {
  images: ImageDescriptor[];
  onView: (index: number) => void;
  onAdd: (files: File[]) => void;
  addLabel: string;
  viewAllLabel: string;
  leadLabel: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bo-dlg__interiors">
      <div className="bo-dlg__interiorbar">
        <button type="button" className="bo-dlg__interioradd" onClick={() => inputRef.current?.click()}>
          <UploadIcon />
          {addLabel}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            onAdd(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
        {images.length > 0 && (
          <button type="button" className="bo-btn bo-btn--secondary bo-btn--small" onClick={() => onView(0)}>
            <EyeIcon />
            {viewAllLabel}
          </button>
        )}
      </div>
      {images.length > 0 && (
        <ul className="bo-dlg__interiorlist">
          {images.map((image, index) => (
            <li key={`${image.src}-${index}`} className="bo-dlg__interior">
              <button type="button" className="bo-dlg__interiorthumb" onClick={() => onView(index)} aria-label={image.name}>
                <SafeImage src={image.src} alt="" fallback={i18n.t(S.imageUnavailable)} />
                {index === 0 && <span className="bo-thumb__badge">{leadLabel}</span>}
              </button>
              <span className="bo-dlg__interiorname" title={image.name}>
                {image.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
