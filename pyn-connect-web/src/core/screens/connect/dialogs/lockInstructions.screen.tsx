'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useLockInstructionsDialog } from '~/core/hooks/connect/useLockInstructionsDialog';

export const LockInstructionsDialog = () => {
  const {
    closeInstr,
    instrOpen,
    instrSteps,
    instrVendor
  } = useLockInstructionsDialog();

  return (
    <>
      {instrOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "407" }}>
            <div style={{ width: "620px", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {instrVendor.name} Instruction Images
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Branded steps a visitor sees in the self-guided app · {instrVendor.note}
                  </div>
                </div>
                <button onClick={closeInstr} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "22px 24px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px" }}>
                {(instrSteps ?? []).map((st: any, stIdx: number) => (
                  <React.Fragment key={stIdx}>
                    <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", overflow: "hidden" }}>
                      <div style={{ height: "110px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", font: "800 30px var(--bo-font)", color: "var(--bo-accent)" }}>
                        {st.n}
                      </div>
                      <div style={{ padding: "12px" }}>
                        <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {st.title}
                        </div>
                        <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)", marginTop: "3px" }}>
                          {st.body}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={closeInstr} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Done
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
