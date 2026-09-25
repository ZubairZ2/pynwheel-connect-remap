'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useCompanyDetailScreen } from '~/core/hooks/connect/useCompanyDetailScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const CompanyDetailScreen = () => {
  const {
    confirmDeleteOrg,
    editOrg,
    goGroups,
    goOrgs,
    goRegions,
    org,
    orgGroups,
    orgHasGroups,
    orgHasNoProps,
    orgHasRegions,
    orgHistory,
    orgPmsKnob,
    orgPmsSummary,
    orgPmsToggleBg,
    orgPmsVendors,
    orgProperties,
    orgRegions,
    toggleOrgPms
  } = useCompanyDetailScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
          <span onClick={goOrgs} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            Companies
          </span>
          <span>
            /
          </span>
          <span style={{ color: "var(--bo-muted)" }}>
            {org.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "52px", height: "52px", borderRadius: "12px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 18px var(--bo-font)" }}>
            {org.initials}<DemoMark />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ font: "800 22px var(--bo-font)", color: "var(--bo-ink)" }}>
                {org.name}<DemoMark />
              </div>
              <StatusPill variant={org.pmsV} label={org.pmsProvider} />
            </div>
            <div style={{ font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
              {org.regionLabel} · {org.groupLabel} · {org.propertyLabel}
            </div>
          </div>
          <button onClick={editOrg} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Edit
          </button>
          <button onClick={confirmDeleteOrg} style={{ height: "38px", padding: "0 14px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
            Delete Company
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "14px" }}>
              Properties<DemoMark />
            </div>
            <table>
              <tbody>
                {(orgProperties ?? []).map((p: any, pIdx: number) => (
                  <React.Fragment key={pIdx}>
                    <tr className="bo-row" onClick={p.open} style={{ borderBottom: "1px solid var(--bo-line-2)", cursor: "pointer" }}>
                      <td style={{ padding: "11px 4px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {p.name}
                      </td>
                      <td style={{ padding: "11px 4px", font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {p.city}
                      </td>
                      <td style={{ padding: "11px 4px", textAlign: "right" }}>
                        <StatusPill variant={p.statusV} label={p.status} />
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
                {orgHasNoProps ? (
                  <>
                    <tr>
                      <td style={{ padding: "16px 4px", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        No properties yet.
                      </td>
                    </tr>
                  </>
                ) : null}
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "12px" }}>
                Primary Contact<DemoMark />
              </div>
              <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                {org.contact}<DemoMark />
              </div>
              <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-accent)" }}>
                {org.email}
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
              <Icon name={"integrations"} style={{ display: "flex" }} />
            </div>
            <div style={{ flex: "1", minWidth: "0" }}>
              <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                Company PMS Credentials<DemoMark />
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                {orgPmsSummary}
              </div>
            </div>
            <StatusPill variant={org.pmsV} label={org.pmsProvider} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", alignItems: "start" }}>
            {(orgPmsVendors ?? []).map((v: any, vIdx: number) => (
              <React.Fragment key={vIdx}>
                <div style={{ border: `1px solid ${v.cardBorder}`, background: v.cardBg, borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {v.name}<DemoMark />
                      </div>
                      <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {v.note}
                      </div>
                    </div>
                    <StatusPill variant={v.statusV} label={v.status} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "11px 12px", background: "#FBFBFC", border: "1px solid var(--bo-line-2)", borderRadius: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      Credential
                      <span style={{ fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace", color: "var(--bo-ink)" }}>
                        {v.cred}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      Last test
                      <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                        {v.lastTest}
                      </span>
                    </div>
                  </div>
                  {v.on ? (
                    <>
                      <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                        <button onClick={v.test} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Test Connection
                        </button>
                        <button onClick={v.rotate} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Rotate Credential
                        </button>
                        <button onClick={v.revoke} style={{ height: "32px", padding: "0 11px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                          Disconnect
                        </button>
                      </div>
                    </>
                  ) : null}
                  {v.notOn ? (
                    <>
                      <button onClick={v.connect} style={{ width: "100%", height: "34px", border: "none", background: "var(--bo-accent)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                        Connect
                      </button>
                    </>
                  ) : null}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--bo-line-2)" }}>
            <div style={{ flex: "1" }}>
              <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                Use company-level settings<DemoMark />
              </div>
              <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                Push this credential to every property in the company instead of per-property keys
              </div>
            </div>
            <div onClick={toggleOrgPms} style={{ width: "44px", height: "26px", borderRadius: "999px", background: orgPmsToggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
              <div style={{ position: "absolute", top: "3px", left: orgPmsKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Regions<DemoMark />
                </div>
                <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Org-chart grouping for reporting &amp; CSV export
                </div>
              </div>
              <button onClick={goRegions} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Manage Regions
              </button>
            </div>
            {(orgRegions ?? []).map((r: any, rIdx: number) => (
              <React.Fragment key={rIdx}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                    <Icon name={"map"} style={{ display: "flex" }} />
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {r.name}<DemoMark />
                    </div>
                    <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {r.contact} · {r.email}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {r.props}<DemoMark />
                    </div>
                    <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Properties
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {!orgHasRegions ? (
              <>
                <div style={{ padding: "14px 0 2px", font: "500 13px var(--bo-font)", color: "var(--bo-subtle)", borderTop: "1px solid var(--bo-line-2)" }}>
                  No regions defined. Regions group properties for reporting and CSV export.
                </div>
              </>
            ) : null}
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <div>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Portfolio Groups<DemoMark />
                </div>
                <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Branded multi-property landing pages
                </div>
              </div>
              <button onClick={goGroups} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Manage Groups
              </button>
            </div>
            {(orgGroups ?? []).map((g: any, gIdx: number) => (
              <React.Fragment key={gIdx}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                    <Icon name={"builds"} style={{ display: "flex" }} />
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {g.name}<DemoMark />
                    </div>
                    <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Master: {g.master} · {g.videoLabel}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {g.props}<DemoMark />
                    </div>
                    <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Properties
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
            {!orgHasGroups ? (
              <>
                <div style={{ padding: "14px 0 2px", font: "500 13px var(--bo-font)", color: "var(--bo-subtle)", borderTop: "1px solid var(--bo-line-2)" }}>
                  No portfolio groups. A group is a branded landing page across several properties with its own design, loop video, and master property.
                </div>
              </>
            ) : null}
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "6px" }}>
            Activity History<DemoMark />
          </div>
          {(orgHistory ?? []).map((h: any, hIdx: number) => (
            <React.Fragment key={hIdx}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                <div style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--bo-accent)", flexShrink: "0" }} />
                <div style={{ flex: "1", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                  <span style={{ fontWeight: "800", color: "var(--bo-ink)" }}>
                    {h.actor}
                  </span>
                  {' '}{h.action}
                </div>
                <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {h.when}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};
