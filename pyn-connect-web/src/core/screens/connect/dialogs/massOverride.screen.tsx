'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useMassOverrideDialog } from '~/core/hooks/connect/useMassOverrideDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const MassOverrideDialog = () => {
  const {
    closeModal,
    puMass,
    puMassCount,
    puMassModalOpen,
    puMassOptions,
    puMassScope,
    puMassWarn,
    saveModal
  } = useMassOverrideDialog();

  return (
    <>
      {puMassModalOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "400" }}>
            <div style={{ width: "500px", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Mass Overrides<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Applies to {puMassScope}.
                  </div>
                </div>
                <button onClick={closeModal} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Action
                  </span>
                  <select value={puMass.action} onChange={puMass.onAction} className="bo-field" style={{ textTransform: "none", cursor: "pointer" }}>
                    {(puMassOptions ?? []).map((o: any, oIdx: number) => (
                      <React.Fragment key={oIdx}>
                        <option value={o.id}>
                          {o.label}
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                </label>
                <div style={{ border: "1px solid #FFECAE", background: "#FFF4D4", borderRadius: "8px", padding: "11px 13px", font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                  {puMassWarn}
                </div>
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeModal} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveModal} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Apply to {puMassCount}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
