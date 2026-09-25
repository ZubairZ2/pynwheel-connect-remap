'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useResidentAccessScreen } from '~/core/hooks/connect/useResidentAccessScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const ResidentAccessScreen = () => {
  const {
    allPropOptions,
    grantRows,
    hasResident,
    onPropSelect,
    propId,
    resident,
    residentCount,
    residentEmpty,
    residentList,
    residentLog,
    revokeAllResident
  } = useResidentAccessScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"key"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Resident Access<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Signed residents using their phone as a key — separate from prospective-tour visitors and their time-boxed keys
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ font: "700 13px var(--bo-font)", color: "var(--bo-muted)" }}>
              Property<DemoMark />
            </span>
            <select value={propId} onChange={onPropSelect} className="bo-field" style={{ width: "auto", minWidth: "240px", textTransform: "none" }}>
              {(allPropOptions ?? []).map((p: any, pIdx: number) => (
                <React.Fragment key={pIdx}>
                  <option value={p.id}>
                    {p.name}
                  </option>
                </React.Fragment>
              ))}
            </select>
          </div>
        </div>
        {residentEmpty ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                No residents yet<DemoMark />
              </div>
              <div style={{ font: "500 12.5px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px" }}>
                This property hasn't taken occupancy. Resident access appears once leases are signed and synced from the PMS.
              </div>
            </div>
          </>
        ) : null}
        {hasResident ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "16px", alignItems: "start" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px" }}>
                <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                  Residents<DemoMark />
                </div>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
                  {residentCount} with active leases
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(residentList ?? []).map((r: any, rIdx: number) => (
                    <React.Fragment key={rIdx}>
                      <div onClick={r.pick} style={{ display: "flex", alignItems: "center", gap: "10px", border: `1px solid ${r.border}`, background: r.bg, borderRadius: "10px", padding: "11px 12px", cursor: "pointer" }}>
                        <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 11px var(--bo-font)", flexShrink: "0" }}>
                          {r.initials}<DemoMark />
                        </div>
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {r.name}<DemoMark />
                          </div>
                          <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Unit {r.unit} · {r.grantCount} grants
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 15px var(--bo-font)", flexShrink: "0" }}>
                      {resident.initials}<DemoMark />
                    </div>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {resident.name}<DemoMark />
                      </div>
                      <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Unit {resident.unit} · {resident.phone} · resident since {resident.since}
                      </div>
                    </div>
                    <button onClick={revokeAllResident} style={{ height: "36px", padding: "0 14px", border: "1px solid #F9DCE0", background: "#FDEDEF", borderRadius: "8px", font: "700 12.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                      Revoke All Access
                    </button>
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Access Grants<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "6px" }}>
                    {resident.grantCount} of 8 targets granted · changes reach the resident's phone on next sync
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 22px" }}>
                    {(grantRows ?? []).map((g: any, gIdx: number) => (
                      <React.Fragment key={gIdx}>
                        <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                          <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                            <Icon name={g.icon} style={{ display: "flex" }} />
                          </div>
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {g.label}<DemoMark />
                            </div>
                            <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {g.note}
                            </div>
                          </div>
                          <div onClick={g.toggle} style={{ width: "44px", height: "26px", borderRadius: "999px", background: g.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                            <div style={{ position: "absolute", top: "3px", left: g.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "2px" }}>
                    Access History<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Every unlock attempt on this resident's credential
                  </div>
                  {(residentLog ?? []).map((l: any, lIdx: number) => (
                    <React.Fragment key={lIdx}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                        <Icon name={"lock"} style={{ color: "var(--bo-subtle)", display: "flex", flexShrink: "0" }} />
                        <div style={{ flex: "1", font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {l.what}<DemoMark />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {l.when}
                        </div>
                        <StatusPill variant={l.v} label={l.result} />
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
