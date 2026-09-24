'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useCompanyGroupsScreen } from '~/core/hooks/connect/useCompanyGroupsScreen';

export const CompanyGroupsScreen = () => {
  const {
    addGroup,
    backToOrg,
    goOrgs,
    groupRows,
    org,
    orgHasGroups
  } = useCompanyGroupsScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
          <span onClick={goOrgs} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            Companies
          </span>
          <span>
            /
          </span>
          <span onClick={backToOrg} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            {org.name}
          </span>
          <span>
            /
          </span>
          <span style={{ color: "var(--bo-muted)" }}>
            Portfolio Groups
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)" }}>
              Portfolio Groups
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              Branded multi-property landing pages · {org.groupLabel} defined
            </div>
          </div>
          <button onClick={addGroup} style={{ height: "38px", padding: "0 16px", background: "var(--bo-accent)", color: "#fff", border: "none", borderRadius: "8px", font: "700 13px var(--bo-font)", cursor: "pointer" }}>
            + Add Group
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
          {(groupRows ?? []).map((g: any, gIdx: number) => (
            <React.Fragment key={gIdx}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                    <Icon name={"builds"} style={{ display: "flex" }} />
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {g.name}
                    </div>
                    <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-accent)" }}>
                      {g.url}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", background: "#FBFBFC", border: "1px solid var(--bo-line-2)", borderRadius: "8px", marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                    Master property
                    <span style={{ fontWeight: "700", color: "var(--bo-ink)", textAlign: "right" }}>
                      {g.master}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                    Members
                    <span style={{ fontWeight: "700", color: "var(--bo-ink)", textAlign: "right" }}>
                      {g.propNames}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                    Background
                    <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                      {g.videoLabel}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                    Design
                    <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                      {g.designLabel}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={g.edit} style={{ flex: "1", height: "34px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                    Edit Group
                  </button>
                  <button onClick={g.remove} style={{ height: "34px", padding: "0 13px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                    Delete
                  </button>
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        {!orgHasGroups ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-muted)" }}>
                No portfolio groups yet
              </div>
              <div style={{ font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px", maxWidth: "460px", marginLeft: "auto", marginRight: "auto" }}>
                A group is one branded landing page across several properties, with a master property, its own design, and an optional background loop video.
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
