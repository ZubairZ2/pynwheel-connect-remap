import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, IconButton, Pill } from '~/components/ui';
import { success, tap } from '~/services/native';
import type { TourStopView } from '~/store/selectors';
import { LightShell } from './shared';

interface StopDetailProps {
  stop: TourStopView;
  onItinerary: () => void;
  onClose: () => void;
  onVideo: () => void;
  onNote: () => void;
  onAi: () => void;
  onNext: () => void;
  isLast: boolean;
}

/** An amenity stop: video, notes, the concierge, "Next Stop". */
export const StopDetailScreen = ({ stop, onItinerary, onClose, onVideo, onNote, onAi, onNext, isLast }: StopDetailProps) => (
  <LightShell>
    <ScreenHeader layout="split" left={<IconButton icon="list" label="Itinerary" onClick={onItinerary} />} right={<IconButton icon="close" label="Close" onClick={onClose} />} />
    <div className="pw-stop">
      <div className="pw-stop__pill">
        <Pill>Amenity</Pill>
      </div>
      <div className="pw-stop__name">{stop.name}</div>
      <div className="pw-stop__status">
        <span />
        Available Now
      </div>
      {stop.amenity?.description ? (
        <div className="pw-stop__about">
          {stop.amenity.description}
          {stop.amenity.hours ? <span> · {stop.amenity.hours} *</span> : null}
        </div>
      ) : null}
      <div className="pw-stop__actions">
        <button type="button" className="pw-stop__action" onClick={onVideo}>
          <span className="pw-stop__actionicon pw-stop__actionicon--dark">
            <Icon name="play" size={14} color="#fff" />
          </span>
          <span>Watch Video Tour</span>
        </button>
        <button type="button" className="pw-stop__action" onClick={onNote}>
          <span className="pw-stop__actionicon">
            <Icon name="pencil" size={16} />
          </span>
          <span>Take Notes</span>
        </button>
      </div>
      <button type="button" className="pw-stop__ai" onClick={onAi}>
        <span className="pw-stop__aiicon">
          <Icon name="sparkle" size={15} color="var(--pw-label-yellow)" />
        </span>
        <span className="pw-stop__aitext">
          <span>Ask The AI Concierge</span>
          <span>Anything about this stop or the property</span>
        </span>
      </button>
      <div className="pw-stop__next">
        <Button onClick={onNext}>{isLast ? 'Finish Tour' : 'Next Stop'}</Button>
      </div>
    </div>
  </LightShell>
);

interface UnlockProps {
  stop: TourStopView;
  drag: number;
  unlocked: boolean;
  onDrag: (pct: number) => void;
  onRelease: () => void;
  onItinerary: () => void;
  onClose: () => void;
  onNext: () => void;
  isLast: boolean;
}

/** A unit stop: slide the 56 px thumb across the 64 px track; past 85% the smart lock opens. */
export const UnlockUnitScreen = ({ stop, drag, unlocked, onDrag, onRelease, onItinerary, onClose, onNext, isLast }: UnlockProps) => {
  const track = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ startX: number; startPct: number } | null>(null);
  const THUMB = 56;
  const PAD = 4;
  const width = track.current?.clientWidth ?? 320;
  const travel = Math.max(1, width - 2 * PAD - THUMB);
  const left = PAD + (drag / 100) * travel;

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (unlocked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging({ startX: e.clientX, startPct: drag });
    void tap();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const pct = dragging.startPct + ((e.clientX - dragging.startX) / travel) * 100;
    onDrag(pct);
  };
  const onUp = () => {
    if (!dragging) return;
    setDragging(null);
    if (drag >= 85) void success();
    onRelease();
  };

  return (
    <LightShell>
      <ScreenHeader layout="split" left={<IconButton icon="list" label="Itinerary" onClick={onItinerary} />} right={<IconButton icon="close" label="Close" onClick={onClose} />} />
      <div className="pw-stop">
        <div className="pw-stop__pill">
          <Pill>Unit</Pill>
        </div>
        <div className="pw-stop__name">Unlock {stop.name}</div>
        <div className="pw-unlock__lock">
          <Icon name="lock" size={16} color="var(--pw-text-muted)" />
          <span>Bluetooth Smart Lock · Secured *</span>
        </div>
        <div className="pw-unlock__wrap">
          <div ref={track} className="pw-unlock__track" role="slider" aria-label="Slide to unlock" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(drag)}>
            <div className="pw-unlock__fill" style={{ width: left + THUMB }} />
            <div className="pw-unlock__label">Slide To Unlock</div>
            <div className={`pw-unlock__thumb${dragging ? ' pw-unlock__thumb--drag' : ''}`} style={{ left }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
              <Icon name={unlocked ? 'unlock' : 'lock'} size={20} color="#fff" />
            </div>
          </div>
        </div>
        {unlocked ? (
          <>
            <div className="pw-unlock__done" role="status">
              <Icon name="check" size={18} color="var(--pw-primary)" />
              <span>Unlocked — Push Door To Enter</span>
            </div>
            <div className="pw-stop__next">
              <Button onClick={onNext}>{isLast ? 'Finish Tour' : 'Next Stop'}</Button>
            </div>
          </>
        ) : null}
      </div>
    </LightShell>
  );
};
