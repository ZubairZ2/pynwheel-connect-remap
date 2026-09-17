import { configureStore } from '@reduxjs/toolkit';

import demoReducer from './demo/demo.slice';

/**
 * Store configuration (react-architecture.md §9).
 *
 * One slice for now: the demo data behind every screen ported from the design.
 * Rails-backed screens (Sign In, Companies, Properties) still render from
 * server components and deliberately do not go through Redux.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      demo: demoReducer
    }
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
