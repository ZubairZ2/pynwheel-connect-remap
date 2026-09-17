'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useBuildsScreen } from '~/core/hooks/connect/useBuildsScreen';

export const BuildsScreen = () => {
  const {
    buildHistory,
    buildVersion,
    confirmTriggerBuild,
    prop,
    toastStore
  } = useBuildsScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
              App Configuration — {prop.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img src="/images/app-icon.png" alt="App icon" style={{ width: "72px", height: "72px", flexShrink: "0", objectFit: "cover", borderRadius: "16px", display: "block" }} />
              <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                  App name
                  <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                    {prop.name}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                  Current version
                  <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                    {buildVersion}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                  Tour published
                  <StatusPill variant={prop.pubV} label={prop.pub} />
                </div>
              </div>
            </div>
            <button onClick={confirmTriggerBuild} style={{ height: "44px", background: "var(--bo-accent)", color: "#fff", border: "none", borderRadius: "8px", font: "700 14px var(--bo-font)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
              Trigger New Build
            </button>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
              Store Links
            </div>
            <div onClick={toastStore} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--bo-line)", borderRadius: "10px", cursor: "pointer" }}>
              <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                App Store Connect
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
            <div onClick={toastStore} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid var(--bo-line)", borderRadius: "10px", cursor: "pointer" }}>
              <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                Google Play Console
              </div>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </div>
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bo-line)", font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
            Build &amp; Submission History
          </div>
          <table>
            <thead>
              <tr style={{ background: "#FAFAFB", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Version
                </th>
                <th style={{ textAlign: "left", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Platform
                </th>
                <th style={{ textAlign: "left", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Status
                </th>
                <th style={{ textAlign: "left", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Triggered By
                </th>
                <th style={{ textAlign: "right", padding: "11px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  When
                </th>
              </tr>
            </thead>
            <tbody>
              {(buildHistory ?? []).map((b: any, bIdx: number) => (
                <React.Fragment key={bIdx}>
                  <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                    <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {b.version}
                    </td>
                    <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {b.platform}
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <StatusPill variant={b.variant} label={b.status} />
                    </td>
                    <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {b.by}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right", font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {b.when}
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
