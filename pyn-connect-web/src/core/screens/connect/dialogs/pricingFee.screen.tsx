'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { usePricingFeeDialog } from '~/core/hooks/connect/usePricingFeeDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const PricingFeeDialog = () => {
  const {
    closeModal,
    pcFee,
    pcFeeModalOpen,
    pcFeeSaveLabel,
    pcFeeTitle,
    pcFreqOptions,
    pcLogicOptions,
    pcMultOptions,
    saveModal
  } = usePricingFeeDialog();

  return (
    <>
      {pcFeeModalOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "400" }}>
            <div style={{ width: "660px", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: "0", background: "#fff", zIndex: "2" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {pcFeeTitle}<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    How this fee is priced and shown in the move-in cost estimator.
                  </div>
                </div>
                <button onClick={closeModal} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Fee Label
                  </span>
                  <input value={pcFee.label} onChange={pcFee.onLabel} placeholder="e.g. Application Fee" className="bo-field" style={{ textTransform: "none" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Pricing Logic
                    </span>
                    <select value={pcFee.logic} onChange={pcFee.onLogic} className="bo-field" style={{ textTransform: "none", cursor: "pointer" }}>
                      {(pcLogicOptions ?? []).map((o: any, oIdx: number) => (
                        <React.Fragment key={oIdx}>
                          <option value={o.id}>
                            {o.label}
                          </option>
                        </React.Fragment>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Fee Frequency
                    </span>
                    <select value={pcFee.freq} onChange={pcFee.onFreq} className="bo-field" style={{ textTransform: "none", cursor: "pointer" }}>
                      {(pcFreqOptions ?? []).map((o: any, oIdx: number) => (
                        <React.Fragment key={oIdx}>
                          <option value={o.id}>
                            {o.label}
                          </option>
                        </React.Fragment>
                      ))}
                    </select>
                  </label>
                </div>
                {pcFee.showPrice ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {pcFee.baseLabel}
                        </span>
                        <input value={pcFee.base} onChange={pcFee.onBase} placeholder="0" className="bo-field" style={{ textTransform: "none" }} />
                      </label>
                      {pcFee.showMax ? (
                        <>
                          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                              Max Price (USD)
                            </span>
                            <input value={pcFee.max} onChange={pcFee.onMax} placeholder="0" className="bo-field" style={{ textTransform: "none" }} />
                          </label>
                        </>
                      ) : null}
                    </div>
                  </>
                ) : null}
                {pcFee.noPrice ? (
                  <>
                    <div style={{ border: "1px solid #FFECAE", background: "#FFF4D4", borderRadius: "8px", padding: "11px 13px", font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00" }}>
                      {pcFee.variesNote}
                    </div>
                  </>
                ) : null}
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Multiplier
                  </span>
                  <select value={pcFee.mult} onChange={pcFee.onMult} className="bo-field" style={{ textTransform: "none", cursor: "pointer" }}>
                    {(pcMultOptions ?? []).map((o: any, oIdx: number) => (
                      <React.Fragment key={oIdx}>
                        <option value={o.id}>
                          {o.label}
                        </option>
                      </React.Fragment>
                    ))}
                  </select>
                  <span style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Estimator multiplies this fee by the count the visitor selects.
                  </span>
                </label>
                <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        Quantity Controls<DemoMark />
                      </div>
                      <div style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Let the visitor pick how many with +/- steppers.
                      </div>
                    </div>
                    <div onClick={pcFee.toggleQty} style={{ width: "44px", height: "26px", borderRadius: "999px", background: pcFee.qtyBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                      <div style={{ position: "absolute", top: "3px", left: pcFee.qtyKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                  {pcFee.qtyEnabled ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", paddingTop: "2px" }}>
                        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Min Qty<DemoMark />
                          </span>
                          <input value={pcFee.qtyMin} onChange={pcFee.onQtyMin} placeholder="0" className="bo-field" style={{ textTransform: "none" }} />
                        </label>
                        <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Max Qty<DemoMark />
                          </span>
                          <input value={pcFee.qtyMax} onChange={pcFee.onQtyMax} placeholder="0" className="bo-field" style={{ textTransform: "none" }} />
                        </label>
                      </div>
                    </>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "11px", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
                  <div style={{ flex: "1" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Visible on Widget<DemoMark />
                    </div>
                    <div style={{ font: "500 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Hidden fees stay in the draft but never render publicly.
                    </div>
                  </div>
                  <div onClick={pcFee.toggleVis} style={{ width: "44px", height: "26px", borderRadius: "999px", background: pcFee.visBg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                    <div style={{ position: "absolute", top: "3px", left: pcFee.visKnob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                  </div>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Display Text
                  </span>
                  <textarea value={pcFee.displayText} onChange={pcFee.onDisplay} placeholder="Short note shown beside the fee" style={{ minHeight: "56px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px", font: "500 12.5px var(--bo-font)", color: "var(--bo-ink)", outline: "none", resize: "vertical" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Pre-Selection Disclaimer
                    </span>
                    <textarea value={pcFee.preText} onChange={pcFee.onPre} placeholder="Shown before the visitor adds this fee" style={{ minHeight: "56px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px", font: "500 12px var(--bo-font)", color: "var(--bo-ink)", outline: "none", resize: "vertical" }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Post-Selection Disclaimer
                    </span>
                    <textarea value={pcFee.postText} onChange={pcFee.onPost} placeholder="Shown after the visitor adds this fee" style={{ minHeight: "56px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "9px 11px", font: "500 12px var(--bo-font)", color: "var(--bo-ink)", outline: "none", resize: "vertical" }} />
                  </label>
                </div>
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px", position: "sticky", bottom: "0", background: "#fff" }}>
                <button onClick={closeModal} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={saveModal} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  {pcFeeSaveLabel}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
