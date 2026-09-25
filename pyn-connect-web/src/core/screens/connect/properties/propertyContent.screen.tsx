'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { usePropertyContentScreen } from '~/core/hooks/connect/usePropertyContentScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const PropertyContentScreen = () => {
  const {
    addLinkBtn,
    addPage,
    addTile,
    backToProperty,
    brochureEmpty,
    brochureLinks,
    contentPages,
    contentPagesEmpty,
    contentTabs,
    goProperties,
    homeTiles,
    hood,
    hoodCats,
    isContentHome,
    isContentHood,
    isContentPages,
    onHoodCenter,
    onHoodRadius,
    poiCount,
    poiResults,
    prop,
    refreshPoi,
    tileCount,
    tileFallback,
    tileFallbackNote
  } = usePropertyContentScreen();

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
            Property Content
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(contentTabs ?? []).map((t: any, tIdx: number) => (
            <React.Fragment key={tIdx}>
              <button onClick={t.go} style={{ height: "36px", padding: "0 15px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer" }}>
                {t.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        {isContentPages ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                <div>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Pages &amp; Galleries<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Linked or embedded pages and image galleries · drag order controls homepage placement
                  </div>
                </div>
                <button onClick={addPage} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  + Add Page
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {(contentPages ?? []).map((p: any, pIdx: number) => (
                  <React.Fragment key={pIdx}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "13px 14px" }}>
                      <Icon name={"drag"} style={{ color: "var(--bo-subtle)", display: "flex", flexShrink: "0", cursor: "grab" }} />
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={p.icon} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {p.title}<DemoMark />
                        </div>
                        <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {p.typeLabel} · {p.detail}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexShrink: "0" }}>
                        <span style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                          On homepage<DemoMark />
                        </span>
                        <div onClick={p.homeToggle} style={{ width: "44px", height: "26px", borderRadius: "999px", background: p.toggleBg, position: "relative", cursor: "pointer", transition: "background .15s" }}>
                          <div style={{ position: "absolute", top: "3px", left: p.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: "0" }}>
                        <button onClick={p.up} style={{ width: "24px", height: "18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "5px 5px 0 0", font: "800 9px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", opacity: p.upOp }}>
                          ▲
                        </button>
                        <button onClick={p.down} style={{ width: "24px", height: "18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "0 0 5px 5px", font: "800 9px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", opacity: p.downOp }}>
                          ▼
                        </button>
                      </div>
                      <button onClick={p.edit} style={{ height: "28px", padding: "0 10px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                        Edit
                      </button>
                      <button onClick={p.remove} style={{ width: "28px", height: "28px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "800 12px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                        ×
                      </button>
                    </div>
                  </React.Fragment>
                ))}
                {contentPagesEmpty ? (
                  <>
                    <div style={{ font: "500 13px var(--bo-font)", color: "var(--bo-subtle)", padding: "8px 0" }}>
                      No pages yet. Add an embedded virtual tour, an external link, or an image gallery.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
        {isContentHome ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", alignItems: "start" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Homepage Icon Tiles<DemoMark />
                    </div>
                    <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {tileCount} of 5 configured · order sets left-to-right placement
                    </div>
                  </div>
                  <button onClick={addTile} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                    + Add Tile
                  </button>
                </div>
                {tileFallback ? (
                  <>
                    <div style={{ background: "#FFF4D4", border: "1px solid #FFE59B", borderRadius: "9px", padding: "11px 13px", font: "500 11.5px/1.55 var(--bo-font)", color: "#7A660C", marginBottom: "12px" }}>
                      {tileFallbackNote}
                    </div>
                  </>
                ) : null}
                <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                  {(homeTiles ?? []).map((t: any, tIdx: number) => (
                    <React.Fragment key={tIdx}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--bo-line)", borderRadius: "10px", padding: "12px 14px" }}>
                        <Icon name={"drag"} style={{ color: "var(--bo-subtle)", display: "flex", flexShrink: "0", cursor: "grab" }} />
                        <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                          <Icon name={t.icon} style={{ display: "flex" }} />
                        </div>
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {t.label}<DemoMark />
                          </div>
                          <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            Position {t.num}
                          </div>
                        </div>
                        <StatusPill variant={t.cropV} label={t.cropLabel} />
                        <button onClick={t.crop} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", flexShrink: "0" }}>
                          <Icon name={"crop"} style={{ display: "flex" }} />
                          Crop
                        </button>
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px", flexShrink: "0" }}>
                          <button onClick={t.up} style={{ width: "24px", height: "18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "5px 5px 0 0", font: "800 9px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", opacity: t.upOp }}>
                            ▲
                          </button>
                          <button onClick={t.down} style={{ width: "24px", height: "18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "0 0 5px 5px", font: "800 9px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", opacity: t.downOp }}>
                            ▼
                          </button>
                        </div>
                        <button onClick={t.remove} style={{ width: "28px", height: "28px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "800 12px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                          ×
                        </button>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Brochure Link Buttons<DemoMark />
                    </div>
                    <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Custom buttons in the emailed favorites brochure
                    </div>
                  </div>
                </div>
                {(brochureLinks ?? []).map((l: any, lIdx: number) => (
                  <React.Fragment key={lIdx}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                      <Icon name={"link"} style={{ color: "var(--bo-subtle)", display: "flex", flexShrink: "0" }} />
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {l.label}<DemoMark />
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-accent)" }}>
                          {l.url}
                        </div>
                      </div>
                      <div onClick={l.toggle} style={{ width: "44px", height: "26px", borderRadius: "999px", background: l.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                        <div style={{ position: "absolute", top: "3px", left: l.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                      <button onClick={l.remove} style={{ width: "28px", height: "28px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "800 12px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                        ×
                      </button>
                    </div>
                  </React.Fragment>
                ))}
                {brochureEmpty ? (
                  <>
                    <div style={{ padding: "12px 0 0", borderTop: "1px solid var(--bo-line-2)", font: "500 12.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      No custom buttons. The brochure ships with the default Schedule Tour link only.
                    </div>
                  </>
                ) : null}
                <button onClick={addLinkBtn} style={{ width: "100%", height: "34px", marginTop: "14px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                  + Add Link Button
                </button>
              </div>
            </div>
          </>
        ) : null}
        {isContentHood ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.05fr", gap: "16px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Search Area<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "14px" }}>
                    Center point and radius for point-of-interest lookups
                  </div>
                  <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", marginBottom: "6px" }}>
                    Search center<DemoMark />
                  </div>
                  <input type="text" value={hood.center} onChange={onHoodCenter} style={{ width: "100%", height: "36px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 11px", font: "600 12.5px var(--bo-font)", color: "var(--bo-ink)", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "16px" }}>
                    <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                      Radius<DemoMark />
                    </div>
                    <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {hood.radiusLabel}<DemoMark />
                    </div>
                  </div>
                  <input type="range" min="0.5" max="5" step="0.5" value={hood.radius} onChange={onHoodRadius} style={{ width: "100%", marginTop: "8px" }} />
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Category Filters<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "13px" }}>
                    Which categories renters can filter by on the kiosk
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                    {(hoodCats ?? []).map((c: any, cIdx: number) => (
                      <React.Fragment key={cIdx}>
                        <button onClick={c.pick} style={{ height: "31px", padding: "0 12px", border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                          {c.label}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ background: hood.quotaBg, border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                    <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      API Usage Quota<DemoMark />
                    </div>
                    <StatusPill variant={hood.quotaV} label={hood.quotaPill} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", font: "700 12px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "7px" }}>
                    {hood.quotaLabel}
                    <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      alerts at 200 · throttled at 400
                    </span>
                  </div>
                  <div style={{ height: "8px", borderRadius: "999px", background: "rgba(0,0,0,0.08)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: hood.pct, background: hood.quotaColor, borderRadius: "999px" }} />
                  </div>
                  <div style={{ font: "500 11.5px/1.55 var(--bo-font)", color: "var(--bo-muted)", marginTop: "9px" }}>
                    {hood.quotaNote}
                  </div>
                </div>
              </div>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Points of Interest<DemoMark />
                    </div>
                    <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {poiCount} results in the selected categories
                    </div>
                  </div>
                  <button onClick={refreshPoi} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
                    <Icon name={"refresh"} style={{ display: "flex" }} />
                    Refresh
                  </button>
                </div>
                {(poiResults ?? []).map((p: any, pIdx: number) => (
                  <React.Fragment key={pIdx}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={"compass"} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {p.name}<DemoMark />
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {p.cat} · {p.dist}
                        </div>
                      </div>
                      <div style={{ font: "800 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                        ★ {p.rating}<DemoMark />
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
