'use client';

import { useEffect, useReducer, useRef } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { DemoMark } from '~/core/components/atoms/DemoMark';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import type { TourBookingController } from '~/core/hooks/tour/useTourBooking';
import { demoActions } from '~/core/store/demo/demo.slice';
import { useAppDispatch } from '~/core/store/hooks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { B, type BookingSection } from '~/core/utils/generator/tour/tourBooking.generator';
import {
  CRM_CREDENTIAL_FIELDS,
  CRM_DEMO_DEEP_LINK,
  CRM_DEMO_STATS,
  CRM_DEMO_WEBHOOK,
  CRM_FLOW_ACTORS,
  CRM_INGEST_OK,
  CRM_NAMES,
  CRM_SYNC_OPTIONS,
  crmNameOf,
  type CrmSyncMode
} from '~/data/mock/crmSyncDemo.mock';

type Status = 'idle' | 'editing' | 'testing' | 'connected' | 'disconnected' | 'error';

interface DemoState {
  mode: CrmSyncMode;
  crm: string;
  status: Status;
  creds: Record<string, string>;
  agentBlock: boolean;
  writeback: boolean;
  webhook: boolean;
  slotCheck: boolean;
  guestCard: boolean;
  cta: string;
  error: string | null;
}

type Action =
  | { type: 'mode'; mode: CrmSyncMode }
  | { type: 'crm'; crm: string }
  | { type: 'cred'; key: string; value: string }
  | { type: 'status'; status: Status; error?: string | null }
  | { type: 'flag'; key: 'agentBlock' | 'writeback' | 'webhook' | 'slotCheck' | 'guestCard' }
  | { type: 'cta'; cta: string };

const reducer = (state: DemoState, action: Action): DemoState => {
  switch (action.type) {
    case 'mode':
      return { ...state, mode: action.mode, error: null };
    case 'crm':
      return { ...state, crm: action.crm, creds: {}, status: action.crm ? 'editing' : 'idle', error: null };
    case 'cred':
      return { ...state, creds: { ...state.creds, [action.key]: action.value }, error: null };
    case 'status':
      return { ...state, status: action.status, error: action.error ?? null };
    case 'flag':
      return { ...state, [action.key]: !state[action.key] };
    case 'cta':
      return { ...state, cta: action.cta };
    default:
      return state;
  }
};

