'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useBrandingScreen } from '~/core/hooks/connect/useBrandingScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const BrandingScreen = () => {
  const {
    alignOptions,
    backToProperty,
    brandTabs,
    fontFamilies,
    fontWeights,
    goProperties,
    heroOptions,
    isBrandLogos,
    isBrandTheme,
    isBrandTokens,
    kickoffDone,
    kickoffNeeded,
    logoCards,
    markerDot,
    markerSizeOptions,
    navStyleOptions,
    onBrandSize,
    onFont,
    onMarkerColor,
    onPrimary,
    onSecondary,
    onWeight,
    openKickoff,
    prop,
    starterThemes,
    theme
  } = useBrandingScreen();

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
            Design System &amp; Branding
          </span>
        </div>
        {kickoffNeeded ? (
          <>
            <div style={{ background: "#FFF4D4", border: "1px solid #FFE59B", borderRadius: "12px", padding: "18px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
              <Icon name={"palette"} style={{ color: "#A88A0B", display: "flex", flexShrink: "0" }} />
              <div style={{ flex: "1" }}>
                <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Design Direction not submitted yet<DemoMark />
                </div>
                <div style={{ font: "500 12.5px/1.55 var(--bo-font)", color: "#7A660C" }}>
                  {prop.name} hasn't completed brand kickoff. Collect a moodboard, a starting palette, and written direction before building out the full theme.
                </div>
              </div>
              <button onClick={openKickoff} style={{ height: "38px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 12.5px var(--bo-font)", color: "#fff", cursor: "pointer", flexShrink: "0" }}>
                Start Design Direction
              </button>
            </div>
          </>
        ) : null}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(brandTabs ?? []).map((t: any, tIdx: number) => (
            <React.Fragment key={tIdx}>
              <button onClick={t.go} style={{ height: "36px", padding: "0 15px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer" }}>
                {t.label}
              </button>
            </React.Fragment>
          ))}
          <div style={{ flex: "1" }} />
          {kickoffDone ? (
            <>
              <button onClick={openKickoff} style={{ height: "34px", padding: "0 13px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Re-run Design Direction
              </button>
            </>
          ) : null}
        </div>
        {isBrandTheme ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                Starter Themes<DemoMark />
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "16px" }}>
                Pick a named theme as the foundation, then refine tokens individually
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
                {(starterThemes ?? []).map((t: any, tIdx: number) => (
                  <React.Fragment key={tIdx}>
                    <div onClick={t.pick} style={{ border: `1px solid ${t.border}`, background: t.bg, borderRadius: "10px", padding: "14px", cursor: "pointer" }}>
                      <div style={{ display: "flex", gap: "6px", marginBottom: "11px" }}>
                        <div style={{ flex: "2", height: "34px", borderRadius: "6px", background: t.primary }} />
                        <div style={{ flex: "1", height: "34px", borderRadius: "6px", background: t.secondary }} />
                      </div>
                      <div style={{ font: "800 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {t.name}<DemoMark />
                      </div>
                      <div style={{ font: "500 11px/1.45 var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "8px" }}>
                        {t.note}
                      </div>
                      <div style={{ font: "800 10.5px var(--bo-font)", color: t.badgeColor, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {t.badge}<DemoMark />
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </>
        ) : null}
        {isBrandTokens ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "16px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                    Color &amp; Type<DemoMark />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Primary color<DemoMark />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: theme.primary }} />
                      <input type="text" value={theme.primary} onChange={onPrimary} style={{ width: "104px", height: "32px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 10px", font: "700 12px var(--pw-font-mono),monospace", color: "var(--bo-ink)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Secondary color<DemoMark />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: theme.secondary }} />
                      <input type="text" value={theme.secondary} onChange={onSecondary} style={{ width: "104px", height: "32px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 10px", font: "700 12px var(--pw-font-mono),monospace", color: "var(--bo-ink)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Font family<DemoMark />
                    </div>
                    <select value={theme.font} onChange={onFont} className="bo-field" style={{ width: "auto", minWidth: "150px", textTransform: "none" }}>
                      {(fontFamilies ?? []).map((ff: any, ffIdx: number) => (
                        <React.Fragment key={ffIdx}>
                          <option value={ff}>
                            {ff}
                          </option>
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Weight<DemoMark />
                    </div>
                    <select value={theme.weight} onChange={onWeight} className="bo-field" style={{ width: "auto", minWidth: "150px", textTransform: "none" }}>
                      {(fontWeights ?? []).map((fw: any, fwIdx: number) => (
                        <React.Fragment key={fwIdx}>
                          <option value={fw}>
                            {fw}
                          </option>
                        </React.Fragment>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Base size<DemoMark />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <input type="range" min="12" max="24" step="1" value={theme.size} onChange={onBrandSize} style={{ width: "150px" }} />
                      <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)", minWidth: "40px", textAlign: "right" }}>
                        {theme.sizeLabel}<DemoMark />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Alignment<DemoMark />
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(alignOptions ?? []).map((a: any, aIdx: number) => (
                        <React.Fragment key={aIdx}>
                          <button onClick={a.pick} style={{ height: "32px", padding: "0 13px", border: `1px solid ${a.border}`, background: a.bg, color: a.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                            {a.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                    Navigation &amp; Map Markers<DemoMark />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Nav button style<DemoMark />
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      {(navStyleOptions ?? []).map((n: any, nIdx: number) => (
                        <React.Fragment key={nIdx}>
                          <button onClick={n.pick} style={{ height: "32px", padding: "0 13px", border: `1px solid ${n.border}`, background: n.bg, color: n.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                            {n.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Marker color<DemoMark />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "6px", border: "1px solid var(--bo-line)", background: theme.markerColor }} />
                      <input type="text" value={theme.markerColor} onChange={onMarkerColor} style={{ width: "104px", height: "32px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 10px", font: "700 12px var(--pw-font-mono),monospace", color: "var(--bo-ink)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Marker size<DemoMark />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "34px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ width: markerDot, height: markerDot, borderRadius: "999px", background: theme.markerColor, border: "2px solid #fff", boxShadow: "0 0 0 1px var(--bo-line)" }} />
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {(markerSizeOptions ?? []).map((m: any, mIdx: number) => (
                          <React.Fragment key={mIdx}>
                            <button onClick={m.pick} style={{ height: "32px", padding: "0 13px", border: `1px solid ${m.border}`, background: m.bg, color: m.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                              {m.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Homepage Hero Media<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "14px" }}>
                    What plays behind the kiosk homepage
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {(heroOptions ?? []).map((h: any, hIdx: number) => (
                      <React.Fragment key={hIdx}>
                        <div onClick={h.pick} style={{ border: `1px solid ${h.border}`, background: h.bg, borderRadius: "10px", padding: "13px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "11px" }}>
                          <Icon name={"image"} style={{ color: "var(--bo-muted)", display: "flex", flexShrink: "0" }} />
                          <div style={{ flex: "1" }}>
                            <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {h.label}<DemoMark />
                            </div>
                            <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {h.note}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "12px" }}>
                    Live Preview<DemoMark />
                  </div>
                  <div style={{ border: "1px solid var(--bo-line)", borderRadius: "10px", overflow: "hidden" }}>
                    <div style={{ background: theme.primary, padding: "16px 18px" }}>
                      <div style={{ font: "700 11px var(--bo-font)", color: "rgba(255,255,255,0.7)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {theme.themeName}<DemoMark />
                      </div>
                      <div style={{ font: "800 18px var(--bo-font)", color: "#fff", textAlign: theme.align }}>
                        {prop.name}<DemoMark />
                      </div>
                    </div>
                    <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "10px" }}>
                      <div style={{ font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)", textAlign: theme.align }}>
                        {theme.font} · {theme.weight} · {theme.sizeLabel} base
                      </div>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <div style={{ flex: "1", height: "36px", borderRadius: "4px", background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", font: "700 12px var(--bo-font)", color: "#fff" }}>
                          Schedule Tour
                        </div>
                        <div style={{ flex: "1", height: "36px", borderRadius: "4px", border: `1px solid ${theme.secondary}`, display: "flex", alignItems: "center", justifyContent: "center", font: "700 12px var(--bo-font)", color: theme.secondary }}>
                          Apply Now
                        </div>
                      </div>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Nav: {theme.navLabel} · Hero: {theme.heroLabel} · Markers: {theme.markerSize}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
        {isBrandLogos ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
              {(logoCards ?? []).map((l: any, lIdx: number) => (
                <React.Fragment key={lIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ flex: "1" }}>
                        <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {l.label}<DemoMark />
                        </div>
                        <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {l.note}
                        </div>
                      </div>
                      <StatusPill variant={l.statusV} label={l.status} />
                    </div>
                    <div onClick={l.upload} style={{ border: "1px dashed var(--bo-line)", borderRadius: "10px", background: "#FBFBFC", height: "150px", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", cursor: "pointer" }}>
                      {l.set ? (
                        <>
                          <div style={{ position: "absolute", inset: "0", overflow: "hidden", background: "#fff" }}>
                            <img src="/images/amenity-thumb.jpg" alt="Logo artwork" style={{ position: "absolute", left: l.imgLeft, top: l.imgTop, width: l.imgW, height: l.imgH, objectFit: "cover" }} />
                          </div>
                          <div style={{ position: "absolute", bottom: "8px", left: "8px", font: "800 10px var(--bo-font)", color: "#fff", background: "rgba(20,22,28,0.82)", padding: "3px 8px", borderRadius: "4px" }}>
                            {l.cropLabel}<DemoMark />
                          </div>
                        </>
                      ) : null}
                      {l.notSet ? (
                        <>
                          <div style={{ textAlign: "center" }}>
                            <Icon name={"upload"} style={{ color: "var(--bo-subtle)", display: "flex", justifyContent: "center" }} />
                            <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "6px" }}>
                              Drop a file or click to upload
                            </div>
                          </div>
                        </>
                      ) : null}
                    </div>
                    <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", margin: "10px 0 12px" }}>
                      {l.ratio}
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={l.crop} style={{ flex: "1", height: "34px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                        <Icon name={"crop"} style={{ display: "flex" }} />
                        {l.cropBtnLabel}
                      </button>
                      <button onClick={l.clear} style={{ height: "34px", padding: "0 13px", border: "1px solid #F9DCE0", background: "#FDEDEF", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                        Remove
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
