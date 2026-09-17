'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useCompanyRegionsScreen } from '~/core/hooks/connect/useCompanyRegionsScreen';

export const CompanyRegionsScreen = () => {
  const {
    addRegion,
    backToOrg,
    goOrgs,
    org,
    orgHasRegions,
    regionRows
  } = useCompanyRegionsScreen();

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
            Regions
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)" }}>
              Regions
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              Reporting and CSV grouping · {org.regionLabel} defined
            </div>
          </div>
          <button onClick={addRegion} style={{ height: "38px", padding: "0 16px", background: "var(--bo-accent)", color: "#fff", border: "none", borderRadius: "8px", font: "700 13px var(--bo-font)", cursor: "pointer" }}>
            + Add Region
          </button>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "8px 20px 18px" }}>
          {(regionRows ?? []).map((r: any, rIdx: number) => (
            <React.Fragment key={rIdx}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "15px 0", borderBottom: "1px solid var(--bo-line-2)" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={"map"} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1", minWidth: "0" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {r.name}
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {r.contact} · {r.email}
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)", marginTop: "2px" }}>
                    {r.propNames}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: "0" }}>
                  <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {r.propCount}
                  </div>
                  <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Properties
                  </div>
                </div>
                <button onClick={r.edit} style={{ height: "32px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                  Edit
                </button>
                <button onClick={r.remove} style={{ height: "32px", padding: "0 13px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                  Delete
                </button>
              </div>
            </React.Fragment>
          ))}
          {!orgHasRegions ? (
            <>
              <div style={{ padding: "34px 0 26px", textAlign: "center" }}>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-muted)" }}>
                  No regions yet
                </div>
                <div style={{ font: "500 12.5px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px" }}>
                  Regions group properties for reporting and CSV export. Each one carries its own contact.
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
};
