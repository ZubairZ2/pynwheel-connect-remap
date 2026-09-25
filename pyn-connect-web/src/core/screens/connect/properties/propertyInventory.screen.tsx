'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { usePropertyInventoryScreen } from '~/core/hooks/connect/usePropertyInventoryScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const PropertyInventoryScreen = () => {
  const {
    addAmenity,
    addFloorplan,
    addFloorplate,
    addUnit,
    backToProperty,
    floorplateSummary,
    floorplates,
    goMapEditor,
    goProperties,
    goTourSetup,
    invAmenities,
    invFloorplans,
    invHasAmenities,
    invHasFloorplans,
    invHasUnits,
    invUnits,
    isTcAmenities,
    isTcFloorplans,
    isTcFloorplates,
    isTcUnits,
    isTcUnplotted,
    lastSync,
    plotAllUnits,
    prop,
    puMassOverride,
    publishTour,
    resyncPms,
    tcTabs,
    unplottedAmenities,
    unplottedAmenitiesClear,
    unplottedAmenityCount,
    unplottedClear,
    unplottedCount,
    unplottedUnits
  } = usePropertyInventoryScreen();

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
            Inventory
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
              Property Inventory<DemoMark />
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              {floorplateSummary} · {prop.pubDetail}
            </div>
          </div>
          <button onClick={goMapEditor} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Map &amp; Plotting
          </button>
          <button onClick={goTourSetup} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Tour Setup
          </button>
          <button onClick={publishTour} style={{ height: "38px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            <Icon name={"upload"} style={{ display: "flex" }} />
            Publish to Touch App
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(tcTabs ?? []).map((t: any, tIdx: number) => (
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
        {isTcFloorplates ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Floorplates<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    The layout of each floor in each building — one site plan per floorplate, and the surface units and amenities are plotted on
                  </div>
                </div>
                <button onClick={addFloorplate} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Add Floorplate
                </button>
              </div>
              {(floorplates ?? []).map((fp: any, fpIdx: number) => (
                <React.Fragment key={fpIdx}>
                  <div style={{ background: "var(--bo-panel)", border: `1px solid ${fp.rowBorder}`, borderRadius: "12px", padding: "15px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={"properties"} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <span style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {fp.floor}<DemoMark />
                          </span>
                          <StatusPill variant={fp.planV} label={fp.planLabel} />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {fp.building} · {fp.rangeLabel}
                        </div>
                      </div>
                      <div style={{ width: "200px", flexShrink: "0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)", marginBottom: "5px" }}>
                          <span>
                            {fp.unitLabel} · {fp.amenityLabel}
                          </span>
                          <span style={{ fontWeight: "800", color: "var(--bo-ink)" }}>
                            {fp.plottedLabel}
                          </span>
                        </div>
                        <div style={{ height: "6px", borderRadius: "999px", background: "#EEF0F4", overflow: "hidden" }}>
                          <div style={{ height: "6px", width: fp.barPct, background: "var(--bo-accent)", borderRadius: "999px" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "7px", flexShrink: "0" }}>
                        <button onClick={fp.open} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                          Open Plotting
                        </button>
                        <button onClick={fp.edit} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={fp.remove} style={{ height: "34px", padding: "0 13px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", margin: "-4px 0 4px" }}>
                      <div style={{ border: `1px solid ${fp.bgBorder}`, background: fp.bgBg, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Background Image<DemoMark />
                          </div>
                          <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {fp.bgFile}<DemoMark />
                          </div>
                          <div style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Raster context under the floor — aerial, render or scan
                          </div>
                        </div>
                        <button onClick={fp.uploadBg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                          Upload
                        </button>
                        {fp.hasBg ? (
                          <>
                            <button onClick={fp.dropBg} style={{ height: "30px", padding: "0 11px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                      <div style={{ border: `1px solid ${fp.svgBorder}`, background: fp.svgBg, borderRadius: "10px", padding: "12px 14px", display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Floor SVG<DemoMark />
                          </div>
                          <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {fp.svgFile}<DemoMark />
                          </div>
                          <div style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Vector geometry only — keeps the map light and fast on the kiosk
                          </div>
                        </div>
                        <button onClick={fp.uploadSvgFile} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                          Upload
                        </button>
                        {fp.hasSvg ? (
                          <>
                            <button onClick={fp.optimizeSvg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", flexShrink: "0" }}>
                              Optimize SVG
                            </button>
                            <button onClick={fp.dropSvg} style={{ height: "30px", padding: "0 11px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                              Remove
                            </button>
                          </>
                        ) : null}
                      </div>
                      {fp.optRun ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "11px 14px", background: "#FBFBFC" }}>
                            <StatusPill variant={fp.optStatusV} label={fp.optStatusLabel} />
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                File Size
                              </span>
                              <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                {fp.optSize}<DemoMark />
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Nodes
                              </span>
                              <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                {fp.optNodes}<DemoMark />
                              </span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Paths
                              </span>
                              <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                                {fp.optPaths}<DemoMark />
                              </span>
                            </div>
                            <div style={{ flex: "1", font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {fp.optNote}
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
        {isTcFloorplans ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Floorplans<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Unit types, lease-term pricing and marketing imagery · fields marked Manual are protected from the next PMS sync
                  </div>
                </div>
                <button onClick={addFloorplan} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Add Floorplan
                </button>
              </div>
              {(invFloorplans ?? []).map((f: any, fIdx: number) => (
                <React.Fragment key={fIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ flex: "1" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <span style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {f.name}<DemoMark />
                          </span>
                          <StatusPill variant={f.statusV} label={f.statusLabel} />
                        </div>
                        <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          {f.bedLabel} · {f.sqftLabel} · {f.unitCount}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {f.rentLabel}<DemoMark />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Deposit {f.depositLabel}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "7px" }}>
                        <button onClick={f.addPhoto} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Add Photo
                        </button>
                        <button onClick={f.edit} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={f.remove} style={{ height: "32px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Field source<DemoMark />
                      </span>
                      {(f.srcRows ?? []).map((sr: any, srIdx: number) => (
                        <React.Fragment key={srIdx}>
                          <button onClick={sr.toggle} style={{ height: "28px", padding: "0 10px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
                            {sr.label}
                            <StatusPill variant={sr.srcV} label={sr.srcLabel} />
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                    {f.hasPhotos ? (
                      <>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "14px" }}>
                          {(f.photos ?? []).map((p: any, pIdx: number) => (
                            <React.Fragment key={pIdx}>
                              <div style={{ width: "150px", border: "1px solid var(--bo-line)", borderRadius: "9px", overflow: "hidden" }}>
                                <div role="img" aria-label="Floorplan image" style={{ width: "100%", height: "96px", backgroundImage: `url(${p.src})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#EEF0F4" }} />
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
                                  <button onClick={p.drop} aria-label="Remove photo" style={{ width: "24px", height: "24px", borderRadius: "5px", border: "1px solid #F7CFD5", background: "#fff", color: "#C62534", cursor: "pointer", font: "700 11px var(--bo-font)" }}>
                                    ×
                                  </button>
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </>
                    ) : null}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                      <div>
                        <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "7px" }}>
                          Lease-Term Pricing<DemoMark />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                          {(f.termRows ?? []).map((t: any, tIdx: number) => (
                            <React.Fragment key={tIdx}>
                              <div style={{ border: `1px solid ${t.border}`, background: t.bg, borderRadius: "9px", padding: "9px 11px" }}>
                                <div style={{ font: "700 10.5px var(--bo-font)", color: t.labelColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                  {t.label}<DemoMark />
                                </div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "1px" }}>
                                  <span style={{ font: "800 15px var(--bo-font)", color: t.valueColor }}>
                                    $<DemoMark />
                                  </span>
                                  <input value={t.fmt} onChange={t.onChange} style={{ flex: "1", minWidth: "0", border: "none", outline: "none", background: "transparent", font: "800 15px var(--bo-font)", color: t.valueColor, padding: "2px 0 0" }} />
                                  <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                                    /mo<DemoMark />
                                  </span>
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "7px" }}>
                          Virtual Tour<DemoMark />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", border: "1px solid var(--bo-line)", borderRadius: "9px", padding: "11px 13px" }}>
                          <Icon name={"cube"} style={{ display: "flex", color: "var(--bo-accent)" }} />
                          <a href="#" style={{ flex: "1", font: "700 12.5px var(--bo-font)" }}>
                            {f.tourUrl}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {!invHasFloorplans ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No floorplans yet. Connect an availability feed to import unit types.
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {isTcUnits ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    PMS-synced inventory<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Last sync {lastSync} · fields marked Manual are protected from the next sync
                  </div>
                </div>
                <button onClick={resyncPms} style={{ height: "34px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Re-sync from PMS
                </button>
                <button onClick={puMassOverride} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Mass Overrides
                </button>
                <button onClick={addUnit} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Add Unit
                </button>
              </div>
              {(invUnits ?? []).map((u: any, uIdx: number) => (
                <React.Fragment key={uIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                      <div onClick={u.open} style={{ flex: "1", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <span style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {u.name}<DemoMark />
                          </span>
                          <StatusPill variant={u.availV} label={u.availLabel} />
                          <StatusPill variant={u.plottedV} label={u.plottedLabel} />
                        </div>
                        <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          {u.fpName} · {u.where} · {u.photoCount}
                        </div>
                      </div>
                      <Icon name={"lock"} title={u.lockTitle} style={{ display: "inline-flex", color: u.lockColor }} aria-label={u.lockTitle} />
                      <button onClick={u.manageImages} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        <Icon name={"image"} style={{ display: "flex" }} />
                        Images
                      </button>
                      <button onClick={u.open} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                        Open Unit
                      </button>
                      <button onClick={u.edit} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={u.remove} style={{ height: "32px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "10px" }}>
                      {(u.fields ?? []).map((f: any, fIdx: number) => (
                        <React.Fragment key={fIdx}>
                          <div style={{ border: "1px solid var(--bo-line)", borderRadius: "9px", padding: "10px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "3px" }}>
                              <span style={{ font: "700 10.5px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", flex: "1" }}>
                                {f.label}<DemoMark />
                              </span>
                              <StatusPill variant={f.srcV} label={f.srcLabel} />
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", flex: "1" }}>
                                {f.value}<DemoMark />
                              </span>
                              <button onClick={f.toggle} style={{ height: "26px", padding: "0 9px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "700 10.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                Toggle
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {!invHasUnits ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No units in inventory. Connect an availability feed on the Integrations Hub.
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {isTcAmenities ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Amenities<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Name, category, floorplate and gallery — the same records that become tour stops
                  </div>
                </div>
                <button onClick={addAmenity} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Add Amenity
                </button>
              </div>
              {(invAmenities ?? []).map((a: any, aIdx: number) => (
                <React.Fragment key={aIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                      <div style={{ flex: "1" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                          <span style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {a.name}<DemoMark />
                          </span>
                          <StatusPill variant={a.plottedV} label={a.plottedLabel} />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {a.whereLabel} · {a.photoCount} in gallery
                        </div>
                      </div>
                      <select value={a.category} onChange={a.onCat} className="bo-field" style={{ width: "auto", minWidth: "190px", textTransform: "none" }}>
                        {(a.categoryOptions ?? []).map((c: any, cIdx: number) => (
                          <React.Fragment key={cIdx}>
                            <option value={c}>
                              {c}
                            </option>
                          </React.Fragment>
                        ))}
                      </select>
                      <button onClick={a.addPhoto} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                        Add Photo
                      </button>
                      <button onClick={a.edit} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                        Edit
                      </button>
                      <button onClick={a.remove} style={{ height: "34px", padding: "0 13px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                        Delete
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      {(a.photos ?? []).map((p: any, pIdx: number) => (
                        <React.Fragment key={pIdx}>
                          <div style={{ width: "150px", border: "1px solid var(--bo-line)", borderRadius: "9px", overflow: "hidden" }}>
                            <div role="img" aria-label="Amenity photo" style={{ width: "100%", height: "96px", backgroundImage: `url(${p.src})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#EEF0F4" }} />
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
                              <button onClick={p.drop} aria-label="Remove photo" style={{ width: "24px", height: "24px", borderRadius: "5px", border: "1px solid #F7CFD5", background: "#fff", color: "#C62534", cursor: "pointer", font: "700 11px var(--bo-font)" }}>
                                ×
                              </button>
                            </div>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {!invHasAmenities ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No amenities yet.
                  </div>
                </>
              ) : null}
            </div>
          </>
        ) : null}
        {isTcUnplotted ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Unplotted Units<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {unplottedCount} · Plot on Map opens the editor with that unit armed
                  </div>
                </div>
                <button onClick={plotAllUnits} style={{ height: "34px", padding: "0 14px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  Auto-Plot All
                </button>
              </div>
              {unplottedClear ? (
                <>
                  <div style={{ padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Every unit in inventory is placed on the map.
                  </div>
                </>
              ) : null}
              {!unplottedClear ? (
                <>
                  <table>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--bo-line)", background: "#FAFAFB" }}>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Unit
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Floorplan
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Location
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Price
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Availability
                        </th>
                        <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(unplottedUnits ?? []).map((u: any, uIdx: number) => (
                        <React.Fragment key={uIdx}>
                          <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                            <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {u.name}
                            </td>
                            <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                              {u.fpName}
                            </td>
                            <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                              {u.where}
                            </td>
                            <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {u.priceLabel}
                            </td>
                            <td style={{ padding: "13px 18px" }}>
                              <StatusPill variant={u.availV} label={u.availLabel} />
                            </td>
                            <td style={{ padding: "13px 18px", textAlign: "right" }}>
                              <button onClick={u.plot} style={{ height: "30px", padding: "0 12px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                                Plot on Map
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden", marginTop: "16px" }}>
              <div style={{ padding: "15px 18px", borderBottom: "1px solid var(--bo-line)" }}>
                <div style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Unplotted Amenities<DemoMark />
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {unplottedAmenityCount}
                </div>
              </div>
              {unplottedAmenitiesClear ? (
                <>
                  <div style={{ padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Every amenity is placed on the map.
                  </div>
                </>
              ) : null}
              {!unplottedAmenitiesClear ? (
                <>
                  <table>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--bo-line)", background: "#FAFAFB" }}>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Amenity
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Category
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Location
                        </th>
                        <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Gallery
                        </th>
                        <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(unplottedAmenities ?? []).map((a: any, aIdx: number) => (
                        <React.Fragment key={aIdx}>
                          <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                            <td style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {a.name}
                            </td>
                            <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                              {a.category}
                            </td>
                            <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                              {a.where}
                            </td>
                            <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                              {a.photoCount}
                            </td>
                            <td style={{ padding: "13px 18px", textAlign: "right" }}>
                              <button onClick={a.plot} style={{ height: "30px", padding: "0 12px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                                Plot on Map
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
