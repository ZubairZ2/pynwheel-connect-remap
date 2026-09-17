'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useFavoritesScreen } from '~/core/hooks/connect/useFavoritesScreen';

export const FavoritesScreen = () => {
  const {
    addBcc,
    allPropOptions,
    brochureLinks,
    cfg,
    cfgBcc,
    cfgBccEmpty,
    cfgBodyShown,
    cfgLogoOptions,
    cfgLogoShown,
    favoriteSample,
    onCfgBody,
    onCfgHeadline,
    onCfgLogo,
    onPropSelect,
    prop,
    propId,
    sendTestBrochure,
    theme
  } = useFavoritesScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"heart"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Favorites eBrochure
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              The automated email sent when a visitor favorites units and requests them · {cfg.sends} sent · {cfg.opens} open rate
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "14px" }}>
                Branding &amp; Copy
              </div>
              <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", marginBottom: "6px" }}>
                Masthead logo
              </div>
              <select value={cfg.logo} onChange={onCfgLogo} className="bo-field" style={{ width: "100%", textTransform: "none" }}>
                {(cfgLogoOptions ?? []).map((o: any, oIdx: number) => (
                  <React.Fragment key={oIdx}>
                    <option value={o.id}>
                      {o.label}
                    </option>
                  </React.Fragment>
                ))}
              </select>
              <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", margin: "14px 0 6px" }}>
                Headline
              </div>
              <input type="text" value={cfg.headline} onChange={onCfgHeadline} style={{ width: "100%", height: "36px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 11px", font: "600 12.5px var(--bo-font)", color: "var(--bo-ink)", boxSizing: "border-box" }} />
              <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", margin: "14px 0 6px" }}>
                Body copy
              </div>
              <textarea onChange={onCfgBody} value={cfg.body} placeholder="Write the intro paragraph the visitor reads above their saved homes." style={{ width: "100%", minHeight: "104px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "11px 12px", font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-ink)", resize: "vertical", boxSizing: "border-box" }} />
            </div>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <div>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    BCC Recipients
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Staff copied on every brochure send
                  </div>
                </div>
                <button onClick={addBcc} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  + Add
                </button>
              </div>
              {(cfgBcc ?? []).map((b: any, bIdx: number) => (
                <React.Fragment key={bIdx}>
                  <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <Icon name={"mail"} style={{ color: "var(--bo-subtle)", display: "flex", flexShrink: "0" }} />
                    <div style={{ flex: "1", minWidth: "0", font: "600 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                      {b.addr}
                    </div>
                    <button onClick={b.remove} style={{ height: "28px", padding: "0 10px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                      Remove
                    </button>
                  </div>
                </React.Fragment>
              ))}
              {cfgBccEmpty ? (
                <>
                  <div style={{ padding: "12px 0 0", borderTop: "1px solid var(--bo-line-2)", font: "500 12.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    No BCC recipients. Only the visitor receives the brochure.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bo-line)", background: "#FAFAFB", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                  Email Preview
                </div>
                <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  Sample with 3 favorited homes
                </div>
              </div>
              <button onClick={sendTestBrochure} style={{ height: "32px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                Send Test
              </button>
            </div>
            <div style={{ padding: "20px", background: "#F5F6F8" }}>
              <div style={{ background: "#fff", border: "1px solid var(--bo-line)", borderRadius: "10px", overflow: "hidden" }}>
                {cfgLogoShown ? (
                  <>
                    <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--bo-line-2)", display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "6px", background: theme.primary }} />
                      <div style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {prop.name}
                      </div>
                    </div>
                  </>
                ) : null}
                <div style={{ padding: "18px" }}>
                  <div style={{ font: "800 16px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "8px" }}>
                    {cfg.headline}
                  </div>
                  {cfgBodyShown ? (
                    <>
                      <div style={{ font: "500 12.5px/1.65 var(--bo-font)", color: "var(--bo-muted)", marginBottom: "16px" }}>
                        {cfg.body}
                      </div>
                    </>
                  ) : null}
                  {(favoriteSample ?? []).map((u: any, uIdx: number) => (
                    <React.Fragment key={uIdx}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "1px solid var(--bo-line)", borderRadius: "9px", padding: "11px 12px", marginBottom: "9px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "7px", background: "#EEF0F4", flexShrink: "0" }} />
                        <div style={{ flex: "1", minWidth: "0" }}>
                          <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                            Unit {u.unit}
                          </div>
                          <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {u.plan} · {u.sqft}
                          </div>
                        </div>
                        <div style={{ font: "800 12.5px var(--bo-font)", color: theme.primary }}>
                          {u.rent}
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                    {(brochureLinks ?? []).map((l: any, lIdx: number) => (
                      <React.Fragment key={lIdx}>
                        <div style={{ flex: "1", height: "34px", borderRadius: "4px", background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", font: "700 11.5px var(--bo-font)", color: "#fff" }}>
                          {l.label}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ font: "500 10px var(--bo-font)", color: "var(--bo-subtle)", marginTop: "14px" }}>
                    Link buttons come from Property Content → Homepage &amp; Brochure.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
