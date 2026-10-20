'use client';

import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Modal } from '~/core/components/molecules/Modal';
import { useTourVisitors, type TourVisitorsController } from '~/core/hooks/tour/useTourVisitors';
import type { BookingSettings } from '~/core/models/data/tourModules.data';
import { t } from '~/core/utils/generator/inventory/inventoryText';
import { formatWhen } from '~/core/utils/generator/tour/tourLocks.generator';
import { V, VISITOR_RANGES, VISITOR_TYPES, bookingSends, cancelSends, feedbackText, idCheckText, idPill, propertyCodeText, statusPill, typeLabelOf } from '~/core/utils/generator/tour/tourVisitors.generator';

const X = CORE_STRINGS.tourModules.common;

/** The Visitors tab: bookings and visits of the property, one visitor's profile, and the booking and privacy actions. */
export const VisitorsTab = ({ propertyId, settings }: { propertyId: number; settings: BookingSettings | null }) => {
  const c = useTourVisitors(propertyId, true, settings);
  if (c.error) {
    return (
      <div className="bo-tx" data-testid="tour-visitors">
        <div className="bo-error" role="alert">
          {c.error}{' '}
          <button type="button" className="bo-tx__btn" onClick={() => void c.reload()}>
            {i18n.t(X.retry)}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="bo-tx" data-testid="tour-visitors">
      {c.profile ? <Profile c={c} settings={settings} /> : <List c={c} settings={settings} />}
      <VisitorDialogs c={c} settings={settings} />
    </div>
  );
};

const List = ({ c, settings }: { c: TourVisitorsController; settings: BookingSettings | null }) => {
  const list = c.list;
  const crm = settings?.crm.provider ?? null;
  void crm;
  return (
    <>
      {!c.canEdit && c.meta && <div className="bo-tx__info">{i18n.t(c.meta.writesEnabled ? X.readOnly : X.writesOff)}</div>}
      <div className="bo-tx__card" data-testid="visitors-onsite">
        <div className="bo-tx__cardhead">
          <div className="bo-tx__grow">
            <span className="bo-tx__cardtitle">{i18n.t(V.onSite)}</span>
            {list && (
              <span className="bo-tx__cardsub">
                {' '}· {t(V.onSiteSub, { touring: list.onSite.length, coming: list.comingToday })} · {t(V.stayLimit, { minutes: list.stayLimitMinutes })}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '12px 18px', flexWrap: 'wrap' }}>
          {c.onSite.map((row) => (
            <button key={row.id} type="button" className="bo-tx__rowitem" style={{ minWidth: 300 }} onClick={() => void c.openProfile(row.id)}>
              <span className="bo-tx__avatar">{row.initials}</span>
              <div className="bo-tx__grow">
                <div className="bo-tx__name">{row.name}</div>
                <div className="bo-tx__meta">{row.sub}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                <span className={`bo-tx__name${row.lengthy ? ' bo-tx__warn' : ''}`}>{row.elapsed}</span>
                {row.lengthy && <StatusPill variant="warn" label={i18n.t(V.lengthy)} />}
              </div>
            </button>
          ))}
          {list && c.onSite.length === 0 && <span className="bo-tx__meta">{i18n.t(V.onSiteEmpty)}</span>}
          {!list && <span className="bo-tx__meta">{i18n.t(X.loading)}</span>}
        </div>
      </div>

      <div className="bo-tx__card" data-testid="visitors-list">
        <div className="bo-tx__cardhead" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="bo-tx__toolbar">
            <div className="bo-tx__grow">
              <div className="bo-tx__cardtitle">{i18n.t(V.title)}</div>
              <div className="bo-tx__cardsub">{t(V.sub, { tz: list?.timeZone ?? settings?.timeZoneEffective ?? '' })}</div>
            </div>
            <input className="bo-tx__input" style={{ width: 240 }} value={c.search} placeholder={i18n.t(V.search)} aria-label={i18n.t(V.search)} onChange={(event) => c.setSearch(event.target.value)} />
            <select className="bo-tx__select" value={c.filters.range} aria-label="Date range" onChange={(event) => c.setFilters({ range: event.target.value })}>
              {VISITOR_RANGES.map((range) => (
                <option key={range} value={range}>
                  {i18n.t(V.range[range])}
                </option>
              ))}
            </select>
            <select className="bo-tx__select" value={c.filters.type} aria-label="Tour type" onChange={(event) => c.setFilters({ type: event.target.value })}>
              {VISITOR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {i18n.t(V.type[type])}
                </option>
              ))}
            </select>
            <a className="bo-tx__btn bo-tx__btn--md" href={c.exportUrl} download>
              {i18n.t(V.export)}
            </a>
            {c.search.trim() !== '' && <span className="bo-tx__meta" data-testid="export-search-note">{i18n.t(V.exportIgnoresSearch)}</span>}
            {c.canEdit && !settings?.salesforce && (
              <button type="button" className="bo-tx__btn bo-tx__btn--primary bo-tx__btn--md" onClick={c.actions.openNewBooking} data-testid="new-booking">
                {i18n.t(V.newBooking)}
              </button>
            )}
          </div>
          <div className="bo-tx__chips">
            {c.chips.map((chip) => (
              <button key={chip.id} type="button" className={`bo-tx__chip${chip.on ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setFilters({ status: chip.id })}>
                {chip.label}
                <span className="bo-tx__chipn">{chip.count}</span>
              </button>
            ))}
          </div>
        </div>
        <table className="bo-tx__table">
          <thead>
            <tr>
              <th>{i18n.t(V.table.when)}</th>
              <th>{i18n.t(V.table.visitor)}</th>
              <th>{i18n.t(V.table.type)}</th>
              <th>{i18n.t(V.table.status)}</th>
              <th>{i18n.t(V.table.flags)}</th>
              <th>{i18n.t(V.table.id)}</th>
              <th>{i18n.t(V.table.source)}</th>
            </tr>
          </thead>
          <tbody>
            {c.rows.map((row) => (
              <tr key={row.id} className="bo-tx__row--click" data-testid="visitor-row" onClick={() => void c.openProfile(row.id)}>
                <td>
                  <div className="bo-tx__name">{row.when}</div>
                  <div className="bo-tx__meta">{row.time}</div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <span className={`bo-tx__avatar${row.grey ? ' bo-tx__avatar--grey' : ''}`}>{row.initials}</span>
                    <div>
                      <div className="bo-tx__name">{row.name}</div>
                      <div className="bo-tx__meta">{row.contact}</div>
                    </div>
                  </div>
                </td>
                <td>{row.type}</td>
                <td>
                  <StatusPill variant={row.status.variant} label={row.status.label} />
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 230 }}>
                    {row.flags.map((flag) => (
                      <StatusPill key={flag.label} variant={flag.variant} label={flag.label} />
                    ))}
                  </div>
                </td>
                <td>
                  <StatusPill variant={row.id_check.variant} label={row.id_check.label} />
                </td>
                <td>{row.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list && c.rows.length === 0 && <div className="bo-tx__empty">{i18n.t((list.counts.all ?? 0) === 0 && !c.filters.q && c.filters.type === 'all' && c.filters.range === 'all' ? V.emptyAll : V.empty)}</div>}
        {!list && <div className="bo-tx__empty">{i18n.t(X.loading)}</div>}
        {list && list.pagination.pages > 1 && (
          <div className="bo-tx__pager">
            <span>{t(V.page, { page: list.pagination.page, pages: list.pagination.pages, total: list.pagination.total })}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="bo-tx__btn" disabled={list.pagination.page <= 1 || c.loading} onClick={() => c.setFilters({ page: list.pagination.page - 1 })}>
                {i18n.t(V.prev)}
              </button>
              <button type="button" className="bo-tx__btn" disabled={list.pagination.page >= list.pagination.pages || c.loading} onClick={() => c.setFilters({ page: list.pagination.page + 1 })}>
                {i18n.t(V.next)}
              </button>
            </span>
          </div>
        )}
      </div>
    </>
  );
};

const Profile = ({ c, settings }: { c: TourVisitorsController; settings: BookingSettings | null }) => {
  const p = c.profile!;
  const v = p.visitor;
  const upcoming = p.bookings.find((b) => b.status === 'upcoming');
  const status = statusPill(v.status);
  const id = idPill(v.idCheck);
  return (
    <div className="bo-tx" data-testid="visitor-profile">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12.5px var(--bo-font)', color: 'var(--bo-subtle)' }}>
        <button type="button" className="bo-breadcrumb__link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--bo-accent)', font: 'inherit' }} onClick={c.closeProfile}>
          {i18n.t(V.profile.back)}
        </button>
        <span>/</span>
        <span style={{ color: 'var(--bo-muted)' }}>{v.name}</span>
      </div>
      <div className="bo-tx__card">
        <div className="bo-tx__cardbody" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span className={`bo-tx__avatar bo-tx__avatar--lg${v.removed ? ' bo-tx__avatar--grey' : ''}`}>{v.initials}</span>
          <div className="bo-tx__grow" style={{ minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ font: '800 17px var(--bo-font)', color: 'var(--bo-ink)' }}>{v.name}</span>
              <StatusPill variant={status.variant} label={status.label} />
              {v.flags.map((flag) => (
                <StatusPill key={flag.key} variant={flag.variant} label={flag.label} />
              ))}
            </div>
            <div className="bo-tx__meta" style={{ marginTop: 2 }}>
              {[v.email, v.phone].filter(Boolean).join(' · ')}
            </div>
          </div>
          {p.chat.available && (
            <button type="button" className="bo-tx__btn bo-tx__btn--md" onClick={c.actions.openChat}>
              {i18n.t(V.profile.chat)}
            </button>
          )}
          {p.canResetStops && c.canEdit && (
            <button type="button" className="bo-tx__btn bo-tx__btn--md" onClick={c.actions.openResetStops}>
              {i18n.t(V.profile.resetStops)}
            </button>
          )}
          {upcoming && c.canEdit && !settings?.salesforce && (
            <>
              <button type="button" className="bo-tx__btn bo-tx__btn--md bo-tx__btn--danger" onClick={() => c.actions.openCancel(upcoming.id, v.name, c.bookingCards.find((b) => b.id === upcoming.id)?.when ?? '')}>
                {i18n.t(V.profile.cancel)}
              </button>
              {upcoming.bookedAt && (
                <button type="button" className="bo-tx__btn bo-tx__btn--md bo-tx__btn--primary" onClick={() => c.actions.openReschedule(upcoming.id, v.name, c.bookingCards.find((b) => b.id === upcoming.id)?.when ?? '', upcoming.tourType)}>
                  {i18n.t(V.profile.reschedule)}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bo-tx__grid2" style={{ gridTemplateColumns: '340px minmax(0, 1fr)' }}>
        <div className="bo-tx">
          <div className="bo-tx__card">
            <div className="bo-tx__cardbody">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="bo-tx__cardtitle">{i18n.t(V.profile.idCheck)}</span>
                <StatusPill variant={id.variant} label={id.label} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <Photo url={v.selfieUrl} label={i18n.t(V.profile.selfie)} />
                <Photo url={v.idCardUrl} label={i18n.t(V.profile.idCard)} />
              </div>
              <div className="bo-tx__meta" data-testid="id-check-text">{idCheckText(p)}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.canEdit && (
                  <button type="button" className="bo-tx__btn bo-tx__btn--accent" onClick={c.actions.openIdReview}>
                    {i18n.t(V.profile.review)}
                  </button>
                )}
                {c.isSuperAdmin && c.canEdit && (
                  <button type="button" className="bo-tx__btn" onClick={c.actions.openResetId}>
                    {i18n.t(V.profile.resetId)}
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="bo-tx__card">
            <div className="bo-tx__cardbody" style={{ gap: 8 }}>
              <span className="bo-tx__cardtitle">{i18n.t(V.profile.contact)}</span>
              <div className="bo-tx__kv">{i18n.t(V.profile.email)}<b>{v.email ?? '—'}</b></div>
              <div className="bo-tx__kv">{i18n.t(V.profile.phone)}<b>{v.phone ?? '—'}</b></div>
              <div className="bo-tx__kv">{i18n.t(V.profile.sms)}<b>{i18n.t(v.sms ? V.profile.optedIn : V.profile.optedOut)}</b></div>
              <div className="bo-tx__kv">{i18n.t(V.profile.beds)}<b>{v.desiredBedroom ?? '—'}</b></div>
              <div className="bo-tx__kv">{i18n.t(V.profile.moveIn)}<b>{p.bookings.find((b) => b.desiredMoveInDate)?.desiredMoveInDate ?? '—'}</b></div>
            </div>
          </div>
          <div className="bo-tx__card">
            <div className="bo-tx__cardhead"><span className="bo-tx__cardtitle">{i18n.t(V.profile.bookings)}</span></div>
            {c.bookingCards.map((booking) => (
              <div key={booking.id} style={{ padding: '11px 18px', borderBottom: '1px solid var(--bo-line-2)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="bo-tx__name bo-tx__grow">{booking.when}</span>
                  <StatusPill variant={booking.pill.variant} label={booking.pill.label} />
                </div>
                <div className="bo-tx__meta">{booking.type} · {booking.source}</div>
                <div className="bo-tx__meta">{booking.reminders}</div>
                {(booking.bedrooms || booking.moveIn) && (
                  <div className="bo-tx__meta">{[booking.bedrooms ? t(V.profile.bookingBeds, { count: booking.bedrooms }) : null, booking.moveIn ? t(V.profile.bookingMoveIn, { date: booking.moveIn }) : null].filter(Boolean).join(' · ')}</div>
                )}
                {booking.changes.map((change) => (
                  <div key={change} className="bo-tx__meta" data-testid="booking-change">{change}</div>
                ))}
                {booking.crm.map((push) => (
                  <div key={push} className="bo-tx__meta" data-testid="booking-crm">{push}</div>
                ))}
                {booking.cancelled && <div className="bo-tx__meta">{booking.cancelled}</div>}
                {booking.customized && <span style={{ font: '700 10.5px var(--bo-font)', color: '#7B3A87' }}>{i18n.t(V.profile.customized)}</span>}
              </div>
            ))}
            {c.bookingCards.length === 0 && <div className="bo-tx__cardbody bo-tx__meta">{i18n.t(V.profile.noBookings)}</div>}
          </div>
          <div className="bo-tx__card" data-testid="visitor-feedback">
            <div className="bo-tx__cardbody" style={{ gap: 8 }}>
              <span className="bo-tx__cardtitle">{i18n.t(V.profile.feedback)}</span>
              <div className="bo-tx__meta">{feedbackText(p) ?? i18n.t(V.profile.feedbackNone)}</div>
              {(p.crmPushes ?? []).length > 0 && (
                <>
                  <div className="bo-tx__statlabel">{i18n.t(V.profile.crmPushes)}</div>
                  {(p.crmPushes ?? []).map((push, index) => (
                    <div key={`${push.label}-${index}`} className="bo-tx__meta">
                      {t(V.profile.guestCard, { crm: push.label, when: formatWhen(push.at, p.timeZone) })}
                      {push.status ? ` · ${push.status}` : ''}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
          {c.isSuperAdmin && (
            <div className="bo-tx__card" style={{ borderColor: '#F9DCE0' }}>
              <div className="bo-tx__cardbody" style={{ gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="bo-tx__cardtitle">{i18n.t(V.profile.privacy)}</span>
                  <span style={{ font: '800 9.5px var(--bo-font)', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7B3A87', background: '#F2E9F4', padding: '3px 7px', borderRadius: 4 }}>{i18n.t(V.profile.superAdmin)}</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" className="bo-tx__btn bo-tx__btn--danger" onClick={c.actions.openPii}>{i18n.t(V.profile.removePii)}</button>
                  <button type="button" className="bo-tx__btn bo-tx__btn--danger" onClick={c.actions.openDelete}>{i18n.t(V.profile.delete)}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bo-tx">
          <div className="bo-tx__card" data-testid="visitor-sessions">
            <div className="bo-tx__cardhead">
              <span className="bo-tx__cardtitle bo-tx__grow">{i18n.t(V.profile.sessions)}</span>
              {p.sessions.map((s) => (
                <button key={s.id} type="button" className={`bo-tx__chip${c.sessionId === s.id ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setSessionId(s.id)}>
                  {c.session && c.session.id === s.id ? c.session.label : `#${s.id}`}
                </button>
              ))}
            </div>
            {p.sessions.length === 0 && <div className="bo-tx__cardbody bo-tx__meta">{i18n.t(v.removed ? V.profile.hiddenSessions : V.profile.noSessions)}</div>}
            {c.session && (
              <>
                <div className="bo-tx__cardbody" style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, borderBottom: '1px solid var(--bo-line-2)' }}>
                  <StatusPill variant={c.session.pill.variant} label={c.session.pill.label} />
                  <span className="bo-tx__grow bo-tx__meta" style={{ fontSize: 12 }}>{c.session.line}</span>
                  {c.session.lengthy && <StatusPill variant="warn" label={i18n.t(V.lengthy)} />}
                  {c.session.abandonedAt && <span className="bo-tx__meta bo-tx__warn">{c.session.abandonedAt}</span>}
                  {c.session.verified && <span className="bo-tx__meta">{c.session.verified}</span>}
                  {c.session.pill.variant === 'ok' && propertyCodeText(p) && <span className="bo-tx__meta" data-testid="property-code">{propertyCodeText(p)}</span>}
                </div>
                <div className="bo-tx__cardbody">
                  <div className="bo-tx__statlabel">{i18n.t(V.profile.stopsVisited)}</div>
                  {c.session.stops.length === 0 && <div className="bo-tx__meta">{i18n.t(V.profile.noStops)}</div>}
                  {c.session.stops.map((stop) => (
                    <div key={stop.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }} data-testid="session-stop">
                      <span className="bo-tx__avatar" style={{ width: 18, height: 18, fontSize: 9.5 }}>{stop.n}</span>
                      <div className="bo-tx__grow">
                        <div className="bo-tx__name">{stop.name}</div>
                        <div className="bo-tx__meta">{[stop.times, stop.pin].filter(Boolean).join(' · ')}</div>
                        {stop.instruction && <div className="bo-tx__meta">{stop.instruction}</div>}
                        {stop.notes.map((note) => (
                          <div key={note} className="bo-tx__meta" style={{ fontStyle: 'italic' }}>“{note}”</div>
                        ))}
                        {stop.photos.length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }} aria-label={i18n.t(V.profile.photos)}>
                            {stop.photos.map((url) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={url} src={url} alt={i18n.t(V.profile.photos)} loading="lazy" style={{ height: 64, width: 64, objectFit: 'cover', borderRadius: 6, background: '#eef0f4' }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {c.session.events.length > 0 && (
                    <>
                      <div className="bo-tx__statlabel">{i18n.t(V.profile.doorEvents)}</div>
                      {c.session.events.map((event) => (
                        <div key={event} className="bo-tx__meta">{event}</div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="bo-tx__card" data-testid="visitor-access">
            <div className="bo-tx__cardhead">
              <div className="bo-tx__grow">
                <span className="bo-tx__cardtitle">{i18n.t(V.profile.access)}</span>
                <div className="bo-tx__cardsub">{i18n.t(V.profile.accessSub)}</div>
              </div>
              {p.sessions.length > 0 && (
                <>
                  <button type="button" className={`bo-tx__chip${c.accessScope === 'visit' ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setAccessScope('visit')}>{i18n.t(V.profile.accessThisVisit)}</button>
                  <button type="button" className={`bo-tx__chip${c.accessScope === 'all' ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setAccessScope('all')}>
                    {i18n.t(V.profile.accessAll)}
                    <span className="bo-tx__chipn">{c.accessTotal}</span>
                  </button>
                </>
              )}
              {p.codesVisible !== false && c.accessRows.some((row) => row.hasCode) && (
                <button type="button" className="bo-tx__btn" onClick={c.toggleCodes} data-testid="toggle-codes">{i18n.t(c.revealCodes ? V.profile.hideCodes : V.profile.showCodes)}</button>
              )}
            </div>
            {c.accessRows.length === 0 && <div className="bo-tx__cardbody bo-tx__meta">{i18n.t(c.accessTotal === 0 ? V.profile.accessEmpty : V.profile.accessEmptyVisit)}</div>}
            {c.accessRows.length > 0 && (
              <table className="bo-tx__table">
                <thead>
                  <tr>
                    <th>{i18n.t(V.profile.accessTable.stop)}</th>
                    <th>{i18n.t(V.profile.accessTable.provider)}</th>
                    <th>{i18n.t(V.profile.accessTable.code)}</th>
                    <th>{i18n.t(V.profile.accessTable.window)}</th>
                    <th>{i18n.t(V.profile.accessTable.status)}</th>
                    <th>{i18n.t(V.profile.accessTable.issued)}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.accessRows.map((row) => (
                    <tr key={row.id} data-testid="access-row">
                      <td>
                        <div className="bo-tx__name">{row.stop}</div>
                        {row.reason && <div className="bo-tx__meta bo-tx__warn">{row.reason}</div>}
                      </td>
                      <td>{row.provider} · {row.method}</td>
                      <td style={{ fontVariantNumeric: 'tabular-nums' }}>{row.code}</td>
                      <td>{row.window}</td>
                      <td><StatusPill variant={row.pill.variant} label={row.pill.label} /></td>
                      <td>{row.issued}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {p.codesVisible === false && c.accessRows.some((row) => row.hasCode) && <div className="bo-tx__cardbody bo-tx__meta">{i18n.t(V.profile.accessHidden)}</div>}
          </div>
          <div className="bo-tx__card">
            <div className="bo-tx__cardhead">
              <div className="bo-tx__grow">
                <span className="bo-tx__cardtitle">{i18n.t(V.profile.timeline)}</span>
                <div className="bo-tx__cardsub">{i18n.t(V.profile.timelineNote)}</div>
              </div>
            </div>
            {p.timeline.length === 0 && <div className="bo-tx__cardbody bo-tx__meta">{i18n.t(V.profile.noTimeline)}</div>}
            {p.timeline.map((event, index) => (
              <div key={`${event.at}-${index}`} style={{ padding: '9px 18px', borderBottom: '1px solid var(--bo-line-2)' }}>
                <div className="bo-tx__name">{event.title}</div>
                <div className="bo-tx__meta">{formatWhen(event.at, p.timeZone)}{event.sub ? ` · ${event.sub}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Photo = ({ url, label }: { url: string | null; label: string }) =>
  url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={label} style={{ height: 120, width: '100%', objectFit: 'cover', borderRadius: 8, background: '#eef0f4' }} />
  ) : (
    <div style={{ height: 120, borderRadius: 8, background: 'repeating-linear-gradient(45deg,#F4F5F7,#F4F5F7 8px,#ECEEF2 8px,#ECEEF2 16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', font: '600 10.5px var(--bo-font)', color: 'var(--bo-subtle)' }}>
      {label} · {i18n.t(V.profile.noPhoto)}
    </div>
  );

const SlotPicker = ({ c }: { c: TourVisitorsController }) => {
  const picker = c.picker;
  if (c.availabilityError) {
    return (
      <div className="bo-error" role="alert" data-testid="slots-error">
        {c.availabilityError}{' '}
        <button type="button" className="bo-tx__btn" onClick={() => void c.actions.retryAvailability()}>
          {i18n.t(X.retry)}
        </button>
      </div>
    );
  }
  if (!c.availability) return <div className="bo-tx__meta">{i18n.t(V.booking.loadingSlots)}</div>;
  if (!picker) return null;
  return (
    <>
      {c.availability.managedBy && <div className="bo-tx__note">{t(V.booking.managed, { crm: c.availability.managedBy })}</div>}
      <div className="bo-tx__daygrid">
        {picker.days.map((day) => (
          <button key={day.date} type="button" className={`bo-tx__day${day.on ? ' bo-tx__day--on' : ''}${day.open ? '' : ' bo-tx__day--off'}`} disabled={!day.open} onClick={() => c.actions.pickDate(day.date)}>
            <div style={{ font: '700 9.5px var(--bo-font)' }}>{day.label.split(' ')[0]}</div>
            <div style={{ font: '800 13px var(--bo-font)' }}>{day.label.split(' ')[1]}</div>
          </button>
        ))}
      </div>
      <div className="bo-tx__times">
        {picker.times.map((slot) => (
          <button key={slot.time} type="button" className={`bo-tx__timechip${c.dialog && 'time' in c.dialog && c.dialog.time === slot.time ? ' bo-tx__timechip--on' : ''}`} disabled={!slot.open} title={slot.full ? 'Full' : undefined} onClick={() => c.actions.pickTime(slot.time)}>
            {slot.label}
          </button>
        ))}
        {c.dialog && 'date' in c.dialog && c.dialog.date && picker.times.every((slot) => !slot.open) && <span className="bo-tx__meta">{i18n.t(V.booking.noTimes)}</span>}
      </div>
    </>
  );
};

const VisitorDialogs = ({ c, settings }: { c: TourVisitorsController; settings: BookingSettings | null }) => {
  const d = c.dialog;
  const close = c.actions.closeDialog;
  const closeLabel = i18n.t(X.close);
  const crm = settings?.crm.provider ?? null;
  const name = c.profile?.visitor.name ?? '';
  // A scheduled booking (and every reschedule) needs a picked slot before Confirm unlocks.
  const slotMissing = d?.kind === 'reschedule' ? !d.date || !d.time : d?.kind === 'newBooking' ? d.scheduled && (!d.date || !d.time) : false;
  const confirmFooter = (label: string, ready: boolean, danger = true) => (
    <>
      <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>{i18n.t(X.cancel)}</button>
      <button type="button" className={`bo-btn bo-btn--primary${danger ? ' bo-map__btn--danger' : ''}`} disabled={!ready || !!(d && 'busy' in d && d.busy)} onClick={() => void c.actions.submitDialog()}>{label}</button>
    </>
  );
  return (
    <>
      <Modal open={d?.kind === 'newBooking' || d?.kind === 'reschedule'} title={d?.kind === 'reschedule' ? t(V.booking.rescheduleTitle, { name: d.name }) : i18n.t(V.booking.title)} subtitle={d?.kind === 'reschedule' ? t(V.booking.currently, { when: d.from }) : undefined} width={560} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>{i18n.t(X.cancel)}</button>
            <button type="button" className="bo-btn bo-btn--primary" disabled={slotMissing || !!(d && 'busy' in d && d.busy)} onClick={() => void (d?.kind === 'reschedule' ? c.actions.submitReschedule() : c.actions.submitBooking())} data-testid="booking-submit">
              {i18n.t(d?.kind === 'reschedule' ? V.booking.rescheduleSubmit : V.booking.submit)}
            </button>
          </>
        }
      >
        {d?.kind === 'newBooking' && (
          <div className="bo-dlg bo-dlg--stacked">
            <div className="bo-dlg__grid bo-dlg__grid--two">
              <input className="bo-tx__input" placeholder={i18n.t(V.booking.first)} aria-label={i18n.t(V.booking.first)} value={d.first} onChange={(e) => c.setDialog({ ...d, first: e.target.value })} />
              <input className="bo-tx__input" placeholder={i18n.t(V.booking.last)} aria-label={i18n.t(V.booking.last)} value={d.last} onChange={(e) => c.setDialog({ ...d, last: e.target.value })} />
              <input className="bo-tx__input" placeholder={i18n.t(V.booking.email)} aria-label={i18n.t(V.booking.email)} value={d.email} onChange={(e) => c.setDialog({ ...d, email: e.target.value })} />
              <input className="bo-tx__input" placeholder={i18n.t(V.booking.phone)} aria-label={i18n.t(V.booking.phone)} value={d.phone} onChange={(e) => c.setDialog({ ...d, phone: e.target.value })} />
            </div>
            <div className="bo-tx__meta">{i18n.t(V.booking.matchNote)}</div>
            {!settings?.onlyScheduledTour && (
              <div className="bo-tx__seg">
                <button type="button" className={`bo-tx__segbtn${d.scheduled ? ' bo-tx__segbtn--on' : ''}`} onClick={() => c.setDialog({ ...d, scheduled: true })}>{i18n.t(V.booking.kind.scheduled)}</button>
                <button type="button" className={`bo-tx__segbtn${d.scheduled ? '' : ' bo-tx__segbtn--on'}`} onClick={() => c.setDialog({ ...d, scheduled: false })}>{i18n.t(V.booking.kind.unscheduled)}</button>
              </div>
            )}
            {d.scheduled && (
              <>
                <div style={{ display: 'flex', gap: 6 }}>
                  {c.types.map((type) => (
                    <button key={type} type="button" className={`bo-tx__chip${d.tourType === type ? ' bo-tx__chip--on' : ''}`} onClick={() => c.setDialog({ ...d, tourType: type, time: null })}>{typeLabelOf(type)}</button>
                  ))}
                </div>
                <SlotPicker c={c} />
              </>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, font: '600 12px var(--bo-font)', color: 'var(--bo-muted)' }}>
              <input type="checkbox" checked={d.sms} onChange={(e) => c.setDialog({ ...d, sms: e.target.checked })} /> {i18n.t(V.booking.sms)}
            </label>
            <WhatHappens rows={bookingSends(crm, false)} />
          </div>
        )}
        {d?.kind === 'reschedule' && (
          <div className="bo-dlg bo-dlg--stacked">
            {(d.bookingType === 'virtual' || d.bookingType === 'walkin') && <div className="bo-tx__note">{t(V.booking.slotsAs, { type: i18n.t(V.type[d.bookingType]) })}</div>}
            <SlotPicker c={c} />
            <WhatHappens rows={bookingSends(crm, true)} />
          </div>
        )}
      </Modal>

      <Modal open={d?.kind === 'cancel'} title={d?.kind === 'cancel' ? t(V.cancel.title, { name: d.name }) : ''} subtitle={d?.kind === 'cancel' ? d.when : undefined} width={480} onClose={close} closeLabel={closeLabel} className="bo-map__dialog"
        footer={
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={close}>{i18n.t(V.cancel.keep)}</button>
            <button type="button" className="bo-btn bo-btn--primary bo-map__btn--danger" disabled={!!(d && 'busy' in d && d.busy)} onClick={() => void c.actions.submitCancel()}>{i18n.t(V.cancel.confirm)}</button>
          </>
        }
      >
        <WhatHappens rows={cancelSends(crm)} />
      </Modal>

      <Modal open={d?.kind === 'resetStops'} title={i18n.t(V.resetStops.title)} width={440} onClose={close} closeLabel={closeLabel} className="bo-map__dialog" footer={confirmFooter(i18n.t(V.resetStops.confirm), true, false)}>
        <p className="bo-map__dialogtext">{i18n.t(V.resetStops.body)}</p>
      </Modal>
      <Modal open={d?.kind === 'resetId'} title={i18n.t(V.resetId.title)} width={440} onClose={close} closeLabel={closeLabel} className="bo-map__dialog" footer={confirmFooter(i18n.t(V.resetId.confirm), true, false)}>
        <p className="bo-map__dialogtext">{i18n.t(V.resetId.body)}</p>
      </Modal>

      <Modal open={d?.kind === 'idReview'} title={t(V.idReview.title, { name })} width={520} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog" footer={confirmFooter(i18n.t(V.idReview.save), d?.kind === 'idReview' && d.input.trim().toUpperCase() === 'FLAG', false)}>
        {d?.kind === 'idReview' && (
          <div className="bo-dlg bo-dlg--stacked">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Photo url={c.profile?.visitor.selfieUrl ?? null} label={i18n.t(V.profile.selfie)} />
              <Photo url={c.profile?.visitor.idCardUrl ?? null} label={i18n.t(V.profile.idCard)} />
            </div>
            <div className="bo-tx__seg">
              <button type="button" className={`bo-tx__segbtn${d.choice === 'match' ? ' bo-tx__segbtn--on' : ''}`} onClick={() => c.setDialog({ ...d, choice: 'match' })}>{i18n.t(V.idReview.matched)}</button>
              <button type="button" className={`bo-tx__segbtn${d.choice === 'mismatch' ? ' bo-tx__segbtn--on' : ''}`} onClick={() => c.setDialog({ ...d, choice: 'mismatch' })}>{i18n.t(V.idReview.mismatched)}</button>
            </div>
            <div className="bo-tx__meta">{i18n.t(V.idReview.note)}</div>
            <input className="bo-tx__input" placeholder="FLAG" value={d.input} onChange={(e) => c.setDialog({ ...d, input: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal open={d?.kind === 'pii'} title={i18n.t(V.pii.title)} width={520} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog" footer={confirmFooter(i18n.t(V.pii.confirm), d?.kind === 'pii' && d.input.trim().toUpperCase() === 'REMOVE' && Object.values(d.fields).some(Boolean))}>
        {d?.kind === 'pii' && (
          <div className="bo-dlg bo-dlg--stacked">
            <p className="bo-map__dialogtext">{i18n.t(V.pii.body)}</p>
            <div className="bo-tx__rowlist">
              {(['name', 'email', 'phone', 'image', 'history'] as const).map((field) => (
                <button key={field} type="button" className={`bo-tx__rowitem${d.fields[field] ? ' bo-tx__rowitem--on' : ''}`} onClick={() => c.setDialog({ ...d, fields: { ...d.fields, [field]: !d.fields[field] } })}>
                  <span className={`bo-tx__check${d.fields[field] ? ' bo-tx__check--on' : ''}`} />
                  <span className="bo-tx__name">{i18n.t(V.pii.field[field])}</span>
                </button>
              ))}
            </div>
            <div className="bo-tx__meta">{i18n.t(V.pii.note)}</div>
            <label className="bo-tx__field">{i18n.t(V.pii.match)}<input className="bo-tx__input" placeholder="REMOVE" value={d.input} onChange={(e) => c.setDialog({ ...d, input: e.target.value })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={d?.kind === 'delete'} title={t(V.delete.title, { name })} width={520} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog" footer={confirmFooter(i18n.t(V.delete.confirm), d?.kind === 'delete' && d.input.trim().toUpperCase() === 'DELETE')}>
        {d?.kind === 'delete' && (
          <div className="bo-dlg bo-dlg--stacked">
            <div className="bo-tx__ok"><b>{i18n.t(V.delete.removed)}</b> · {i18n.t(V.delete.removedText)}</div>
            <div className="bo-tx__note"><b>{i18n.t(V.delete.notDone)}</b> · {i18n.t(V.delete.notDoneText)}</div>
            <label className="bo-tx__field">{i18n.t(V.delete.match)}<input className="bo-tx__input" placeholder="DELETE" value={d.input} onChange={(e) => c.setDialog({ ...d, input: e.target.value })} /></label>
          </div>
        )}
      </Modal>

      <Modal open={d?.kind === 'chat'} title={t(V.chat.title, { name })} width={520} onClose={close} closeLabel={closeLabel} className="bo-tour__dialog" footer={<button type="button" className="bo-btn bo-btn--secondary" onClick={close}>{i18n.t(X.close)}</button>}>
        <div className="bo-dlg bo-dlg--stacked">
          {(c.profile?.chat.messages ?? []).map((message, index) => (
            <div key={index} style={{ alignSelf: message.who === 'Support Team' ? 'flex-end' : 'flex-start', maxWidth: '80%', background: message.who === 'Support Team' ? 'var(--bo-accent-soft)' : '#F1F3F6', borderRadius: 10, padding: '9px 12px' }}>
              <div className="bo-tx__meta">{message.who}</div>
              <div style={{ font: '500 12.5px/1.5 var(--bo-font)', color: 'var(--bo-ink)' }}>{message.text}</div>
            </div>
          ))}
          {(c.profile?.chat.messages ?? []).length === 0 && <div className="bo-tx__meta">{i18n.t(V.chat.empty)}</div>}
        </div>
      </Modal>
    </>
  );
};

const WhatHappens = ({ rows }: { rows: { title: string; text: string }[] }) => (
  <div style={{ border: '1px solid var(--bo-line)', borderRadius: 9, overflow: 'hidden' }}>
    <div style={{ padding: '9px 12px', background: '#FAFBFC', font: '800 11px var(--bo-font)', color: 'var(--bo-subtle)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{i18n.t(V.booking.whatHappens)}</div>
    {rows.map((row) => (
      <div key={row.title} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderTop: '1px solid var(--bo-line-2)' }}>
        <span style={{ width: 90, font: '700 12px var(--bo-font)', color: 'var(--bo-ink)', flexShrink: 0 }}>{row.title}</span>
        <span style={{ font: '500 12px/1.45 var(--bo-font)', color: 'var(--bo-muted)' }}>{row.text}</span>
      </div>
    ))}
  </div>
);
