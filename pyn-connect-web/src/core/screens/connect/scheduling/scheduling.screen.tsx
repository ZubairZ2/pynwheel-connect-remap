'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useSchedulingScreen } from '~/core/hooks/connect/useSchedulingScreen';

export const SchedulingScreen = () => {
  const {
    abandonedAllClear,
    abandonedCount,
    abandonedTours,
    addBooking,
    booking,
    calendarDays,
    cancelBooking,
    embedCode,
    isSchedCal,
    isSchedDirectory,
    isSchedTypes,
    isSchedWidget,
    onVdQuery,
    onWidgetCap,
    onWidgetMsg,
    reminderSteps,
    resyncBooking,
    schedStats,
    schedTabs,
    tourTypeCards,
    vdEmpty,
    vdQuery,
    vdRemovalCount,
    visitorRows,
    widgetCap,
    widgetMsg,
    widgetSlotChips,
    widgetSlotCount
  } = useSchedulingScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {(schedTabs ?? []).map((t: any, tIdx: number) => (
            <React.Fragment key={tIdx}>
              <button onClick={t.go} style={{ height: "36px", padding: "0 15px", border: `1px solid ${t.border}`, background: t.bg, color: t.color, borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer" }}>
                {t.label}
              </button>
            </React.Fragment>
          ))}
          <div style={{ flex: "1" }} />
          <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
            Week of Mar 2, 2026 · all properties
          </div>
        </div>
        {isSchedCal ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px" }}>
                {(schedStats ?? []).map((k: any, kIdx: number) => (
                  <React.Fragment key={kIdx}>
                    <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "16px 18px" }}>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {k.label}
                      </div>
                      <div style={{ font: "800 26px var(--bo-font)", color: "var(--bo-ink)", marginTop: "6px" }}>
                        {k.value}
                      </div>
                      <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {k.sub}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ background: "var(--bo-panel)", border: "1px solid #F9DCE0", borderRadius: "12px", padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <Icon name={"alert"} style={{ color: "#E03B45", display: "flex" }} />
                  <div style={{ flex: "1" }}>
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Abandoned Self-Guided Tours
                    </div>
                    <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      Sessions idle more than 60 minutes — visitor likely left without finishing
                    </div>
                  </div>
                  <StatusPill variant="crit" label={`${abandonedCount} open`} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(abandonedTours ?? []).map((a: any, aIdx: number) => (
                    <React.Fragment key={aIdx}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 14px", border: `1px solid ${a.border}`, background: a.bg, borderRadius: "10px" }}>
                        <Icon name={"clock"} style={{ color: a.dotColor, display: "flex", flexShrink: "0" }} />
                        <div onClick={a.go} style={{ flex: "1", cursor: "pointer" }}>
                          <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {a.visitor} · {a.property}
                          </div>
                          <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-muted)" }}>
                            Last activity at {a.stop} · started {a.started}
                          </div>
                        </div>
                        {a.isOpen ? (
                          <>
                            <button onClick={a.recover} style={{ height: "30px", padding: "0 12px", border: "1px solid var(--bo-accent)", background: "var(--bo-accent-soft)", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)", cursor: "pointer", flexShrink: "0" }}>
                              Send Recovery Text
                            </button>
                            <button onClick={a.close} style={{ height: "30px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer", flexShrink: "0" }}>
                              Close Session
                            </button>
                          </>
                        ) : null}
                        <StatusPill variant={a.stateV} label={a.stateLabel} />
                      </div>
                    </React.Fragment>
                  ))}
                  {abandonedAllClear ? (
                    <>
                      <div style={{ padding: "14px", border: "1px dashed var(--bo-line)", borderRadius: "10px", font: "600 12.5px var(--bo-font)", color: "var(--bo-subtle)", textAlign: "center" }}>
                        Every abandoned session has been handled.
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: "16px", alignItems: "start" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "18px 20px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                    <div style={{ flex: "1" }}>
                      <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                        Scheduled Appointments
                      </div>
                      <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Booked ahead of time — separate from walk-in self-guided sessions
                      </div>
                    </div>
                    <button onClick={addBooking} style={{ height: "34px", padding: "0 14px", background: "var(--bo-accent)", color: "#fff", border: "none", borderRadius: "8px", font: "700 12.5px var(--bo-font)", cursor: "pointer" }}>
                      + New Booking
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: "8px" }}>
                    {(calendarDays ?? []).map((d: any, dIdx: number) => (
                      <React.Fragment key={dIdx}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                          <div style={{ paddingBottom: "8px", borderBottom: "2px solid var(--bo-line)" }}>
                            <div style={{ font: "800 12px var(--bo-font)", color: d.headColor }}>
                              {d.label}
                            </div>
                            <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {d.date}
                            </div>
                          </div>
                          {(d.slots ?? []).map((b: any, bIdx: number) => (
                            <React.Fragment key={bIdx}>
                              <div onClick={b.pick} style={{ border: b.outline, background: b.b, borderRadius: "8px", padding: "8px 9px", cursor: "pointer", opacity: b.op }}>
                                <div style={{ font: "800 11px var(--bo-font)", color: b.c, textDecoration: b.strike }}>
                                  {b.time}
                                </div>
                                <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)", textDecoration: b.strike }}>
                                  {b.visitor}
                                </div>
                                <div style={{ font: "600 10.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                                  {b.typeLabel}
                                </div>
                              </div>
                            </React.Fragment>
                          ))}
                          {d.empty ? (
                            <>
                              <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)", padding: "6px 2px" }}>
                                No bookings
                              </div>
                            </>
                          ) : null}
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: booking.typeBg, color: booking.typeColor, display: "flex", alignItems: "center", justifyContent: "center", font: "800 13px var(--bo-font)", flexShrink: "0" }}>
                        {booking.initials}
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {booking.visitor}
                        </div>
                        <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {booking.dayLabel} · {booking.time}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Tour type
                        <span style={{ font: "800 11px var(--bo-font)", color: booking.typeColor, background: booking.typeBg, padding: "3px 8px", borderRadius: "999px" }}>
                          {booking.typeLabel}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Property
                        <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                          {booking.property}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Email
                        <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                          {booking.email}
                        </span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                        Phone
                        <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                          {booking.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                      <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        CRM Sync
                      </div>
                      <StatusPill variant={booking.syncV} label={booking.syncLabel} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)", marginBottom: "12px" }}>
                      Connected CRM
                      <span style={{ fontWeight: "700", color: "var(--bo-ink)" }}>
                        {booking.crm}
                      </span>
                    </div>
                    <button onClick={resyncBooking} style={{ width: "100%", height: "34px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                      <Icon name={"refresh"} style={{ display: "flex" }} />
                      Re-send to CRM
                    </button>
                  </div>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "4px" }}>
                      Reminder Timeline
                    </div>
                    {(reminderSteps ?? []).map((r: any, rIdx: number) => (
                      <React.Fragment key={rIdx}>
                        <div style={{ display: "flex", alignItems: "center", gap: "11px", padding: "11px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                          <div style={{ width: "9px", height: "9px", borderRadius: "999px", background: r.dot, flexShrink: "0" }} />
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {r.label}
                            </div>
                            <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {r.detail}
                            </div>
                          </div>
                          <StatusPill variant={r.pillV} label={r.pillLabel} />
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
                      <Icon name={"card"} style={{ color: "var(--bo-muted)", display: "flex" }} />
                      <div style={{ flex: "1", font: "800 13.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        Stripe Card Hold
                      </div>
                      <StatusPill variant={booking.holdV} label={booking.holdLabel} />
                    </div>
                    <div style={{ font: "500 12px/1.55 var(--bo-font)", color: "var(--bo-subtle)" }}>
                      {booking.holdNote} · status only, managed in Stripe
                    </div>
                  </div>
                  <button onClick={cancelBooking} style={{ height: "38px", border: "1px solid #F9DCE0", background: "#FDEDEF", borderRadius: "8px", font: "700 12.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                    Cancel this booking
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : null}
        {isSchedTypes ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", alignItems: "start" }}>
              {(tourTypeCards ?? []).map((t: any, tIdx: number) => (
                <React.Fragment key={tIdx}>
                  <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px", opacity: t.op }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "14px" }}>
                      <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: t.b, color: t.c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                        <Icon name={t.icon} style={{ display: "flex" }} />
                      </div>
                      <div style={{ flex: "1", minWidth: "0" }}>
                        <div style={{ font: "800 14.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          {t.label}
                        </div>
                        <div style={{ font: "500 11.5px/1.5 var(--bo-font)", color: "var(--bo-subtle)" }}>
                          {t.note}
                        </div>
                      </div>
                      <div onClick={t.toggle} style={{ width: "44px", height: "26px", borderRadius: "999px", background: t.toggleBg, position: "relative", cursor: "pointer", flexShrink: "0", transition: "background .15s" }}>
                        <div style={{ position: "absolute", top: "3px", left: t.knob, width: "20px", height: "20px", borderRadius: "999px", background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                      <div>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Daily capacity
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Max bookings per day
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={t.dailyDown} style={{ width: "26px", height: "26px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "800 14px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          −
                        </button>
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", minWidth: "24px", textAlign: "center" }}>
                          {t.dailyCap}
                        </div>
                        <button onClick={t.dailyUp} style={{ width: "26px", height: "26px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "800 14px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                      <div>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Per-slot capacity
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Concurrent tours per time slot
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button onClick={t.slotDown} style={{ width: "26px", height: "26px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "800 14px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          −
                        </button>
                        <div style={{ font: "800 15px var(--bo-font)", color: "var(--bo-ink)", minWidth: "24px", textAlign: "center" }}>
                          {t.slotCap}
                        </div>
                        <button onClick={t.slotUp} style={{ width: "26px", height: "26px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "6px", font: "800 14px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", marginTop: "4px", borderTop: "1px solid var(--bo-line-2)" }}>
                      <StatusPill variant={t.statusV} label={t.statusLabel} />
                      <div style={{ font: "600 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {t.booked} booked this week
                      </div>
                    </div>
                    <button onClick={t.toggleExpand} style={{ width: "100%", marginTop: "12px", height: "36px", border: "1px solid var(--bo-line)", background: "#FAFBFC", borderRadius: "8px", font: "700 12px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                      <Icon name={"settings"} style={{ display: "flex" }} />
                      Behavior Settings {t.expandCaret}
                    </button>
                    {t.expanded ? (
                      <>
                        <div style={{ marginTop: "12px", borderTop: "1px solid var(--bo-line-2)", paddingTop: "12px" }}>
                          <div style={{ font: "800 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                            Behavior
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                            {(t.behaviors ?? []).map((bx: any, bxIdx: number) => (
                              <React.Fragment key={bxIdx}>
                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                  <div style={{ flex: "1", minWidth: "0" }}>
                                    <div style={{ font: "700 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                                      {bx.label}
                                    </div>
                                    <div style={{ font: "500 10.5px/1.4 var(--bo-font)", color: "var(--bo-subtle)" }}>
                                      {bx.desc}
                                    </div>
                                  </div>
                                  <div onClick={bx.toggle} style={{ width: "40px", height: "23px", borderRadius: "999px", background: bx.bg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                    <div style={{ position: "absolute", top: "3px", left: bx.knob, width: "17px", height: "17px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                          <div style={{ font: "800 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "14px 0 8px" }}>
                            Visiting Hours
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            {(t.hourRows ?? []).map((h: any, hIdx: number) => (
                              <React.Fragment key={hIdx}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  <div onClick={h.toggle} style={{ width: "34px", height: "20px", borderRadius: "999px", background: h.bg, position: "relative", cursor: "pointer", flexShrink: "0" }}>
                                    <div style={{ position: "absolute", top: "3px", left: h.knob, width: "14px", height: "14px", borderRadius: "999px", background: "#fff", boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }} />
                                  </div>
                                  <span style={{ width: "30px", font: "700 11.5px var(--bo-font)", color: "var(--bo-ink)", flexShrink: "0" }}>
                                    {h.day}
                                  </span>
                                  {h.on ? (
                                    <>
                                      <input type="time" value={h.open} onChange={h.onOpen} style={{ height: "28px", border: "1px solid var(--bo-line)", borderRadius: "6px", padding: "0 6px", font: "600 11px var(--bo-font)", color: "var(--bo-ink)" }} />
                                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                                        –
                                      </span>
                                      <input type="time" value={h.close} onChange={h.onClose} style={{ height: "28px", border: "1px solid var(--bo-line)", borderRadius: "6px", padding: "0 6px", font: "600 11px var(--bo-font)", color: "var(--bo-ink)" }} />
                                    </>
                                  ) : null}
                                  {h.off ? (
                                    <>
                                      <span style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                                        Closed
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </>
        ) : null}
        {isSchedDirectory ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "14px 20px", display: "flex", alignItems: "center", gap: "14px" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: "#EEF0F4", color: "var(--bo-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={"users"} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Visitor Directory
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Every prospective tour visitor across all properties · handle GDPR / CCPA data-removal requests here
                  </div>
                </div>
                {vdRemovalCount ? (
                  <>
                    <StatusPill variant="warn" label={`${vdRemovalCount} removal requests`} />
                  </>
                ) : null}
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "11px", top: "50%", transform: "translateY(-50%)", color: "var(--bo-subtle)", display: "flex" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </span>
                  <input value={vdQuery} onChange={onVdQuery} placeholder="Search visitors, email, property" style={{ width: "280px", height: "36px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "0 12px 0 34px", font: "600 12.5px var(--bo-font)", color: "var(--bo-ink)", outline: "none" }} />
                </div>
              </div>
              <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#FAFBFC", borderBottom: "1px solid var(--bo-line)" }}>
                      <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Visitor
                      </th>
                      <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Contact
                      </th>
                      <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Property
                      </th>
                      <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Last Tour
                      </th>
                      <th style={{ textAlign: "left", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Data Status
                      </th>
                      <th style={{ textAlign: "right", padding: "12px 16px", font: "800 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Data Removal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(visitorRows ?? []).map((v: any, vIdx: number) => (
                      <React.Fragment key={vIdx}>
                        <tr className="bo-row" style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                          <td style={{ padding: "12px 16px", font: "800 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {v.name}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ font: "600 12px var(--bo-font)", color: "var(--bo-ink)" }}>
                              {v.email}
                            </div>
                            <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                              {v.phone}
                            </div>
                          </td>
                          <td style={{ padding: "12px 16px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                            {v.property}
                          </td>
                          <td style={{ padding: "12px 16px", font: "600 12.5px var(--bo-font)", color: "var(--bo-muted)" }}>
                            {v.lastTour}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <StatusPill variant={v.gdprV} label={v.gdprLabel} />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            {v.isActive ? (
                              <>
                                <button onClick={v.requestRemoval} style={{ height: "30px", padding: "0 12px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                                  Request Removal
                                </button>
                              </>
                            ) : null}
                            {v.isRequested ? (
                              <>
                                <button onClick={v.processRemoval} style={{ height: "30px", padding: "0 12px", border: "1px solid #F7CFD5", background: "#FDEDEF", borderRadius: "7px", font: "700 11.5px var(--bo-font)", color: "#C62534", cursor: "pointer" }}>
                                  Process Removal
                                </button>
                              </>
                            ) : null}
                            {v.isRemoved ? (
                              <>
                                <span style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-subtle)" }}>
                                  Removed
                                </span>
                              </>
                            ) : null}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
                {vdEmpty ? (
                  <>
                    <div style={{ padding: "36px", textAlign: "center", font: "600 13px var(--bo-font)", color: "var(--bo-subtle)" }}>
                      No visitors match your search.
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
        {isSchedWidget ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "16px", alignItems: "start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Embeddable Scheduler Widget
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "16px" }}>
                    The booking form partners embed on their own property websites
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div>
                      <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                        Bookings per time slot
                      </div>
                      <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        Applies across all tour types in the widget
                      </div>
                    </div>
                    <input type="number" value={widgetCap} onChange={onWidgetCap} style={{ width: "74px", height: "34px", border: "1px solid var(--bo-line)", borderRadius: "7px", padding: "0 10px", font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }} />
                  </div>
                  <div style={{ padding: "14px 0 0", borderTop: "1px solid var(--bo-line-2)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                      <div>
                        <div style={{ font: "700 12.5px var(--bo-font)", color: "var(--bo-ink)" }}>
                          Available time slots
                        </div>
                        <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                          Click to enable or disable a slot
                        </div>
                      </div>
                      <div style={{ font: "700 11.5px var(--bo-font)", color: "var(--bo-accent)" }}>
                        {widgetSlotCount} enabled
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "7px" }}>
                      {(widgetSlotChips ?? []).map((c: any, cIdx: number) => (
                        <React.Fragment key={cIdx}>
                          <button onClick={c.pick} style={{ height: "31px", padding: "0 11px", border: `1px solid ${c.border}`, background: c.bg, color: c.color, borderRadius: "7px", font: "700 11.5px var(--bo-font)", cursor: "pointer" }}>
                            {c.label}
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Confirmation Message
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)", marginBottom: "12px" }}>
                    Shown after booking and included in the confirmation email
                  </div>
                  <textarea onChange={onWidgetMsg} value={widgetMsg} style={{ width: "100%", minHeight: "96px", border: "1px solid var(--bo-line)", borderRadius: "8px", padding: "11px 12px", font: "500 12.5px/1.6 var(--bo-font)", color: "var(--bo-ink)", resize: "vertical", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)", marginBottom: "12px" }}>
                    Embed Code
                  </div>
                  <div style={{ background: "#161821", borderRadius: "9px", padding: "14px", font: "500 11px/1.7 var(--pw-font-mono),monospace", color: "#C9D3E4", wordBreak: "break-all" }}>
                    {embedCode}
                  </div>
                </div>
                <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "20px 22px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px", marginBottom: "10px" }}>
                    <Icon name={"card"} style={{ color: "var(--bo-muted)", display: "flex" }} />
                    <div style={{ font: "800 14px var(--bo-font)", color: "var(--bo-ink)" }}>
                      Card Hold at Booking
                    </div>
                  </div>
                  <div style={{ font: "500 12.5px/1.65 var(--bo-font)", color: "var(--bo-muted)" }}>
                    Stripe places a temporary{' '}
                    <strong style={{ color: "var(--bo-ink)" }}>
                      $50 authorization
                    </strong>
                    {' '}when a self-guided or staff-led tour is booked, then releases it automatically once the tour completes or the booking is cancelled. Hold status appears on each booking — refunds and disputes are handled in Stripe.
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
};
