'use client';

import { useEffect } from 'react';

import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';

/**
 * Keeps the demo slice's selected company / property in step with the URL.
 *
 * Property-scoped screens read `demo.propId`, so a deep link like
 * `/properties/cortsky/map` has to select `cortsky` before the screen renders
 * its first frame — hence the synchronous first pass rather than an effect
 * alone.
 */
export const PropertyScope = ({ propId, children }: { propId: string; children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const known = useAppSelector((s) => s.demo.props.some((p) => p.id === propId));
  const current = useAppSelector((s) => s.demo.propId);

  useEffect(() => {
    if (known && current !== propId) dispatch(demoActions.selectProp(propId));
  }, [known, current, propId, dispatch]);

  if (!known) return <UnknownRecord kind="property" id={propId} />;
  if (current !== propId) return null;
  return <>{children}</>;
};

export const CompanyScope = ({ orgId, children }: { orgId: string; children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const known = useAppSelector((s) => s.demo.orgs.some((o) => o.id === orgId));
  const current = useAppSelector((s) => s.demo.orgId);

  useEffect(() => {
    if (known && current !== orgId) dispatch(demoActions.selectOrg(orgId));
  }, [known, current, orgId, dispatch]);

  if (!known) return <UnknownRecord kind="company" id={orgId} />;
  if (current !== orgId) return null;
  return <>{children}</>;
};

/**
 * These screens run on demo data, so an id from the Rails-backed listings (or a
 * stale bookmark) has nothing to render. Say so plainly rather than falling back
 * to an unrelated record.
 */
const UnknownRecord = ({ kind, id }: { kind: string; id: string }) => (
  <div
    style={{
      background: 'var(--bo-panel)',
      border: '1px solid var(--bo-line)',
      borderRadius: '12px',
      padding: '48px 28px',
      textAlign: 'center'
    }}
  >
    <div style={{ font: '800 16px var(--bo-font)', color: 'var(--bo-ink)' }}>
      No demo {kind} with the id “{id}”
    </div>
    <div style={{ font: '500 13.5px/1.7 var(--bo-font)', color: 'var(--bo-muted)', marginTop: '8px' }}>
      These screens run on the bundled demo data set, not on the live database. Open a {kind} from the
      Dashboard or the search box above.
    </div>
  </div>
);
