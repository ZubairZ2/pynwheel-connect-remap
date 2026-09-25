'use client';

import React from 'react';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { useTranscriptDialog } from '~/core/hooks/connect/useTranscriptDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const TranscriptDialog = () => {
  const {
    clearTranscript,
    closeTranscript,
    transcript,
    transcriptOpen
  } = useTranscriptDialog();

  return (
    <>
      {transcriptOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "408" }}>
            <div style={{ width: "560px", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Flagged Transcript<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    {transcript.property} · {transcript.reason}
                  </div>
                </div>
                <button onClick={closeTranscript} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "22px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                {(transcript.lines ?? []).map((m: any, mIdx: number) => (
                  <React.Fragment key={mIdx}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: m.align, gap: "3px" }}>
                      <div style={{ maxWidth: "86%", padding: "10px 12px", borderRadius: "9px", background: m.bg, font: "600 12.5px/1.55 var(--bo-font)", color: m.color }}>
                        {m.text}
                      </div>
                      <div style={{ font: "600 10px var(--bo-font)", color: "var(--bo-subtle)" }}>
                        {m.speaker} · {m.when}
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeTranscript} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Keep in Queue
                </button>
                <button onClick={clearTranscript} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Mark Reviewed
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
