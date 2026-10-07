import { useMemo, type ReactNode } from 'react';
import { DummyTourRepository } from './dummy/dummyTourRepository';
import { RepositoryContext } from './repositoryContext';
import type { TourRepository } from './tourRepository';

export { useRepository } from './repositoryContext';

/**
 * Where the app chooses its data provider. This phase has exactly one:
 * the dummy repository. Connecting the backend later means constructing
 * `PynwheelApiTourRepository` here instead — nothing else changes.
 */
export const createTourRepository = (): TourRepository => new DummyTourRepository();

export const RepositoryProvider = ({ repository, children }: { repository?: TourRepository; children: ReactNode }) => {
  const value = useMemo(() => repository ?? createTourRepository(), [repository]);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
};
