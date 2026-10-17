import { useRef, type PointerEvent as ReactPointerEvent } from 'react';
import accessPhoto from '~/assets/images/onboard-access.png';
import homePhoto from '~/assets/images/onboard-home.png';
import wayfindingPhoto from '~/assets/images/onboard-wayfinding.png';
import logo from '~/assets/images/pynwheel-tour-logo.png';
import { HomeIndicator, StatusArea } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import type { OnboardingSlide } from '~/models';

interface Props {
  slides: OnboardingSlide[];
  index: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

/** The three onboarding photographs are the original Pynwheel Tour app's slides (pyn-tour-old/src/assest/images/img_slide1–3.png). */
const PHOTOS = [homePhoto, wayfindingPhoto, accessPhoto];

/** The design's three bullet points per slide. */
const POINTS: string[][] = [
  ['Book any day, including evenings and weekends', 'Pick the units and amenities you want to see', 'No leasing agent needed'],
  ['Snap photos at every stop', 'Jot notes on what you liked', 'Compare units side by side after your tour'],
  ['Turn-by-turn directions to each stop', 'Unlock doors right from your phone', 'Help from the leasing team is one tap away']
];

/**
 * Three slides, as the October 2026 design draws them: the photograph card,
 * a centred title and body, the three check points on a soft card, then
 * Previous · dots · Next (Let's Start on the last). A horizontal swipe on the
 * photograph moves between slides.
 */
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
        <span />
        <img src={logo} alt="Pynwheel Tour" width={150} className="pw-onboard__logo" />
        <div className="pw-onboard__topright">
          {!last ? (
            <button type="button" className="pw-onboard__skip" onClick={onSkip}>
              Skip
            </button>
          ) : null}
        </div>
      </div>
      <div className="pw-onboard__body">
        <div className="pw-onboard__picture" onPointerDown={onDown} onPointerUp={onUp} onPointerCancel={() => (swipe.current = null)}>
          <img src={PHOTOS[index] ?? PHOTOS[0]} alt={slide.title} />
        </div>
        <div className="pw-onboard__text">
          <div className="pw-onboard__title">{slide.title}</div>
          <div className="pw-onboard__copy">{slide.body}</div>
        </div>
        <div className="pw-onboard__points">
          {(POINTS[index] ?? POINTS[0]).map((p) => (
            <div key={p} className="pw-onboard__point">
              <span className="pw-onboard__pointicon">
                <Icon name="check" size={11} color="var(--pw-primary)" strokeWidth={3.4} />
              </span>
              <span>{p}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="pw-onboard__bar">
        <div className="pw-onboard__barleft">
          {index > 0 ? (
            <button type="button" className="pw-onboard__textbtn" onClick={onPrev}>
              Previous
            </button>
          ) : null}
        </div>
        <div className="pw-onboard__dots" aria-hidden>
          {slides.map((s, i) => (
            <span key={s.id} className={i === index ? 'pw-onboard__dotactive' : 'pw-onboard__dotidle'} />
          ))}
        </div>
        <div className="pw-onboard__barright">
          {last ? (
            <button type="button" className="pw-onboard__start" onClick={onNext}>
              Let&rsquo;s Start
            </button>
          ) : (
            <button type="button" className="pw-onboard__textbtn pw-onboard__textbtn--primary" onClick={onNext}>
              Next
            </button>
          )}
        </div>
      </div>
      <div className="pw-onboard__copyright">© Pynwheel, Inc</div>
      <HomeIndicator />
    </div>
  );
};
