'use client';

import { useMemo } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Modal } from '~/core/components/molecules/Modal';
import { useTourLocks, type TourLocksController } from '~/core/hooks/tour/useTourLocks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { L, LOCK_SUBS, targetLabel, type ProviderCard } from '~/core/utils/generator/tour/tourLocks.generator';

const X = CORE_STRINGS.tourModules.common;

/** The Locks tab: providers, the lock inventory with mapping, and the issued codes, on the real lock rows. */
export const LocksTab = ({ propertyId, legacyUrl }: { propertyId: number; legacyUrl: string | null }) => {
  const c = useTourLocks(propertyId);
  if (c.error) {
    return (
      <div className="bo-tx" data-testid="tour-locks">
        <div className="bo-error" role="alert">
          {c.error}
          <button type="button" className="bo-tx__btn" onClick={() => void c.reload()} style={{ marginLeft: 10 }}>
            {i18n.t(X.retry)}
          </button>
        </div>
      </div>
    );
  }
  if (!c.inventory) {
    return (
      <div className="bo-tx" data-testid="tour-locks">
        <div className="bo-tx__empty">{i18n.t(X.loading)}</div>
      </div>
    );
  }
  if (!c.inventory.enabled) {
    return (
      <div className="bo-tx" data-testid="tour-locks">
        <div className="bo-section bo-section--empty" role="status">
          <h2 className="bo-section__title">{i18n.t(L.offTitle)}</h2>
          <p className="bo-section__subtitle">{i18n.t(L.offBody)}</p>
          <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" onClick={() => void c.actions.setEnabled(true)} disabled={c.busy === 'enabled'}>
            {i18n.t(L.turnOn)}
          </button>
        </div>
        <LocksDialogs c={c} />
      </div>
    );
  }
  return (
    <div className="bo-tx" data-testid="tour-locks">
      {!c.canEdit && <div className="bo-tx__info">{i18n.t(c.meta?.writesEnabled ? X.readOnly : X.writesOff)}</div>}
      <div className="bo-tx__subs" role="tablist">
        {LOCK_SUBS.map((sub) => (
          <button key={sub} type="button" role="tab" aria-selected={c.sub === sub} className={`bo-tx__sub${c.sub === sub ? ' bo-tx__sub--on' : ''}`} onClick={() => c.setSub(sub)}>
            {i18n.t(L.subs[sub])}
            {sub === 'inventory' && <span className="bo-tx__chipn">{c.inventory?.counts.all ?? 0}</span>}
          </button>
        ))}
        <div className="bo-tx__grow" />
        <button type="button" className="bo-tx__btn" onClick={() => void c.actions.setEnabled(false)}>
          {i18n.t(L.turnOff)}
        </button>
      </div>
      {c.sub === 'providers' && <Providers c={c} legacyUrl={legacyUrl} />}
      {c.sub === 'inventory' && <Inventory c={c} />}
      {c.sub === 'issued' && <Issued c={c} />}
      <LocksDialogs c={c} />
    </div>
  );
};

