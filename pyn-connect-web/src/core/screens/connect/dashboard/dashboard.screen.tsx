'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useDashboardScreen } from '~/core/hooks/connect/useDashboardScreen';

export const DashboardScreen = () => {
  const {
    alerts,
    clearDashProduct,
    dashProducts,
    dashScopeLabel,
    dashScoped,
    kpis,
    liveTours,
    recentSignups,
    trendBars,
    trendTitle
  } = useDashboardScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "16px" }}>
          {(kpis ?? []).map((k: any, kIdx: number) => (
            <React.Fragment key={kIdx}>
              <div onClick={k.go} style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px", display: "flex", flexDirection: "column", gap: "8px", cursor: "pointer" }}>
                <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {k.label}
                </div>
                <div style={{ font: "800 30px var(--bo-font)", color: "var(--bo-ink)" }}>
                  {k.value}
                </div>
                <div style={{ font: "700 12px var(--bo-font)", color: k.deltaColor }}>
                  {k.delta}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px" }}>
          {(dashProducts ?? []).map((p: any, pIdx: number) => (
            <React.Fragment key={pIdx}>
              <div onClick={p.pick} style={{ border: `1px solid ${p.border}`, background: p.bg, borderRadius: "12px", padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: "16px" }}>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {p.label}
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {p.note} · {p.propLabel}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ font: "800 26px var(--bo-font)", color: p.valueColor, lineHeight: "1.1" }}>
                    {p.value}
                  </div>
                  <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    {p.sub}
                  </div>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div>
                <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                  {trendTitle}
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {dashScopeLabel} · all tenants
                </div>
              </div>
              {dashScoped ? (
                <>
                  <button onClick={clearDashProduct} style={{ height: "30px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                    Show All Products
                  </button>
                </>
              ) : null}
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "180px" }}>
              {(trendBars ?? []).map((b: any, bIdx: number) => (
                <React.Fragment key={bIdx}>
                  <div style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ width: "100%", height: `${b.h}px`, background: "var(--bo-accent)", borderRadius: "4px 4px 0 0", opacity: b.op }} />
                    <div style={{ font: "600 9px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {b.d}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
              Sessions Happening Now
            </div>
            {(liveTours ?? []).map((t: any, tIdx: number) => (
              <React.Fragment key={tIdx}>
                <div onClick={t.go} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderBottom: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#5C8E1C", flexShrink: "0" }} />
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.property}
                    </div>
                    <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {t.stop}
                    </div>
                  </div>
                  <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-muted)", background: "#EEF0F4", padding: "3px 7px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                    {t.product}
                  </span>
                  <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                    {t.elapsed}
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "14px" }}>
              Alerts Needing Attention
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(alerts ?? []).map((a: any, aIdx: number) => (
                <React.Fragment key={aIdx}>
                  <div onClick={a.go} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 14px", border: `1px solid ${a.border}`, background: a.bg, borderRadius: "10px", cursor: "pointer" }}>
                    <Icon name={"alert"} style={{ color: a.color, display: "flex", flexShrink: "0" }} />
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {a.title}
                      </div>
                      <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                        {a.sub}
                      </div>
                    </div>
                    <StatusPill variant={a.variant} label={a.tag} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "14px" }}>
              Recent Client Onboarding
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {(recentSignups ?? []).map((r: any, rIdx: number) => (
                <React.Fragment key={rIdx}>
                  <div onClick={r.go} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 0", borderBottom: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                    <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 12px var(--bo-font)", flexShrink: "0" }}>
                      {r.initials}
                    </div>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {r.name}
                      </div>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {r.plan} · {r.when}
                      </div>
                    </div>
                    <StatusPill variant={r.variant} label={r.status} />
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
