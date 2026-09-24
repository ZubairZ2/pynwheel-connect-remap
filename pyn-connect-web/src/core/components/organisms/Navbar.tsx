'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { CONNECT_ROUTES } from '~/config/app/connectRoutes';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch, useAppSelector } from '~/core/store/hooks';
import {
  generateGlobalEmptyLabel,
  generateGlobalResults
} from '~/core/utils/generator/connect/globalSearch.generator';
import { orgRoute, propRoute } from '~/config/app/connectRoutes';

interface Props {
  title: string;
  recordCount?: number;
}

/**
 * The design's top bar: page title, omni-search over the demo data, environment
 * chip and the audit-log bell. Shared by every screen, old and new.
 */
export const Navbar = ({ title, recordCount }: Props) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const query = useAppSelector((s) => s.demo.globalQuery);
  const demo = useAppSelector((s) => s.demo);
  const results = useMemo(() => generateGlobalResults(demo), [demo]);
  const open = query.trim().length > 0;

  const openResult = (kind: string, id: string) => {
    dispatch(demoActions.setGlobalQuery(''));
    if (kind === 'Company') {
      dispatch(demoActions.selectOrg(id));
      router.push(orgRoute(id));
    } else if (kind === 'Property') {
      dispatch(demoActions.selectProp(id));
      router.push(propRoute(id));
    } else {
      router.push(CONNECT_ROUTES.users);
    }
  };

  return (
    <header className="bo-topbar">
      <h1 className="bo-topbar__title">{title}</h1>
      {recordCount != null && (
        <>
          <span className="bo-topbar__divider" aria-hidden="true" />
          <span className="bo-topbar__count">{recordCount.toLocaleString()} records</span>
        </>
      )}

      <span className="bo-topbar__divider" aria-hidden="true" />

      <div className="bo-globalsearch">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--bo-subtle)"
          strokeWidth="2"
          strokeLinecap="round"
          className="bo-globalsearch__icon"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="bo-globalsearch__input"
          value={query}
          aria-label="Search companies, properties, users"
          placeholder="Search companies, properties, users…"
          onChange={(event) => dispatch(demoActions.setGlobalQuery(event.target.value))}
        />

        {open && (
          <div className="bo-globalsearch__panel">
            {results.map((result) => (
              <button
                type="button"
                key={`${result.kind}-${result.id}`}
                className="bo-globalsearch__row"
                onClick={() => openResult(result.kind, result.id)}
              >
                <span className="bo-globalsearch__badge">
                  <Icon name={result.icon} style={{ transform: 'scale(0.8)' }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="bo-globalsearch__name">{result.name}</span>
                  <span className="bo-globalsearch__sub">{result.sub}</span>
                </span>
                <span className="bo-globalsearch__kind">{result.kind}</span>
              </button>
            ))}

            {results.length === 0 && (
              <div className="bo-globalsearch__empty">{generateGlobalEmptyLabel(query)}</div>
            )}

            <button
              type="button"
              className="bo-globalsearch__clear"
              onClick={() => dispatch(demoActions.setGlobalQuery(''))}
            >
              Clear search
            </button>
          </div>
        )}
      </div>

      <span style={{ flex: 1 }} />

      <span className="bo-env">
        <span className="bo-env__dot" aria-hidden="true" />
        {(process.env.NEXT_PUBLIC_ENV_LABEL ?? 'PRODUCTION').toUpperCase()}
      </span>

      <button
        type="button"
        className="bo-bell"
        aria-label="Notifications"
        onClick={() => router.push(CONNECT_ROUTES.audit)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="bo-bell__dot" aria-hidden="true" />
      </button>
    </header>
  );
};
