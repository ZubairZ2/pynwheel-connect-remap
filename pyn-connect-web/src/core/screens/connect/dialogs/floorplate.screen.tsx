'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useFloorplateDialog } from '~/core/hooks/connect/useFloorplateDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const FloorplateDialog = () => {
  const {
    closeModal,
    fpForm,
    fpModalOpen,
    fpModalTitle,
    saveModal
  } = useFloorplateDialog();

  return (
    <>
      {fpModalOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "400" }}>
            <div style={{ width: "760px", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {fpModalTitle}<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    To change the image of the floorplate, upload a new image or SVG here. Images that are too small appear pixelated on the kiosk.
                  </div>
                </div>
                <button onClick={closeModal} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "16px 24px 0" }}>
                <div style={{ padding: "11px 14px", background: "#FFF4D4", border: "1px solid #FFECAE", borderRadius: "8px", font: "700 12px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                  Note: if the new image is not the exact same dimensions as the existing one, unit and amenity markers will not land in the correct place on the map.
                </div>
              </div>
              <div style={{ padding: "6px 24px 22px" }}>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Manual Override<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Name this floorplate yourself instead of deriving it from the range
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", gap: "28px", paddingTop: "2px" }}>
                      <div onClick={fpForm.pickYes} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
                        <span style={{ width: "17px", height: "17px", borderRadius: "999px", border: `2px solid ${fpForm.yesRing}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: fpForm.yesDot }} />
                        </span>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Yes<DemoMark />
                        </span>
                      </div>
                      <div onClick={fpForm.pickNo} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
                        <span style={{ width: "17px", height: "17px", borderRadius: "999px", border: `2px solid ${fpForm.noRing}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: fpForm.noDot }} />
                        </span>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          No<DemoMark />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Floorplate Name<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Specify name here (Manual Override required)
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <input value={fpForm.name} onChange={fpForm.onName} placeholder="Floorplate Name" className="bo-field" style={{ textTransform: "none", background: fpForm.nameBg, color: fpForm.nameColor }} />
                    <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "6px" }}>
                      {fpForm.nameNote}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Building<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Which building or sub-community this floorplate belongs to
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <select value={fpForm.building} onChange={fpForm.onBuilding} className="bo-field" style={{ textTransform: "none" }}>
                      {(fpForm.buildingOptions ?? []).map((b: any, bIdx: number) => (
                        <React.Fragment key={bIdx}>
                          <option value={b}>
                            {b}
                          </option>
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Range<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Enter the range of floors this floorplate covers
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <input value={fpForm.range} onChange={fpForm.onRange} placeholder="Range" className="bo-field" style={{ textTransform: "none" }} />
                    <div style={{ font: "500 11.5px var(--bo-font)", color: fpForm.rangeColor, marginTop: "6px" }}>
                      {fpForm.rangePreview}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Add Floor Name<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Print the floor name over the plan on the kiosk map
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "11px", paddingTop: "2px" }}>
                      <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        No<DemoMark />
                      </span>
                      <div onClick={fpForm.toggleAddName} style={{ width: "44px", height: "26px", borderRadius: "999px", background: fpForm.addNameBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                        <div style={{ position: "absolute", top: "3px", left: fpForm.addNameKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                      <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Yes<DemoMark />
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Upload Image<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Background image of this floorplate
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                      <div style={{ width: "196px", height: "132px", border: "1px solid var(--bo-line)", borderRadius: "10px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: "0" }}>
                        {fpForm.hasImg ? (
                          <>
                            <img src="/images/site-plan.png" alt="Image preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </>
                        ) : null}
                        {fpForm.noImg ? (
                          <>
                            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#A9B0BC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="9" r="1.8" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {fpForm.img}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={fpForm.pickImg} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                            Select Image
                          </button>
                          {fpForm.hasImg ? (
                            <>
                              <button onClick={fpForm.dropImg} style={{ height: "34px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                                Remove
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "184px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Upload SVG<DemoMark />
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Vector geometry of this floorplate — keeps the kiosk map fast
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                      <div style={{ width: "196px", height: "132px", border: "1px solid var(--bo-line)", borderRadius: "10px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: "0" }}>
                        {fpForm.hasSvg ? (
                          <>
                            <img src="/images/site-plan.png" alt="SVG preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </>
                        ) : null}
                        {fpForm.noSvg ? (
                          <>
                            <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#A9B0BC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="3" width="18" height="18" rx="2" />
                              <circle cx="8.5" cy="9" r="1.8" />
                              <path d="M21 15l-5-5L5 21" />
                            </svg>
                          </>
                        ) : null}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {fpForm.svg}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={fpForm.pickSvg} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                            Select SVG
                          </button>
                          {fpForm.hasSvg ? (
                            <>
                              <button onClick={fpForm.dropSvg} style={{ height: "34px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                                Remove
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeModal} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveModal} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Save Floorplate
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
