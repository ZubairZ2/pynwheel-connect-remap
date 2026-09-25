'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/connect/StatusPill';
import { useUsersScreen } from '~/core/hooks/connect/useUsersScreen';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const UsersScreen = () => {
  const {
    inviteUser,
    users
  } = useUsersScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-muted)" }}>
            Platform admins &amp; assigned staff-console users<DemoMark />
          </div>
          <button onClick={inviteUser} style={{ height: "38px", padding: "0 16px", background: "var(--bo-accent)", color: "#fff", border: "none", borderRadius: "8px", font: "700 13px var(--bo-font)", cursor: "pointer", display: "flex", alignItems: "center", gap: "7px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Invite User
          </button>
        </div>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", overflow: "hidden" }}>
          <table>
            <thead>
              <tr style={{ background: "#FAFAFB", borderBottom: "1px solid var(--bo-line)" }}>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  User
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Company
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Role
                </th>
                <th style={{ textAlign: "left", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Status
                </th>
                <th style={{ textAlign: "right", padding: "12px 18px", font: "700 11px var(--bo-font)", color: "var(--bo-subtle)", textTransform: "uppercase", letterSpacing: "0.04em" }} />
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u: any, uIdx: number) => (
                <React.Fragment key={uIdx}>
                  <tr style={{ borderBottom: "1px solid var(--bo-line-2)" }}>
                    <td style={{ padding: "13px 18px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "999px", background: "#EEF0F4", color: "var(--bo-muted)", display: "flex", alignItems: "center", justifyContent: "center", font: "800 11px var(--bo-font)" }}>
                          {u.initials}<DemoMark />
                        </div>
                        <div>
                          <div style={{ font: "700 13px var(--bo-font)", color: "var(--bo-ink)" }}>
                            {u.name}<DemoMark />
                          </div>
                          <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 18px", font: "600 13px var(--bo-font)", color: "var(--bo-muted)" }}>
                      {u.org}
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{ font: "700 12px var(--bo-font)", color: u.roleColor, background: u.roleBg, padding: "4px 10px", borderRadius: "6px" }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: "13px 18px" }}>
                      <StatusPill variant={u.statusV} label={u.status} />
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <button aria-label="Remove" onClick={u.remove} style={{ width: "30px", height: "30px", borderRadius: "7px", border: "1px solid var(--bo-line)", background: "#fff", color: "#C62534", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};
