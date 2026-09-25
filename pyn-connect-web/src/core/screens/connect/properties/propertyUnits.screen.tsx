'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { usePropertyUnitsScreen } from '~/core/hooks/connect/usePropertyUnitsScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const PropertyUnitsScreen = () => {
  const {
    addFloorplan,
    addUnit,
    backToProperty,
    goProperties,
    prop,
    puBulkImages,
    puEmptyBody,
    puEmptyTitle,
    puGoPlans,
    puGoUnits,
    puHasUnits,
    puIsPlans,
    puIsUnits,
    puMassOverride,
    puOnQuery,
    puPlanCards,
    puPlansBorder,
    puPlansColor,
    puPlansCount,
    puPlansEmpty,
    puQuery,
    puSortAvail,
    puSortAvailArrow,
    puSortFp,
    puSortFpArrow,
    puSortName,
    puSortNameArrow,
    puSortPrice,
    puSortPriceArrow,
    puSummary,
    puUnitRows,
    puUnitsBorder,
    puUnitsColor,
    puUnitsCount,
    puUnitsEmpty,
    resyncPms
  } = usePropertyUnitsScreen();

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
            Units &amp; Floor Plans
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)" }}>
              Units &amp; Floor Plans<DemoMark />
            </div>
            <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
              {puSummary}
            </div>
          </div>
          <button onClick={resyncPms} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            <Icon name={"refresh"} style={{ display: "flex" }} />
            Re-sync PMS
          </button>
        </div>
        <div style={{ display: "flex", gap: "8px", borderBottom: "1px solid var(--bo-line)" }}>
          <button onClick={puGoUnits} style={{ height: "40px", padding: "0 4px", border: "none", background: "transparent", borderBottom: `2px solid ${puUnitsBorder}`, font: "800 13px var(--bo-font)", color: puUnitsColor, cursor: "pointer", marginBottom: "-1px" }}>
            Units{' '}
            <span style={{ fontWeight: "700", color: "var(--bo-subtle)" }}>
              {puUnitsCount}
            </span>
          </button>
          <button onClick={puGoPlans} style={{ height: "40px", padding: "0 14px", border: "none", background: "transparent", borderBottom: `2px solid ${puPlansBorder}`, font: "800 13px var(--bo-font)", color: puPlansColor, cursor: "pointer", marginBottom: "-1px" }}>
            Floor Plans{' '}
            <span style={{ fontWeight: "700", color: "var(--bo-subtle)" }}>
              {puPlansCount}
            </span>
          </button>
        </div>
        {puIsUnits ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: "1", position: "relative", maxWidth: "340px" }}>
                  <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--bo-subtle)", display: "flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input value={puQuery} onChange={puOnQuery} placeholder="Search units, floor plans, floors" style={{ width: "100%", height: "38px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "0 12px 0 34px", font: "600 13px var(--bo-font)", color: "var(--bo-ink)", outline: "none" }} />
                </div>
                <button onClick={puMassOverride} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Mass Overrides
                </button>
                <button onClick={addUnit} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  + Add Unit
                </button>
              </div>
              {puUnitsEmpty ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {puEmptyTitle}<DemoMark />
                    </div>
                    <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px" }}>
                      {puEmptyBody}
                    </div>
                  </div>
                </>
              ) : null}
              {puHasUnits ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#FAFBFC", borderBottom: "1px solid var(--bo-line)" }}>
                          <th onClick={puSortName} style={{ textAlign: "left", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>
                            Unit {puSortNameArrow}
                          </th>
                          <th onClick={puSortFp} style={{ textAlign: "left", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>
                            Floor Plan {puSortFpArrow}
                          </th>
                          <th onClick={puSortPrice} style={{ textAlign: "right", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>
                            Price {puSortPriceArrow}
                          </th>
                          <th onClick={puSortAvail} style={{ textAlign: "left", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em", cursor: "pointer" }}>
                            Available {puSortAvailArrow}
                          </th>
                          <th style={{ textAlign: "center", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Avail?
                          </th>
                          <th style={{ textAlign: "center", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Override
                          </th>
                          <th style={{ textAlign: "center", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Lock
                          </th>
                          <th style={{ textAlign: "left", padding: "11px 14px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Floor / Bldg
                          </th>
                          <th style={{ padding: "11px 14px" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {(puUnitRows ?? []).map((u: any, uIdx: number) => (
                          <React.Fragment key={uIdx}>
                            <tr className="bo-row" style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                              <td onClick={u.open} style={{ padding: "12px 14px", font: "800 13px var(--bo-font)", color: "var(--bo-ink)", cursor: "pointer" }}>
                                {u.name}
                              </td>
                              <td style={{ padding: "12px 14px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                                {u.fpName}
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "right", font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                                {u.priceLabel}
                              </td>
                              <td style={{ padding: "12px 14px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                                {u.availDate}
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <StatusPill variant={u.availV} label={u.availLabel} />
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <div onClick={u.toggleOverride} style={{ display: "inline-block", width: "40px", height: "23px", borderRadius: "999px", background: u.ovBg, position: "relative", cursor: "pointer" }} title="Manual override">
                                  <div style={{ position: "absolute", top: "3px", left: u.ovKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                </div>
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "center" }}>
                                <Icon name={"lock"} title={u.lockTitle} style={{ display: "inline-flex", color: u.lockColor }} />
                              </td>
                              <td style={{ padding: "12px 14px", font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                                {u.floorBldg}
                              </td>
                              <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                                <button onClick={u.manageImages} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                                  <Icon name={"image"} style={{ display: "flex" }} />
                                  Images
                                </button>
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
        ) : null}
        {puIsPlans ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ flex: "1" }} />
                <button onClick={addFloorplan} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  + Add Floor Plan
                </button>
              </div>
              <div onClick={puBulkImages} style={{ border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "20px", display: "flex", alignItems: "center", gap: "14px", cursor: "pointer", background: "#FAFBFC" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={"upload"} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Bulk Image Upload<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Drop a batch of floor plan renders here — files are matched to floor plans by name.
                  </div>
                </div>
                <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-accent)" }}>
                  Browse Files
                </span>
              </div>
              {puPlansEmpty ? (
                <>
                  <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "40px", textAlign: "center" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      No floor plans yet<DemoMark />
                    </div>
                    <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px" }}>
                      Add a floor plan or wait for the next PMS sync to populate unit types.
                    </div>
                  </div>
                </>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
                {(puPlanCards ?? []).map((fp: any, fpIdx: number) => (
                  <React.Fragment key={fpIdx}>
                    <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                      <div style={{ height: "150px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative" }}>
                        {fp.hasImg ? (
                          <>
                            <img src="/images/amenity-thumb.jpg" alt="Floor plan" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </>
                        ) : null}
                        {fp.noImg ? (
                          <>
                            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#A9B0BC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="9" r="1.8" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </>
                        ) : null}
                        <div style={{ position: "absolute", top: "10px", right: "10px" }}>
                          <StatusPill variant={fp.statusV} label={fp.statusLabel} />
                        </div>
                      </div>
                      <div style={{ padding: "14px", display: "flex", flexDirection: "column", gap: "10px", flex: "1" }}>
                        <div>
                          <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {fp.name}<DemoMark />
                          </div>
                          <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {fp.spec}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", marginTop: "auto" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Icon name={"bed"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                            {fp.bedLabel}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                            <Icon name={"ruler"} style={{ display: "flex", color: "var(--bo-subtle)" }} />
                            {fp.sqftLabel}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={fp.manageImages} style={{ flex: "1", height: "34px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            <Icon name={"image"} style={{ display: "flex" }} />
                            Interior Images
                          </button>
                          <button onClick={fp.edit} style={{ height: "34px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
