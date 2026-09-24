'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useIntegrationsScreen } from '~/core/hooks/connect/useIntegrationsScreen';

export const IntegrationsScreen = () => {
  const {
    accessFilter,
    accessFilterOptions,
    accessLog,
    accessLogCount,
    allPropOptions,
    integTabs,
    isAccessTab,
    isIntegTab,
    latchActive,
    latchActiveCount,
    latchHasKeys,
    latchKeys,
    lockConnectedCount,
    lockTotalLabel,
    lockVendors,
    onAccessFilter,
    onPropSelect,
    propId,
    vendorCategories
  } = useIntegrationsScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {(integTabs ?? []).map((t: any, tIdx: number) => (
              <React.Fragment key={tIdx}>
                <button onClick={t.go} style={{ height: "36px", padding: "0 16px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer" }}>
                  {t.label}
                </button>
              </React.Fragment>
            ))}
          </div>
          <div style={{ flex: "1" }} />
          {isIntegTab ? (
            <>
              <span style={{ font: "700 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                Property
              </span>
              <select value={propId} onChange={onPropSelect} className="bo-field" style={{ width: "auto", minWidth: "260px", textTransform: "none" }}>
                {(allPropOptions ?? []).map((p: any, pIdx: number) => (
                  <React.Fragment key={pIdx}>
                    <option value={p.id}>
                      {p.name}
                    </option>
                  </React.Fragment>
                ))}
              </select>
            </>
          ) : null}
          {isAccessTab ? (
            <>
              <span style={{ font: "700 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                Filter
              </span>
              <select value={accessFilter} onChange={onAccessFilter} className="bo-field" style={{ width: "auto", minWidth: "220px", textTransform: "none" }}>
                {(accessFilterOptions ?? []).map((o: any, oIdx: number) => (
                  <React.Fragment key={oIdx}>
                    <option value={o.id}>
                      {o.name}
                    </option>
                  </React.Fragment>
                ))}
              </select>
            </>
          ) : null}
        </div>
        {isIntegTab ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                    <Icon name={"lock"} style={{ display: "flex" }} />
                  </div>
                  <div style={{ flex: "1" }}>
                    <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Locks / Physical Access
                    </div>
                    <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      One lock provider per property · {lockConnectedCount} connected · {lockTotalLabel}
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", alignItems: "start" }}>
                  {(lockVendors ?? []).map((v: any, vIdx: number) => (
                    <React.Fragment key={vIdx}>
                      <div style={{ border: `1px solid ${v.cardBorder}`, background: v.cardBg, borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {v.name}
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
                            Mapping
                            <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                              {v.mappedLabel}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                            Last test
                            <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                              {v.lastTest}
                            </span>
                          </div>
                        </div>
                        {v.hasExtra ? (
                          <>
                            <div style={{ padding: "9px 11px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", font: "700 11.5px var(--bo-font)", color: "#8A6A00" }}>
                              {v.extraLabel}
                            </div>
                          </>
                        ) : null}
                        {v.on ? (
                          <>
                            <div style={{ display: "flex", gap: "7px", flexWrap: "wrap" }}>
                              <button onClick={v.test} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                Test Connection
                              </button>
                              <button onClick={v.imp} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                Import Locks
                              </button>
                              <button onClick={v.automap} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                Auto-Map
                              </button>
                              <button onClick={v.instr} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                Instruction Images
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
              </div>
              {latchActive ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={"key"} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1" }}>
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Latch Digital Key Grants
                        </div>
                        <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Keys are issued against a visitor's tour window and expire automatically · {latchActiveCount}
                        </div>
                      </div>
                    </div>
                    {(latchKeys ?? []).map((k: any, kIdx: number) => (
                      <React.Fragment key={kIdx}>
                        <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {k.visitor}
                            </div>
                            <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {k.unit}
                            </div>
                          </div>
                          <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                            {k.window}
                          </div>
                          <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)", width: "84px", textAlign: "right" }}>
                            Issued {k.issued}
                          </div>
                          <StatusPill variant={k.v} label={k.state} />
                        </div>
                      </React.Fragment>
                    ))}
                    {!latchHasKeys ? (
                      <>
                        <div style={{ padding: "14px 0 2px", borderTop: "1px solid var(--bo-line-2)", font: "500 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          No key grants issued yet. Keys appear here when a visitor books a tour window.
                        </div>
                      </>
                    ) : null}
                  </div>
                </>
              ) : null}
              {(vendorCategories ?? []).map((cat: any, catIdx: number) => (
                <React.Fragment key={catIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px", marginBottom: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={cat.icon} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {cat.label}
                        </div>
                        <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {cat.sub} · {cat.summary}
                        </div>
                      </div>
                      <StatusPill variant={cat.activeV} label={cat.activePill} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "12px", alignItems: "start" }}>
                      {(cat.vendors ?? []).map((v: any, vIdx: number) => (
                        <React.Fragment key={vIdx}>
                          <div style={{ border: `1px solid ${v.cardBorder}`, background: v.cardBg, borderRadius: "10px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "11px" }}>
                            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}>
                              <div style={{ flex: "1", minWidth: "0" }}>
                                <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  {v.name}
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
                                {v.metaLabel}
                                <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                                  {v.metaValue}
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
                                  <button onClick={v.act} style={{ height: "32px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                    {v.actionLabel}
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
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
        {isAccessTab ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--bo-line)" }}>
                <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Access Log
                </div>
                <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Every lock actuation across all vendors and properties · {accessLogCount}
                </div>
              </div>
              <table>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--bo-line)", background: "#FAFAFB" }}>
                    <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Lock
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Tour User
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Property
                    </th>
                    <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      When
                    </th>
                    <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(accessLog ?? []).map((e: any, eIdx: number) => (
                    <React.Fragment key={eIdx}>
                      <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                        <td style={{ padding: "13px 18px" }}>
                          <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {e.lock}
                          </div>
                          <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {e.vendor}
                          </div>
                        </td>
                        <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                          {e.user}
                        </td>
                        <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                          {e.property}
                        </td>
                        <td style={{ padding: "13px 18px", font: "600 12.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {e.when}
                        </td>
                        <td style={{ padding: "13px 18px", textAlign: "right" }}>
                          <StatusPill variant={e.v} label={e.result} />
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
