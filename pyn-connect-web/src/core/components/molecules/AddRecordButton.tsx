'use client';

import { useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { PlusIcon } from '~/core/components/atoms/Icons';
import { Modal } from '~/core/components/molecules/Modal';
import { i18n } from '~/resources/i18n';

interface Props {
  /** The button text ("Add Company"). */
  label: string;
  /** Why nothing is created from Connect yet. */
  explanation: string;
}

/**
 * The listings' primary "Add …" button from the Back Office design. Connect
 * has no create path for companies or properties (they are created in the
 * legacy CMS), so the button opens a dialog that says exactly that instead of
 * pretending to create anything.
 */
export const AddRecordButton = ({ label, explanation }: Props) => {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <button type="button" className="bo-toolbar__add" onClick={() => setOpen(true)}>
        <PlusIcon />
        {label}
      </button>
      <Modal
        open={open}
        title={label}
        subtitle={i18n.t(CORE_STRINGS.listingActions.unavailableTitle)}
        width={480}
        onClose={close}
        closeLabel={i18n.t(CORE_STRINGS.listingActions.close)}
        dismissOnBackdrop
        footer={
          <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
            {i18n.t(CORE_STRINGS.listingActions.close)}
          </button>
        }
      >
        <p className="bo-map__dialogtext">{explanation}</p>
      </Modal>
    </>
  );
};
