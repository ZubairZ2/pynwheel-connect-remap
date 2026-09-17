'use client';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useConnectActions } from '~/core/hooks/connect/useConnectActions';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

/**
 * The design's destructive-action confirm. A few flows also require the user to
 * retype the record's name (`confirmMatch`) before the button unlocks.
 */
export const ConfirmDialog = () => {
  const dispatch = useAppDispatch();
  const actions = useConnectActions();
  const state = useAppSelector((s) => s.demo);

  if (!state.confirmOpen) return null;

  const ready = !state.confirmMatch || state.confirmInput.trim() === state.confirmMatch;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(20,22,28,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 410,
        padding: '16px'
      }}
      onClick={() => dispatch(demoActions.closeConfirm())}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={state.confirmTitle}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '440px',
          maxWidth: '100%',
          background: '#fff',
          borderRadius: '14px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        <div style={{ padding: '24px 24px 0', display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#FDEDEF',
              color: '#C62534',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Icon name="alert" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ font: '800 17px var(--bo-font)', color: 'var(--bo-ink)' }}>
              {state.confirmTitle}
            </div>
            <div
              style={{
                font: '500 13.5px/1.6 var(--bo-font)',
                color: 'var(--bo-muted)',
                marginTop: '6px'
              }}
            >
              {state.confirmMsg}
            </div>

            {state.confirmMatch && (
              <div style={{ marginTop: '14px' }}>
                <label
                  htmlFor="bo-confirm-match"
                  style={{
                    display: 'block',
                    font: '600 12px var(--bo-font)',
                    color: 'var(--bo-muted)',
                    marginBottom: '6px'
                  }}
                >
                  Type <span style={{ fontWeight: 800, color: 'var(--bo-ink)' }}>{state.confirmMatch}</span> to confirm
                </label>
                <input
                  id="bo-confirm-match"
                  value={state.confirmInput}
                  placeholder={state.confirmMatch}
                  onChange={(event) => dispatch(demoActions.setConfirmInput(event.target.value))}
                  style={{
                    width: '100%',
                    height: '38px',
                    padding: '0 12px',
                    border: '1px solid var(--bo-line)',
                    borderRadius: '8px',
                    font: '600 13px var(--bo-font)',
                    color: 'var(--bo-ink)',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '20px 24px' }}>
          <button
            type="button"
            onClick={() => dispatch(demoActions.closeConfirm())}
            style={{
              height: '40px',
              padding: '0 18px',
              border: '1px solid var(--bo-line)',
              background: '#fff',
              borderRadius: '8px',
              font: '700 13px var(--bo-font)',
              color: 'var(--bo-muted)',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={actions.doConfirm}
            disabled={!ready}
            style={{
              height: '40px',
              padding: '0 18px',
              border: 'none',
              background: ready ? '#C62534' : '#F2B8BF',
              borderRadius: '8px',
              font: '700 13px var(--bo-font)',
              color: '#fff',
              cursor: ready ? 'pointer' : 'not-allowed'
            }}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
