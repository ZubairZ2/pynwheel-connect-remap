'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useLiveChatScreen } from '~/core/hooks/connect/useLiveChatScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const LiveChatScreen = () => {
  const {
    chatConvos,
    chatConvosEmpty,
    chatFilters,
    chatStaffRows,
    chatStats,
    closeConvo,
    closeThread,
    onThreadDraft,
    sendThread,
    thread,
    threadDraft,
    threadOpen
  } = useLiveChatScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "#EEF5E1", border: "1px solid #CFE3AC", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <Icon name={"chat"} style={{ color: "#4A7212", display: "flex", flexShrink: "0" }} />
          <div style={{ flex: "1" }}>
            <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
              Shipped — real-time human chat<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "#20603C" }}>
              Live conversations between touring visitors and property staff. No AI in the loop — every reply is a person.
            </div>
          </div>
          <StatusPill variant="ok" label="Live in production" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
          {(chatStats ?? []).map((k: any, kIdx: number) => (
            <React.Fragment key={kIdx}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {k.label}
                </div>
                <div style={{ font: "800 26px var(--bo-font)", color: "var(--bo-ink)", marginTop: "6px" }}>
                  {k.value}<DemoMark />
                </div>
                <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                  {k.sub}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
          {(chatFilters ?? []).map((t: any, tIdx: number) => (
            <React.Fragment key={tIdx}>
              <button onClick={t.go} style={{ height: "32px", padding: "0 13px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                {t.label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: "16px", alignItems: "start" }}>
          <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
            <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "2px" }}>
              Active Conversations<DemoMark />
            </div>
            <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
              Unassigned chats need a human before the visitor gives up
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              {(chatConvos ?? []).map((c: any, cIdx: number) => (
                <React.Fragment key={cIdx}>
                  <div onClick={c.open} style={{ display: "flex", alignItems: "center", gap: "12px", border: `1px solid ${c.border}`, background: c.bg, borderRadius: "10px", padding: "12px 13px", cursor: "pointer" }}>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {c.visitor}<DemoMark />
                        </span>
                        {c.hasUnread ? (
                          <>
                            <span style={{ minWidth: "17px", height: "17px", padding: "0 5px", borderRadius: "999px", background: "#C62534", color: "#fff", font: "800 10px var(--bo-font)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {c.unread}<DemoMark />
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div style={{ font: "500 11.5px var(--bo-font)", color: "var(--bo-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {c.last}
                      </div>
                      <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {c.property} · {c.staff} · {c.when}
                      </div>
                    </div>
                    {c.isUnassigned ? (
                      <>
                        <button onClick={c.assign} style={{ height: "30px", padding: "0 11px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", flexShrink: "0" }}>
                          Assign
                        </button>
                      </>
                    ) : null}
                    <StatusPill variant={c.stateV} label={c.stateLabel} />
                  </div>
                </React.Fragment>
              ))}
              {chatConvosEmpty ? (
                <>
                  <div style={{ font: "500 13px var(--bo-font)", color: "var(--bo-subtle)", padding: "6px 0" }}>
                    No conversations at this property.
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {threadOpen ? (
              <>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-accent)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "12px" }}>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                        {thread.visitor}<DemoMark />
                      </div>
                      <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {thread.property} · {thread.staff}
                      </div>
                    </div>
                    <StatusPill variant={thread.stateV} label={thread.stateLabel} />
                    <button onClick={closeThread} style={{ width: "26px", height: "26px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-muted)", font: "800 12px var(--bo-font)", cursor: "pointer", flexShrink: "0" }}>
                      ×
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "230px", overflowY: "auto", padding: "12px", background: "#FBFBFC", border: "1px solid var(--bo-line-2)", borderRadius: "9px" }}>
                    {(thread.lines ?? []).map((m: any, mIdx: number) => (
                      <React.Fragment key={mIdx}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: m.align, gap: "3px" }}>
                          <div style={{ maxWidth: "88%", padding: "9px 11px", borderRadius: "9px", background: m.bg, font: "600 12px/1.5 var(--bo-font)", color: m.color }}>
                            {m.text}
                          </div>
                          <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {m.name} · {m.when}
                          </div>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                    <input value={threadDraft} onChange={onThreadDraft} placeholder="Type a reply as staff\u2026" className="bo-field" style={{ flex: "1", textTransform: "none" }} />
                    <button onClick={sendThread} style={{ height: "42px", padding: "0 16px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 12.5px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                      Send
                    </button>
                  </div>
                  <button onClick={closeConvo} style={{ width: "100%", height: "34px", marginTop: "8px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                    Close Conversation
                  </button>
                </div>
              </>
            ) : null}
            <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
              <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "2px" }}>
                Staff Availability<DemoMark />
              </div>
              <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                Toggle whether each person is in their property's chat rotation
              </div>
              {(chatStaffRows ?? []).map((x: any, xIdx: number) => (
                <React.Fragment key={xIdx}>
                  <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 11px var(--bo-font)", flexShrink: "0" }}>
                      {x.initials}<DemoMark />
                    </div>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: x.dot }} />
                        <span style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {x.name}<DemoMark />
                        </span>
                      </div>
                      <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {x.role} · {x.property}
                      </div>
                      <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        {x.statusLabel} · {x.loadLabel}
                      </div>
                    </div>
                    <div onClick={x.toggle} style={{ width: "44px", height: "26px", borderRadius: "999px", background: x.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                      <div style={{ position: "absolute", top: "3px", left: x.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
