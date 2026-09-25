'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useTourSetupScreen } from '~/core/hooks/connect/useTourSetupScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const TourSetupScreen = () => {
  const {
    addElevator,
    addStop,
    backToProperty,
    computeRoute,
    goIntegrations,
    goInventoryUnits,
    goMapEditor,
    goProperties,
    invElevators,
    invHasElevators,
    isTsElevators,
    isTsRouting,
    isTsStops,
    onRouteFrom,
    onRouteTo,
    prop,
    propHasNoStops,
    publishTour,
    routeColor,
    routeFrom,
    routeResult,
    routeTo,
    startPointRows,
    startPointsMissing,
    startPointsMissingLabel,
    stopOptions,
    stopSourcePool,
    tourStops,
    tsTabs
  } = useTourSetupScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
          <span onClick={goProperties} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            Properties
          </span>
          <span>
            /
          </span>
          <span onClick={backToProperty} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            {prop.name}
          </span>
          <span>
            /
          </span>
          <span style={{ color: "var(--bo-muted)" }}>
            Tour Setup
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
              Tour Setup<DemoMark />
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              Stops, elevator access and routing · {prop.pubDetail}
            </div>
          </div>
          <button onClick={goInventoryUnits} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Inventory
          </button>
          <button onClick={goMapEditor} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Map &amp; Plotting
          </button>
          <button onClick={addStop} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Stop
          </button>
          <button onClick={publishTour} style={{ height: "38px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            <Icon name={"upload"} style={{ display: "flex" }} />
            Publish to Touch App
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(tsTabs ?? []).map((t: any, tIdx: number) => (
            <React.Fragment key={tIdx}>
              <button onClick={t.go} style={{ height: "36px", padding: "0 14px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
                {t.label}
                <span style={{ font: "800 10.5px var(--bo-font)", background: t.badgeBg, color: t.badgeColor, padding: "2px 7px", borderRadius: "999px" }}>
                  {t.count}<DemoMark />
                </span>
              </button>
            </React.Fragment>
          ))}
        </div>
        {isTsStops ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <div style={{ flex: "1" }}>
                <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Tour Stops<DemoMark />
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  A stop is always a unit or an amenity promoted from inventory · {stopSourcePool}
                </div>
              </div>
            </div>
          </>
        ) : null}
        {isTsStops ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {(tourStops ?? []).map((s: any, sIdx: number) => (
                <React.Fragment key={sIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px", display: "flex", gap: "16px" }}>
                    {s.img ? (
                      <>
                        <div role="img" aria-label={s.name} style={{ width: "150px", height: "120px", flexShrink: "0", borderRadius: "10px", backgroundImage: `url(${s.img})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#EEF0F4" }} />
                      </>
                    ) : null}
                    <div style={{ flex: "1", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Icon name={s.icon} style={{ color: "var(--bo-accent)", display: "flex" }} />
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", flex: "1" }}>
                          {s.name}<DemoMark />
                        </div>
                        <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-muted)", background: "#EEF0F4", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase" }}>
                          {s.type}
                        </span>
                        <StatusPill variant={s.plotV} label={s.plotLabel} />
                        <button onClick={s.view} style={{ height: "28px", padding: "0 10px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", font: "700 11px var(--bo-font)", cursor: "pointer" }}>
                          {s.viewLabel}
                        </button>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button onClick={s.moveUp} aria-label="Move up" style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                          <button onClick={s.moveDown} aria-label="Move down" style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          <button onClick={s.edit} style={{ height: "28px", padding: "0 10px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", font: "700 11px var(--bo-font)", cursor: "pointer" }}>
                            Edit
                          </button>
                          <button onClick={s.remove} aria-label="Remove" style={{ width: "28px", height: "28px", borderRadius: "6px", border: "1px solid #F7CFD5", background: "#fff", color: "#C62534", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "16px", font: "600 12px var(--bo-font)", color: "var(--bo-muted)", flexWrap: "wrap" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icon name={"pin"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                          {s.floorLabel}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icon name={"properties"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                          {s.whereLabel}
                        </span>
                        <span style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {s.sourceLabel}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icon name={"ruler"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                          {s.distance} ft
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icon name={"clock"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                          {s.duration} min
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Icon name={"node"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                          Node {s.posLabel}
                        </span>
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", font: "700 11px var(--bo-font)", color: "var(--bo-accent)", marginBottom: "5px" }}>
                          <Icon name={"ai"} style={{ display: "flex" }} />
                          AI Concierge Talking Point
                        </div>
                        <textarea value={s.talkingPoint} onChange={s.onTalk} style={{ width: "100%", height: "52px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px", font: "500 12.5px/1.5 var(--bo-font)", color: "var(--bo-ink)", resize: "none", outline: "none", background: "#FBFBFC" }} />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {propHasNoStops ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No stops yet. Every stop is a unit or an amenity — click{' '}
                    <b style={{ color: "var(--bo-accent)" }}>
                      Add Stop
                    </b>
                    {' '}to promote one from inventory.
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {isTsElevators ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Elevators &amp; Smart-Lock Grants<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Gated banks issue a time-boxed key for the visitor's tour window · vendor keys live on the Integrations Hub
                  </div>
                </div>
                <button onClick={goIntegrations} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Lock Vendors
                </button>
                <button onClick={addElevator} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Add Elevator Bank
                </button>
              </div>
              {(invElevators ?? []).map((e: any, eIdx: number) => (
                <React.Fragment key={eIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={"properties"} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <span style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {e.name}<DemoMark />
                          </span>
                          <StatusPill variant={e.lockV} label={e.lockLabel} />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {e.building} · serves {e.rangeLabel} · {e.photoCount}
                        </div>
                      </div>
                      <span style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Smart-lock gated<DemoMark />
                      </span>
                      <div onClick={e.toggleLock} style={{ width: "44px", height: "26px", borderRadius: "999px", background: e.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                        <div style={{ position: "absolute", top: "3px", left: e.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                      <button onClick={e.addPhoto} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                        Add Photo
                      </button>
                      <button onClick={e.remove} style={{ height: "34px", padding: "0 13px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {(e.photos ?? []).map((p: any, pIdx: number) => (
                        <React.Fragment key={pIdx}>
                          <div style={{ width: "150px", border: "1px solid var(--bo-line)", borderRadius: "9px", overflow: "hidden" }}>
                            <div role="img" aria-label="Elevator photo" style={{ width: "100%", height: "96px", backgroundImage: `url(${p.src})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#EEF0F4" }} />
                            <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 8px" }}>
                              <span style={{ flex: "1", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                                {p.pos}<DemoMark />
                              </span>
                              <button onClick={p.up} aria-label="Move earlier" style={{ width: "24px", height: "24px", borderRadius: "5px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", cursor: "pointer", font: "700 11px var(--bo-font)" }}>
                                ←
                              </button>
                              <button onClick={p.down} aria-label="Move later" style={{ width: "24px", height: "24px", borderRadius: "5px", border: "1px solid var(--bo-line)", background: "#fff", color: "var(--bo-muted)", cursor: "pointer", font: "700 11px var(--bo-font)" }}>
                                →
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {!invHasElevators ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No elevator banks defined for this property.
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {isTsRouting ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                  Route Preview<DemoMark />
                </div>
                <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
                  Solves the shortest path across floors and buildings, including elevator and stair links
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <select value={routeFrom} onChange={onRouteFrom} className="bo-field" style={{ textTransform: "none" }}>
                    {(stopOptions ?? []).map((o: any, oIdx: number) => (
                      <React.Fragment key={oIdx}>
                        <option value={o.id}>
                          From: {o.name}
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                  <select value={routeTo} onChange={onRouteTo} className="bo-field" style={{ textTransform: "none" }}>
                    {(stopOptions ?? []).map((o: any, oIdx: number) => (
                      <React.Fragment key={oIdx}>
                        <option value={o.id}>
                          To: {o.name}
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                  <button onClick={computeRoute} style={{ height: "38px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                    Compute Multi-Floor Route
                  </button>
                  <div style={{ padding: "11px 12px", background: "#EEF0F3", borderRadius: "8px", font: "600 12px/1.5 var(--bo-font)", color: routeColor }}>
                    {routeResult}
                  </div>
                </div>
              </div>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "4px" }}>
                  <div style={{ flex: "1" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Building Starting Points<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      One designated entry per building — set them on the pathway graph
                    </div>
                  </div>
                  <button onClick={goMapEditor} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                    Open Map &amp; Plotting
                  </button>
                </div>
                {(startPointRows ?? []).map((b: any, bIdx: number) => (
                  <React.Fragment key={bIdx}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {b.building}<DemoMark />
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {b.name}
                        </div>
                      </div>
                      <StatusPill variant={b.v} label={b.state} />
                    </div>
                  </React.Fragment>
                ))}
                {startPointsMissing ? (
                  <>
                    <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                      {startPointsMissingLabel}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
