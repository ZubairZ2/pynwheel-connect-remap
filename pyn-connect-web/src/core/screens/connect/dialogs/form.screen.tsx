'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useFormDialog } from '~/core/hooks/connect/useFormDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const FormDialog = () => {
  const {
    closeModal,
    modalFields,
    modalOpen,
    modalSaveLabel,
    modalTitle,
    saveModal
  } = useFormDialog();

  return (
    <>
      {modalOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "400" }}>
            <div style={{ width: "520px", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)" }}>
                  {modalTitle}<DemoMark />
                </div>
                <button aria-label="Close modal" onClick={closeModal} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--bo-ink)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {(modalFields ?? []).map((f: any, fIdx: number) => (
                  <React.Fragment key={fIdx}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }} className="bo-label">
                      {f.label}{' '}
                      {f.isSelect ? (
                        <>
                          <select value={f.value} onChange={f.onChange} className="bo-field" style={{ textTransform: "none" }}>
                            {(f.options ?? []).map((o: any, oIdx: number) => (
                              <React.Fragment key={oIdx}>
                                <option value={o}>
                                  {o}
                                </option>
                              </React.Fragment>
                            ))}
                          </select>
                        </>
                      ) : null}
                      {f.isText ? (
                        <>
                          <input value={f.value} onChange={f.onChange} placeholder={f.placeholder} className="bo-field" style={{ textTransform: "none" }} />
                        </>
                      ) : null}
                      {f.isChecks ? (
                        <>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                            {(f.boxes ?? []).map((b: any, bIdx: number) => (
                              <React.Fragment key={bIdx}>
                                <button onClick={b.toggle} style={{ height: "32px", padding: "0 12px", border: `1px solid ${b.border}`, background: b.bg, color: b.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer", textTransform: "none" }}>
                                  {b.label}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                          <div style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "none", letterSpacing: "0" }}>
                            {f.note}
                          </div>
                        </>
                      ) : null}
                    </label>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeModal} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveModal} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  {modalSaveLabel}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
