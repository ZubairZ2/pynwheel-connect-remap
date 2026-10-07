import { useMemo, type ReactNode } from 'react';
import { env } from '~/config/env';
import { DummyTourRepository } from './dummy/dummyTourRepository';
import { PynwheelApiTourRepository } from './pynwheelApi/pynwheelApiTourRepository';
import { RepositoryContext } from './repositoryContext';
import { RepositoryConfigurationError, type TourRepository } from './tourRepository';

export { useRepository } from './repositoryContext';

/**
 * Where the app chooses its data provider, from the build configuration:
 *
 *   VITE_TOUR_DATA_SOURCE=dummy   → DummyTourRepository (development demo data)
 *   otherwise                     → PynwheelApiTourRepository at VITE_TOUR_API_URL
 *
 * There is no silent fallback: an API build without a URL fails loudly.
 */
let instance: TourRepository | null = null;

export const createTourRepository = (): TourRepository => {
  if (instance) return instance;
  if (env.dataSource === 'dummy') {
    instance = new DummyTourRepository();
    return instance;
  }
  if (!env.apiUrl) throw new RepositoryConfigurationError('VITE_TOUR_API_URL is not set, so the app does not know where the Pynwheel Tour App API runs. Set it at build time (tour-app/.env.production.local, e.g. http://<your-machine-ip>:8000) and rebuild with `npm run build && npx cap sync`.');
  instance = new PynwheelApiTourRepository({ baseUrl: env.apiUrl, timeoutMs: env.apiTimeoutMs });
  return instance;
};

export const RepositoryProvider = ({ repository, children }: { repository?: TourRepository; children: ReactNode }) => {
  const value = useMemo(() => repository ?? createTourRepository(), [repository]);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
};
