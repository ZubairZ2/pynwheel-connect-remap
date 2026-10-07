import { createContext, useContext, type Dispatch } from 'react';
import type { Place, PropertyListing } from '~/models';
import type { AppContent, PropertyBundle, StopDistance } from '~/repositories/tourRepository';
import type { AppState } from './appState';
import type { Action } from './reducer';

/**
 * The app context lives in its own module (no component exports) so Vite's
 * Fast Refresh never recreates it on a hot update.
 */

/** `idle`: signed out or no property chosen yet, so nothing is loaded. */
export type DataStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface AppData {
  status: DataStatus;
  error: string | null;
  bundle: PropertyBundle | null;
  content: AppContent | null;
  places: Place[];
  /** Distance from the tour start per stop node ("45 ft ↑" on the cards). */
  distances: Record<string, StopDistance>;
  /** The properties the signed-in user may tour (the property picker). */
  properties: PropertyListing[];
  propertiesStatus: 'idle' | 'loading' | 'ready' | 'error';
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  data: AppData;
  hydrated: boolean;
  reload: () => void;
  reloadProperties: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
};
