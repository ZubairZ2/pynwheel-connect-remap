'use client';

import { useState } from 'react';

import { i18n } from '~/resources/i18n';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Modal } from '~/core/components/molecules/Modal';
import { ImageViewer } from '~/core/components/organisms/ImageViewer';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import { AP_TOKENS, AP_TRIMS, apRuleSummary, type ApRow } from '~/core/utils/map/autoPlotRules';
import type { PillVariant } from '~/core/utils/generator/listing.types';
import type { ImageDescriptor } from '~/core/utils/generator/inventory/inventory.types';
import { S } from '~/core/utils/generator/inventory/inventoryText';
import { M, plural, t } from '~/core/utils/generator/map/mapText';
import { FloorplateDialog } from '../inventory/InventoryDialogs';

/**
 * The dialogs of the screen: the confirm (a local change only, and its
 * message says so), Publish (what the CMS would push, and that Connect
 * cannot publish yet), Add Floorplate (the inventory's own dialog; Save only
 * closes) and the four-step Auto Plot wizard. None sends a request.
 */
export const MapDialogs = ({ controller }: { controller: PropertyMapController }) => {
  const { state, actions, publishSummary, map } = controller;
  const confirm = state.confirm;
  const [viewer, setViewer] = useState<{ images: ImageDescriptor[]; index: number }>({ images: [], index: 0 });

  return (
    <>
      <Modal
        open={!!confirm}
        title={confirm?.title ?? ''}
        width={460}
        onClose={actions.closeConfirm}
        closeLabel={i18n.t(M.confirm.cancel)}
        className="bo-map__dialog"
        footer={
          confirm && (
            <>
              <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closeConfirm}>
                {i18n.t(M.confirm.cancel)}
              </button>
              <button
                type="button"
                className={`bo-btn bo-btn--primary${confirm.danger ? ' bo-map__btn--danger' : ''}`}
                onClick={confirm.onConfirm}
              >
                {confirm.label}
              </button>
            </>
          )
        }
      >
        <p className="bo-map__dialogtext">{confirm?.message}</p>
        <p className="bo-map__dialognote">{i18n.t(M.confirm.readOnly)}</p>
      </Modal>

      <Modal
        open={state.publishOpen}
        title={i18n.t(M.publish.title)}
        width={480}
        onClose={actions.closePublish}
        closeLabel={i18n.t(M.publish.close)}
        className="bo-map__dialog"
        footer={
          <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.closePublish}>
            {i18n.t(M.publish.close)}
          </button>
        }
      >
        <p className="bo-map__dialogtext">{publishSummary.body}</p>
        {publishSummary.unplotted && <p className="bo-map__dialogtext">{publishSummary.unplotted}</p>}
        {publishSummary.local && <p className="bo-map__dialogtext">{publishSummary.local}</p>}
        <div className="bo-map__warnbox">{i18n.t(M.publish.unavailable)}</div>
      </Modal>

      {state.floorplateDialog && (
        <FloorplateDialog
          inventory={map.inventory}
          id={null}
          onClose={actions.closeFloorplateDialog}
          onView={(images, index = 0) => setViewer({ images, index })}
        />
      )}

      <ImageViewer
        images={viewer.images}
        index={viewer.index}
        onIndexChange={(index) => setViewer((current) => ({ ...current, index }))}
        onClose={() => setViewer({ images: [], index: 0 })}
        labels={{
          close: i18n.t(S.viewer.close),
          previous: i18n.t(S.viewer.previous),
          next: i18n.t(S.viewer.next),
          position: (current, total) => t(S.viewer.position, { current, total }),
          unavailable: i18n.t(S.viewer.unavailable)
        }}
      />

      <AutoPlotDialog controller={controller} />
    </>
  );
};

const PILL: Record<ApRow['how'], [PillVariant, string]> = {
  exact: ['ok', M.autoPlot.status.exact],
  pattern: ['ok', M.autoPlot.status.pattern],
  manual: ['info', M.autoPlot.status.manual],
  none: ['crit', M.autoPlot.status.none],
  nosvg: ['warn', M.autoPlot.status.nosvg],
  loading: ['neutral', M.autoPlot.status.loading],
  amenity: ['neutral', M.autoPlot.status.amenity]
};

