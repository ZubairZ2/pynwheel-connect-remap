'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useAnalyticsScreen } from '~/core/hooks/connect/useAnalyticsScreen';

export const AnalyticsScreen = () => {
  const {
    analyticsEmpty,
    analyticsEmptyLabel,
    analyticsKpis,
    dateRange,
    dateRanges,
    deviceSplit,
    entryConic,
    entryNativePct,
    entryQrPct,
    funnel,
    onDateRange,
    onScopeId,
    scopeId,
    scopeNeedsPicker,
    scopeOptions,
    scopeSummary,
    scopeTabs,
    surfaceRows,
    topProps
  } = useAnalyticsScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Drill down
            </span>
            <div style={{ display: "flex", gap: "6px" }}>
              {(scopeTabs ?? []).map((t: any, tIdx: number) => (
                <React.Fragment key={tIdx}>
                  <button onClick={t.go} style={{ height: "32px", padding: "0 13px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                    {t.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
            {scopeNeedsPicker ? (
              <>
                <select value={scopeId} onChange={onScopeId} className="bo-field" style={{ width: "auto", minWidth: "230px", textTransform: "none" }}>
                  {(scopeOptions ?? []).map((o: any, oIdx: number) => (
                    <React.Fragment key={oIdx}>
                      <option value={o.id}>
                        {o.name}
                      </option>
                    </React.Fragment>
                  ))}
                </select>
              </>
            ) : null}
            <div style={{ flex: "1" }} />
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
          <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)", borderTop: "1px solid var(--bo-line-2)", paddingTop: "11px" }}>
            {scopeSummary}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {(analyticsKpis ?? []).map((k: any, kIdx: number) => (
            <React.Fragment key={kIdx}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {k.label}
                </div>
                <div style={{ font: "800 26px var(--bo-font)", color: "var(--bo-ink)", marginTop: "6px" }}>
                  {k.value}
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {k.sub}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        {analyticsEmpty ? (
          <>
            <div style={{ background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "12px", padding: "16px 20px", font: "600 12.5px/1.6 var(--bo-font)", color: "#8A6A00" }}>
              {analyticsEmptyLabel}
            </div>
          </>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "18px" }}>
              Tour Funnel
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {(funnel ?? []).map((f: any, fIdx: number) => (
                <React.Fragment key={fIdx}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", font: "700 13px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "6px" }}>
                      {f.label}
                      <span>
                        {f.value} · {f.pct}
                      </span>
                    </div>
                    <div style={{ height: "14px", background: "#EEF0F3", borderRadius: "7px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: f.pct, background: "var(--bo-accent)", borderRadius: "7px" }} />
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "18px" }}>
              Entry Path Split
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div style={{ width: "130px", height: "130px", borderRadius: "999px", background: entryConic, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: "86px", height: "86px", borderRadius: "999px", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ font: "800 20px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {entryNativePct}
                  </div>
                  <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Native app
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "var(--bo-accent)" }} />
                  Native App · {entryNativePct}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "3px", background: "#DfE2E7" }} />
                  QR / Browser · {entryQrPct}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Breakdown by Product Surface
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "6px" }}>
              Where sessions actually happen across the product line
            </div>
            {(surfaceRows ?? []).map((x: any, xIdx: number) => (
              <React.Fragment key={xIdx}>
                <div style={{ padding: "13px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "7px" }}>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {x.label}
                      </span>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {' '}· {x.note}
                      </span>
                    </div>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {x.sessionsLabel}
                    </div>
                    <div style={{ font: "700 11.5px var(--bo-font)", color: x.deltaColor, minWidth: "48px", textAlign: "right" }}>
                      {x.delta}
                    </div>
                  </div>
                  <div style={{ height: "10px", background: "#EEF0F3", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: x.barWidth, background: "var(--bo-accent)", borderRadius: "5px" }} />
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Device Type
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "6px" }}>
              Share of sessions by hardware
            </div>
            {(deviceSplit ?? []).map((d: any, dIdx: number) => (
              <React.Fragment key={dIdx}>
                <div style={{ padding: "13px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "7px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ width: "11px", height: "11px", borderRadius: "3px", background: d.color }} />
                      <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {d.label}
                      </span>
                    </div>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {d.pctLabel}
                    </div>
                  </div>
                  <div style={{ height: "10px", background: "#EEF0F3", borderRadius: "5px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: d.barWidth, background: d.color, borderRadius: "5px" }} />
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bo-line)", font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
            Top-Performing Properties
          </div>
          <table>
            <thead>
              <tr style={{ background: "#FAFAFB", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Property
                </th>
                <th style={{ textAlign: "right", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Tours
                </th>
                <th style={{ textAlign: "right", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Completion
                </th>
                <th style={{ textAlign: "right", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Lead → Lease
                </th>
              </tr>
            </thead>
            <tbody>
              {(topProps ?? []).map((t: any, tIdx: number) => (
                <React.Fragment key={tIdx}>
                  <tr onClick={t.open} className="bo-row" style={{ borderBottom: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                    <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {t.name}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {t.tours}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {t.completion}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "700 13px var(--bo-font)", color: "#4A7212" }}>
                      {t.conversion}
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
