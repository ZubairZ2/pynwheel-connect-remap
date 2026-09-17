'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useSvgOptimizerScreen } from '~/core/hooks/connect/useSvgOptimizerScreen';

export const SvgOptimizerScreen = () => {
  const {
    optimizeAllSvg,
    svgOptRows,
    svgOptSummary
  } = useSvgOptimizerScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"map"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              SVG Maps Optimizer
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Portfolio-wide floor SVG validation and compression · {svgOptSummary}
            </div>
          </div>
          <button onClick={optimizeAllSvg} style={{ height: "38px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name={"rocket"} style={{ display: "flex" }} />
            Optimize All
          </button>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFBFC", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Property
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  SVG Status
                </th>
                <th style={{ textAlign: "right", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  File Size
                </th>
                <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Last Optimized
                </th>
                <th style={{ padding: "12px 16px" }} />
              </tr>
            </thead>
            <tbody>
              {(svgOptRows ?? []).map((r: any, rIdx: number) => (
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
                    <td style={{ padding: "13px 16px" }}>
                      <StatusPill variant={r.statusV} label={r.statusLabel} />
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right", font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {r.size}
                    </td>
                    <td style={{ padding: "13px 16px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.last}
                    </td>
                    <td style={{ padding: "13px 16px", textAlign: "right" }}>
                      <button onClick={r.optimize} style={{ height: "30px", padding: "0 13px", border: `1px solid ${r.btnBorder}`, background: r.btnBg, borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: r.btnColor, cursor: "pointer" }}>
                        {r.btnLabel}
                      </button>
                    </td>
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
