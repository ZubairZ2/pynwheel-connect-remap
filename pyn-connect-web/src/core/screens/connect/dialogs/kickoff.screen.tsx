'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useKickoffDialog } from '~/core/hooks/connect/useKickoffDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const KickoffDialog = () => {
  const {
    closeKickoff,
    kickoffOpen,
    koDirection,
    koMoodLabel,
    koSwatches,
    koUpload,
    onKoDirection,
    prop,
    submitKickoff
  } = useKickoffDialog();

  return (
    <>
      {kickoffOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "405" }}>
            <div style={{ width: "600px", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "22px 24px", borderBottom: "1px solid var(--bo-line)" }}>
                <div style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-accent)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
                  Brand Kickoff<DemoMark />
                </div>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)", marginTop: "3px" }}>
                  Design Direction<DemoMark />
                </div>
                <div style={{ font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-muted)", marginTop: "4px" }}>
                  A quick intake for {prop.name} before the full theme gets built. Three inputs — the design team takes it from here.
                </div>
              </div>
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
                <div>
                  <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "3px" }}>
                    1 · Moodboard<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "9px" }}>
                    Reference imagery, a brand sheet, or a screenshot of a site they like
                  </div>
                  <div onClick={koUpload} style={{ border: "1px dashed var(--bo-line)", borderRadius: "10px", background: "#FBFBFC", height: "110px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <div style={{ textAlign: "center" }}>
                      <Icon name={"upload"} style={{ color: "var(--bo-subtle)", display: "flex", justifyContent: "center" }} />
                      <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "6px" }}>
                        {koMoodLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "3px" }}>
                    2 · Starting Palette<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "9px" }}>
                    One hex to anchor the theme — refined later in the token editor
                  </div>
                  <div style={{ display: "flex", gap: "9px" }}>
                    {(koSwatches ?? []).map((s: any, sIdx: number) => (
                      <React.Fragment key={sIdx}>
                        <div onClick={s.pick} style={{ width: "52px", height: "52px", borderRadius: "9px", background: s.hex, cursor: "pointer", boxShadow: s.ring }} />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "3px" }}>
                    3 · Brand Direction<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "9px" }}>
                    How should this property feel to a prospective renter?
                  </div>
                  <textarea onChange={onKoDirection} value={koDirection} placeholder="e.g. Warm and residential, not corporate. Lean into the mountain views and the rooftop. Avoid anything that reads like a hotel." style={{ width: "100%", minHeight: "96px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "11px 12px", font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-ink)", resize: "vertical", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeKickoff} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={submitKickoff} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Submit Direction
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
