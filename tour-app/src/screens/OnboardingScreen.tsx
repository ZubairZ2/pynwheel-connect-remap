import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import communityPhoto from '~/assets/images/community-pool.jpg';
import aerialPhoto from '~/assets/images/pool-aerial.jpg';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { HomeIndicator, StatusArea } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button } from '~/components/ui';
import type { OnboardingSlide } from '~/models';

interface Props {
  slides: OnboardingSlide[];
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

/** Three slides, as the reference draws them; a horizontal swipe on the picture moves between them (the touch equivalent of Previous / Next). */
export const OnboardingScreen = ({ slides, index, onNext, onPrev, onSkip }: Props) => {
  const slide = slides[index] ?? slides[0];
  const last = index >= slides.length - 1;
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const onDown = (e: ReactPointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onUp = (e: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) onNext();
    else if (index > 0) onPrev();
  };

  return (
    <div className="pw-screen pw-onboard">
      <StatusArea />
      <div className="pw-onboard__top">
        <img src={logo} alt="Pynwheel Tour" width={130} className="pw-onboard__logo" />
        <button type="button" className="pw-onboard__skip" onClick={onSkip}>
          Skip
        </button>
      </div>
      <div className="pw-onboard__body">
        <div className="pw-onboard__picture" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (swipe.current = null)}>
          {index === 0 ? (
            <div className="pw-onboard__slide">
              <img src={communityPhoto} alt="Apartment community" />
              <div className="pw-onboard__shade pw-onboard__shade--up" />
              <span className="pw-onboard__chip pw-onboard__chip--tour">
                <span className="pw-onboard__dot" />
                Your Tour
              </span>
              <div className="pw-onboard__bottomchips">
                <span>Units</span>
                <span>Amenities</span>
                <span>Community</span>
              </div>
            </div>
          ) : index === 1 ? (
            <div className="pw-onboard__slide pw-onboard__slide--dark">
              <img src={aerialPhoto} alt="Amenities" style={{ opacity: 0.9 }} />
              <div className="pw-onboard__shade pw-onboard__shade--down" />
              <span className="pw-onboard__chip pw-onboard__chip--primary" style={{ top: 58, left: 36 }}>
                Amenities →
              </span>
              <span className="pw-onboard__chip pw-onboard__chip--white" style={{ top: 104, right: 34 }}>
                Pool ↑
              </span>
              <div className="pw-onboard__qr">
                <span className="pw-onboard__qrcode" />
                <span>Scan lobby QR to start</span>
              </div>
            </div>
          ) : (
            <div className="pw-onboard__slide pw-onboard__slide--dark">
              <img src={communityPhoto} alt="Apartment community" />
              <div className="pw-onboard__shade pw-onboard__shade--up2" />
              <div className="pw-onboard__unlock">
                <span className="pw-onboard__unlockicon">
                  <Icon name="unlock" size={22} color="#fff" />
                </span>
                <div className="pw-onboard__unlocktitle">Your Unit · Unlocked</div>
                <div className="pw-onboard__unlocksub">Tap your phone to enter</div>
              </div>
            </div>
          )}
        </div>
        <div className="pw-onboard__text">
          <div className="pw-onboard__title">{slide.title}</div>
          <div className="pw-onboard__copy">{slide.body}</div>
        </div>
      </div>
      <div className="pw-onboard__dots" aria-hidden>
        {slides.map((s, i) => (
          <span key={s.id} className={i === index ? 'pw-onboard__dotactive' : 'pw-onboard__dotidle'} />
        ))}
      </div>
      <div className="pw-onboard__actions">
        {index > 0 ? (
          <Button variant="secondary" style={{ flex: 1 }} block={false} onClick={onPrev}>
            Previous
          </Button>
        ) : null}
        <Button style={{ flex: 2, fontSize: 14 }} block={false} onClick={onNext}>
          {last ? 'Get Started' : 'Next'}
        </Button>
      </div>
      <div className="pw-onboard__copyright">© Pynwheel, Inc</div>
      <HomeIndicator />
    </div>
  );
};