const Providers = ({ c, legacyUrl }: { c: TourLocksController; legacyUrl: string | null }) => (
  <div className="bo-tx">
    {c.providers.connected.length === 0 && <div className="bo-tx__card"><div className="bo-tx__empty">{i18n.t(L.provider.none)}</div></div>}
    {c.providers.connected.map((card) => (
      <ProviderCardView key={card.vendor} card={card} c={c} legacyUrl={legacyUrl} />
    ))}
    <div className="bo-tx__card">
      <div className="bo-tx__cardhead">
        <div className="bo-tx__grow">
          <div className="bo-tx__cardtitle">{i18n.t(L.provider.available)}</div>
          <div className="bo-tx__cardsub">{i18n.t(L.provider.availableSub)}</div>
        </div>
        {legacyUrl && (
          <a className="bo-tx__btn bo-tx__btn--accent" href={legacyUrl} target="_blank" rel="noopener noreferrer">
            {i18n.t(L.provider.openCms)}
          </a>
        )}
      </div>
      <div className="bo-tx__cardbody">
        <div className="bo-tx__info">{i18n.t(L.provider.manageInCms)}</div>
        <div className="bo-tx__chips">
          {c.providers.available.map((card) => (
            <span key={card.vendor} className="bo-tx__chip">
              {card.label} · {card.cred}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ProviderCardView = ({ card, c, legacyUrl }: { card: ProviderCard; c: TourLocksController; legacyUrl: string | null }) => {
  const test = c.testResult?.vendor === card.vendor ? c.testResult : null;
  return (
    <div className="bo-tx__card" data-testid={`lock-provider-${card.vendor}`}>
      <div className="bo-tx__cardhead">
        <div className="bo-tx__grow">
          <div className="bo-tx__cardtitle" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {card.label}
            <StatusPill variant={card.pill.variant} label={card.pill.label} />
          </div>
          {card.note && <div className="bo-tx__cardsub bo-tx__warn">{card.note}</div>}
          <div className="bo-tx__cardsub">{card.lastChanged}</div>
        </div>
      </div>
      <div className="bo-tx__cardbody">
        <div className="bo-tx__stats">
          <div className="bo-tx__stat">
            <div className="bo-tx__statlabel">{i18n.t(L.provider.account)}</div>
            <div className="bo-tx__statvalue">{card.account.length ? card.account.map((row) => `${row.label}: ${row.value}`).join(' · ') : '—'}</div>
          </div>
          <div className="bo-tx__stat">
            <div className="bo-tx__statlabel">{i18n.t(L.provider.locks)}</div>
            <div className="bo-tx__statvalue">{card.counts}</div>
          </div>
          <div className="bo-tx__stat">
            <div className="bo-tx__statlabel">{i18n.t(L.provider.visitorGets)}</div>
            <div className="bo-tx__statvalue">{card.cred}</div>
          </div>
          <div className="bo-tx__stat">
            <div className="bo-tx__statlabel">{i18n.t(L.provider.healthData)}</div>
            <div className="bo-tx__statvalue">{card.health}</div>
          </div>
        </div>
        {card.noApi && <div className="bo-tx__note">{i18n.t(L.provider.noApi)}</div>}
        {test && <div className={test.ok ? 'bo-tx__ok' : 'bo-tx__bad'}>{test.message}</div>}
        {card.instructions && (card.instructions.unit || card.instructions.amenity) && (
          <div className="bo-tx__info">
            <b>{i18n.t(L.provider.instructions)}</b>
            {card.instructions.unit && <div>{i18n.t(L.provider.unitDoors)}: {stripHtml(card.instructions.unit)}</div>}
            {card.instructions.amenity && <div>{i18n.t(L.provider.amenityDoors)}: {stripHtml(card.instructions.amenity)}</div>}
          </div>
        )}
        <div className="bo-tx__toolbar">
          <span className="bo-tx__grow bo-tx__cardsub">{i18n.t(L.provider.manageInCms)}</span>
          {legacyUrl && (
            <a className="bo-tx__btn" href={legacyUrl} target="_blank" rel="noopener noreferrer">
              {i18n.t(L.provider.openCms)}
            </a>
          )}
          <button type="button" className="bo-tx__btn" disabled={!card.supports.test || c.busy === `test:${card.vendor}`} onClick={() => void c.actions.test(card.vendor)}>
            {c.busy === `test:${card.vendor}` ? i18n.t(L.provider.testing) : i18n.t(L.provider.test)}
          </button>
          <button type="button" className="bo-tx__btn" disabled={!card.supports.sync || c.busy === `sync:${card.vendor}`} onClick={() => void c.actions.sync(card.vendor)}>
            {c.busy === `sync:${card.vendor}` ? i18n.t(L.provider.syncing) : i18n.t(L.provider.sync)}
          </button>
          <button type="button" className="bo-tx__btn bo-tx__btn--danger" disabled={!c.inventory || c.inventory.locks.every((lock) => lock.vendor !== card.vendor)} onClick={() => c.actions.openPurge(card.vendor, card.label, c.inventory?.locks.filter((lock) => lock.vendor === card.vendor).length ?? 0)}>
            {i18n.t(L.provider.purge)}
          </button>
        </div>
      </div>
    </div>
  );
};

const stripHtml = (value: string): string => value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const Inventory = ({ c }: { c: TourLocksController }) => {
  const inventory = c.inventory!;
  const proposalsCount = useMemo(() => inventory.counts.unmapped, [inventory.counts.unmapped]);
  return (
    <div className="bo-tx__grid2">
      <div className="bo-tx__card" data-testid="lock-inventory">
        <div className="bo-tx__cardhead">
          <div className="bo-tx__chips">
            {c.filters.map((chip) => (
              <button key={chip.id} type="button" className={`bo-tx__chip${chip.on ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setFilter(chip.id)}>
                {chip.label}
                <span className="bo-tx__chipn">{chip.count}</span>
              </button>
            ))}
          </div>
          <div className="bo-tx__grow" />
          {c.selected.length > 0 && (
            <>
              <span className="bo-tx__meta">{t(L.bulk.selected, { count: c.selected.length })}</span>
              <button type="button" className="bo-tx__btn" onClick={() => void c.actions.bulkUnmap()} disabled={c.busy === 'bulk'}>
                {i18n.t(L.bulk.unmap)}
              </button>
              <button type="button" className="bo-tx__btn" onClick={() => c.setSelected([])}>
                {i18n.t(L.bulk.clear)}
              </button>
            </>
          )}
          <button type="button" className="bo-tx__btn bo-tx__btn--soft" onClick={() => void c.actions.openAutoMatch()} disabled={proposalsCount === 0}>
            {t(L.autoMatch.button, { count: proposalsCount })}
          </button>
        </div>
        <table className="bo-tx__table">
          <thead>
            <tr>
              <th style={{ width: 40 }} />
              <th>{i18n.t(L.table.lock)}</th>
              <th>{i18n.t(L.table.provider)}</th>
              <th>{i18n.t(L.table.opens)}</th>
              <th>{i18n.t(L.table.lastChanged)}</th>
              <th>{i18n.t(L.table.health)}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => {
              const device = row.kind === 'device' ? inventory.locks.find((lock) => lock.key === row.key) ?? null : null;
              return (
                <tr key={row.key} data-testid="lock-row">
                  <td>
                    {row.selectable && (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={c.selected.includes(row.key)}
                        aria-label={i18n.t(L.bulk.selectLock)}
                        className={`bo-tx__check${c.selected.includes(row.key) ? ' bo-tx__check--on' : ''}`}
                        onClick={() => c.toggleSelected(row.key)}
                      />
                    )}
                  </td>
                  <td>
                    <div className="bo-tx__name">{row.name}</div>
                    <div className="bo-tx__meta">{row.sub}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', color: 'var(--bo-ink)', fontWeight: 700 }}>{row.provider}</td>
                  <td>
                    <div className={`bo-tx__name${row.opensVariant === 'warn' ? ' bo-tx__warn' : ''}`}>{row.opens}</div>
                    {row.opensWhere && <div className="bo-tx__meta">{row.opensWhere}</div>}
                  </td>
                  <td>{row.lastChanged}</td>
                  <td>
                    <StatusPill variant={row.health.variant} label={row.health.label} />
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {row.kind === 'device' && device && (
                      <>
                        <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => c.actions.openMap(device)} disabled={c.busy === row.key}>
                          {row.mapLabel}
                        </button>{' '}
                        {(row.mapped || row.stale) && (
                          <button type="button" className="bo-tx__btn" onClick={() => void c.actions.unmap(device)} disabled={c.busy === row.key}>
                            {i18n.t(L.table.unmap)}
                          </button>
                        )}
                      </>
                    )}
                    {row.kind === 'manual' && row.target && (
                      <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => c.actions.openManual(row.target!, inventory.manualCodes.find((m) => m.target.type === row.target!.type && m.target.id === row.target!.id)?.code ?? '')}>
                        {row.mapLabel}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {c.rows.length === 0 && <div className="bo-tx__empty">{i18n.t(inventory.counts.all === 0 ? L.empty.none : L.empty.filtered)}</div>}
      </div>
      <div className="bo-tx__card" data-testid="locks-without-lock">
        <div className="bo-tx__cardhead">
          <div className="bo-tx__grow">
            <div className="bo-tx__cardtitle">{i18n.t(L.withoutLock.title)}</div>
            <div className="bo-tx__cardsub">{i18n.t(L.withoutLock.sub)}</div>
          </div>
        </div>
        {c.withoutLock.map((row) => (
          <div key={row.key} style={{ padding: '11px 16px', borderBottom: '1px solid var(--bo-line-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div>
              <div className="bo-tx__name">{row.name}</div>
              <div className="bo-tx__meta">
                {row.where} · {row.reason}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={() => c.setSub('inventory')}>
                {i18n.t(L.withoutLock.pick)}
              </button>
              <button type="button" className="bo-tx__btn" onClick={() => c.actions.openManual(row.target)}>
                {i18n.t(L.withoutLock.manual)}
              </button>
            </div>
          </div>
        ))}
        {c.withoutLock.length === 0 && <div style={{ padding: 16 }} className="bo-tx__meta">{i18n.t(L.withoutLock.empty)}</div>}
      </div>
    </div>
  );
};

const Issued = ({ c }: { c: TourLocksController }) => (
  <div className="bo-tx__card" data-testid="lock-issued">
    <div className="bo-tx__cardhead">
      <div className="bo-tx__grow">
        <div className="bo-tx__cardtitle">{i18n.t(L.issued.title)}</div>
        <div className="bo-tx__cardsub">{i18n.t(L.issued.sub)}</div>
      </div>
    </div>
    <table className="bo-tx__table">
      <thead>
        <tr>
          <th>{i18n.t(L.issued.visitor)}</th>
          <th>{i18n.t(L.issued.stop)}</th>
          <th>{i18n.t(L.issued.provider)}</th>
          <th>{i18n.t(L.issued.when)}</th>
          <th>{i18n.t(L.issued.window)}</th>
          <th style={{ textAlign: 'right' }}>{i18n.t(L.issued.status)}</th>
        </tr>
      </thead>
      <tbody>
        {c.issued.map((row) => (
          <tr key={row.key}>
            <td className="bo-tx__name">{row.visitor}</td>
            <td>{row.stop}</td>
            <td>{row.provider}</td>
            <td>{row.when}</td>
            <td>{row.window}</td>
            <td style={{ textAlign: 'right' }}>
              <StatusPill variant={row.pill.variant} label={row.pill.label} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {c.issued.length === 0 && <div className="bo-tx__empty">{i18n.t(L.issued.empty)}</div>}
  </div>
);

const LocksDialogs = ({ c }: { c: TourLocksController }) => {
  const dialog = c.dialog;
  const close = c.actions.closeDialog;
  const closeLabel = i18n.t(X.close);
  return (
    <>
      <Modal open={dialog?.kind === 'map'} title={dialog?.kind === 'map' ? t(L.mapDialog.title, { name: dialog.device.name }) : ''} subtitle={dialog?.kind === 'map' ? t(L.mapDialog.sub, { provider: dialog.device.vendorLabel }) : undefined} width={560} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog">
        {dialog?.kind === 'map' && (
          <div className="bo-dlg bo-dlg--stacked">
            <input className="bo-tx__input" value={dialog.query} placeholder={i18n.t(L.mapDialog.search)} aria-label={i18n.t(L.mapDialog.search)} onChange={(event) => c.setDialog({ ...dialog, query: event.target.value })} />
            <div className="bo-tx__rowlist" style={{ maxHeight: 380, overflowY: 'auto' }}>
              {c.mapTargets.map((row) => (
                <button key={row.key} type="button" className={`bo-tx__rowitem${row.current ? ' bo-tx__rowitem--on' : ''}`} disabled={dialog.busy} onClick={() => void c.actions.mapTo(row.option.target)}>
                  <div className="bo-tx__grow">
                    <div className="bo-tx__name">{row.name}</div>
                    <div className="bo-tx__meta">{row.sub}{row.doorNote ? ` · ${row.doorNote}` : ''}</div>
                  </div>
                  {row.taken && <span className="bo-tx__meta bo-tx__warn">{row.taken}</span>}
                  {row.current && <StatusPill variant="ok" label={i18n.t(L.mapDialog.current)} />}
                </button>
              ))}
              {c.mapTargets.length === 0 && <div className="bo-tx__empty">{i18n.t(L.mapDialog.empty)}</div>}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'manual'}
        title={dialog?.kind === 'manual' ? t(L.manual.title, { name: targetLabel(dialog.target) }) : ''}
        width={480}
        onClose={close}
        closeLabel={closeLabel}
        className="bo-tour__dialog"
        footer={
          dialog?.kind === 'manual' && (
            <>
              {c.inventory?.manualCodes.some((m) => m.target.type === dialog.target.type && m.target.id === dialog.target.id) && (
                <button type="button" className="bo-btn bo-btn--secondary bo-map__btn--danger" disabled={dialog.busy} onClick={() => { c.setDialog({ ...dialog, code: '' }); void c.actions.saveManual(); }}>
                  {i18n.t(L.manual.remove)}
                </button>
              )}
              <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
                {i18n.t(X.cancel)}
              </button>
              <button type="button" className="bo-btn bo-btn--primary" disabled={dialog.busy || !dialog.code.trim()} onClick={() => void c.actions.saveManual()}>
                {i18n.t(L.manual.save)}
              </button>
            </>
          )
        }
      >
        {dialog?.kind === 'manual' && (
          <div className="bo-dlg bo-dlg--stacked">
            <p className="bo-map__dialogtext">{i18n.t(L.manual.body)}</p>
            <input className="bo-tx__input bo-tx__input--code" value={dialog.code} placeholder={i18n.t(L.manual.placeholder)} aria-label={i18n.t(L.manual.title)} onChange={(event) => c.setDialog({ ...dialog, code: event.target.value })} />
            {dialog.code && !/^[0-9#*]{1,10}$/.test(dialog.code.trim()) && <span className="bo-tx__error">{i18n.t(L.manual.invalid)}</span>}
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'autoMatch'}
        title={i18n.t(L.autoMatch.title)}
        width={560}
        onClose={close}
        closeLabel={closeLabel}
        className="bo-tour__dialog"
        footer={
          dialog?.kind === 'autoMatch' && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
                {i18n.t(X.cancel)}
              </button>
              <button type="button" className="bo-btn bo-btn--primary" disabled={dialog.busy || dialog.loading || dialog.picked.length === 0} onClick={() => void c.actions.applyAutoMatch()}>
                {t(L.autoMatch.apply, { count: dialog.picked.length })}
              </button>
            </>
          )
        }
      >
        {dialog?.kind === 'autoMatch' && (
          <div className="bo-dlg bo-dlg--stacked">
            <p className="bo-map__dialogtext">
              {i18n.t(L.autoMatch.body)} {t(L.autoMatch.kept, { count: c.inventory?.counts.mapped ?? 0 })}
            </p>
            {dialog.loading && <div className="bo-tx__empty">{i18n.t(X.loading)}</div>}
            {!dialog.loading && dialog.proposals.length === 0 && <div className="bo-tx__empty">{i18n.t(L.autoMatch.empty)}</div>}
            <div className="bo-tx__rowlist">
              {dialog.proposals.map((p) => {
                const key = `${p.vendor}:${p.deviceId}`;
                const on = dialog.picked.includes(key);
                return (
                  <button key={key} type="button" className={`bo-tx__rowitem${on ? ' bo-tx__rowitem--on' : ''}`} onClick={() => c.actions.toggleProposal(key)}>
                    <span className={`bo-tx__check${on ? ' bo-tx__check--on' : ''}`} />
                    <div className="bo-tx__grow bo-tx__name">
                      {p.deviceName} <span className="bo-tx__meta">→</span> {p.target.name}
                    </div>
                    <span className="bo-tx__meta">{i18n.t(L.autoMatch.exact)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'purge'}
        title={dialog?.kind === 'purge' ? t(L.purge.title, { provider: dialog.label }) : ''}
        width={480}
        onClose={close}
        closeLabel={closeLabel}
        className="bo-map__dialog"
        footer={
          dialog?.kind === 'purge' && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
                {i18n.t(X.cancel)}
              </button>
              <button type="button" className="bo-btn bo-btn--primary bo-map__btn--danger" disabled={dialog.busy || dialog.input.trim().toUpperCase() !== 'DELETE'} onClick={() => void c.actions.purge()}>
                {i18n.t(L.purge.confirm)}
              </button>
            </>
          )
        }
      >
        {dialog?.kind === 'purge' && (
          <div className="bo-dlg bo-dlg--stacked">
            <p className="bo-map__dialogtext">{t(L.purge.body, { count: dialog.count })}</p>
            <label className="bo-tx__field">
              {i18n.t(L.purge.match)}
              <input className="bo-tx__input" value={dialog.input} placeholder="DELETE" onChange={(event) => c.setDialog({ ...dialog, input: event.target.value })} />
            </label>
            <p className="bo-map__dialognote">{i18n.t(X.confirmNote)}</p>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.kind === 'disable'}
        title={i18n.t(L.turnOffTitle)}
        width={460}
        onClose={close}
        closeLabel={closeLabel}
        className="bo-map__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
              {i18n.t(X.cancel)}
            </button>
            <button type="button" className="bo-btn bo-btn--primary bo-map__btn--danger" disabled={c.busy === 'enabled'} onClick={() => void c.actions.setEnabled(false)}>
              {i18n.t(L.turnOff)}
            </button>
          </>
        }
      >
        <p className="bo-map__dialogtext">{i18n.t(L.turnOffBody)}</p>
      </Modal>
      <span style={{ display: 'none' }}>
        <Icon name="lock" />
      </span>
    </>
  );
};
