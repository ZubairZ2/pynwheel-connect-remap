'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { usePropertyDetailScreen } from '~/core/hooks/connect/usePropertyDetailScreen';

export const PropertyDetailScreen = () => {
  const {
    brandKickoffLabel,
    brandKickoffV,
    confirmDeleteProperty,
    editProperty,
    editRates,
    goBranding,
    goBuilds,
    goContent,
    goIntegrations,
    goInventoryUnits,
    goMapEditor,
    goPropPricing,
    goProperties,
    idvProviderOptions,
    ilsDetailPartners,
    inventoryCards,
    mapConfigOpacity,
    mapDisplayOptions,
    mapsOff,
    productCards,
    productSummary,
    prop,
    prop3DKnob,
    prop3DToggleBg,
    propBilling,
    propBuildingLabel,
    propBuildings,
    propEdgeCount,
    propMultiBuilding,
    propNodeCount,
    publishTour,
    qrStamp,
    regenQr,
    stageSteps,
    theme,
    togglePropMap,
    touchDisplayOptions,
    tourBtnOpacity,
    tourSetupAccess,
    tourSetupTitle
  } = usePropertyDetailScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
          <span onClick={goProperties} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            Properties
          </span>
          <span>
            /
          </span>
          <span style={{ color: "var(--bo-muted)" }}>
            {prop.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ font: "800 22px var(--bo-font)", color: "var(--bo-ink)" }}>
                {prop.name}
              </div>
              <StatusPill variant={prop.statusV} label={prop.status} />
            </div>
            <div style={{ font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
              {prop.org} · {prop.city} · {prop.units} units
            </div>
          </div>
          <button onClick={editProperty} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Edit
          </button>
          <button onClick={confirmDeleteProperty} style={{ height: "38px", padding: "0 14px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
            Delete
          </button>
        </div>
        <div style={{ background: "linear-gradient(100deg,#1C1F29,#14161C)", borderRadius: "14px", padding: "20px 22px", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
          <div style={{ width: "44px", height: "44px", borderRadius: "11px", background: "rgba(0,119,174,0.18)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"rocket"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1 1 260px", minWidth: "260px" }}>
            <div style={{ font: "800 16px var(--bo-font)", color: "#fff", whiteSpace: "nowrap" }}>
              Live Products
            </div>
            <div style={{ font: "500 12.5px var(--bo-font)", color: "var(--bo-nav-txt)" }}>
              {productSummary}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button onClick={goInventoryUnits} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
              Inventory
            </button>
            <button onClick={goMapEditor} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
              Map &amp; Plotting
            </button>
            <button onClick={goPropPricing} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
              Pricing Calculator
            </button>
            <button onClick={tourSetupAccess} title={tourSetupTitle} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", opacity: tourBtnOpacity }}>
              Tour Setup
            </button>
            <button onClick={goBranding} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
              Branding
            </button>
            <button onClick={goContent} style={{ height: "40px", padding: "0 16px", border: "1px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
              Content
            </button>
            <button onClick={publishTour} style={{ height: "40px", padding: "0 18px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon name={"upload"} style={{ display: "flex" }} />
              Publish Updates
            </button>
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Deployment Lifecycle
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Current stage: {prop.stageLabel}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {(stageSteps ?? []).map((st: any, stIdx: number) => (
              <React.Fragment key={stIdx}>
                <div onClick={st.set} style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", cursor: "pointer", padding: "0 4px" }}>
                  <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                    <div style={{ flex: "1", height: "2px", background: st.lineBg }} />
                    <div style={{ width: "28px", height: "28px", borderRadius: "999px", flexShrink: "0", display: "flex", alignItems: "center", justifyContent: "center", background: st.circleBg, border: `2px solid ${st.circleBorder}`, color: st.circleColor, font: "800 12px var(--bo-font)" }}>
                      {st.num}
                    </div>
                    <div style={{ flex: "1", height: "2px", background: st.lineBg }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ font: `${st.labelWeight} 12px var(--bo-font)`, color: st.labelColor }}>
                      {st.label}
                    </div>
                    <div style={{ font: "500 10.5px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "2px" }}>
                      {st.desc}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Products
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(productCards ?? []).map((p: any, pIdx: number) => (
                <React.Fragment key={pIdx}>
                  <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: p.iconBg, color: p.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={p.icon} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "800 12.5px var(--bo-font)", color: p.nameColor }}>
                          {p.name}
                        </div>
                        <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {p.metric}
                        </div>
                      </div>
                      {p.showCaret ? (
                        <>
                          <button onClick={p.toggleExpand} style={{ width: "24px", height: "24px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "800 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                            {p.caret}
                          </button>
                        </>
                      ) : null}
                      <div onClick={p.toggle} style={{ width: "42px", height: "24px", borderRadius: "999px", background: p.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                        <div style={{ position: "absolute", top: "3px", left: p.knob, width: "18px", height: "18px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                    </div>
                    {p.expanded ? (
                      <>
                        <div style={{ borderTop: "1px solid var(--bo-line-2)", background: "#FBFBFC", padding: "12px", display: "flex", flexDirection: "column", gap: "11px" }}>
                          {p.isTouch ? (
                            <>
                              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Kiosk Display Type
                                </span>
                                <select value={p.tDisplay} onChange={p.onTDisplay} className="bo-field" style={{ textTransform: "none", height: "34px" }}>
                                  {(touchDisplayOptions ?? []).map((o: any, oIdx: number) => (
                                    <React.Fragment key={oIdx}>
                                      <option value={o.id}>
                                        {o.label}
                                      </option>
                                    </React.Fragment>
                                  ))}
                                </select>
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  MDU Mode{' '}
                                  <span style={{ fontWeight: "600", color: "var(--bo-subtle)" }}>
                                    · multi-dwelling
                                  </span>
                                </div>
                                <div onClick={p.toggleTMdu} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.tMduBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.tMduKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  ID Verification Provider
                                </span>
                                <select value={p.tIdv} onChange={p.onTIdv} className="bo-field" style={{ textTransform: "none", height: "34px" }}>
                                  {(idvProviderOptions ?? []).map((o: any, oIdx: number) => (
                                    <React.Fragment key={oIdx}>
                                      <option value={o.id}>
                                        {o.label}
                                      </option>
                                    </React.Fragment>
                                  ))}
                                </select>
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  Enable Locks
                                </div>
                                <div onClick={p.toggleTLocks} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.tLocksBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.tLocksKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Subscription Start Date
                                </span>
                                <input type="date" value={p.tStart} onChange={p.onTStart} className="bo-field" style={{ textTransform: "none", height: "34px" }} />
                              </label>
                            </>
                          ) : null}
                          {p.isTour ? (
                            <>
                              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Subscription Start Date
                                </span>
                                <input type="date" value={p.tourStart} onChange={p.onTourStart} className="bo-field" style={{ textTransform: "none", height: "34px" }} />
                              </label>
                              <div style={{ font: "600 11px/1.55 var(--bo-font)", color: "var(--bo-subtle)" }}>
                                Configure stops, elevators and locks in{' '}
                                <span onClick={p.goTourSetup} style={{ color: "var(--bo-accent)", cursor: "pointer", fontWeight: "700" }}>
                                  Tour Setup
                                </span>
                                , and booking behavior in{' '}
                                <span onClick={p.goScheduling} style={{ color: "var(--bo-accent)", cursor: "pointer", fontWeight: "700" }}>
                                  Tour Scheduling
                                </span>
                                .
                              </div>
                            </>
                          ) : null}
                          {p.isMaps ? (
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  Beans.ai 3D Maps
                                </div>
                                <div onClick={p.toggleMBeans} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.mBeansBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.mBeansKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  SVG Mode
                                </div>
                                <div onClick={p.toggleMSvg} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.mSvgBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.mSvgKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  Automate Wayfinding
                                </div>
                                <div onClick={p.toggleMWayfind} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.mWayfindBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.mWayfindKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                              <label style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  Map Display Type
                                </span>
                                <select value={p.mDisplay} onChange={p.onMDisplay} className="bo-field" style={{ textTransform: "none", height: "34px" }}>
                                  {(mapDisplayOptions ?? []).map((o: any, oIdx: number) => (
                                    <React.Fragment key={oIdx}>
                                      <option value={o.id}>
                                        {o.label}
                                      </option>
                                    </React.Fragment>
                                  ))}
                                </select>
                              </label>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div style={{ flex: "1", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                  Gesture Icons
                                </div>
                                <div onClick={p.toggleMGestures} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.mGesturesBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                  <div style={{ position: "absolute", top: "3px", left: p.mGesturesKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Design System
              </div>
              <StatusPill variant={brandKickoffV} label={brandKickoffLabel} />
            </div>
            <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", overflow: "hidden" }}>
              <img src="/images/amenity-thumb.jpg" alt="Property hero" style={{ width: "100%", height: "96px", objectFit: "cover", display: "block" }} />
              <div style={{ padding: "10px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "7px", background: theme.primary }} />
                <div>
                  <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {theme.themeName}
                  </div>
                  <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {theme.font} · {theme.heroLabel}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <div style={{ flex: "2", height: "22px", borderRadius: "5px", background: theme.primary }} />
              <div style={{ flex: "1", height: "22px", borderRadius: "5px", background: theme.secondary }} />
              <div style={{ flex: "1", height: "22px", borderRadius: "5px", background: "#EEF0F4" }} />
            </div>
            <button onClick={goBranding} style={{ height: "36px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
              Open Design System &amp; Branding
            </button>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Entry QR Codes
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <div style={{ flex: "1", textAlign: "center" }}>
                <div style={{ width: "100%", aspectRatio: "1", border: "1px solid var(--bo-line)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--bo-ink)">
                    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm0 4h3v4h-2v-2h-1v-2zm-5-4h3v3h-2v-1h-1v-2z" />
                  </svg>
                </div>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-muted)", marginTop: "6px" }}>
                  Lobby
                </div>
              </div>
              <div style={{ flex: "1", textAlign: "center" }}>
                <div style={{ width: "100%", aspectRatio: "1", border: "1px solid var(--bo-line)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="var(--bo-ink)">
                    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm0 4h3v4h-2v-2h-1v-2zm-5-4h3v3h-2v-1h-1v-2z" />
                  </svg>
                </div>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-muted)", marginTop: "6px" }}>
                  Gate
                </div>
              </div>
            </div>
            <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
              {qrStamp}
            </div>
            <button onClick={regenQr} style={{ height: "36px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
              Regenerate Codes
            </button>
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
              <Icon name={"broadcast"} style={{ display: "flex" }} />
            </div>
            <div style={{ flex: "1" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                ILS Syndication
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                Where this property's listing is published · manage the full portfolio in Partner Configuration
              </div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
            {(ilsDetailPartners ?? []).map((p: any, pIdx: number) => (
              <React.Fragment key={pIdx}>
                <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "13px", display: "flex", alignItems: "center", gap: "11px" }}>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {p.name}
                    </div>
                    <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {p.statusLabel}
                    </div>
                  </div>
                  <div onClick={p.toggle} style={{ width: "40px", height: "23px", borderRadius: "999px", background: p.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                    <div style={{ position: "absolute", top: "3px", left: p.knob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <div>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Inventory
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                {propBuildingLabel} · sub-communities supported
              </div>
            </div>
            <button onClick={goInventoryUnits} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
              Manage Inventory
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
            {(inventoryCards ?? []).map((c: any, cIdx: number) => (
              <React.Fragment key={cIdx}>
                <div onClick={c.open} style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                    <Icon name={c.icon} style={{ display: "flex" }} />
                  </div>
                  <div>
                    <div style={{ font: "800 19px var(--bo-font)", color: "var(--bo-ink)", lineHeight: "1.1" }}>
                      {c.value}
                    </div>
                    <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      {c.label}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>
          {propMultiBuilding ? (
            <>
              <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px solid var(--bo-line-2)" }}>
                <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
                  Sub-communities
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {(propBuildings ?? []).map((b: any, bIdx: number) => (
                    <React.Fragment key={bIdx}>
                      <div style={{ border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "8px 12px", display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {b.name}
                        </span>
                        <span style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {b.units} units
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
              <div>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Billing Rate Card
                </div>
                <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Per-property rates · {propBilling.cadence} · {propBilling.month}
                </div>
              </div>
              <button onClick={editRates} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Edit Rates
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
              <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "13px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Touch Kiosk
                </div>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)", marginTop: "4px" }}>
                  {propBilling.touch}
                </div>
              </div>
              <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "13px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Self-Guided Tour
                </div>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)", marginTop: "4px" }}>
                  {propBilling.tour}
                </div>
              </div>
              <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "13px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Maps
                </div>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-ink)", marginTop: "4px" }}>
                  {propBilling.maps}
                </div>
              </div>
              <div style={{ border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "10px", padding: "13px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Combined
                </div>
                <div style={{ font: "800 18px var(--bo-font)", color: "var(--bo-accent)", marginTop: "4px" }}>
                  {propBilling.combined}
                </div>
              </div>
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px", display: "flex", flexDirection: "column", gap: "12px", opacity: mapConfigOpacity }}>
            <div>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Map Configuration
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                2D and 3D are configured separately
              </div>
            </div>
            {mapsOff ? (
              <>
                <div style={{ border: "1px solid #FFECAE", background: "#FFF4D4", borderRadius: "8px", padding: "9px 12px", font: "600 11.5px var(--bo-font)", color: "#8A6A00" }}>
                  Enable Pynwheel Maps above to configure.
                </div>
              </>
            ) : null}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                <Icon name={"map"} style={{ display: "flex" }} />
              </div>
              <div style={{ flex: "1" }}>
                <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                  2D Map &amp; Pathways
                </div>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {propNodeCount} nodes · {propEdgeCount} connections
                </div>
              </div>
              <StatusPill variant="ok" label="Active" />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                <Icon name={"cube"} style={{ display: "flex" }} />
              </div>
              <div style={{ flex: "1" }}>
                <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                  3D Maps
                </div>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Separate 3D model configuration
                </div>
              </div>
              <div onClick={togglePropMap} style={{ width: "44px", height: "26px", borderRadius: "999px", background: prop3DToggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                <div style={{ position: "absolute", top: "3px", left: prop3DKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
              </div>
            </div>
            <button onClick={goMapEditor} style={{ height: "36px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
              Open Map Editor
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div onClick={goIntegrations} style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Integrations
              </div>
              <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                Locks, CRM, Data Feed, ILS
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
          <div onClick={goBuilds} style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                White-Label Build
              </div>
              <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                App status: {prop.status}
              </div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bo-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
};
