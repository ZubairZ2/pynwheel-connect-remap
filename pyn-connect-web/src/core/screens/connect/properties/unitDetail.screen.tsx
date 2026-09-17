'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useUnitDetailScreen } from '~/core/hooks/connect/useUnitDetailScreen';

export const UnitDetailScreen = () => {
  const {
    backToProperty,
    goInventoryFromUnit,
    goProperties,
    prop,
    resyncPms,
    unitDetail
  } = useUnitDetailScreen();

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
          <span onClick={goInventoryFromUnit} style={{ cursor: "pointer", color: "var(--bo-accent)" }}>
            Units
          </span>
          <span>
            /
          </span>
          <span style={{ color: "var(--bo-muted)" }}>
            {unitDetail.name}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ font: "800 22px var(--bo-font)", color: "var(--bo-ink)" }}>
                {unitDetail.name}
              </div>
              <StatusPill variant={unitDetail.availV} label={unitDetail.availLabel} />
              <StatusPill variant={unitDetail.plottedV} label={unitDetail.plottedLabel} />
            </div>
            <div style={{ font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
              {unitDetail.fpName} · {unitDetail.bedLabel} · {unitDetail.where}
            </div>
          </div>
          <button onClick={unitDetail.view} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            {unitDetail.viewLabel}
          </button>
          <button onClick={unitDetail.edit} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Edit Unit
          </button>
          <button onClick={unitDetail.remove} style={{ height: "38px", padding: "0 14px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
            Delete
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Unit Data
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Typing in a field marks it Manual — the next PMS sync leaves it alone
                  </div>
                </div>
                <button onClick={resyncPms} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Re-sync from PMS
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {(unitDetail.fields ?? []).map((fd: any, fdIdx: number) => (
                  <React.Fragment key={fdIdx}>
                    <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ flex: "1", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {fd.label}
                        </span>
                        <StatusPill variant={fd.srcV} label={fd.srcLabel} />
                        <button onClick={fd.toggle} style={{ height: "24px", padding: "0 8px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "700 10.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          Toggle
                        </button>
                      </div>
                      <input value={fd.value} onChange={fd.onChange} className="bo-field" style={{ textTransform: "none", fontWeight: "800" }} />
                    </div>
                  </React.Fragment>
                ))}
                <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                    Availability
                  </div>
                  <select value={unitDetail.avail} onChange={unitDetail.onAvail} className="bo-field" style={{ textTransform: "none" }}>
                    {(unitDetail.availOptions ?? []).map((o: any, oIdx: number) => (
                      <React.Fragment key={oIdx}>
                        <option value={o}>
                          {o}
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                </div>
                <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "6px" }}>
                    PMS Floor / Building
                  </div>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {unitDetail.pmsFloor}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Unit Gallery
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {unitDetail.photoCount} · first image is the card thumbnail on the kiosk
                  </div>
                </div>
                <button onClick={unitDetail.addPhoto} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Add Photo
                </button>
              </div>
              {unitDetail.hasPhotos ? (
                <>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    {(unitDetail.photos ?? []).map((p: any, pIdx: number) => (
                      <React.Fragment key={pIdx}>
                        <div style={{ width: "150px", border: "1px solid var(--bo-line)", borderRadius: "9px", overflow: "hidden" }}>
                          <div role="img" aria-label="Unit photo" style={{ width: "100%", height: "96px", backgroundImage: `url(${p.src})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#EEF0F4" }} />
                          <div style={{ display: "flex", alignItems: "center", gap: "5px", padding: "6px 8px" }}>
                            <span style={{ flex: "1", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {p.pos}
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
              {!unitDetail.hasPhotos ? (
                <>
                  <div style={{ border: "1px dashed var(--bo-line)", borderRadius: "10px", padding: "28px", textAlign: "center", font: "600 12.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No photos yet. The kiosk falls back to the floorplan gallery until one is added.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                Placement
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
                {unitDetail.where} · pin at {unitDetail.coord}
              </div>
              <button onClick={unitDetail.view} style={{ width: "100%", height: "36px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                {unitDetail.viewLabel}
              </button>
              {unitDetail.notPlotted ? (
                <>
                  <div style={{ marginTop: "12px", padding: "10px 12px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                    This unit has no pin. Visitors cannot find it on the map or route to it until it is plotted.
                  </div>
                </>
              ) : null}
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                Lease-Term Pricing
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
                Inherited from {unitDetail.fpName}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "8px" }}>
                {(unitDetail.termRows ?? []).map((t: any, tIdx: number) => (
                  <React.Fragment key={tIdx}>
                    <div style={{ border: `1px solid ${t.border}`, background: t.bg, borderRadius: "9px", padding: "9px 11px" }}>
                      <div style={{ font: "700 10.5px var(--bo-font)", color: t.labelColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {t.label}
                      </div>
                      <div style={{ font: "800 15px var(--bo-font)", color: t.valueColor }}>
                        {t.value}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
