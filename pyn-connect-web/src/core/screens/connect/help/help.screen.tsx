'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useHelpScreen } from '~/core/hooks/connect/useHelpScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const HelpScreen = () => {
  const {
    helpCount,
    helpEmpty,
    helpQuery,
    helpSections,
    onHelpQuery
  } = useHelpScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
            <Icon name={"help"} style={{ display: "flex" }} />
          </div>
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Help &amp; Tutorials<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
              Short guides and videos for each part of the Back Office · {helpCount}
            </div>
          </div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--bo-subtle)", display: "flex" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input value={helpQuery} onChange={onHelpQuery} placeholder="Search articles and videos" style={{ width: "280px", height: "36px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "0 12px 0 34px", font: "600 12.5px var(--bo-font)", color: "var(--bo-ink)", outline: "none" }} />
          </div>
        </div>
        {(helpSections ?? []).map((sec: any, secIdx: number) => (
          <React.Fragment key={secIdx}>
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "14px 18px", borderBottom: "1px solid var(--bo-line-2)", background: "#FAFBFC" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: "var(--bo-accent-soft)", color: "var(--bo-accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={sec.icon} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                    {sec.name}<DemoMark />
                  </div>
                  <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {sec.blurb}
                  </div>
                </div>
                <span style={{ font: "700 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {sec.count}<DemoMark />
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1px", background: "var(--bo-line-2)" }}>
                {(sec.items ?? []).map((a: any, aIdx: number) => (
                  <React.Fragment key={aIdx}>
                    <div onClick={a.open} style={{ background: "var(--bo-panel)", padding: "14px 16px", display: "flex", gap: "11px", cursor: "pointer" }}>
                      <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: a.kindBg, color: a.kindColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={a.kindIcon} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {a.title}<DemoMark />
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {a.meta}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
        {helpEmpty ? (
          <>
            <div style={{ background: "var(--bo-panel)", border: "1px dashed var(--bo-line)", borderRadius: "12px", padding: "40px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
              No articles match your search.
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
