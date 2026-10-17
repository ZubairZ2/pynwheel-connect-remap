'use client';

import { useCallback, useEffect, useState } from 'react';

import type { LockInventory, StopRows, VisitorsList } from '~/core/models/data/tourModules.data';
import { tourGet } from '~/core/utils/tour/tourApi.client';

/**
 * What the Overview adds to the local tour: today's visitors (who is on site,
 * who is still coming), the lock inventory's counts and the stops' setup
 * gaps, from the three module reads, loaded together when the tab opens.
 */
export const useTourOverview = (propertyId: number, enabled = true) => {
  const [visitors, setVisitors] = useState<VisitorsList | null>(null);
  const [locks, setLocks] = useState<LockInventory | null>(null);
  const [stops, setStops] = useState<StopRows | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const [v, l, s] = await Promise.all([
      tourGet<VisitorsList>(propertyId, 'visitors', { range: 'today', per: 1 }),
      tourGet<LockInventory>(propertyId, 'locks'),
      tourGet<StopRows>(propertyId, 'stops')
    ]);
    if (v.ok) setVisitors(v.data);
    if (l.ok) setLocks(l.data);
    if (s.ok) setStops(s.data);
    setFailed(!v.ok || !l.ok || !s.ok);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    if (!enabled || loading || (visitors && locks && stops)) return;
    void load();
  }, [enabled, load, loading, locks, stops, visitors]);

  return { visitors, locks, stops, loading, failed, reload: load };
};

export type TourOverviewController = ReturnType<typeof useTourOverview>;
