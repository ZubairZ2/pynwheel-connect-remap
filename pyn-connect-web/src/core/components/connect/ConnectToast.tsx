'use client';

import { useEffect } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

/** The design's bottom-centre toast, auto-dismissed after 2.8s. */
export const ConnectToast = () => {
  const dispatch = useAppDispatch();
  const toast = useAppSelector((s) => s.demo.toast);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => dispatch(demoActions.clearToast()), 2800);
    return () => window.clearTimeout(timer);
  }, [toast, dispatch]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 420,
        background: 'var(--bo-nav)',
        color: '#fff',
        padding: '13px 20px',
        borderRadius: '10px',
        font: '700 13px var(--bo-font)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        maxWidth: 'calc(100vw - 32px)'
      }}
    >
      <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#5C8E1C', flexShrink: 0 }} />
      {toast}
    </div>
  );
};
