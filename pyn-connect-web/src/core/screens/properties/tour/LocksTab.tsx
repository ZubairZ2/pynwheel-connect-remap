'use client';

import { useMemo, useState } from 'react';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Modal } from '~/core/components/molecules/Modal';
import { useTourLocks, type TourLocksController } from '~/core/hooks/tour/useTourLocks';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { CSV_HINT_COLUMNS, generateAccountForm, instructionImages, stripHtml, type AccountField } from '~/core/utils/generator/tour/lockAccounts.generator';
import { L, LOCK_SUBS, targetLabel, type ProviderCard } from '~/core/utils/generator/tour/tourLocks.generator';

const X = CORE_STRINGS.tourModules.common;
const A = L.account;

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
    {c.providers.available.length > 0 && (
      <div className="bo-tx__card" data-testid="lock-providers-available">
        <div className="bo-tx__cardhead">
          <div className="bo-tx__grow">
            <div className="bo-tx__cardtitle">{i18n.t(L.provider.available)}</div>
            <div className="bo-tx__cardsub">{i18n.t(L.provider.availableSub)}</div>
          </div>
        </div>
        <div className="bo-tx__cardbody">
          <div className="bo-tx__rowlist">
            {c.providers.available.map((card) => (
              <div key={card.vendor} className="bo-tx__rowitem bo-tx__rowitem--static" data-testid={`lock-provider-available-${card.vendor}`}>
                <div className="bo-tx__grow">
                  <div className="bo-tx__name">{card.label}</div>
                  <div className="bo-tx__meta">{card.cred}</div>
                </div>
                <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={!c.canEdit} onClick={() => c.actions.openAccount(card.vendor)}>
                  {i18n.t(A.connect)}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);

const ProviderCardView = ({ card, c, legacyUrl }: { card: ProviderCard; c: TourLocksController; legacyUrl: string | null }) => {
  const test = c.testResult?.vendor === card.vendor ? c.testResult : null;
  const supports = card.supports;
  const count = c.inventory?.locks.filter((lock) => lock.vendor === card.vendor).length ?? 0;
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
        <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={!supports.account} onClick={() => c.actions.openAccount(card.vendor)}>
          {i18n.t(card.configured || card.provider.details ? A.edit : A.connect)}
        </button>
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
        {test && <div className={test.ok ? 'bo-tx__ok' : 'bo-tx__bad'} role="status">{test.message}</div>}
        {card.instructions && (card.instructions.unit || card.instructions.amenity) && (
          <div className="bo-tx__info">
            <b>{i18n.t(L.provider.instructions)}</b>
            {card.instructions.unit && <div>{i18n.t(L.provider.unitDoors)}: {stripHtml(card.instructions.unit)}</div>}
            {card.instructions.amenity && <div>{i18n.t(L.provider.amenityDoors)}: {stripHtml(card.instructions.amenity)}</div>}
          </div>
        )}
        <div className="bo-tx__toolbar">
          <span className="bo-tx__grow" />
          {legacyUrl && (
            <a className="bo-tx__btn" href={legacyUrl} target="_blank" rel="noopener noreferrer">
              {i18n.t(L.provider.openCms)}
            </a>
          )}
          <button type="button" className="bo-tx__btn" disabled={!supports.instructions || !card.provider.details} onClick={() => c.actions.openInstructions(card.vendor)}>
            {i18n.t(A.instructions.button)}
          </button>
          {supports.addDevice && (
            <button type="button" className="bo-tx__btn" onClick={() => c.actions.openDevices(card.vendor)}>
              {i18n.t(A.devices.button)}
            </button>
          )}
          <button type="button" className="bo-tx__btn" disabled={!supports.test || c.busy === `test:${card.vendor}`} onClick={() => void c.actions.test(card.vendor)}>
            {c.busy === `test:${card.vendor}` ? i18n.t(L.provider.testing) : i18n.t(L.provider.test)}
          </button>
          <button type="button" className="bo-tx__btn" disabled={!supports.sync || c.busy === `sync:${card.vendor}`} onClick={() => void c.actions.sync(card.vendor)}>
            {c.busy === `sync:${card.vendor}` ? i18n.t(L.provider.syncing) : i18n.t(L.provider.sync)}
          </button>
          {supports.removeAuthorization && (
            <button type="button" className="bo-tx__btn" onClick={() => c.actions.openRemoveAuth(card.vendor)}>
              {i18n.t(A.removeAuth)}
            </button>
          )}
          <button type="button" className="bo-tx__btn bo-tx__btn--danger" disabled={!supports.purge || count === 0} onClick={() => c.actions.openPurge(card.vendor, card.label, count)}>
            {i18n.t(L.provider.purge)}
          </button>
        </div>
      </div>
    </div>
  );
};


const Inventory = ({ c }: { c: TourLocksController }) => {
  const inventory = c.inventory!;
  const unmappedCount = useMemo(() => inventory.counts.unmapped, [inventory.counts.unmapped]);
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
          <button type="button" className="bo-tx__btn bo-tx__btn--soft" onClick={() => void c.actions.openAutoMatch()} disabled={unmappedCount === 0}>
            {i18n.t(L.autoMatch.title)}
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
              <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={inventory.counts.unmapped === 0} onClick={() => c.setFilter('unmapped')}>
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
                <button type="button" className="bo-btn bo-btn--secondary bo-map__btn--danger" disabled={dialog.busy} onClick={() => void c.actions.saveManual('')}>
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
      <AccountDialog c={c} />
      <InstructionsDialog c={c} />
      <DevicesDialog c={c} />

      <Modal
        open={dialog?.kind === 'removeAuth'}
        title={dialog?.kind === 'removeAuth' ? t(A.removeAuthTitle, { provider: c.inventory?.providers.find((p) => p.vendor === dialog.vendor)?.label ?? dialog.vendor }) : ''}
        width={480}
        onClose={close}
        closeLabel={closeLabel}
        className="bo-map__dialog"
        footer={
          dialog?.kind === 'removeAuth' && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
                {i18n.t(X.cancel)}
              </button>
              <button type="button" className="bo-btn bo-btn--primary bo-map__btn--danger" disabled={dialog.busy} onClick={() => void c.actions.removeAuthorization()}>
                {i18n.t(A.removeAuth)}
              </button>
            </>
          )
        }
      >
        {dialog?.kind === 'removeAuth' && (
          <div className="bo-dlg bo-dlg--stacked">
            <p className="bo-map__dialogtext">{i18n.t(A.removeAuthBody)}</p>
            {dialog.vendor === 'Igloohome' && <p className="bo-map__dialognote">{i18n.t(A.removeAuthIgloo)}</p>}
          </div>
        )}
      </Modal>
      <span style={{ display: 'none' }}>
        <Icon name="lock" />
      </span>
    </>
  );
};

/** One field of an account form: the real legacy input, with its problem under it. */
const AccountFieldView = ({ field, value, problem, disabled, onChange }: { field: AccountField; value: string; problem: string | null; disabled: boolean; onChange: (value: string) => void }) => {
  const id = `lock-account-${field.key}`;
  return (
    <label className="bo-tx__field" htmlFor={id} data-testid={`lock-account-field-${field.key}`}>
      <span>
        {field.label}
        {field.required && <span aria-hidden="true"> *</span>}
      </span>
      {field.kind === 'select' && (
        <select id={id} className="bo-tx__select" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {field.kind === 'radio' && (
        <div className="bo-tx__seg" role="radiogroup" aria-label={field.label}>
          {(field.options ?? []).map((option) => (
            <button key={option.value} type="button" role="radio" aria-checked={value === option.value} className={`bo-tx__segbtn${value === option.value ? ' bo-tx__segbtn--on' : ''}`} disabled={disabled} onClick={() => onChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      )}
      {(field.kind === 'text' || field.kind === 'password' || field.kind === 'number') && (
        <input
          id={id}
          className="bo-tx__input"
          type={field.kind === 'password' ? 'password' : 'text'}
          inputMode={field.kind === 'number' ? 'numeric' : undefined}
          autoComplete={field.kind === 'password' ? 'new-password' : 'off'}
          value={value}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          disabled={disabled}
          aria-invalid={!!problem}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      {field.hint && !problem && <span className="bo-tx__meta">{field.hint}</span>}
      {problem && <span className="bo-tx__error" role="alert">{problem}</span>}
    </label>
  );
};

/** The provider account form: the legacy tab's fields for the vendor, under the current draft. */
const AccountDialog = ({ c }: { c: TourLocksController }) => {
  const dialog = c.dialog;
  const open = dialog?.kind === 'account';
  const provider = open ? c.inventory?.providers.find((p) => p.vendor === dialog.vendor) ?? null : null;
  const form = useMemo(() => (open && provider ? generateAccountForm(provider, dialog.draft) : null), [open, provider, dialog]);
  const close = c.actions.closeDialog;
  return (
    <Modal
      open={open}
      title={form?.title ?? ''}
      subtitle={form ? i18n.t(A.oneAccount) : undefined}
      width={560}
      onClose={close}
      closeLabel={i18n.t(X.close)}
      className="bo-tour__dialog"
      footer={
        open && (
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
              {i18n.t(X.cancel)}
            </button>
            {provider && provider.vendor !== 'Igloohome' && (
              <button type="button" className="bo-btn bo-btn--secondary" disabled={dialog.busy} onClick={() => void c.actions.saveAccount(true)}>
                {i18n.t(A.saveTest)}
              </button>
            )}
            <button type="button" className="bo-btn bo-btn--primary" disabled={dialog.busy} onClick={() => void c.actions.saveAccount(false)} data-testid="lock-account-save">
              {i18n.t(A.save)}
            </button>
          </>
        )
      }
    >
      {open && form && (
        <div className="bo-dlg bo-dlg--stacked" data-testid="lock-account-form">
          {form.intro && <p className="bo-map__dialogtext">{form.intro}</p>}
          {form.sections.map((section) => (
            <div key={section.key} className="bo-dlg__group">
              {section.title && <div className="bo-dlg__grouptitle">{section.title}</div>}
              {section.note && <div className="bo-tx__note">{section.note}</div>}
              {section.fields.map((field) => (
                <AccountFieldView key={field.key} field={field} value={dialog.draft[field.key] ?? ''} problem={dialog.problems[field.key] ?? null} disabled={dialog.busy} onChange={(value) => c.actions.setAccountField(field.key, value)} />
              ))}
            </div>
          ))}
          {form.authorization && (
            <div className="bo-tx__info" data-testid="lock-account-authorization">
              <b>{form.authorization.label}</b>
              <div>{form.authorization.note}</div>
              <div>{i18n.t(A.authorizeInCms)}</div>
              {form.authorization.removable && (
                <button type="button" className="bo-tx__btn" style={{ marginTop: 8 }} disabled={dialog.busy} onClick={() => c.actions.openRemoveAuth(dialog.vendor)}>
                  {i18n.t(A.removeAuth)}
                </button>
              )}
            </div>
          )}
          {dialog.error && <div className="bo-tx__bad" role="alert">{dialog.error}</div>}
        </div>
      )}
    </Modal>
  );
};

const ImageSlot = ({ label, image, uploading, disabled, onPick }: { label: string; image: { url: string | null; fileName: string } | null; uploading: boolean; disabled: boolean; onPick: (file: File) => void }) => {
  // A stored file this CMS host cannot serve (a database restored from another environment) shows its name instead of a broken image.
  const [broken, setBroken] = useState<string | null>(null);
  return (
  <div className="bo-tx__field">
    <span>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {image?.url && broken !== image.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image.url} alt={label} onError={() => setBroken(image.url)} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--bo-line)' }} />
      ) : (
        <div className="bo-tx__meta" style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px dashed var(--bo-line)' }}>
          {image ? image.fileName : i18n.t(A.instructions.noImage)}
        </div>
      )}
      <label className="bo-tx__btn" style={{ cursor: disabled ? 'default' : 'pointer' }}>
        {uploading ? i18n.t(A.instructions.uploading) : i18n.t(image ? A.instructions.replace : A.instructions.choose)}
        <input
          type="file"
          accept="image/png,image/jpeg"
          style={{ display: 'none' }}
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onPick(file);
          }}
        />
      </label>
    </div>
  </div>
  );
};

/** The vendor's visitor instructions: the two texts and the two images of the legacy tab. */
const InstructionsDialog = ({ c }: { c: TourLocksController }) => {
  const dialog = c.dialog;
  const open = dialog?.kind === 'instructions';
  const provider = open ? c.inventory?.providers.find((p) => p.vendor === dialog.vendor) ?? null : null;
  const images = provider ? instructionImages(provider) : { unit: null, amenity: null };
  const close = c.actions.closeDialog;
  return (
    <Modal
      open={open}
      title={provider ? t(A.instructions.title, { provider: provider.label }) : ''}
      subtitle={i18n.t(A.instructions.intro)}
      width={600}
      onClose={close}
      closeLabel={i18n.t(X.close)}
      className="bo-tour__dialog"
      footer={
        open && (
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>
              {i18n.t(X.cancel)}
            </button>
            <button type="button" className="bo-btn bo-btn--primary" disabled={dialog.busy || !!dialog.uploading} onClick={() => void c.actions.saveInstructions()} data-testid="lock-instructions-save">
              {i18n.t(X.save)}
            </button>
          </>
        )
      }
    >
      {open && (
        <div className="bo-dlg bo-dlg--stacked" data-testid="lock-instructions-form">
          <div className="bo-tx__note">{i18n.t(A.instructions.legacyOnly)}</div>
          <label className="bo-tx__field">
            <span>{i18n.t(A.instructions.unitText)}</span>
            <textarea className="bo-tx__textarea" rows={3} value={dialog.unit} disabled={dialog.busy} onChange={(event) => c.setDialog({ ...dialog, unit: event.target.value })} />
          </label>
          <ImageSlot label={i18n.t(A.instructions.unitImage)} image={images.unit} uploading={dialog.uploading === 'unit'} disabled={dialog.busy} onPick={(file) => void c.actions.uploadInstructionImage('unit', file)} />
          <label className="bo-tx__field">
            <span>{i18n.t(A.instructions.amenityText)}</span>
            <textarea className="bo-tx__textarea" rows={3} value={dialog.amenity} disabled={dialog.busy} onChange={(event) => c.setDialog({ ...dialog, amenity: event.target.value })} />
          </label>
          <ImageSlot label={i18n.t(A.instructions.amenityImage)} image={images.amenity} uploading={dialog.uploading === 'amenity'} disabled={dialog.busy} onPick={(file) => void c.actions.uploadInstructionImage('amenity', file)} />
        </div>
      )}
    </Modal>
  );
};

/** igloohome v1: one lock at a time, or the legacy CSV. */
const DevicesDialog = ({ c }: { c: TourLocksController }) => {
  const dialog = c.dialog;
  const open = dialog?.kind === 'devices';
  const close = c.actions.closeDialog;
  return (
    <Modal open={open} title={i18n.t(A.devices.title)} subtitle={i18n.t(A.devices.intro)} width={560} onClose={close} closeLabel={i18n.t(X.close)} className="bo-tour__dialog">
      {open && (
        <div className="bo-dlg bo-dlg--stacked" data-testid="lock-devices-form">
          <div className="bo-dlg__group">
            <div className="bo-dlg__grouptitle">{i18n.t(A.devices.addTitle)}</div>
            <label className="bo-tx__field">
              <span>{i18n.t(A.devices.name)}</span>
              <input className="bo-tx__input" value={dialog.name} placeholder={i18n.t(A.devices.namePh)} disabled={dialog.busy} onChange={(event) => c.setDialog({ ...dialog, name: event.target.value })} />
            </label>
            <label className="bo-tx__field">
              <span>{i18n.t(A.devices.id)}</span>
              <input className="bo-tx__input" value={dialog.deviceId} placeholder={i18n.t(A.devices.idPh)} disabled={dialog.busy} onChange={(event) => c.setDialog({ ...dialog, deviceId: event.target.value })} />
            </label>
            <div>
              <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={dialog.busy || !dialog.name.trim() || !dialog.deviceId.trim()} onClick={() => void c.actions.addDevice()} data-testid="lock-device-add">
                {i18n.t(A.devices.add)}
              </button>
            </div>
          </div>
          <div className="bo-dlg__group">
            <div className="bo-dlg__grouptitle">{i18n.t(A.devices.csvTitle)}</div>
            <div className="bo-tx__meta">{i18n.t(A.devices.csvHint)}</div>
            <div className="bo-tx__mono bo-tx__meta">{CSV_HINT_COLUMNS.join(',')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label className="bo-tx__btn" style={{ cursor: 'pointer' }}>
                {i18n.t(A.devices.csvChoose)}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  style={{ display: 'none' }}
                  disabled={dialog.busy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file) void c.actions.pickCsv(file);
                  }}
                />
              </label>
              {dialog.file && <span className="bo-tx__meta">{dialog.file.name}</span>}
              {dialog.file && (
                <button type="button" className="bo-tx__btn bo-tx__btn--accent" disabled={dialog.busy} onClick={() => void c.actions.importCsv()} data-testid="lock-csv-import">
                  {t(A.devices.csvImport, { name: dialog.file.name })}
                </button>
              )}
            </div>
            {dialog.fileError && <div className="bo-tx__bad" role="alert">{dialog.fileError}</div>}
            {dialog.result && <div className="bo-tx__ok" role="status">{dialog.result}</div>}
          </div>
        </div>
      )}
    </Modal>
  );
};
