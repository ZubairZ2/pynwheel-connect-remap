'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { usePartnerConfigScreen } from '~/core/hooks/connect/usePartnerConfigScreen';

export const PartnerConfigScreen = () => {
  const {
    ilsApply,
    ilsFile,
    ilsHasUpload,
    ilsMatchLabel,
    ilsTemplate,
    ilsUpload,
    partnerRows,
    partnerSummary
  } = usePartnerConfigScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"broadcast"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Partner Configuration
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              ILS syndication across the portfolio · {partnerSummary}
            </div>
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "4px" }}>
            Bulk Update Across Properties
          </div>
          <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
            {ilsMatchLabel}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <button onClick={ilsTemplate} style={{ height: "36px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name={"download"} style={{ display: "flex" }} />
              Download CSV Template
            </button>
            <button onClick={ilsUpload} style={{ height: "36px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name={"upload"} style={{ display: "flex" }} />
              Upload Matched Data
            </button>
            <span style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              {ilsFile}
            </span>
            <div style={{ flex: "1" }} />
            {ilsHasUpload ? (
              <>
                <button onClick={ilsApply} style={{ height: "36px", padding: "0 18px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Apply to Matched Properties
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Property
                </th>
                <th style={{ textAlign: "center", padding: "12px 12px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Rent.com
                </th>
                <th style={{ textAlign: "center", padding: "12px 12px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Apartments.com
                </th>
                <th style={{ textAlign: "center", padding: "12px 12px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  ApartmentList
                </th>
                <th style={{ textAlign: "center", padding: "12px 12px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Propexo
                </th>
              </tr>
            </thead>
            <tbody>
              {(partnerRows ?? []).map((r: any, rIdx: number) => (
                <React.Fragment key={rIdx}>
                  <tr className="bo-row" style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {r.name}
                      </div>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {r.org}
                      </div>
                    </td>
                    {(r.cells ?? []).map((c: any, cIdx: number) => (
                      <React.Fragment key={cIdx}>
                        <td style={{ padding: "13px 12px", textAlign: "center" }}>
                          <div onClick={c.toggle} style={{ display: "inline-block", width: "42px", height: "24px", borderRadius: "999px", background: c.bg, position: "relative", cursor: "pointer" }}>
                            <div style={{ position: "absolute", top: "3px", left: c.knob, width: "18px", height: "18px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                          </div>
                        </td>
                      </React.Fragment>
                    ))}
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
