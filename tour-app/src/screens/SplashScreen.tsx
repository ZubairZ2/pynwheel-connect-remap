import logo from '~/assets/images/pynwheel-tour-logo.png';
import poweredBy from '~/assets/images/powered-by-pynwheel.png';
import { Spinner } from '~/components/ui';

/** The launch screen: the Pynwheel Tour logo, the spinner and "Powered by Pynwheel", for 1.7 s (or until the session is restored). */
export const SplashScreen = () => (
  <div className="pw-splash" role="status" aria-label="Pynwheel Tour is starting">
    <img src={logo} alt="Pynwheel Tour" className="pw-splash__logo" width={240} />
    <div className="pw-splash__foot">
      <Spinner />
      <img src={poweredBy} alt="Powered by Pynwheel" className="pw-splash__powered" />
    </div>
  </div>
);
