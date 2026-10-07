import { useEffect, useState } from 'react';
import { DARK_SCREENS, type Screen } from '~/navigation/screens';
import { hideSplash, onBackButton, onKeyboard, setChrome } from '~/services/native';

/** The native status bar follows the screen: light chrome on white screens, dark over photos and the AR flow. */
export const useChrome = (screen: Screen) => {
  useEffect(() => {
    void setChrome(DARK_SCREENS.includes(screen));
  }, [screen]);
};

/** Hides the native splash once React has painted the in-app splash. */
export const useNativeSplash = () => {
  useEffect(() => {
    const id = window.setTimeout(() => void hideSplash(), 60);
    return () => window.clearTimeout(id);
  }, []);
};

/** Android Back (and Escape on the desktop): the handler says whether it consumed the press. */
export const useBackButton = (handler: () => boolean) => {
  useEffect(() => onBackButton(handler), [handler]);
};

/** The keyboard's height, so sheets with inputs lift above it. */
export const useKeyboardInset = (): number => {
  const [inset, setInset] = useState(0);
  useEffect(() => onKeyboard(setInset), []);
  return inset;
};

/** Whether the app runs framed on a desktop (review) rather than on a phone. */
export const useFramed = (): boolean => {
  const query = '(min-width: 600px) and (min-height: 700px) and (hover: hover)';
  const [framed, setFramed] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setFramed(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  return framed;
};
