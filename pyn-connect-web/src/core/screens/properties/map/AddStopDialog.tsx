'use client';

import { i18n } from '~/resources/i18n';
import { Modal } from '~/core/components/molecules/Modal';
import type { PropertyMapController } from '~/core/hooks/usePropertyMap';
import { STOP_NAME_MAX, STOP_NOTE_MAX } from '~/core/utils/generator/map/wayfinding.generator';
import { M } from '~/core/utils/generator/map/mapText';

const S = M.stops;

const Box = ({ on }: { on: boolean }) => (
  <span className={`bo-wf__box${on ? ' bo-wf__box--on' : ''}`} aria-hidden="true">
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0 }}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  </span>
);

const FieldError = ({ id, text }: { id: string; text?: string }) =>
  text ? (
    <span id={id} className="bo-wf__fielderror" role="alert">
      {text}
    </span>
  ) : null;

/**
 * "Add Additional Stop" (and "Edit Additional Stop" for one added here), as
 * the wayfinding design lays it out: the twelve stop types, Name, Building,
 * Floorplate, the floor of a stacked floorplate, the vertical / gate /
 * blocker extras, the visitor instruction and "Place it on the map after
 * saving". Saving validates, keeps the stop on this page and (optionally)
 * arms it for placement. Nothing is sent.
 */
