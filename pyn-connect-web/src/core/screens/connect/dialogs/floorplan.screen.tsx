'use client';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { useFloorplanDialog } from '~/core/hooks/connect/useFloorplanDialog';

export const FloorplanDialog = () => {
  const {
    closeModal,
    fplForm,
    fplModalOpen,
    fplModalTitle,
    fplSaveLabel,
    saveModal
  } = useFloorplanDialog();

  return (
    <>
      {fplModalOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "400" }}>
            <div style={{ width: "820px", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: "0", background: "#fff", zIndex: "2" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {fplModalTitle}
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Unit-type record shown on the kiosk, web widget, and Pynwheel Map. PMS-synced fields are read-only unless Manual Override is on.
                  </div>
                </div>
                <button onClick={closeModal} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "6px 24px 22px" }}>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Manual Override
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Enter details yourself instead of taking them from the PMS feed
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", gap: "28px", paddingTop: "2px" }}>
                      <div onClick={fplForm.pickYes} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
                        <span style={{ width: "17px", height: "17px", borderRadius: "999px", border: `2px solid ${fplForm.yesRing}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: fplForm.yesDot }} />
                        </span>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Yes
                        </span>
                      </div>
                      <div onClick={fplForm.pickNo} style={{ display: "flex", alignItems: "center", gap: "9px", cursor: "pointer" }}>
                        <span style={{ width: "17px", height: "17px", borderRadius: "999px", border: `2px solid ${fplForm.noRing}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: fplForm.noDot }} />
                        </span>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          No
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Floor Plan Name
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Specify name here (Manual Override required)
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <input value={fplForm.name} onChange={fplForm.onName} placeholder="Floor Plan Name" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Provider Floor Plan ID
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      From 3rd-party vendor (Manual Override required)
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <input value={fplForm.providerId} onChange={fplForm.onProviderId} placeholder="From 3rd Party Vendor" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Floor Plan Info
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Specify floor plan info here (Manual Override required)
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Square Feet
                      </span>
                      <input value={fplForm.sqft} onChange={fplForm.onSqft} placeholder="0" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Bedrooms
                      </span>
                      <input value={fplForm.beds} onChange={fplForm.onBeds} placeholder="0" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Bathrooms
                      </span>
                      <input value={fplForm.baths} onChange={fplForm.onBaths} placeholder="No of bathrooms" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Base Price (USD)
                      </span>
                      <input value={fplForm.price} onChange={fplForm.onPrice} placeholder="0" className="bo-field" style={{ textTransform: "none", background: fplForm.fieldBg, color: fplForm.fieldColor }} />
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Button
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Primary CTA on the floor plan card
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Button Label
                      </span>
                      <input value={fplForm.btnLabel} onChange={fplForm.onBtnLabel} placeholder="3D Tour" className="bo-field" style={{ textTransform: "none" }} />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Button URL
                      </span>
                      <input value={fplForm.btnUrl} onChange={fplForm.onBtnUrl} placeholder="URL" className="bo-field" style={{ textTransform: "none" }} />
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                      <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Open in New Tab
                      </span>
                      <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                        No
                      </span>
                      <div onClick={fplForm.toggleBtnTab} style={{ width: "44px", height: "26px", borderRadius: "999px", background: fplForm.btnTabBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                        <div style={{ position: "absolute", top: "3px", left: fplForm.btnTabKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                      <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Yes
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Additional Buttons
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Only appear on the Pynwheel Map
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Additional Button Label
                        </span>
                        <input value={fplForm.b2Label} onChange={fplForm.onB2Label} placeholder="Additional Button Label" className="bo-field" style={{ textTransform: "none" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Additional Button URL
                        </span>
                        <input value={fplForm.b2Url} onChange={fplForm.onB2Url} placeholder="Additional Button URL" className="bo-field" style={{ textTransform: "none" }} />
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          Open in New Tab
                        </span>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          No
                        </span>
                        <div onClick={fplForm.toggleB2Tab} style={{ width: "44px", height: "26px", borderRadius: "999px", background: fplForm.b2TabBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                          <div style={{ position: "absolute", top: "3px", left: fplForm.b2TabKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                        </div>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          Yes
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", borderTop: "1px dashed var(--bo-line-2)", paddingTop: "12px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Additional Button Label 2
                        </span>
                        <input value={fplForm.b3Label} onChange={fplForm.onB3Label} placeholder="Additional Button Label" className="bo-field" style={{ textTransform: "none" }} />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Additional Button 2 URL
                        </span>
                        <input value={fplForm.b3Url} onChange={fplForm.onB3Url} placeholder="Additional Button URL" className="bo-field" style={{ textTransform: "none" }} />
                      </label>
                      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          Open in New Tab
                        </span>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          No
                        </span>
                        <div onClick={fplForm.toggleB3Tab} style={{ width: "44px", height: "26px", borderRadius: "999px", background: fplForm.b3TabBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                          <div style={{ position: "absolute", top: "3px", left: fplForm.b3TabKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                        </div>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                          Yes
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Details
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Long-form description shown under More Details
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Details Title
                      </span>
                      <input value={fplForm.detailsTitle} onChange={fplForm.onDetailsTitle} placeholder="More Details" className="bo-field" style={{ textTransform: "none" }} />
                    </label>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "2px", border: "1px solid var(--bo-line)", borderBottom: "none", borderRadius: "8px 8px 0 0", background: "#FAFAFB", padding: "6px 8px" }}>
                        <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-muted)", padding: "0 6px" }}>
                          Normal text
                        </span>
                        <span style={{ width: "1px", height: "16px", background: "var(--bo-line)", margin: "0 4px" }} />
                        <span style={{ font: "800 12px var(--bo-font)", color: "var(--bo-muted)", padding: "0 5px" }}>
                          B
                        </span>
                        <span style={{ font: "800 italic 12px var(--bo-font)", color: "var(--bo-muted)", padding: "0 5px" }}>
                          I
                        </span>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)", textDecoration: "underline", padding: "0 5px" }}>
                          U
                        </span>
                        <span style={{ width: "1px", height: "16px", background: "var(--bo-line)", margin: "0 4px" }} />
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-muted)", padding: "0 5px" }}>
                          Small
                        </span>
                      </div>
                      <textarea value={fplForm.details} onChange={fplForm.onDetails} placeholder="Enter Description" style={{ minHeight: "110px", border: "1px solid var(--bo-line)", borderRadius: "0 0 8px 8px", padding: "10px 12px", font: "500 13px var(--bo-font)", color: "var(--bo-ink)", outline: "none", resize: "vertical" }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "24px", padding: "18px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Primary Image
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Shown at 325 × 300 when expanded. Small images appear pixelated.
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                      <div style={{ width: "196px", height: "132px", border: "1px solid var(--bo-line)", borderRadius: "10px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: "0" }}>
                        {fplForm.hasPrimary ? (
                          <>
                            <img src="/images/amenity-thumb.jpg" alt="Primary image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </>
                        ) : null}
                        {fplForm.noPrimary ? (
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
                          {fplForm.primaryImg}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={fplForm.pickPrimary} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                            Upload a New Image
                          </button>
                          {fplForm.hasPrimary ? (
                            <>
                              <button onClick={fplForm.dropPrimary} style={{ height: "34px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
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
                  <div style={{ width: "196px", flexShrink: "0" }}>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Secondary Image
                    </div>
                    <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Shown at 325 × 300 when expanded. Small images appear pixelated.
                    </div>
                  </div>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: "14px" }}>
                      <div style={{ width: "196px", height: "132px", border: "1px solid var(--bo-line)", borderRadius: "10px", background: "#EEF0F4", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: "0" }}>
                        {fplForm.hasSecondary ? (
                          <>
                            <img src="/images/amenity-thumb.jpg" alt="Secondary image" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </>
                        ) : null}
                        {fplForm.noSecondary ? (
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
                          {fplForm.secondaryImg}
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={fplForm.pickSecondary} style={{ height: "34px", padding: "0 14px", border: "none", background: "var(--bo-accent)", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                            Upload a New Image
                          </button>
                          {fplForm.hasSecondary ? (
                            <>
                              <button onClick={fplForm.dropSecondary} style={{ height: "34px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "6px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
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
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px", position: "sticky", bottom: "0", background: "#fff" }}>
                <button onClick={closeModal} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveModal} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  {fplSaveLabel}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
