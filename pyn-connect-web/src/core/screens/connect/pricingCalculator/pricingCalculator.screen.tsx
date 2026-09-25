'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { usePricingCalculatorScreen } from '~/core/hooks/connect/usePricingCalculatorScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const PricingCalculatorScreen = () => {
  const {
    allPropOptions,
    onPropSelect,
    pcAddCategory,
    pcAllowDrop,
    pcCategories,
    pcCopyDraft,
    pcCopyLive,
    pcDiscard,
    pcDraftDirty,
    pcDraftUrl,
    pcEstimate,
    pcEstimateNote,
    pcHiddenCount,
    pcLiveUrl,
    pcNoCategories,
    pcPublish,
    pcSaveDraft,
    pcStatusLabel,
    pcStatusV,
    pcSummary,
    pcVisibleCount,
    prop,
    propId
  } = usePricingCalculatorScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"calc"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Move-In Cost Estimator<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Categorized fee builder powering the public embeddable calculator widget · {pcSummary}
            </div>
          </div>
          <select value={propId} onChange={onPropSelect} className="bo-field" style={{ width: "auto", minWidth: "240px", textTransform: "none" }}>
            {(allPropOptions ?? []).map((p: any, pIdx: number) => (
              <React.Fragment key={pIdx}>
                <option value={p.id}>
                  {p.name}
                </option>
              </React.Fragment>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <StatusPill variant={pcStatusV} label={pcStatusLabel} />
          <div style={{ flex: "1", font: "500 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
            Editing fees for {prop.name}. Switch properties above.
          </div>
          <button onClick={pcAddCategory} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            + Category
          </button>
          <button onClick={pcSaveDraft} style={{ height: "38px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
            Save Draft
          </button>
          <button onClick={pcPublish} style={{ height: "38px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon name={"upload"} style={{ display: "flex" }} />
            Publish
          </button>
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: "1", minWidth: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
            {(pcCategories ?? []).map((cat: any, catIdx: number) => (
              <React.Fragment key={catIdx}>
                <div onDragOver={pcAllowDrop} onDrop={cat.onDropEnd} style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "14px 16px", borderBottom: "1px solid var(--bo-line-2)", background: "#FAFBFC" }}>
                    <Icon name={"drag"} style={{ display: "flex", color: "var(--bo-subtle)", cursor: "grab" }} />
                    <input value={cat.name} onChange={cat.onName} style={{ flex: "1", minWidth: "0", border: "none", background: "transparent", font: "800 14px var(--bo-font)", color: "var(--bo-ink)", outline: "none" }} />
                    <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {cat.count}<DemoMark />
                    </span>
                    <button onClick={cat.addFee} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                      + Fee
                    </button>
                    <button aria-label="Remove" onClick={cat.remove} style={{ width: "30px", height: "30px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", color: "#C62534", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                      </svg>
                    </button>
                  </div>
                  {cat.empty ? (
                    <>
                      <div style={{ padding: "22px 16px", textAlign: "center", font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        No fees in this category yet. Use + Fee, or drag one here.
                      </div>
                    </>
                  ) : null}
                  {(cat.fees ?? []).map((f: any, fIdx: number) => (
                    <React.Fragment key={fIdx}>
                      <div draggable="true" onDragStart={f.onDragStart} onDragOver={pcAllowDrop} onDrop={f.onDropBefore} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", borderBottom: "1px solid var(--bo-line-2)", opacity: f.op, background: f.rowBg }}>
                        <Icon name={"drag"} style={{ display: "flex", color: "var(--bo-subtle)", cursor: "grab", flexShrink: "0" }} />
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {f.label}<DemoMark />
                            </span>
                            <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-accent)", background: "var(--bo-accent-soft)", padding: "2px 7px", borderRadius: "5px" }}>
                              {f.logicLabel}
                            </span>
                          </div>
                          <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "2px" }}>
                            {f.meta}
                          </div>
                        </div>
                        <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", textAlign: "right", whiteSpace: "nowrap" }}>
                          {f.priceLabel}<DemoMark />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
                          <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {f.visLabel}
                          </span>
                          <div onClick={f.toggleVis} style={{ width: "40px", height: "23px", borderRadius: "999px", background: f.visBg, position: "relative", cursor: "pointer" }}>
                            <div style={{ position: "absolute", top: "3px", left: f.visKnob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                          </div>
                        </div>
                        <button onClick={f.edit} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                          Edit
                        </button>
                        <button aria-label="Remove" onClick={f.remove} style={{ width: "30px", height: "30px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", color: "#C62534", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </React.Fragment>
            ))}
            {pcNoCategories ? (
              <>
                <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "36px", textAlign: "center" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    No fee categories yet<DemoMark />
                  </div>
                  <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "4px" }}>
                    Add a category to start building this property's move-in cost estimator.
                  </div>
                  <button onClick={pcAddCategory} style={{ marginTop: "14px", height: "36px", padding: "0 16px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                    + Add Category
                  </button>
                </div>
              </>
            ) : null}
          </div>
          <div style={{ width: "300px", flexShrink: "0", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "12px" }}>
                Embed URLs<DemoMark />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "#2E9C6A" }} />
                  <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Live<DemoMark />
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input value={pcLiveUrl} readOnly style={{ flex: "1", minWidth: "0", height: "32px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 9px", font: "600 11px var(--bo-font)", color: "var(--bo-muted)", background: "#F7F8FA", outline: "none", textOverflow: "ellipsis" }} />
                  <button onClick={pcCopyLive} style={{ height: "32px", padding: "0 10px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                    Copy
                  </button>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: "var(--bo-accent)" }} />
                  <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Draft<DemoMark />
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input value={pcDraftUrl} readOnly style={{ flex: "1", minWidth: "0", height: "32px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 9px", font: "600 11px var(--bo-font)", color: "var(--bo-muted)", background: "#F7F8FA", outline: "none", textOverflow: "ellipsis" }} />
                  <button onClick={pcCopyDraft} style={{ height: "32px", padding: "0 10px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                    Copy
                  </button>
                </div>
              </div>
            </div>
            {pcDraftDirty ? (
              <>
                <div style={{ border: "1px solid #FFECAE", background: "#FFF4D4", borderRadius: "12px", padding: "14px 16px" }}>
                  <div style={{ font: "800 12.5px var(--bo-font)", color: "#8A6A00" }}>
                    Unpublished Changes<DemoMark />
                  </div>
                  <div style={{ font: "600 11.5px/1.5 var(--bo-font)", color: "#8A6A00", marginTop: "3px" }}>
                    The draft differs from what the public widget shows. Publish to push these fees live, or save the draft to keep editing.
                  </div>
                  <button onClick={pcDiscard} style={{ marginTop: "10px", height: "30px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                    Discard Draft
                  </button>
                </div>
              </>
            ) : null}
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px" }}>
              <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "10px" }}>
                Estimated Move-In<DemoMark />
              </div>
              <div data-testid="pc-estimate" style={{ font: "800 26px var(--bo-font)", color: "var(--bo-accent)" }}>
                {pcEstimate}<DemoMark />
              </div>
              <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "3px" }}>
                Example: {pcEstimateNote}
              </div>
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid var(--bo-line-2)", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                  Visible Fees
                  <span style={{ fontWeight: "800", color: "var(--bo-ink)" }}>
                    {pcVisibleCount}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", font: "600 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                  Hidden
                  <span style={{ fontWeight: "800", color: "var(--bo-ink)" }}>
                    {pcHiddenCount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