export const AddStopDialog = ({ controller }: { controller: PropertyMapController }) => {
  const { state, wayfinding } = controller;
  const form = state.stopDialog;
  const view = wayfinding.stopForm;
  const wf = wayfinding.actions;
  if (!form || !view) return null;
  const errors = view.errors;

  return (
    <Modal
      open
      title={view.title}
      subtitle={i18n.t(S.dialog.subtitle)}
      width={640}
      onClose={wf.closeStopDialog}
      closeLabel={i18n.t(S.dialog.close)}
      className="bo-tour__dialog bo-wf__dialog"
      footer={
        <>
          <span className="bo-dlg__readonly">{i18n.t(S.dialog.localNote)}</span>
          <button type="button" className="bo-btn bo-btn--secondary" onClick={wf.closeStopDialog}>
            {i18n.t(S.dialog.cancel)}
          </button>
          <button type="button" className="bo-btn bo-btn--primary" onClick={wf.saveStop} data-testid="stop-save">
            {view.saveLabel}
          </button>
        </>
      }
    >
      <form
        className="bo-dlg bo-dlg--stacked"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          wf.saveStop();
        }}
      >
        <fieldset className="bo-wf__types">
          <legend className="bo-wf__fieldlabel">{i18n.t(S.dialog.type)}</legend>
          <div className="bo-wf__typegrid" role="radiogroup" aria-label={i18n.t(S.dialog.type)}>
            {view.types.map((type) => (
              <button
                key={type.id}
                type="button"
                role="radio"
                aria-checked={type.active}
                className={`bo-wf__type${type.active ? ' bo-wf__type--on' : ''}`}
                onClick={() => wf.setStopForm({ type: type.id })}
              >
                <span className="bo-wf__typedisc" style={{ background: type.color }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={type.d} />
                  </svg>
                </span>
                <span className="bo-wf__typelabel">{type.label}</span>
              </button>
            ))}
          </div>
          <div className="bo-wf__typehint">{view.hint}</div>
          <FieldError id="stop-type-error" text={errors.type} />
        </fieldset>

        <label className="bo-wf__field">
          <span className="bo-wf__fieldlabel">{i18n.t(S.dialog.name)}</span>
          <input
            className={`bo-field${errors.name ? ' bo-field--invalid' : ''}`}
            value={form.name}
            maxLength={STOP_NAME_MAX + 20}
            placeholder={view.namePlaceholder}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'stop-name-error' : undefined}
            onChange={(event) => wf.setStopForm({ name: event.target.value })}
          />
          <FieldError id="stop-name-error" text={errors.name} />
        </label>

        <div className="bo-wf__fieldrow">
          <label className="bo-wf__field">
            <span className="bo-wf__fieldlabel">{i18n.t(S.dialog.building)}</span>
            <select
              className={`bo-field${errors.building ? ' bo-field--invalid' : ''}`}
              value={form.building}
              aria-invalid={!!errors.building}
              aria-describedby={errors.building ? 'stop-building-error' : undefined}
              onChange={(event) => wf.setStopForm({ building: event.target.value })}
            >
              {view.buildings.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="stop-building-error" text={errors.building} />
          </label>
          <label className="bo-wf__field">
            <span className="bo-wf__fieldlabel">{i18n.t(S.dialog.floorplate)}</span>
            <select
              className={`bo-field${errors.levelId ? ' bo-field--invalid' : ''}`}
              value={form.levelId}
              aria-invalid={!!errors.levelId}
              aria-describedby={errors.levelId ? 'stop-level-error' : undefined}
              onChange={(event) => wf.setStopForm({ levelId: event.target.value })}
            >
              {!view.plates.some((option) => option.id === form.levelId) && <option value="">{i18n.t(S.dialog.pickFloorplate)}</option>}
              {view.plates.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="stop-level-error" text={errors.levelId} />
          </label>
        </div>

        {view.stack && (
          <label className="bo-wf__field">
            <span className="bo-wf__fieldlabel">
              {i18n.t(S.dialog.appliesTo)} <span className="bo-wf__subtle">· {view.stack.label}</span>
            </span>
            <select
              className={`bo-field${errors.floorOnly ? ' bo-field--invalid' : ''}`}
              value={form.floorOnly}
              aria-invalid={!!errors.floorOnly}
              onChange={(event) => wf.setStopForm({ floorOnly: event.target.value })}
            >
              {view.stack.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            <FieldError id="stop-floor-error" text={errors.floorOnly} />
          </label>
        )}

        {view.vertical && (
          <div className="bo-wf__fieldrow bo-wf__fieldrow--end">
            <label className="bo-wf__field">
              <span className="bo-wf__fieldlabel">{i18n.t(S.dialog.floorsServed)}</span>
              <input
                className={`bo-field${errors.floors ? ' bo-field--invalid' : ''}`}
                value={form.floors}
                placeholder={i18n.t(S.dialog.floorsPlaceholder)}
                aria-invalid={!!errors.floors}
                aria-describedby={errors.floors ? 'stop-floors-error' : undefined}
                onChange={(event) => wf.setStopForm({ floors: event.target.value })}
              />
              <FieldError id="stop-floors-error" text={errors.floors} />
            </label>
            <button type="button" role="checkbox" aria-checked={form.accessible} className="bo-wf__checkrow" onClick={() => wf.setStopForm({ accessible: !form.accessible })}>
              <Box on={form.accessible} />
              <span>{i18n.t(S.dialog.accessible)}</span>
            </button>
          </div>
        )}

        {view.gate && (
          <button type="button" role="checkbox" aria-checked={form.lock} className="bo-wf__checkrow" onClick={() => wf.setStopForm({ lock: !form.lock })}>
            <Box on={form.lock} />
            <span>{i18n.t(S.dialog.smartLock)}</span>
          </button>
        )}

        {view.block && <div className="bo-wf__blocknote">{i18n.t(S.dialog.blockerNote)}</div>}

        <label className="bo-wf__field">
          <span className="bo-wf__fieldlabel">
            {i18n.t(S.dialog.instruction)} <span className="bo-wf__subtle">· {i18n.t(S.dialog.instructionSub)}</span>
          </span>
          <textarea
            className={`bo-wf__textarea${errors.note ? ' bo-field--invalid' : ''}`}
            value={form.note}
            placeholder={i18n.t(S.dialog.instructionPlaceholder)}
            aria-invalid={!!errors.note}
            aria-describedby={errors.note ? 'stop-note-error' : undefined}
            onChange={(event) => wf.setStopForm({ note: event.target.value })}
          />
          <span className="bo-wf__counter">
            {form.note.trim().length}/{STOP_NOTE_MAX}
          </span>
          <FieldError id="stop-note-error" text={errors.note} />
        </label>

        {!form.editing && (
          <button type="button" role="checkbox" aria-checked={form.place} className="bo-wf__checkrow" onClick={() => wf.setStopForm({ place: !form.place })}>
            <Box on={form.place} />
            <span>{i18n.t(S.dialog.place)}</span>
          </button>
        )}
      </form>
    </Modal>
  );
};