const Card = ({ title, sub, right, children, testId }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; testId?: string }) => (
  <div className="bo-tx__card" data-testid={testId}>
    <div className="bo-tx__cardhead">
      <div className="bo-tx__grow">
        <div className="bo-tx__cardtitle">{title}</div>
        {sub && <div className="bo-tx__cardsub">{sub}</div>}
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Row = ({ label, sub, indent, children }: { label: React.ReactNode; sub?: React.ReactNode; indent?: boolean; children?: React.ReactNode }) => (
  <div className={`bo-tx__setrow${indent ? ' bo-tx__setrow--indent' : ''}`}>
    <div className="bo-tx__grow">
      <div className="bo-tx__setlabel">{label}</div>
      {sub && <div className="bo-tx__setdesc">{sub}</div>}
    </div>
    {children}
  </div>
);

/**
 * Settings › CRM & sync, UI only (October 20, 2026 phase): the design's
 * option cards, scheduler-source card, flow panel and source stats on local
 * demo state. It never calls the CMS; the only real rows are the "From the
 * CMS" card, read from the booking settings already loaded. Every demo value
 * carries the `*` marker.
 */
export const CrmSyncDemoPanel = ({ c, propertyId, onNavigate }: { c: TourBookingController; propertyId: number; onNavigate: (section: BookingSection) => void }) => {
  const s = c.settings!;
  const dispatch = useAppDispatch();
  const toast = (message: string) => dispatch(demoActions.showToast(message));
  const X = B.crm;
  const storedCrm = crmNameOf(s.crm.provider);
  const [d, send] = useReducer(reducer, {
    mode: 'sync',
    crm: storedCrm ?? '',
    status: storedCrm ? 'connected' : 'idle',
    creds: {},
    agentBlock: true,
    writeback: true,
    webhook: true,
    slotCheck: true,
    guestCard: true,
    cta: 'Self-guided tour',
    error: null
  });
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const option = CRM_SYNC_OPTIONS.find((row) => row.id === d.mode)!;
  const crm = d.crm || i18n.t(X.none);
  const fields = d.crm ? (CRM_CREDENTIAL_FIELDS[d.crm] ?? []) : [];
  const ingestOk = d.crm ? CRM_INGEST_OK.includes(d.crm) : false;
  const stats = CRM_DEMO_STATS(d.mode, crm);
  const max = Math.max(...stats.map(([, n]) => n));
  const warn = d.mode === 'ingest' && d.crm && !ingestOk ? t(X.warnNoConnector, { crm }) : d.mode === 'redirect' && !d.slotCheck ? i18n.t(X.warnTwoCalendars) : null;

  const connect = () => {
    if (fields.some(([key]) => !(d.creds[key] ?? '').trim())) return send({ type: 'status', status: 'error', error: i18n.t(X.fillAll) });
    send({ type: 'status', status: 'testing' });
    timer.current = window.setTimeout(() => {
      send({ type: 'status', status: 'connected' });
      toast(t(X.connectedToast, { crm }));
    }, 800);
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard refused: the toast still says it is a demo value */
    }
    toast(i18n.t(X.copied));
  };

  return (
    <div className="bo-tx" data-testid="booking-crm">
      <div className="bo-tx__note" data-testid="crm-demo-banner">
        {i18n.t(X.demoBanner)}
      </div>
      <Card title={i18n.t(X.fromCms)} sub={i18n.t(X.fromCmsSub)} testId="crm-from-cms">
        <div className="bo-tx__cardbody">
          <div className="bo-tx__kv">
            {i18n.t(X.provider)}
            <b>{storedCrm ?? i18n.t(X.none)}</b>
          </div>
          <div className="bo-tx__kv">
            {i18n.t(X.leadSync)}
            <b>{i18n.t(s.crm.leadSync ? X.on : X.off)}</b>
          </div>
          <div className="bo-tx__kv">
            {i18n.t(X.dataProvider)}
            <b>{s.crm.dataProvider ?? i18n.t(X.none)}</b>
          </div>
          <div className="bo-tx__kv">
            {i18n.t(X.managedHours)}
            <b>{s.crm.managedHours ?? i18n.t(X.none)}</b>
          </div>
        </div>
      </Card>

      <div className="bo-tx__info">{i18n.t(X.intro)}</div>
      <div className="bo-tx__options">
        {CRM_SYNC_OPTIONS.map((row) => {
          const on = row.id === d.mode;
          return (
            <button key={row.id} type="button" className={`bo-tx__option${on ? ' bo-tx__option--on' : ''}`} onClick={() => send({ type: 'mode', mode: row.id })} data-testid={`crm-option-${row.id}`} aria-pressed={on}>
              <div className="bo-tx__optionhead">
                <span className={`bo-tx__radio${on ? ' bo-tx__radio--on' : ''}`} />
                <div className="bo-tx__grow" style={{ minWidth: 0 }}>
                  <div className="bo-tx__optiontitle">
                    {row.title}
                    <DemoMark />
                  </div>
                  <div className="bo-tx__optiontag">{row.tag}</div>
                </div>
                {on && <StatusPill variant="ok" label={i18n.t(X.inUse)} />}
              </div>
              <div className="bo-tx__optionwhen">
                <b>{i18n.t(X.useWhen)}</b> {row.when}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bo-tx__grid2 bo-tx__grid2--crm">
        <Card title={t(X.sourceTitle, { option: option.title })} sub={i18n.t(X.sourceSub)} testId="crm-source-card">
          <Row label={i18n.t(X.crm)} sub={i18n.t(X.crmSub)}>
            <select className="bo-tx__select" aria-label={i18n.t(X.crm)} value={d.crm} onChange={(event) => send({ type: 'crm', crm: event.target.value })} data-testid="crm-select">
              <option value="">{i18n.t(X.notConnectedOpt)}</option>
              {CRM_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Row>
          {!d.crm && <Row label={i18n.t(X.connection)} sub={i18n.t(X.chooseCrm)} />}
          {d.crm && d.status === 'connected' && (
            <Row
              label={i18n.t(X.connection)}
              sub={
                <>
                  {t(X.connected, { when: 'Today 10:42 AM' })}
                  <DemoMark />
                </>
              }
            >
              <button type="button" className="bo-tx__btn" onClick={() => toast(t(X.healthy, { crm }))}>
                {i18n.t(X.test)}
              </button>
              <button type="button" className="bo-tx__btn" onClick={() => send({ type: 'status', status: 'editing' })}>
                {i18n.t(X.updateCreds)}
              </button>
              <button
                type="button"
                className="bo-tx__btn bo-tx__btn--danger"
                onClick={() => {
                  send({ type: 'status', status: 'disconnected' });
                  toast(t(X.disconnectedToast, { crm }));
                }}
              >
                {i18n.t(X.disconnect)}
              </button>
            </Row>
          )}
          {d.crm && d.status === 'disconnected' && (
            <Row label={i18n.t(X.connection)} sub={i18n.t(X.disconnected)}>
              <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => send({ type: 'status', status: 'editing' })}>
                {i18n.t(X.updateCreds)}
              </button>
            </Row>
          )}
          {d.crm && (d.status === 'editing' || d.status === 'error' || d.status === 'testing') && (
            <>
              {fields.map(([key, label, secret]) => (
                <Row key={key} label={label} indent>
                  <input
                    className="bo-tx__input"
                    type={secret ? 'password' : 'text'}
                    aria-label={label}
                    autoComplete="off"
                    value={d.creds[key] ?? ''}
                    disabled={d.status === 'testing'}
                    onChange={(event) => send({ type: 'cred', key, value: event.target.value })}
                    style={{ width: 240 }}
                  />
                </Row>
              ))}
              {d.error && <div className="bo-tx__bad" style={{ margin: '0 20px' }}>{d.error}</div>}
              <Row label="" indent>
                <button type="button" className="bo-tx__btn" disabled={d.status === 'testing'} onClick={() => send({ type: 'status', status: storedCrm ? 'connected' : 'disconnected' })}>
                  {i18n.t(X.cancel)}
                </button>
                <button type="button" className="bo-tx__btn bo-tx__btn--primary" disabled={d.status === 'testing'} onClick={connect} data-testid="crm-connect">
                  {d.status === 'testing' ? i18n.t(X.testing) : t(X.connect, { crm })}
                </button>
              </Row>
            </>
          )}
          {d.mode === 'sync' && (
            <>
              <Row
                label={i18n.t(X.agentBlock)}
                sub={
                  <>
                    {t(X.agentBlockSub, { crm })}
                    <DemoMark />
                  </>
                }
              >
                <Switch on={d.agentBlock} label={i18n.t(X.agentBlock)} onToggle={() => send({ type: 'flag', key: 'agentBlock' })} />
              </Row>
              <Row
                label={i18n.t(X.writeback)}
                sub={
                  <>
                    {t(X.writebackSub, { crm })}
                    <DemoMark />
                  </>
                }
              >
                <Switch on={d.writeback} label={i18n.t(X.writeback)} onToggle={() => send({ type: 'flag', key: 'writeback' })} />
              </Row>
              <Row label={i18n.t(X.existingCtas)} sub={i18n.t(X.existingCtasSub)}>
                <span className="bo-tx__setinfo">{i18n.t(X.existingCtasValue)}</span>
                <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => onNavigate('link')}>
                  {i18n.t(X.bookingLink)}
                </button>
              </Row>
            </>
          )}
          {d.mode === 'ingest' && (
            <>
              <Row
                label={i18n.t(X.feed)}
                sub={
                  <>
                    {t(ingestOk ? X.feedOkSub : X.feedNoSub, { crm })}
                    <DemoMark />
                  </>
                }
              >
                <span className="bo-tx__setinfo">{ingestOk ? i18n.t(d.webhook ? X.feedWebhook : X.feedPolling) : i18n.t(X.feedNone)}</span>
                {ingestOk ? (
                  <button type="button" className="bo-tx__btn" onClick={() => send({ type: 'flag', key: 'webhook' })}>
                    {i18n.t(d.webhook ? X.usePolling : X.useWebhook)}
                  </button>
                ) : (
                  <button type="button" className="bo-tx__btn" onClick={() => send({ type: 'mode', mode: 'redirect' })}>
                    {i18n.t(X.switchRedirect)}
                  </button>
                )}
              </Row>
              <Row
                label={i18n.t(X.writeback)}
                sub={
                  <>
                    {t(X.writebackIngestSub, { crm })}
                    <DemoMark />
                  </>
                }
              >
                <Switch on={d.writeback} label={i18n.t(X.writeback)} onToggle={() => send({ type: 'flag', key: 'writeback' })} />
              </Row>
              {ingestOk && d.webhook && (
                <Row label={i18n.t(X.webhookUrl)} sub={i18n.t(X.webhookUrlSub)}>
                  <span className="bo-tx__mono">
                    {CRM_DEMO_WEBHOOK(propertyId)}
                    <DemoMark />
                  </span>
                  <button type="button" className="bo-tx__btn" onClick={() => void copy(CRM_DEMO_WEBHOOK(propertyId))}>
                    {i18n.t(X.copyUrl)}
                  </button>
                </Row>
              )}
            </>
          )}
          {d.mode === 'redirect' && (
            <>
              <Row label={i18n.t(X.ctaLabel)} sub={i18n.t(X.ctaLabelSub)}>
                <input className="bo-tx__input" aria-label={i18n.t(X.ctaLabel)} maxLength={40} value={d.cta} onChange={(event) => send({ type: 'cta', cta: event.target.value })} style={{ width: 220 }} />
              </Row>
              <Row label={i18n.t(X.slotCheck)} sub={i18n.t(X.slotCheckSub)}>
                <Switch on={d.slotCheck} label={i18n.t(X.slotCheck)} onToggle={() => send({ type: 'flag', key: 'slotCheck' })} />
              </Row>
              <Row
                label={i18n.t(X.guestCard)}
                sub={
                  <>
                    {t(X.guestCardSub, { crm })}
                    <DemoMark />
                  </>
                }
              >
                <Switch on={d.guestCard} label={i18n.t(X.guestCard)} onToggle={() => send({ type: 'flag', key: 'guestCard' })} />
              </Row>
              <Row label={i18n.t(X.deepLink)} sub={i18n.t(X.deepLinkSub)}>
                <span className="bo-tx__mono">
                  {CRM_DEMO_DEEP_LINK(propertyId)}
                  <DemoMark />
                </span>
                <button type="button" className="bo-tx__btn" onClick={() => void copy(CRM_DEMO_DEEP_LINK(propertyId))}>
                  {i18n.t(X.copyLink)}
                </button>
              </Row>
            </>
          )}
        </Card>

        <div className="bo-tx__card" data-testid="crm-flow">
          <div className="bo-tx__cardhead">
            <div className="bo-tx__grow">
              <div className="bo-tx__cardtitle">{i18n.t(X.flowTitle)}</div>
              <div className="bo-tx__cardsub">
                {option.title}
                <DemoMark />
              </div>
            </div>
          </div>
          {option.flow.map((step, index) => (
            <div key={step} className="bo-tx__flow">
              <span className="bo-tx__flownum">{index + 1}</span>
              <div className="bo-tx__grow" style={{ minWidth: 0 }}>
                <div className="bo-tx__flowtitle">{CRM_FLOW_ACTORS[index]}</div>
                <div className="bo-tx__flowsub">{step}</div>
              </div>
            </div>
          ))}
          {warn && (
            <div className="bo-tx__note" style={{ margin: '12px 18px' }}>
              {warn}
            </div>
          )}
          <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="bo-tx__statlabel">
              {i18n.t(X.statsTitle)}
              <DemoMark />
            </div>
            {stats.map(([label, n]) => (
              <div key={label} className="bo-tx__statrow">
                <span className="bo-tx__grow">{label}</span>
                <div className="bo-tx__statbar">
                  <span style={{ width: `${Math.round((n / max) * 100)}%` }} />
                </div>
                <span className="bo-tx__statn">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