const MatchCell = ({ raw, converted, conv, keyColor }: { raw: string; converted: string; conv: boolean; keyColor?: string }) =>
  conv ? (
    <span className="bo-ap__conv">
      <span className="bo-ap__raw">{raw}</span>
      <span className="bo-ap__arrow">→</span>
      <span className="bo-ap__key" style={keyColor ? { color: keyColor } : undefined}>
        {converted}
      </span>
    </span>
  ) : (
    <span>{raw}</span>
  );

const RowsTable = ({ rows, multi, onManual, preview }: { rows: ApRow[]; multi: boolean; onManual?: (unitKey: string, targetKey: string) => void; preview?: boolean }) => (
  <div className="bo-ap__tablewrap">
    <table className="bo-ap__table">
      <thead>
        <tr>
          <th>{i18n.t(M.autoPlot.colUnit)}</th>
          {multi && <th>{i18n.t(M.autoPlot.colPlate)}</th>}
          <th>{i18n.t(M.autoPlot.colNumber)}</th>
          <th>{i18n.t(M.autoPlot.colPolygon)}</th>
          <th>{i18n.t(M.autoPlot.colStatus)}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const pmsConv = row.dir === 'pms' && row.kind === 'unit' && row.pmsKey !== row.pmsRaw;
          const svgConv = row.dir === 'svg' && !!row.svgRaw && row.svgKey !== row.svgRaw;
          const canPick = !preview && !!onManual && (row.how === 'none' || row.how === 'manual');
          const [variant, status] = PILL[row.how];
          return (
            <tr key={row.key}>
              <td className="bo-ap__name">{row.name}</td>
              {multi && <td className="bo-ap__muted">{row.levelName}</td>}
              <td className="bo-ap__mono">
                <MatchCell raw={row.pmsRaw} converted={row.pmsKey} conv={pmsConv} />
              </td>
              <td className="bo-ap__mono">
                {canPick ? (
                  <select className="bo-ap__select" value={row.target?.key ?? ''} aria-label={t(M.autoPlot.pickFor, { name: row.name })} onChange={(event) => onManual!(row.key, event.target.value)}>
                    <option value="">{i18n.t(M.autoPlot.pickPolygon)}</option>
                    {row.choices.map((choice) => (
                      <option key={choice.key} value={choice.key}>
                        {choice.code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <MatchCell raw={row.svgRaw || '—'} converted={row.svgKey} conv={svgConv} keyColor={row.isCand ? '#C62534' : undefined} />
                    {row.isCand && <span className="bo-ap__closest">{i18n.t(M.autoPlot.closest)}</span>}
                  </>
                )}
              </td>
              <td>
                <StatusPill variant={variant} label={i18n.t(status)} />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

/** The design's "Auto Plot · {scope}" wizard: Analyze, Match Pattern, Confirm, Result. Local only. */
const AutoPlotDialog = ({ controller }: { controller: PropertyMapController }) => {
  const { ap, apAnalysis, apPreview, apCurrentMatched, apSuggestion, apScopeName, apPresets, actions, level, assets } = controller;
  if (!ap || !apAnalysis || !apPreview) return null;

  const r = apAnalysis;
  const multi = ap.scope !== 'one';
  const exact = r.exact;
  const allOk = r.units > 0 && r.unmatched === 0 && r.nosvg === 0 && r.loading === 0;
  const plotN = r.matched + r.manual;
  const stepIndex = { analyze: 0, pattern: 1, confirm: 2, done: 3 }[ap.step];
  const steps = [M.autoPlot.stepAnalyze, M.autoPlot.stepPattern, M.autoPlot.stepConfirm, M.autoPlot.stepResult];
  const d = ap.draft;
  const units0 = r.rows.filter((row) => row.kind === 'unit');
  const pvUnits = apPreview.rows.filter((row) => row.kind === 'unit' && row.how !== 'nosvg');
  const pmsSample = units0.slice(0, 5).map((row) => row.pmsRaw).join(', ') || '—';
  const svgSample = r.sampleIds.slice(0, 6).join(', ') + (r.sampleIds.length > 6 ? ' …' : '');
  const delta = apPreview.matched - apCurrentMatched;
  const deltaLabel = delta === 0 ? i18n.t(M.autoPlot.sameAsCurrent) : t(M.autoPlot.deltaVsCurrent, { delta: `${delta > 0 ? '+' : ''}${delta}` });
  const pvColor = apPreview.units && apPreview.matched === apPreview.units ? '#4A7212' : apPreview.matched ? '#8A6A00' : '#C62534';
  const example = (() => {
    const first = pvUnits[0];
    if (!first) return '—';
    return d.dir === 'svg' ? (first.svgRaw ? `${first.svgRaw} → ${first.svgKey}` : '—') : `${first.pmsRaw} → ${first.pmsKey}`;
  })();
  const subtitle = multi
    ? t(M.autoPlot.subtitleMulti, { count: plural(r.rows.length ? new Set(r.rows.map((row) => row.levelId)).size : 0, M.autoPlot.plateOne, M.autoPlot.plateMany) })
    : t(M.autoPlot.subtitleOne, { file: assets?.svg?.name ?? i18n.t(M.autoPlot.theFloorSvg) });

  const footer = (() => {
    switch (ap.step) {
      case 'analyze':
        return (
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.apClose}>
              {i18n.t(M.confirm.cancel)}
            </button>
            <span className="bo-map__spacer" />
            {r.units === 0 && r.nosvg === 0 ? (
              <button type="button" className="bo-btn bo-btn--primary" onClick={actions.apClose}>
                {i18n.t(M.publish.close)}
              </button>
            ) : allOk ? (
              <>
                <button type="button" className="bo-btn bo-btn--secondary" onClick={() => actions.apGo('pattern')}>
                  {i18n.t(M.autoPlot.adjustPattern)}
                </button>
                <button type="button" className="bo-btn bo-btn--primary" onClick={() => actions.apGo('confirm')}>
                  {i18n.t(M.autoPlot.continue)}
                </button>
              </>
            ) : (
              <>
                {plotN > 0 && (
                  <button type="button" className="bo-btn bo-btn--secondary" onClick={() => actions.apGo('confirm')}>
                    {t(M.autoPlot.continueWith, { count: plotN })}
                  </button>
                )}
                <button type="button" className="bo-btn bo-btn--primary" onClick={() => actions.apGo('pattern')}>
                  {i18n.t(M.autoPlot.definePattern)}
                </button>
              </>
            )}
          </>
        );
      case 'pattern':
        return (
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={() => actions.apGo('analyze')}>
              {i18n.t(M.autoPlot.back)}
            </button>
            <span className="bo-map__spacer" />
            <button type="button" className="bo-btn bo-btn--primary" onClick={actions.apApply}>
              {i18n.t(M.autoPlot.applyRules)}
            </button>
          </>
        );
      case 'confirm':
        return (
          <>
            <button type="button" className="bo-btn bo-btn--secondary" onClick={() => actions.apGo('analyze')}>
              {i18n.t(M.autoPlot.back)}
            </button>
            <span className="bo-map__spacer" />
            <button type="button" className="bo-btn bo-btn--primary" onClick={actions.apRun} disabled={plotN === 0}>
              {i18n.t(M.autoPlot.confirmRun)}
            </button>
          </>
        );
      default:
        return (
          <>
            <span className="bo-map__spacer" />
            {ap.left.length > 0 && (
              <button type="button" className="bo-btn bo-btn--secondary" onClick={actions.apFinishManual}>
                {i18n.t(M.autoPlot.plotRest)}
              </button>
            )}
            <button type="button" className="bo-btn bo-btn--primary" onClick={actions.apClose}>
              {i18n.t(M.autoPlot.done)}
            </button>
          </>
        );
    }
  })();

  return (
    <Modal
      open
      title={`${i18n.t(M.autoPlot.wizardTitle)} · ${apScopeName}`}
      subtitle={subtitle}
      width={1040}
      onClose={actions.apClose}
      closeLabel={i18n.t(M.publish.close)}
      className="bo-map__dialog bo-ap"
      footer={footer}
    >
      <div className="bo-ap__steps" aria-label={i18n.t(M.autoPlot.wizardTitle)}>
        {steps.map((label, index) => (
          <div key={label} className={`bo-ap__step${index < stepIndex ? ' bo-ap__step--done' : index === stepIndex ? ' bo-ap__step--current' : ''}`}>
            <span className="bo-ap__stepdot">{index + 1}</span>
            <span className="bo-ap__steplabel">{i18n.t(label)}</span>
            <span className="bo-ap__stepline" />
          </div>
        ))}
      </div>

      {ap.step === 'analyze' && (
        <div className="bo-ap__body" data-testid="ap-analyze">
          <div className="bo-ap__stats">
            {[
              [r.matched, M.autoPlot.matched, '#4A7212'],
              [r.manual, M.autoPlot.manual, '#0077AE'],
              [r.unmatched, M.autoPlot.noMatch, '#C62534'],
              [r.nosvg + r.skipped, M.autoPlot.skipped, 'var(--bo-muted)']
            ].map(([value, label, color]) => (
              <div key={String(label)} className="bo-ap__stat">
                <div className="bo-ap__statvalue" style={{ color: String(color) }}>
                  {String(value)}
                </div>
                <div className="bo-ap__statlabel">{i18n.t(String(label))}</div>
              </div>
            ))}
          </div>
          {r.loading > 0 && <div className="bo-ap__note">{t(M.autoPlot.loadingSvgs, { count: r.loading })}</div>}
          {allOk && (
            <div className="bo-ap__ok">
              <div className="bo-ap__okhead">{t(exact && !r.manual ? M.autoPlot.okHeadExact : M.autoPlot.okHead, { count: plural(r.units, M.autoPlot.unitOne, M.autoPlot.unitMany) })}</div>
              <div className="bo-ap__okbody">{exact && !r.manual ? i18n.t(M.autoPlot.okBodyExact) : t(M.autoPlot.okBody, { manual: r.manual ? t(M.autoPlot.andManual, { count: plural(r.manual, M.autoPlot.pickOne, M.autoPlot.pickMany) }) : '' })}</div>
            </div>
          )}
          {(r.unmatched > 0 || (r.nosvg > 0 && r.units === 0)) && (
            <div className="bo-ap__bad">
              <div className="bo-ap__badhead">{r.unmatched ? t(M.autoPlot.badHead, { unmatched: r.unmatched, count: plural(r.units, M.autoPlot.unitOne, M.autoPlot.unitMany) }) : i18n.t(M.autoPlot.badHeadNoSvg)}</div>
              <div className="bo-ap__badbody">{i18n.t(M.autoPlot.badBody)}</div>
              <div className="bo-ap__samples">
                <span>PMS: {pmsSample}</span>
                <span>SVG: {svgSample || '—'}</span>
              </div>
              {apSuggestion && (
                <div className="bo-ap__suggest">
                  <span>
                    {t(M.autoPlot.suggested, {
                      pattern: apSuggestion.pattern + (apSuggestion.ignoreZeros ? ` + ${i18n.t(M.autoPlot.ignoreZerosShort)}` : ''),
                      matched: apSuggestion.matched,
                      total: r.units
                    })}
                  </span>
                  <button type="button" className="bo-ap__suggestbtn" onClick={actions.apUseSuggest}>
                    {i18n.t(M.autoPlot.useSuggestion)}
                  </button>
                </div>
              )}
            </div>
          )}
          {r.nosvg > 0 && <div className="bo-ap__note">{t(M.autoPlot.noSvgNote, { count: plural(r.nosvg, M.autoPlot.unitOne, M.autoPlot.unitMany) })}</div>}
          {r.units === 0 && r.nosvg === 0 && <div className="bo-ap__note">{i18n.t(M.autoPlot.nothing)}</div>}
          {!exact && (
            <div className="bo-ap__rules">
              {i18n.t(M.autoPlot.rulesInUse)}
              <span className="bo-ap__rulesummary">{apRuleSummary(ap.rules)}</span>
              <button type="button" className="bo-ap__link" onClick={() => actions.apGo('pattern')}>
                {i18n.t(M.autoPlot.edit)}
              </button>
            </div>
          )}
          <RowsTable rows={r.rows} multi={multi} onManual={actions.apSetManual} />
        </div>
      )}

      {ap.step === 'pattern' && (
        <div className="bo-ap__body" data-testid="ap-pattern">
          <div className="bo-ap__section">
            <span className="bo-ap__h">{i18n.t(M.autoPlot.whichSide)}</span>
            <div className="bo-ap__dircards" role="radiogroup" aria-label={i18n.t(M.autoPlot.whichSide)}>
              {(['pms', 'svg'] as const).map((dir) => {
                const on = d.dir === dir;
                const first = pvUnits[0];
                const ex =
                  dir === 'pms'
                    ? first
                      ? `${first.pmsRaw} → ${first.pmsKey}`
                      : '—'
                    : first?.svgRaw
                      ? `${first.svgRaw} → ${first.svgKey}`
                      : r.sampleIds[0]
                        ? `${r.sampleIds[0]} → ${r.sampleIds[0]}`
                        : '—';
                return (
                  <button key={dir} type="button" role="radio" aria-checked={on} className={`bo-ap__dircard${on ? ' bo-ap__dircard--on' : ''}`} onClick={() => actions.apSetDir(dir)}>
                    <span className="bo-ap__radio" />
                    <span className="bo-ap__dirtext">
                      <span className="bo-ap__dirtitle">{i18n.t(dir === 'pms' ? M.autoPlot.dirPms : M.autoPlot.dirSvg)}</span>
                      <span className="bo-ap__dirsub">{i18n.t(dir === 'pms' ? M.autoPlot.dirPmsSub : M.autoPlot.dirSvgSub)}</span>
                      <span className="bo-ap__direx">e.g. {ex}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="bo-ap__samplecards">
            <div className="bo-ap__samplecard">
              <div className="bo-ap__samplelabel">{i18n.t(M.autoPlot.pmsNumbers)}</div>
              <div className="bo-ap__samplevalue">{pmsSample}</div>
            </div>
            <div className="bo-ap__samplecard">
              <div className="bo-ap__samplelabel">{i18n.t(M.autoPlot.svgIds)}</div>
              <div className="bo-ap__samplevalue">{svgSample || '—'}</div>
            </div>
          </div>
          <div className="bo-ap__columns">
            <div className="bo-ap__rulescol">
              <span className="bo-ap__h">{t(M.autoPlot.rulesAppliedTo, { target: i18n.t(d.dir === 'svg' ? M.autoPlot.svgIds : M.autoPlot.pmsNumbers) })}</span>
              <div className="bo-ap__rulebox">
                <div className="bo-ap__rule">
                  <div className="bo-ap__rulehead">
                    <span className="bo-ap__h">{i18n.t(M.autoPlot.rewriteAs)}</span>
                    <span className="bo-ap__hint">{i18n.t(M.autoPlot.rewriteHint)}</span>
                    <button type="button" className="bo-ap__link bo-ap__link--right" onClick={actions.apResetDraft}>
                      {i18n.t(M.autoPlot.resetAll)}
                    </button>
                  </div>
                  <input className="bo-ap__pattern" value={d.pattern} placeholder={d.dir === 'svg' ? '{id}' : '{unit}'} aria-label={i18n.t(M.autoPlot.rewriteAs)} onChange={(event) => actions.apDraft({ pattern: event.target.value })} />
                  <div className="bo-ap__tokens">
                    {AP_TOKENS[d.dir].map((token) => (
                      <button key={token.t} type="button" className="bo-ap__token" title={token.d} onClick={() => actions.apInsertToken(token.t)}>
                        <span className="bo-ap__tokenkey">{token.t}</span>
                        <span className="bo-ap__tokendesc">{token.d}</span>
                      </button>
                    ))}
                  </div>
                  <div className="bo-ap__presets">
                    <span className="bo-ap__hint">{i18n.t(M.autoPlot.common)}</span>
                    {apPresets.map((preset) => (
                      <button key={preset.p} type="button" className={`bo-ap__preset${d.pattern === preset.p ? ' bo-ap__preset--on' : ''}`} onClick={() => actions.apDraft({ pattern: preset.p })}>
                        {preset.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="bo-ap__rule">
                  <div className="bo-ap__rulehead">
                    <span className="bo-ap__h">{i18n.t(M.autoPlot.findReplace)}</span>
                    <span className="bo-ap__hint">{i18n.t(M.autoPlot.findReplaceHint)}</span>
                    <button type="button" className="bo-ap__addrule" onClick={actions.apAddReplace}>
                      {i18n.t(M.autoPlot.addRule)}
                    </button>
                  </div>
                  {d.replaces.map((rule, index) => (
                    <div key={index} className="bo-ap__replace">
                      <input className="bo-ap__mono-input" value={rule.find} placeholder={i18n.t(M.autoPlot.find)} aria-label={i18n.t(M.autoPlot.find)} onChange={(event) => actions.apSetReplace(index, 'find', event.target.value)} />
                      <span className="bo-ap__arrow">→</span>
                      <input className="bo-ap__mono-input" value={rule.repl} placeholder={i18n.t(M.autoPlot.replaceWith)} aria-label={i18n.t(M.autoPlot.replaceWith)} onChange={(event) => actions.apSetReplace(index, 'repl', event.target.value)} />
                      <button type="button" className="bo-ap__drop" aria-label={i18n.t(M.autoPlot.removeRule)} onClick={() => actions.apDropReplace(index)}>
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="bo-ap__rule">
                  <span className="bo-ap__h">{i18n.t(M.autoPlot.trim)}</span>
                  <div className="bo-ap__trimrow">
                    {AP_TRIMS.map((option) => (
                      <button key={option.v} type="button" className={`bo-ap__seg${d.trim === option.v ? ' bo-ap__seg--on' : ''}`} onClick={() => actions.apSetTrim(option.v)}>
                        {option.l}
                      </button>
                    ))}
                    <span className={`bo-ap__trimn${d.trim === 'none' ? ' bo-ap__trimn--off' : ''}`}>
                      <button type="button" aria-label={i18n.t(M.autoPlot.fewer)} onClick={() => actions.apStepTrim(-1)}>
                        −
                      </button>
                      <input inputMode="numeric" value={d.trimN} aria-label={i18n.t(M.autoPlot.characters)} onChange={(event) => actions.apSetTrimN(event.target.value)} />
                      <button type="button" aria-label={i18n.t(M.autoPlot.more2)} onClick={() => actions.apStepTrim(1)}>
                        +
                      </button>
                      <span className="bo-ap__hint">{i18n.t(M.autoPlot.characters)}</span>
                    </span>
                  </div>
                </div>
                <div className="bo-ap__rule">
                  <span className="bo-ap__h">{i18n.t(M.autoPlot.padWrap)}</span>
                  <div className="bo-ap__padgrid">
                    {(
                      [
                        ['pad', M.autoPlot.padTo],
                        ['prefix', M.autoPlot.prefix],
                        ['suffix', M.autoPlot.suffix]
                      ] as const
                    ).map(([key, label]) => (
                      <label key={key} className="bo-ap__padfield">
                        <span className="bo-ap__samplelabel">{i18n.t(label)}</span>
                        <input className="bo-ap__mono-input" value={d[key]} placeholder="—" onChange={(event) => actions.apDraft({ [key]: event.target.value })} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="bo-ap__rule">
                  <span className="bo-ap__h">{i18n.t(M.autoPlot.comparison)}</span>
                  {(
                    [
                      ['ignoreSep', M.autoPlot.ignoreSep, M.autoPlot.ignoreSepSub],
                      ['ignoreZeros', M.autoPlot.ignoreZeros, M.autoPlot.ignoreZerosSub],
                      ['ignoreCase', M.autoPlot.ignoreCase, M.autoPlot.ignoreCaseSub]
                    ] as const
                  ).map(([flag, label, sub]) => (
                    <button key={flag} type="button" role="switch" aria-checked={d[flag]} className="bo-ap__flag" onClick={() => actions.apToggleFlag(flag)}>
                      <span className={`bo-switch bo-switch--control bo-map__switch${d[flag] ? ' bo-switch--on' : ''}`}>
                        <span className="bo-switch__knob" />
                      </span>
                      <span className="bo-ap__flagtext">
                        <span className="bo-ap__flaglabel">{i18n.t(label)}</span>
                        <span className="bo-ap__flagsub">{i18n.t(sub)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="bo-ap__previewcol">
              <span className="bo-ap__h">{i18n.t(M.autoPlot.livePreview)}</span>
              <div className="bo-ap__preview">
                <div className="bo-ap__previewrow">
                  <span className="bo-ap__previewcount" style={{ color: pvColor }}>
                    {t(M.autoPlot.previewCount, { matched: apPreview.matched, count: plural(apPreview.units, M.autoPlot.unitOne, M.autoPlot.unitMany) })}
                  </span>
                  <span className="bo-ap__previewdelta" style={{ color: delta > 0 ? '#4A7212' : delta < 0 ? '#C62534' : 'var(--bo-subtle)' }}>
                    {deltaLabel}
                  </span>
                </div>
                <div className="bo-ap__bar">
                  <div style={{ width: `${apPreview.units ? Math.round((apPreview.matched / apPreview.units) * 100) : 0}%`, background: pvColor }} />
                </div>
                <div className="bo-ap__example">
                  <span className="bo-ap__samplelabel">{i18n.t(M.autoPlot.example)}</span>
                  <span className="bo-ap__mono">{example}</span>
                </div>
              </div>
              <RowsTable rows={pvUnits} multi={false} preview />
              <span className="bo-ap__hint">{i18n.t(M.autoPlot.previewNote)}</span>
            </div>
          </div>
        </div>
      )}

      {ap.step === 'confirm' && (
        <div className="bo-ap__body" data-testid="ap-confirm">
          <div className="bo-ap__confirmhead">{t(M.autoPlot.confirmHead, { count: plural(plotN, M.autoPlot.unitOne, M.autoPlot.unitMany), scope: apScopeName })}</div>
          <div className="bo-ap__confirmbox">
            <div className="bo-ap__confirmrow">
              <span className="bo-ap__samplelabel">{i18n.t(M.autoPlot.matchingRule)}</span>
              <span>{exact ? i18n.t(M.autoPlot.exactRule) : `${i18n.t(ap.rules.dir === 'svg' ? M.autoPlot.rulesOnSvg : M.autoPlot.rulesOnPms)} ${ap.rules.pattern}`}</span>
            </div>
            <div className="bo-ap__confirmrow">
              <span className="bo-ap__samplelabel">{i18n.t(M.autoPlot.willPlot)}</span>
              <span style={{ color: '#4A7212' }}>
                {t(M.autoPlot.willPlotValue, { count: plural(r.matched, M.autoPlot.unitOne, M.autoPlot.unitMany), how: i18n.t(exact ? M.autoPlot.byExact : M.autoPlot.byPattern) })}
                {r.manual ? ` + ${t(M.autoPlot.pickedManually, { count: r.manual })}` : ''}
              </span>
            </div>
            <div className="bo-ap__confirmrow">
              <span className="bo-ap__samplelabel">{i18n.t(M.autoPlot.leftOver)}</span>
              <span>
                {r.unmatched + r.skipped + r.nosvg
                  ? t(M.autoPlot.leftOverValue, { count: plural(r.unmatched + r.skipped + r.nosvg, M.place.itemOne, M.place.itemMany) })
                  : i18n.t(M.autoPlot.nothingLeft)}
              </span>
            </div>
          </div>
          {!exact && (
            <button type="button" className="bo-ap__remember" role="checkbox" aria-checked={ap.remember} onClick={actions.apToggleRemember}>
              <span className={`bo-map__tick${ap.remember ? ' bo-map__tick--on' : ''}`} aria-hidden="true">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: ap.remember ? 1 : 0 }}>
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </span>
              {t(M.autoPlot.rememberFor, { building: ap.building ?? level?.sub ?? '' })}
            </button>
          )}
          <div className="bo-ap__note">{i18n.t(M.autoPlot.confirmNote)}</div>
        </div>
      )}

      {ap.step === 'done' && (
        <div className="bo-ap__body" data-testid="ap-done">
          <div className="bo-ap__ok bo-ap__ok--head">{i18n.t(M.autoPlot.complete)}</div>
          <div className="bo-ap__stats bo-ap__stats--two">
            <div className="bo-ap__stat">
              <div className="bo-ap__statvalue" style={{ color: '#4A7212' }}>
                {ap.placed}
              </div>
              <div className="bo-ap__statlabel">{i18n.t(M.autoPlot.plotted)}</div>
            </div>
            <div className="bo-ap__stat">
              <div className="bo-ap__statvalue" style={{ color: '#8A6A00' }}>
                {ap.left.length}
              </div>
              <div className="bo-ap__statlabel">{i18n.t(M.autoPlot.leftForManual)}</div>
            </div>
          </div>
          {ap.left.length > 0 && (
            <div className="bo-ap__left">
              {ap.left.slice(0, 14).map((row, index) => (
                <div key={`${row.name}-${index}`} className="bo-ap__leftrow">
                  <span className="bo-ap__leftname">{row.name}</span>
                  <span className="bo-ap__leftwhere">{row.where}</span>
                  <span className="bo-ap__leftreason">{row.reason}</span>
                </div>
              ))}
              {ap.left.length > 14 && <div className="bo-ap__leftmore">{t(M.autoPlot.more, { count: ap.left.length - 14 })}</div>}
            </div>
          )}
          <div className="bo-ap__note">{i18n.t(M.autoPlot.doneNote)}</div>
        </div>
      )}
    </Modal>
  );
};
