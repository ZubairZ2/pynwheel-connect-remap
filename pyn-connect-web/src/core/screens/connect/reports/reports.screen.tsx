'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useReportsScreen } from '~/core/hooks/connect/useReportsScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const ReportsScreen = () => {
  const {
    dateRange,
    dateRanges,
    onDateRange,
    reportRows,
    scopeSummary
  } = useReportsScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Exportable Reports<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Generated against the current Analytics scope — {scopeSummary}
            </div>
          </div>
          <select value={dateRange} onChange={onDateRange} className="bo-field" style={{ width: "auto", minWidth: "160px", textTransform: "none" }}>
            {(dateRanges ?? []).map((d: any, dIdx: number) => (
              <React.Fragment key={dIdx}>
                <option value={d}>
                  {d}
                </option>
              </React.Fragment>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {(reportRows ?? []).map((r: any, rIdx: number) => (
            <React.Fragment key={rIdx}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: "13px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={"report"} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {r.name}<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {r.note}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "9px" }}>
                    <span style={{ font: "800 10px var(--bo-font)", color: "var(--bo-muted)", background: "#EEF0F4", padding: "3px 7px", borderRadius: "5px" }}>
                      {r.fmt}<DemoMark />
                    </span>
                    <span style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {r.cadence} · {r.lastRun} {r.lastBy}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px", flexShrink: "0" }}>
                  {r.isIdle ? (
                    <>
                      <button onClick={r.run} style={{ height: "32px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Icon name={"report"} style={{ display: "flex" }} />
                        Generate
                      </button>
                    </>
                  ) : null}
                  {r.isGenerating ? (
                    <>
                      <div style={{ height: "32px", padding: "0 13px", border: "1px solid #FFECAE", background: "#FFF4D4", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#8A6A00", display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "#C9A200" }} />
                        Generating…
                      </div>
                    </>
                  ) : null}
                  {r.isReady ? (
                    <>
                      <button onClick={r.download} style={{ height: "32px", padding: "0 13px", border: "none", background: "var(--bo-accent)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <Icon name={"download"} style={{ display: "flex" }} />
                        {r.downloadLabel}
                      </button>
                      <div style={{ font: "700 10.5px var(--bo-font)", color: "#4A7212" }}>
                        {r.readyLabel}<DemoMark />
                      </div>
                      <button onClick={r.run} style={{ height: "24px", padding: "0 9px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "700 10.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                        Re-generate
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};
