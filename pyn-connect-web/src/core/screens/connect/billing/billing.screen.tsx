'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useBillingScreen } from '~/core/hooks/connect/useBillingScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const BillingScreen = () => {
  const {
    billingStats,
    orgRollup,
    rateCardRows
  } = useBillingScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "13px" }}>
          <Icon name={"billing"} style={{ color: "var(--bo-muted)", display: "flex", flexShrink: "0" }} />
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Rate Card Rollup<DemoMark />
            </div>
            <div style={{ font: "500 12px/1.55 var(--bo-font)", color: "var(--bo-subtle)" }}>
              Billing lives per-property, not per-company — there is no subscription tier or MRR on a company. This rolls up the Phase 1 rate cards so you can see contracted rates across the portfolio. Invoicing happens outside this system.
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {(billingStats ?? []).map((k: any, kIdx: number) => (
            <React.Fragment key={kIdx}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {k.label}
                </div>
                <div style={{ font: "800 26px var(--bo-font)", color: "var(--bo-ink)", marginTop: "6px" }}>
                  {k.value}<DemoMark />
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {k.sub}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Per-Property Rate Cards<DemoMark />
              </div>
              <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                Grouped by company · edit a rate on its Property Detail screen
              </div>
            </div>
          </div>
          <table>
            <thead>
              <tr style={{ background: "#FAFAFB", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Property
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Company
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Touch Kiosk
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Self-Guided
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Maps
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Combined
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Billing Month
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Stage
                </th>
              </tr>
            </thead>
            <tbody>
              {(rateCardRows ?? []).map((r: any, rIdx: number) => (
                <React.Fragment key={rIdx}>
                  <tr onClick={r.open} className="bo-row" style={{ borderBottom: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                    <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {r.name}
                    </td>
                    <td style={{ padding: "13px 18px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.org}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.touch}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.tour}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.maps}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {r.combined}
                    </td>
                    <td style={{ padding: "13px 18px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {r.month}
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <StatusPill variant={r.stageV} label={r.stageLabel} />
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
          <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
            Rollup by Company<DemoMark />
          </div>
          <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "6px" }}>
            Sum of combined rates for properties billing this month
          </div>
          {(orgRollup ?? []).map((o: any, oIdx: number) => (
            <React.Fragment key={oIdx}>
              <div onClick={o.open} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 11px var(--bo-font)", flexShrink: "0" }}>
                  {o.initials}<DemoMark />
                </div>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {o.name}<DemoMark />
                  </div>
                  <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {o.detail}
                  </div>
                </div>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  {o.total}<DemoMark />
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};
