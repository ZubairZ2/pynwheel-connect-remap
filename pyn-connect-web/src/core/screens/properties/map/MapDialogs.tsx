'use client';

import { i18n } from '~/resources/i18n';
import { Modal } from '~/core/components/molecules/Modal';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import { M } from '~/core/utils/generator/map/mapText';

/**
 * The two dialogs of the screen. The confirm applies a local change only
 * (its message says so); Publish shows what the CMS would push and that
 * Connect cannot publish yet. Neither sends a request.
 */
export const MapDialogs = ({ controller }: { controller: PropertyMapController }) => {
  const { state, actions, publishSummary } = controller;
  const confirm = state.confirm;

  return (
    <>
      <Modal
        open={!!confirm}
        title={confirm?.title ?? ''}
        width={460}
        onClose={actions.closeConfirm}
        closeLabel={i18n.t(M.confirm.cancel)}
        className="bo-map__dialog"
        footer={
          confirm && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closeConfirm}>
                {i18n.t(M.confirm.cancel)}
              </button>
              <button
                type="button"
                className={`bo-btn bo-btn--primary${confirm.danger ? ' bo-map__btn--danger' : ''}`}
                onClick={confirm.onConfirm}
              >
                {confirm.label}
              </button>
            </>
          )
        }
      >
        <p className="bo-map__dialogtext">{confirm?.message}</p>
        <p className="bo-map__dialognote">{i18n.t(M.confirm.readOnly)}</p>
      </Modal>

      <Modal
        open={state.publishOpen}
        title={i18n.t(M.publish.title)}
        width={480}
        onClose={actions.closePublish}
        closeLabel={i18n.t(M.publish.close)}
        className="bo-map__dialog"
        footer={
          <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closePublish}>
            {i18n.t(M.publish.close)}
          </button>
        }
      >
        <p className="bo-map__dialogtext">{publishSummary.body}</p>
        {publishSummary.unplotted && <p className="bo-map__dialogtext">{publishSummary.unplotted}</p>}
        <div className="bo-map__warnbox">{i18n.t(M.publish.unavailable)}</div>
      </Modal>
    </>
  );
};
