'use client';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { useLogoCropDialog } from '~/core/hooks/connect/useLogoCropDialog';
import { DemoMark } from '~/core/components/atoms/DemoMark';

export const LogoCropDialog = () => {
  const {
    closeCrop,
    confirmCrop,
    cropFrame,
    cropOpen,
    cropPreview,
    cropRef,
    cropSizeLabel,
    cropWhichLabel,
    onCropFrameDown,
    onCropHandleDown,
    onCropMove,
    onCropUp
  } = useLogoCropDialog();

  return (
    <>
      {cropOpen ? (
        <>
          <div style={{ position: "fixed", inset: "0", background: "rgba(20,22,28,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "406" }}>
            <div style={{ width: "680px", background: "#fff", borderRadius: "14px", boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--bo-line)", display: "flex", alignItems: "center", gap: "12px" }}>
                <Icon name={"crop"} style={{ color: "var(--bo-accent)", display: "flex", flexShrink: "0" }} />
                <div style={{ flex: "1" }}>
                  <div style={{ font: "800 17px var(--bo-font)", color: "var(--bo-ink)" }}>
                    Crop {cropWhichLabel}<DemoMark />
                  </div>
                  <div style={{ font: "500 12px var(--bo-font)", color: "var(--bo-subtle)" }}>
                    Drag the frame to reposition · drag the corner handle to resize
                  </div>
                </div>
                <button onClick={closeCrop} style={{ width: "30px", height: "30px", borderRadius: "999px", border: "none", background: "#EEF0F4", color: "var(--bo-ink)", font: "800 13px var(--bo-font)", cursor: "pointer" }}>
                  ×
                </button>
              </div>
              <div style={{ padding: "22px 24px", display: "flex", gap: "18px" }}>
                <div ref={cropRef} onPointerMove={onCropMove} onPointerUp={onCropUp} style={{ position: "relative", flex: "1", height: "280px", background: "#1C1F29", borderRadius: "10px", overflow: "hidden", touchAction: "none", userSelect: "none" }}>
                  <img src="/images/amenity-thumb.jpg" alt="Uploaded artwork" style={{ position: "absolute", inset: "0", width: "100%", height: "100%", objectFit: "cover", opacity: "0.4" }} />
                  <div onPointerDown={onCropFrameDown} style={{ position: "absolute", left: cropFrame.left, top: cropFrame.top, width: cropFrame.width, height: cropFrame.height, border: "2px solid var(--bo-accent)", cursor: "grab", overflow: "hidden" }}>
                    <img src="/images/amenity-thumb.jpg" alt="Crop region" style={{ position: "absolute", left: cropPreview.imgLeft, top: cropPreview.imgTop, width: cropPreview.imgW, height: cropPreview.imgH, objectFit: "cover", pointerEvents: "none" }} />
                    <div onPointerDown={onCropHandleDown} style={{ position: "absolute", right: "-8px", bottom: "-8px", width: "17px", height: "17px", borderRadius: "4px", background: "var(--bo-accent)", border: "2px solid #fff", cursor: "nwse-resize" }} />
                  </div>
                </div>
                <div style={{ width: "200px", flexShrink: "0", display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ font: "700 11px var(--bo-font)", color: "var(--bo-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Result<DemoMark />
                  </div>
                  <div style={{ height: "100px", border: "1px solid var(--bo-line)", borderRadius: "9px", overflow: "hidden", position: "relative", background: "#fff" }}>
                    <img src="/images/amenity-thumb.jpg" alt="Cropped result" style={{ position: "absolute", left: cropPreview.imgLeft, top: cropPreview.imgTop, width: cropPreview.imgW, height: cropPreview.imgH, objectFit: "cover" }} />
                  </div>
                  <div style={{ font: "700 11.5px/1.6 var(--bo-font)", color: "var(--bo-ink)" }}>
                    {cropSizeLabel}
                  </div>
                  <div style={{ font: "500 11.5px/1.6 var(--bo-font)", color: "var(--bo-subtle)" }}>
                    This crop is what the kiosk header, the web embed, and the emailed brochure masthead all render.
                  </div>
                </div>
              </div>
              <div style={{ padding: "18px 24px", borderTop: "1px solid var(--bo-line)", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button onClick={closeCrop} style={{ height: "42px", padding: "0 18px", border: "1px solid var(--bo-line)", background: "#fff", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "var(--bo-muted)", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={confirmCrop} style={{ height: "42px", padding: "0 20px", border: "none", background: "var(--bo-accent)", borderRadius: "8px", font: "700 13px var(--bo-font)", color: "#fff", cursor: "pointer" }}>
                  Save Crop
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
};
