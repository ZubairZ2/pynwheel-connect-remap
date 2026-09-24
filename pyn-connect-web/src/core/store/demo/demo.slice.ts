import { createSlice } from '@reduxjs/toolkit';

import { accountReducers } from './reducers/account.reducers';
import { contentReducers } from './reducers/content.reducers';
import { engagementReducers } from './reducers/engagement.reducers';
import { integrationReducers } from './reducers/integrations.reducers';
import { inventoryReducers } from './reducers/inventory.reducers';
import { mapReducers } from './reducers/map.reducers';
import { schedulingReducers } from './reducers/scheduling.reducers';
import { shellReducers } from './reducers/shell.reducers';
import { initialDemoState } from './demo.state';

/**
 * The demo slice (react-architecture.md §9).
 *
 * Every screen ported from `pyn-connect-new.html` reads from here. It holds
 * *parsed models* seeded from `src/data/mock` — no API call ever writes to it,
 * which is the whole point of this phase: the UI is complete and interactive
 * while the Rails endpoints are still to come.
 *
 * Reducers are grouped by domain in `reducers/` purely so the files stay
 * readable; RTK still sees one flat reducer map, so action types are
 * `demo/<reducerName>`.
 */
export const demoSlice = createSlice({
  name: 'demo',
  initialState: initialDemoState,
  reducers: {
    ...shellReducers,
    ...accountReducers,
    ...inventoryReducers,
    ...mapReducers,
    ...integrationReducers,
    ...contentReducers,
    ...schedulingReducers,
    ...engagementReducers
  }
});

export const demoActions = demoSlice.actions;
export default demoSlice.reducer;
