import { createContext, useContext, type Dispatch } from 'react';
import type { Place } from '~/models';
import type { AppContent, PropertyBundle, StopDistance } from '~/repositories/tourRepository';
import type { AppState } from './appState';
import type { Action } from './reducer';

/**
 * The app context lives in its own module (no component exports) so Vite's
 * Fast Refresh never recreates it on a hot update.
 */

export type DataStatus = 'loading' | 'ready' | 'error';

export interface AppData {
  status: DataStatus;
  error: string | null;
  bundle: PropertyBundle | null;
  content: AppContent | null;
  places: Place[];
  /** Distance from the tour start per stop node ("45 ft ↑" on the cards). */
  distances: Record<string, StopDistance>;
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<Action>;
  data: AppData;
  hydrated: boolean;
  reload: () => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const useApp = (): AppContextValue => {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside <AppProvider>');
  return value;
};
