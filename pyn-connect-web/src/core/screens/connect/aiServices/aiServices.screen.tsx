'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useAiServicesScreen } from '~/core/hooks/connect/useAiServicesScreen';

export const AiServicesScreen = () => {
  const {
    aiProps,
    goLiveChat,
    reviewCount,
    reviewQueue
  } = useAiServicesScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "#FFF4D4", border: "1px solid #FFE59B", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "13px" }}>
          <Icon name={"ai"} style={{ color: "#A88A0B", display: "flex", flexShrink: "0" }} />
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
              Planned — not yet built
            </div>
            <div style={{ font: "500 12px/1.55 var(--bo-font)", color: "#7A660C" }}>
              No AI or concierge backend exists in the product today. This screen is the forward-looking vision, kept deliberately so the direction isn't lost. What ships today is real human chat — see{' '}
              <span style={{ fontWeight: "800" }}>
                Live Chat
              </span>
              {' '}under Platform.
            </div>
          </div>
          <button onClick={goLiveChat} style={{ height: "36px", padding: "0 14px", border: "1px solid #F0D98A", background: "#fff", borderRadius: "8px", font: "700 12.5px var(--bo-font)", color: "#7A660C", cursor: "pointer", flexShrink: "0" }}>
            Open Live Chat
          </button>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--bo-line)", font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
            AI Concierge — Per Property
          </div>
          <table>
            <thead>
              <tr style={{ background: "#FAFAFB", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Property
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Knowledge Base
                </th>
                <th style={{ textAlign: "center", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Flagged
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Concierge
                </th>
              </tr>
            </thead>
            <tbody>
              {(aiProps ?? []).map((a: any, aIdx: number) => (
                <React.Fragment key={aIdx}>
                  <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                    <td onClick={a.open} style={{ padding: "13px 18px", font: "700 13px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer" }}>
                      {a.name}
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <StatusPill variant={a.kbV} label={a.kb} />
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "center", font: "800 13px var(--bo-font)", color: a.flagColor }}>
                      {a.flagged}
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      {a.on ? (
                        <>
                          <button onClick={a.toggle} style={{ width: "46px", height: "26px", borderRadius: "999px", border: "none", background: "var(--bo-accent)", position: "relative", cursor: "pointer" }}>
                            <span style={{ position: "absolute", top: "3px", left: "23px", width: "20px", height: "20px", borderRadius: "999px", background: "#fff" }} />
                          </button>
                        </>
                      ) : null}
                      {!a.on ? (
                        <>
                          <button onClick={a.toggle} style={{ width: "46px", height: "26px", borderRadius: "999px", border: "none", background: "#CDD1D9", position: "relative", cursor: "pointer" }}>
                            <span style={{ position: "absolute", top: "3px", left: "3px", width: "20px", height: "20px", borderRadius: "999px", background: "#fff" }} />
                          </button>
                        </>
                      ) : null}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
            <Icon name={"shield"} style={{ color: "#C62534", display: "flex" }} />
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
              Flagged Transcript Review Queue
            </div>
            <span style={{ font: "700 11px var(--bo-font)", color: "#C62534", background: "#FDEDEF", padding: "3px 9px", borderRadius: "999px" }}>
              {reviewCount} to review
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(reviewQueue ?? []).map((r: any, rIdx: number) => (
              <React.Fragment key={rIdx}>
                <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px", border: "1px solid var(--bo-line)", borderRadius: "10px" }}>
                  <div style={{ flex: "1" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {r.property}
                      </span>
                      <span style={{ font: "700 10px var(--bo-font)", color: r.tagColor, background: r.tagBg, padding: "2px 8px", borderRadius: "4px" }}>
                        {r.reason}
                      </span>
                    </div>
                    <div style={{ font: "500 12.5px/1.5 var(--bo-font)", color: "var(--bo-muted)", marginTop: "4px" }}>
                      “{r.excerpt}”
                    </div>
                  </div>
                  <button onClick={r.review} style={{ height: "34px", padding: "0 14px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", flexShrink: "0" }}>
                    Review
                  </button>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
