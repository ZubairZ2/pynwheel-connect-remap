'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useMapEditorScreen } from '~/core/hooks/connect/useMapEditorScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const MapEditorScreen = () => {
  const {
    autoPlot,
    autoPlotReport,
    backToProperty,
    bedLegend,
    clearPlan,
    clearPlotTarget,
    curLevelLabel,
    curPlanFile,
    curPlanKindLabel,
    deleteSelected,
    dismissAutoPlot,
    dropBg,
    dropBorder,
    dropLabel,
    dropSlotBgBg,
    dropSlotBgColor,
    dropSlotSvgBg,
    dropSlotSvgColor,
    edgeLines,
    goInventoryUnits,
    goProperties,
    goTourSetup,
    gridDisplay,
    gridKnob,
    gridToggleBg,
    hasAutoPlotReport,
    hasPlan,
    hasSelPin,
    hasSelection,
    hasVerticalLinks,
    invPins,
    levelNodeCount,
    mapCursor,
    mapHint,
    mapLevels,
    mapNodes,
    mapRef,
    mapTools,
    movePinToThisFloor,
    onMapDown,
    onMapMove,
    onMapUp,
    onPlanDragLeave,
    onPlanDragOver,
    onPlanDrop,
    onSelLabel,
    optimizeCurSvg,
    pickDropBg,
    pickDropSvg,
    planAerialOpacity,
    planBg,
    planCorridor,
    planCorridorFill,
    planEmptyLabel,
    planOptNodes,
    planOptNote,
    planOptPaths,
    planOptRun,
    planOptSize,
    planOptStatusLabel,
    planOptStatusV,
    planRects,
    planRoomFill,
    planRoomStroke,
    planShell,
    plotArmed,
    plotArmedLabel,
    plotDoneLabel,
    plotQueue,
    plotQueueEmpty,
    plotQueueLabel,
    prop,
    publishTour,
    removePin,
    selLabel,
    selMeta,
    selPin,
    setStartPoint,
    startPointRows,
    startPointsMissing,
    startPointsMissingLabel,
    toggleGrid,
    uploadRaster,
    uploadSvg,
    verticalLinks
  } = useMapEditorScreen();

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
            Map &amp; Plotting
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
              Map &amp; Plotting<DemoMark />
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              Site plans, unit and amenity pins, and the pathway graph. Tour stops and lock grants are managed on Tour Setup.
            </div>
          </div>
          <button onClick={goInventoryUnits} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Inventory
          </button>
          <button onClick={goTourSetup} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Tour Setup
          </button>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: "1", background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "12px 16px 0", display: "flex", alignItems: "flex-end", gap: "6px", flexWrap: "wrap" }}>
              {(mapLevels ?? []).map((l: any, lIdx: number) => (
                <React.Fragment key={lIdx}>
                  <button onClick={l.pick} style={{ padding: "7px 13px", border: `1px solid ${l.border}`, background: l.bg, borderRadius: "8px 8px 0 0", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ font: "700 9.5px var(--bo-font)", color: l.subColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {l.sub}
                    </div>
                    <div style={{ font: "800 12.5px var(--bo-font)", color: l.color }}>
                      {l.label}<DemoMark />
                    </div>
                  </button>
                </React.Fragment>
              ))}
            </div>
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bo-line)", borderTop: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              {(mapTools ?? []).map((t: any, tIdx: number) => (
                <React.Fragment key={tIdx}>
                  <button onClick={t.pick} style={{ height: "34px", padding: "0 12px", border: `1px solid ${t.border}`, background: t.bg, borderRadius: "7px", font: "700 12px var(--bo-font)", color: t.color, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Icon name={t.icon} style={{ display: "flex" }} />
                    {t.label}
                  </button>
                </React.Fragment>
              ))}
              <button onClick={autoPlot} style={{ height: "34px", padding: "0 12px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                <Icon name={"grid"} style={{ display: "flex" }} />
                Auto-Plot
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", paddingLeft: "4px" }}>
                <span style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                  Grid<DemoMark />
                </span>
                <div onClick={toggleGrid} style={{ width: "38px", height: "22px", borderRadius: "999px", background: gridToggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                  <div style={{ position: "absolute", top: "3px", left: gridKnob, width: "16px", height: "16px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                </div>
              </div>
              <div style={{ flex: "1" }} />
              <span style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                {mapHint}
              </span>
              <button onClick={publishTour} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                Publish
              </button>
            </div>
            <div style={{ padding: "9px 16px", borderBottom: "1px solid var(--bo-line)", background: "#FBFBFC", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ font: "800 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                {curLevelLabel}<DemoMark />
              </span>
              <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-muted)", background: "#EEF0F4", padding: "3px 8px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {curPlanKindLabel}
              </span>
              <span style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                {curPlanFile} · {levelNodeCount}
              </span>
              <div style={{ flex: "1" }} />
              <button onClick={uploadSvg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Upload SVG
              </button>
              <button onClick={uploadRaster} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Upload Image
              </button>
              <button onClick={optimizeCurSvg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                Optimize SVG
              </button>
              <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Drop target<DemoMark />
              </span>
              <button onClick={pickDropSvg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: dropSlotSvgBg, color: dropSlotSvgColor, borderRadius: "7px 0 0 7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                Floor SVG
              </button>
              <button onClick={pickDropBg} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: dropSlotBgBg, color: dropSlotBgColor, borderRadius: "0 7px 7px 0", font: "700 11.5px var(--bo-font)", cursor: "pointer", marginLeft: "-7px" }}>
                Background
              </button>
              {hasPlan ? (
                <>
                  <button onClick={clearPlan} style={{ height: "30px", padding: "0 11px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                    Remove Plan
                  </button>
                </>
              ) : null}
            </div>
            {planOptRun ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap", border: "1px solid var(--bo-line)", borderBottom: "none", padding: "11px 14px", background: "#FBFBFC" }}>
                  <StatusPill variant={planOptStatusV} label={planOptStatusLabel} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      File Size
                    </span>
                    <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {planOptSize}<DemoMark />
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Nodes
                    </span>
                    <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {planOptNodes}<DemoMark />
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                      Paths
                    </span>
                    <span style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {planOptPaths}<DemoMark />
                    </span>
                  </div>
                  <div style={{ flex: "1", minWidth: "180px", font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {planOptNote}
                  </div>
                </div>
              </>
            ) : null}
            <div ref={mapRef} data-testid="plan-surface" onPointerDown={onMapDown} onPointerMove={onMapMove} onPointerUp={onMapUp} style={{ position: "relative", height: "520px", background: planBg, touchAction: "none", cursor: mapCursor, userSelect: "none" }}>
              {hasPlan ? (
                <>
                  <img src="/images/site-plan.png" alt="Site plan" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", opacity: planAerialOpacity, pointerEvents: "none" }} />
                  <svg style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x={planShell.x} y={planShell.y} width={planShell.w} height={planShell.h} fill="none" stroke={planRoomStroke} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                    <rect x={planCorridor.x} y={planCorridor.y} width={planCorridor.w} height={planCorridor.h} fill={planCorridorFill} />
                    {(planRects ?? []).map((r: any, rIdx: number) => (
                      <React.Fragment key={rIdx}>
                        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={planRoomFill} stroke={planRoomStroke} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      </React.Fragment>
                    ))}
                  </svg>
                </>
              ) : null}
              {!hasPlan ? (
                <>
                  <div onDragOver={onPlanDragOver} onDragLeave={onPlanDragLeave} onDrop={onPlanDrop} onClick={uploadSvg} style={{ position: "absolute", inset: "0", display: "flex", alignItems: "center", justifyContent: "center", padding: "34px", background: "repeating-linear-gradient(45deg,#F4F5F7,#F4F5F7 12px,#EEF0F3 12px,#EEF0F3 24px)", cursor: "pointer" }}>
                    <div style={{ width: "100%", height: "100%", border: `2px dashed ${dropBorder}`, background: dropBg, borderRadius: "14px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                      <Icon name={"upload"} style={{ color: "var(--bo-accent)", display: "flex", transform: "scale(1.6)", marginBottom: "6px" }} />
                      <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {dropLabel}<DemoMark />
                      </div>
                      <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {planEmptyLabel} — the floor SVG carries the geometry, an optional background image sits underneath
                      </div>
                      <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                        <button onClick={uploadSvg} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                          Choose SVG File
                        </button>
                        <button onClick={uploadRaster} style={{ height: "34px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Upload Image Instead
                        </button>
                      </div>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        SVG keeps room boundaries crisp at kiosk resolution · PNG and JPG are accepted as a fallback
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
              <div style={{ position: "absolute", inset: "0", pointerEvents: "none", display: gridDisplay, backgroundImage: "linear-gradient(rgba(23,26,33,0.22) 1px,transparent 1px),linear-gradient(90deg,rgba(23,26,33,0.22) 1px,transparent 1px)", backgroundSize: "5% 5%" }} />
              <svg style={{ position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none" }} viewBox="0 0 100 100" preserveAspectRatio="none">
                {(edgeLines ?? []).map((e: any, eIdx: number) => (
                  <React.Fragment key={eIdx}>
                    <line x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={e.color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
                  </React.Fragment>
                ))}
              </svg>
              {(mapNodes ?? []).map((n: any, nIdx: number) => (
                <React.Fragment key={nIdx}>
                  <div data-node={n.nodeId} onPointerDown={n.down} style={{ position: "absolute", top: n.top, left: n.left, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", zIndex: n.z }}>
                    <div style={{ width: n.size, height: n.size, borderRadius: "999px", background: n.fill, border: n.ring, boxShadow: "0 1px 5px rgba(0,0,0,0.35)" }} />
                    <span style={{ font: "700 10px var(--bo-font)", color: "#fff", background: "rgba(20,22,28,0.78)", padding: "2px 7px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                      {n.label}
                    </span>
                  </div>
                </React.Fragment>
              ))}
              {(invPins ?? []).map((p: any, pIdx: number) => (
                <React.Fragment key={pIdx}>
                  <div data-node={p.pinId} onPointerDown={p.down} style={{ position: "absolute", top: p.top, left: p.left, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", cursor: "pointer", zIndex: p.z }}>
                    <div style={{ width: p.size, height: p.size, borderRadius: "999px", background: p.fill, border: p.ring, boxShadow: "0 1px 6px rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                      <Icon name={p.icon} style={{ display: "flex", transform: "scale(0.62)" }} />
                    </div>
                    <span style={{ font: "800 10px var(--bo-font)", color: "#fff", background: "rgba(20,22,28,0.86)", padding: "2px 7px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                      {p.label}<DemoMark />
                    </span>
                  </div>
                </React.Fragment>
              ))}
              {plotArmed ? (
                <>
                  <div style={{ position: "absolute", left: "14px", right: "14px", bottom: "14px", display: "flex", alignItems: "center", gap: "10px", padding: "10px 13px", background: "rgba(20,22,28,0.9)", borderRadius: "9px" }}>
                    <Icon name={"pin"} style={{ color: "var(--bo-accent)", display: "flex", flexShrink: "0" }} />
                    <div style={{ flex: "1", font: "700 12px var(--bo-font)", color: "#fff" }}>
                      {plotArmedLabel}
                    </div>
                    <button onClick={clearPlotTarget} style={{ height: "28px", padding: "0 11px", border: "1px solid rgba(255,255,255,0.24)", background: "transparent", borderRadius: "6px", font: "700 11px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ width: "300px", flexShrink: "0", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Place Units &amp; Amenities<DemoMark />
                </div>
                <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-accent)" }}>
                  {plotDoneLabel}<DemoMark />
                </span>
              </div>
              <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "10px" }}>
                {plotQueueLabel} — pick one, then click the plan
              </div>
              {plotQueueEmpty ? (
                <>
                  <div style={{ padding: "12px", border: "1px dashed var(--bo-line)", borderRadius: "9px", font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", textAlign: "center" }}>
                    Everything in inventory is on the plan.
                  </div>
                </>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "210px", overflowY: "auto" }}>
                {(plotQueue ?? []).map((q: any, qIdx: number) => (
                  <React.Fragment key={qIdx}>
                    <div onClick={q.pick} style={{ display: "flex", alignItems: "center", gap: "9px", border: `1px solid ${q.border}`, background: q.bg, borderRadius: "8px", padding: "9px 10px", cursor: "pointer" }}>
                      <span style={{ width: "11px", height: "11px", borderRadius: "999px", background: q.dot, flexShrink: "0" }} />
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {q.name}
                        </div>
                        <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {q.kindLabel} · {q.where}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <button onClick={autoPlot} style={{ width: "100%", height: "34px", marginTop: "10px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                Auto-Plot from PMS Data
              </button>
            </div>
            {hasAutoPlotReport ? (
              <>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                        Auto-Plot Result<DemoMark />
                      </div>
                      <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {autoPlotReport.headline}
                      </div>
                    </div>
                    <button onClick={dismissAutoPlot} style={{ width: "24px", height: "24px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-muted)", font: "800 11px var(--bo-font)", cursor: "pointer", flexShrink: "0" }}>
                      ×
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                    <div style={{ flex: "1", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px" }}>
                      <div style={{ font: "800 18px var(--bo-font)", color: "#4A7212" }}>
                        {autoPlotReport.placed}<DemoMark />
                      </div>
                      <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Placed
                      </div>
                    </div>
                    <div style={{ flex: "1", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px" }}>
                      <div style={{ font: "800 18px var(--bo-font)", color: "#8A6A00" }}>
                        {autoPlotReport.skippedCount}<DemoMark />
                      </div>
                      <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Not placed
                      </div>
                    </div>
                  </div>
                  {autoPlotReport.hasSkipped ? (
                    <>
                      <div style={{ padding: "11px 12px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "7px" }}>
                        {(autoPlotReport.rows ?? []).map((r: any, rIdx: number) => (
                          <React.Fragment key={rIdx}>
                            <div>
                              <div style={{ font: "800 11.5px var(--bo-font)", color: "#8A6A00" }}>
                                {r.name}<DemoMark />
                              </div>
                              <div style={{ font: "600 11px/1.45 var(--bo-font)", color: "#8A6A00" }}>
                                {r.reason}
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
            {hasSelPin ? (
              <>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-accent)", borderRadius: "12px", padding: "18px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "4px" }}>
                    <span style={{ width: "13px", height: "13px", borderRadius: "999px", background: selPin.color, flexShrink: "0" }} />
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {selPin.name}<DemoMark />
                    </div>
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {selPin.meta}
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)", marginBottom: "10px" }}>
                    Pin at {selPin.coord} — switch to Move to drag it
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    {!selPin.onThisFloor ? (
                      <>
                        <button onClick={movePinToThisFloor} style={{ height: "34px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Move Pin to This Floor
                        </button>
                      </>
                    ) : null}
                    <button onClick={removePin} style={{ height: "34px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                      Remove Pin
                    </button>
                  </div>
                </div>
              </>
            ) : null}
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                Building Starting Points<DemoMark />
              </div>
              <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "10px" }}>
                One designated entry/exit per building
              </div>
              {(startPointRows ?? []).map((b: any, bIdx: number) => (
                <React.Fragment key={bIdx}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderTop: "1px solid var(--bo-line-2)" }}>
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
                  <div style={{ marginTop: "10px", padding: "10px 12px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                    {startPointsMissingLabel}
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "6px" }}>
                Selection<DemoMark />
              </div>
              {hasSelection ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <input value={selLabel} onChange={onSelLabel} className="bo-field" style={{ textTransform: "none" }} />
                    <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {selMeta}
                    </div>
                    <button onClick={setStartPoint} style={{ height: "36px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                      Set as Building Starting Point
                    </button>
                    <button onClick={deleteSelected} style={{ height: "36px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                      Delete Node
                    </button>
                  </div>
                </>
              ) : null}
              {!hasSelection ? (
                <>
                  <div style={{ font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-muted)" }}>
                    Switch floors with the tabs above the map.{' '}
                    <b>
                      Place Pin
                    </b>
                    {' '}drops the selected unit or amenity where you click;{' '}
                    <b>
                      Junction
                    </b>
                    {' '}adds a pathway node;{' '}
                    <b>
                      Connect
                    </b>
                    {' '}links two nodes — across floors it becomes a vertical connection;{' '}
                    <b>
                      Move
                    </b>
                    {' '}drags any pin or node.
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                Marker Colors by Bedroom<DemoMark />
              </div>
              <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "10px" }}>
                Unit pins take their color from bedroom count
              </div>
              {(bedLegend ?? []).map((t: any, tIdx: number) => (
                <React.Fragment key={tIdx}>
                  <div style={{ padding: "8px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "6px" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "999px", background: t.color }} />
                      <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {t.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "5px" }}>
                      {(t.swatches ?? []).map((w: any, wIdx: number) => (
                        <React.Fragment key={wIdx}>
                          <div onClick={w.pick} style={{ width: "19px", height: "19px", borderRadius: "5px", background: w.c, border: w.ring, cursor: "pointer" }} />
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
            {hasVerticalLinks ? (
              <>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                    Vertical Connections<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "8px" }}>
                    Links that leave this floor
                  </div>
                  {(verticalLinks ?? []).map((v: any, vIdx: number) => (
                    <React.Fragment key={vIdx}>
                      <div style={{ padding: "9px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                        <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {v.from} ↔ {v.to}
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {v.kind}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
};
