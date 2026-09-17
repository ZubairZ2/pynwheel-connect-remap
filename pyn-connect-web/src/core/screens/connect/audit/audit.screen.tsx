'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useAuditScreen } from '~/core/hooks/connect/useAuditScreen';

export const AuditScreen = () => {
  const {
    auditLog
  } = useAuditScreen();

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ background: "var(--bo-panel)", border: "1px solid var(--bo-line)", borderRadius: "12px", padding: "8px 20px" }}>
          {(auditLog ?? []).map((e: any, eIdx: number) => (
            <React.Fragment key={eIdx}>
              <div style={{ display: "flex", gap: "14px", padding: "14px 0", borderBottom: "1px solid var(--bo-line-2)" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: e.iconBg, color: e.iconColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: "0" }}>
                  <Icon name={e.icon} style={{ display: "flex" }} />
                </div>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "600 13px/1.5 var(--bo-font)", color: "var(--bo-ink)" }}>
                    <span style={{ fontWeight: "800" }}>
                      {e.actor}
                    </span>
                    {' '}{e.action}{' '}
                    <span style={{ fontWeight: "800" }}>
                      {e.target}
                    </span>
                  </div>
                  <div style={{ font: "600 11px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {e.org} · {e.when}
                  </div>
                </div>
                <span style={{ font: "700 10px var(--bo-font)", color: "var(--bo-muted)", background: "#EEF0F4", padding: "3px 9px", borderRadius: "4px", height: "fit-content", textTransform: "uppercase" }}>
                  {e.type}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </>
  );
};
