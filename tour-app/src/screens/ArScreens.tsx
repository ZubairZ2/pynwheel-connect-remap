import aerialPhoto from '~/assets/images/pool-aerial.jpg';
import { HomeIndicator, ScreenHeader } from '~/components/chrome';
import { Icon } from '~/components/Icon';
import { Button, ErrorBanner, IconButton, SelectableRow } from '~/components/ui';
import type { Property } from '~/models';
import type { StopDistance } from '~/repositories/tourRepository';
import { distanceLabel, type TourStopView } from '~/store/selectors';
import { DarkShell, LightShell } from './shared';

/** Choose AR Stops: the same cards as Build Your Tour, without icons; "Launch AR Tour" in the footer. */
export const ChooseStopsScreen = ({ stops, distances, selected, calculating, error, onBack, onToggle, onLaunch }: { stops: TourStopView[]; distances: Record<string, StopDistance>; selected: Record<string, boolean>; calculating: boolean; error: string | null; onBack: () => void; onToggle: (node: string) => void; onLaunch: () => void }) => (
  <LightShell
    footer={
      <div className="pw-buildfoot">
        {error ? (
          <div className="pw-buildfoot__error">
            <ErrorBanner title="Route not available" body={error} />
          </div>
        ) : null}
        <div className="pw-buildfoot__row">
          <Button height={48} busy={calculating} onClick={onLaunch}>
            Launch AR Tour
          </Button>
        </div>
      </div>
    }
  >
    <div className="pw-build">
      <ScreenHeader left={<IconButton icon="back" label="Back" onClick={onBack} />} title="Choose AR Stops" />
      <div className="pw-build__sub">Select what you&rsquo;d like to navigate in AR.</div>
      <div className="pw-build__list">
        {stops.map((s) => (
          <SelectableRow key={s.node} selected={!!selected[s.node]} onToggle={() => onToggle(s.node)} title={s.name} meta={`${s.floorLabel} · ${distanceLabel(distances[s.node])}`} />
        ))}
      </div>
    </div>
  </LightShell>
);

/** Scan QR: the dark camera frame with "Simulate QR Scan" (no camera in this phase). */
export const ScanQrScreen = ({ propertyName, onBack, onScan }: { propertyName: string; onBack: () => void; onScan: () => void }) => (
  <DarkShell className="pw-scan">
    <div className="pw-scan__top">
      <IconButton icon="back" label="Back" tone="dark" onClick={onBack} className="pw-scan__back" />
      <span className="pw-scan__live">
        <i />
        LIVE
      </span>
    </div>
    <div className="pw-scan__center">
      <div className="pw-scan__frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="pw-scan__hint">Point camera at {propertyName} QR code in the lobby</div>
    </div>
    <div className="pw-scan__actions">
      <Button onClick={onScan}>Simulate QR Scan</Button>
      <button type="button" className="pw-scan__skip" onClick={onScan}>
        Skip → Enter AR Directly
      </button>
    </div>
    <HomeIndicator dark />
  </DarkShell>
);

/** Initializing AR: five steps that complete one after another, then "Continue". */
export const ArInitScreen = ({ labels, step, propertyName, onContinue }: { labels: string[]; step: number; propertyName: string; onContinue: () => void }) => (
  <DarkShell className="pw-arinit" statusBar={false}>
    <div className="pw-arinit__center">
      <div className="pw-arinit__title">Initializing AR</div>
      <div className="pw-arinit__steps" role="list">
        {labels.map((label, i) => (
          <div key={label} className="pw-arinit__step" role="listitem">
            {i < step ? (
              <span className="pw-arinit__done">
                <Icon name="check" size={13} color="#fff" strokeWidth={3} />
              </span>
            ) : i === step && step < labels.length ? (
              <span className="pw-arinit__current" />
            ) : (
              <span className="pw-arinit__pending" />
            )}
            <span className="pw-arinit__label">{label}</span>
          </div>
        ))}
      </div>
      {step >= labels.length ? (
        <div className="pw-arinit__ready">
          <div className="pw-arinit__readytext">AR Ready · {propertyName}</div>
          <Button onClick={onContinue}>Continue</Button>
        </div>
      ) : null}
    </div>
    <HomeIndicator dark />
  </DarkShell>
);

interface ArLiveProps {
  property: Property;
  stops: TourStopView[];
  distances: Record<string, string>;
  onBack: () => void;
  onPin: (node: string) => void;
  onBegin: () => void;
}

/** AR Live: the property photo with a label pinned on every tour stop, the property stats and "Begin Guided Tour". */
export const ArLiveScreen = ({ property, stops, distances, onBack, onPin, onBegin }: ArLiveProps) => (
  <DarkShell className="pw-arlive" background={<ArBackground />}>
    <div className="pw-arlive__top">
      <IconButton icon="back" label="Back" tone="dark" onClick={onBack} />
      <span className="pw-arlive__badge">
        <i />
        AR Live · {property.name}
      </span>
      <span className="pw-arlive__heading">N 23°</span>
    </div>
    {stops.map((s, i) => {
      const pin = s.arPin ?? { top: `${18 + ((i * 17) % 60)}%`, left: `${14 + ((i * 29) % 70)}%` };
      return (
        <button key={s.node} type="button" className="pw-arpin" style={{ top: pin.top, left: pin.left }} onClick={() => onPin(s.node)}>
          <span className="pw-arpin__box">
            <span className="pw-arpin__name">{s.name}</span>
            <span className="pw-arpin__meta">
              {s.kind === 'unit' ? s.floorLabel : s.floor} · {distances[s.node] ?? '—'}
            </span>
          </span>
          <span className="pw-arpin__dot" />
        </button>
      );
    })}
    <div className="pw-arlive__stats">
      <div>
        <b>{property.floorsCount}</b>
        <span>Floors</span>
      </div>
      <div>
        <b>{property.unitsCount}</b>
        <span>Units</span>
      </div>
      <div>
        <b>{property.amenitiesCount}</b>
        <span>Amenities</span>
      </div>
    </div>
    <div className="pw-arlive__actions">
      <Button onClick={onBegin}>Begin Guided Tour</Button>
      <div className="pw-arlive__hint">Tap any label for details · Tilt to explore</div>
    </div>
  </DarkShell>
);

export const ArBackground = ({ strong = false }: { strong?: boolean }) => (
  <>
    <img src={aerialPhoto} alt="" className="pw-arbg" />
    <div className={`pw-arbg__shade${strong ? ' pw-arbg__shade--strong' : ''}`} />
  </>
);
