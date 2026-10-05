import { createContext, useContext } from 'react';
import type { TourRepository } from './tourRepository';

/** The repository context, in its own module so a hot update never recreates it. */
export const RepositoryContext = createContext<TourRepository | null>(null);

export const useRepository = (): TourRepository => {
  const repository = useContext(RepositoryContext);
  if (!repository) throw new Error('useRepository must be used inside <RepositoryProvider>');
  return repository;
};
