'use client';

import { useState } from 'react';

import { i18n } from '~/resources/i18n';
import { Modal } from '~/core/components/molecules/Modal';
import { UploadSlot, type UploadSlotFile } from '~/core/components/molecules/UploadSlot';
import type { InventoryDialog } from '~/core/hooks/usePropertyInventory';
import type { InventoryButton, PropertyInventory } from '~/core/models/data/propertyInventory.data';
import type { ImageDescriptor } from '~/core/utils/generator/inventory/inventory.types';
import {
  MASS_OVERRIDE_ACTIONS,
  amenityForm,
  amenityPlacementOptions,
  buildingOptions,
  floorplanForm,
  floorplateDialogTitle,
  floorplateForm,
  lockDeviceOptions,
  lockTypeOptions,
  massOverrideScope,
  unitDialogSubtitle,
  unitFieldSources,
  unitForm,
  type MassOverrideAction
} from '~/core/utils/generator/inventory/inventoryForms.generator';
import { S, rangeText, t } from '~/core/utils/generator/inventory/inventoryText';
import {
  DialogFooter,
  Field,
  FormGroup,
  FormRow,
  InteriorGrid,
  SwitchField,
  YesNo,
  uploadLabels,
  usePickedFiles
} from './dialogParts';

interface Props {
  inventory: PropertyInventory;
  dialog: InventoryDialog | null;
  onClose: () => void;
  onView: (images: ImageDescriptor[], index?: number) => void;
}

/**
 * The inventory's Add / Edit dialogs and Mass Overrides, as the 22-Sep design
 * draws them. They open on the record's real values and can be filled in, but
 * Connect is read-only (gap G20): Save only closes the dialog.
 */
export const InventoryDialogs = ({ inventory, dialog, onClose, onView }: Props) => {
  if (!dialog) return null;

  switch (dialog.kind) {
    case 'floorplate':
      return <FloorplateDialog key={`fp-${dialog.id}`} inventory={inventory} id={dialog.id} onClose={onClose} onView={onView} />;
    case 'floorplan':
      return <FloorplanDialog key={`fl-${dialog.id}`} inventory={inventory} id={dialog.id} onClose={onClose} onView={onView} />;
    case 'unit':
      return <UnitDialog key={`u-${dialog.id}`} inventory={inventory} id={dialog.id} onClose={onClose} onView={onView} />;
    case 'amenity':
      return <AmenityDialog key={`a-${dialog.id}`} inventory={inventory} id={dialog.id} onClose={onClose} onView={onView} />;
    case 'mass':
      return <MassOverrideDialog count={dialog.count} filtered={dialog.filtered} onClose={onClose} />;
    default:
      return null;
  }
};

interface DialogProps {
  inventory: PropertyInventory;
  id: number | null;
  onClose: () => void;
  onView: (images: ImageDescriptor[], index?: number) => void;
}

const preview = (file: UploadSlotFile | null, onView: DialogProps['onView']) =>
  file?.src ? () => onView([{ name: file.name, src: file.src as string }]) : undefined;

/* ---------------- Floorplate ---------------- */

const FloorplateDialog = ({ inventory, id, onClose, onView }: DialogProps) => {
  const plate = inventory.floorplates.find((candidate) => candidate.id === id) ?? null;
  const [form, setForm] = useState(() => floorplateForm(plate));
  const pick = usePickedFiles();
  const buildings = buildingOptions(inventory);
  const F = S.dialogs.floorplate;
  const reads = rangeText(form.range);

  return (
    <Modal
      open
      title={floorplateDialogTitle(plate)}
      subtitle={i18n.t(F.subtitle)}
      onClose={onClose}
      closeLabel={i18n.t(S.dialogs.close)}
      footer={<DialogFooter saveLabel={i18n.t(F.save)} onClose={onClose} />}
    >
      <p className="bo-dlg__notice">{i18n.t(F.note)}</p>
      <div className="bo-dlg">
        <FormRow label={i18n.t(F.override)} hint={i18n.t(F.overrideHint)}>
          <YesNo label={i18n.t(F.override)} value={form.override} onChange={(override) => setForm({ ...form, override })} />
        </FormRow>
        <FormRow label={i18n.t(F.name)} hint={i18n.t(F.nameHint)}>
          <input
            className="bo-field"
            value={form.name}
            placeholder={i18n.t(F.name)}
            onChange={(event) => setForm({ ...form, name: event.target.value, override: true })}
          />
          <span className="bo-dlg__fieldhint">{i18n.t(form.override ? F.nameNoteManual : F.nameNoteAuto)}</span>
        </FormRow>
        <FormRow label={i18n.t(F.building)} hint={i18n.t(F.buildingHint)}>
          <select className="bo-field" value={form.building} onChange={(event) => setForm({ ...form, building: event.target.value })}>
            <option value="">{i18n.t(F.noBuilding)}</option>
            {buildings.map((building) => (
              <option key={building} value={building}>
                {building}
              </option>
            ))}
          </select>
        </FormRow>
        <FormRow label={i18n.t(F.range)} hint={i18n.t(F.rangeHint)}>
          <input
            className="bo-field"
            value={form.range}
            placeholder={i18n.t(F.range)}
            onChange={(event) => setForm({ ...form, range: event.target.value })}
          />
          <span className="bo-dlg__fieldhint">
            {reads ? t(F.rangeReads, { label: reads }) : i18n.t(form.override ? F.rangeFormatsManual : F.rangeFormats)}
          </span>
        </FormRow>
        <FormRow label={i18n.t(F.addName)} hint={i18n.t(F.addNameHint)}>
          <SwitchField label={i18n.t(F.addName)} on={form.addName} onToggle={() => setForm({ ...form, addName: !form.addName })} />
        </FormRow>
        <FormRow label={i18n.t(F.background)} hint={i18n.t(F.backgroundHint)}>
          <select className="bo-field" disabled value="">
            <option value="">
              {i18n.t(inventory.sharedBackground ? S.floorplates.sharedBackground : S.floorplates.noBackground)}
            </option>
          </select>
          <span className="bo-dlg__fieldhint">{i18n.t(F.backgroundNote)}</span>
        </FormRow>
        <FormRow label={i18n.t(F.image)} hint={i18n.t(F.imageHint)}>
          <UploadSlot
            file={form.image}
            accept="image/png,image/jpeg"
            hint={i18n.t(F.imageUploadHint)}
            labels={uploadLabels()}
            onPreview={preview(form.image, onView)}
            onPick={(file) => setForm({ ...form, image: pick(file) })}
            onRemove={() => setForm({ ...form, image: null })}
          />
        </FormRow>
        <FormRow label={i18n.t(F.svg)} hint={i18n.t(F.svgHint)}>
          <UploadSlot
            file={form.svg}
            accept="image/svg+xml,.svg"
            hint={i18n.t(F.svgUploadHint)}
            labels={uploadLabels()}
            onPreview={preview(form.svg, onView)}
            onPick={(file) => setForm({ ...form, svg: pick(file) })}
            onRemove={() => setForm({ ...form, svg: null })}
          />
        </FormRow>
      </div>
    </Modal>
  );
};

/* ---------------- Buttons (floor plan and unit) ---------------- */

const ButtonFields = ({
  buttons,
  onChange,
  labels
}: {
  buttons: InventoryButton[];
  onChange: (buttons: InventoryButton[]) => void;
  labels: { label: string; url: string }[];
}) => (
  <div className="bo-dlg__buttons">
    {buttons.map((button, index) => {
      const set = (patch: Partial<InventoryButton>) =>
        onChange(buttons.map((current, position) => (position === index ? { ...current, ...patch } : current)));

      return (
        <div key={labels[index].label} className="bo-dlg__grid bo-dlg__grid--button">
          <Field label={labels[index].label}>
            <input
              className="bo-field"
              value={button.label ?? ''}
              placeholder={index === 0 ? '3D Tour' : labels[index].label}
              onChange={(event) => set({ label: event.target.value })}
            />
          </Field>
          <Field label={labels[index].url}>
            <input
              className="bo-field"
              value={button.url ?? ''}
              placeholder="https://…"
              onChange={(event) => set({ url: event.target.value })}
            />
          </Field>
          <Field label={i18n.t(S.dialogs.newTab)}>
            <SwitchField label={`${labels[index].label}: ${i18n.t(S.dialogs.newTab)}`} on={button.newTab} onToggle={() => set({ newTab: !button.newTab })} />
          </Field>
        </div>
      );
    })}
  </div>
);

/* ---------------- Floor plan ---------------- */

const FloorplanDialog = ({ inventory, id, onClose, onView }: DialogProps) => {
  const plan = inventory.floorplans.find((candidate) => candidate.id === id) ?? null;
  const [form, setForm] = useState(() => floorplanForm(plan));
  const pick = usePickedFiles();
  const F = S.dialogs.floorplan;
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });

  return (
    <Modal
      open
      title={i18n.t(plan ? F.editTitle : F.addTitle)}
      subtitle={i18n.t(F.subtitle)}
      width={820}
      onClose={onClose}
      closeLabel={i18n.t(S.dialogs.close)}
      footer={<DialogFooter saveLabel={i18n.t(plan ? F.editSave : F.addSave)} onClose={onClose} />}
    >
      <div className="bo-dlg">
        <FormRow label={i18n.t(F.override)} hint={i18n.t(F.overrideHint)}>
          <YesNo label={i18n.t(F.override)} value={form.override} onChange={(override) => set({ override })} />
        </FormRow>
        <FormRow label={i18n.t(F.name)} hint={i18n.t(F.nameHint)}>
          <input className="bo-field" value={form.name} placeholder={i18n.t(F.name)} onChange={(event) => set({ name: event.target.value })} />
        </FormRow>
        <FormRow label={i18n.t(F.providerId)} hint={i18n.t(F.providerIdHint)}>
          <input
            className="bo-field"
            value={form.providerId}
            placeholder={i18n.t(F.providerIdPlaceholder)}
            onChange={(event) => set({ providerId: event.target.value })}
          />
        </FormRow>
        <FormRow label={i18n.t(F.info)} hint={i18n.t(F.infoHint)}>
          <div className="bo-dlg__grid bo-dlg__grid--four">
            <Field label={i18n.t(F.squareFeet)}>
              <input className="bo-field" value={form.sqft} placeholder="0" onChange={(event) => set({ sqft: event.target.value })} />
            </Field>
            <Field label={i18n.t(F.bedrooms)}>
              <input className="bo-field" value={form.beds} placeholder="0" onChange={(event) => set({ beds: event.target.value })} />
            </Field>
            <Field label={i18n.t(F.bathrooms)}>
              <input
                className="bo-field"
                value={form.baths}
                placeholder={i18n.t(F.bathroomsPlaceholder)}
                onChange={(event) => set({ baths: event.target.value })}
              />
            </Field>
            <Field label={t(F.basePrice, { currency: inventory.currencySymbol })}>
              <input className="bo-field" value={form.price} placeholder="0" onChange={(event) => set({ price: event.target.value })} />
            </Field>
          </div>
        </FormRow>
        <FormRow label={i18n.t(F.button)} hint={i18n.t(F.buttonHint)}>
          <ButtonFields
            buttons={form.buttons.slice(0, 1)}
            onChange={(first) => set({ buttons: [first[0], ...form.buttons.slice(1)] })}
            labels={[{ label: i18n.t(F.buttonLabel), url: i18n.t(F.buttonUrl) }]}
          />
        </FormRow>
        <FormRow label={i18n.t(F.additional)} hint={i18n.t(F.additionalHint)}>
          <ButtonFields
            buttons={form.buttons.slice(1)}
            onChange={(rest) => set({ buttons: [form.buttons[0], ...rest] })}
            labels={[
              { label: i18n.t(F.additionalLabel), url: i18n.t(F.additionalUrl) },
              { label: i18n.t(F.additional2Label), url: i18n.t(F.additional2Url) }
            ]}
          />
        </FormRow>
        <FormRow label={i18n.t(F.details)} hint={i18n.t(F.detailsHint)}>
          <Field label={i18n.t(F.detailsTitle)}>
            <input
              className="bo-field"
              value={form.detailsTitle}
              placeholder="More Details"
              onChange={(event) => set({ detailsTitle: event.target.value })}
            />
          </Field>
          <textarea
            className="bo-field bo-dlg__textarea"
            value={form.details}
            placeholder={i18n.t(F.detailsPlaceholder)}
            aria-label={i18n.t(F.details)}
            onChange={(event) => set({ details: event.target.value })}
          />
          <Field label={i18n.t(F.directional)} hint={i18n.t(F.directionalUnavailable)}>
            <textarea className="bo-field bo-dlg__textarea" placeholder={i18n.t(F.directionalPlaceholder)} disabled />
          </Field>
          <Field label={i18n.t(F.showOnCards)} hint={i18n.t(F.showOnCardsHint)}>
            <SwitchField label={i18n.t(F.showOnCards)} on={form.showOnCards} onToggle={() => set({ showOnCards: !form.showOnCards })} />
          </Field>
        </FormRow>
        <FormRow label={i18n.t(F.primary)} hint={i18n.t(F.imageHint)}>
          <UploadSlot
            file={form.primary}
            accept="image/png,image/jpeg"
            hint={i18n.t(F.imageUploadHint)}
            labels={uploadLabels()}
            onPreview={preview(form.primary, onView)}
            onPick={(file) => set({ primary: pick(file) })}
            onRemove={() => set({ primary: null })}
          />
        </FormRow>
        <FormRow label={i18n.t(F.secondary)} hint={i18n.t(F.imageHint)}>
          <UploadSlot
            file={form.secondary}
            accept="image/png,image/jpeg"
            hint={i18n.t(F.imageUploadHint)}
            labels={uploadLabels()}
            onPreview={preview(form.secondary, onView)}
            onPick={(file) => set({ secondary: pick(file) })}
            onRemove={() => set({ secondary: null })}
          />
        </FormRow>
        <FormRow label={i18n.t(F.interiors)} hint={i18n.t(F.interiorsHint)}>
          <InteriorGrid
            images={form.interiors}
            onView={(index) => onView(form.interiors, index)}
            onAdd={(files) =>
              set({ interiors: [...form.interiors, ...files.map((file) => ({ name: file.name, src: pick(file).src as string }))] })
            }
            addLabel={i18n.t(F.addImages)}
            viewAllLabel={i18n.t(F.viewAll)}
            leadLabel={i18n.t(F.lead)}
          />
        </FormRow>
      </div>
    </Modal>
  );
};

/* ---------------- Unit ---------------- */

const UnitDialog = ({ inventory, id, onClose, onView }: DialogProps) => {
  const unit = inventory.units.find((candidate) => candidate.id === id) ?? null;
  const [form, setForm] = useState(() => unitForm(unit, inventory));
  const pick = usePickedFiles();
  const sources = unitFieldSources(unit);
  const U = S.dialogs.unit;
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const buildings = buildingOptions(inventory);
  const plans = [...inventory.floorplans].sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  return (
    <Modal
      open
      title={i18n.t(unit ? U.editTitle : U.addTitle)}
      subtitle={unitDialogSubtitle(inventory)}
      width={860}
      onClose={onClose}
      closeLabel={i18n.t(S.dialogs.close)}
      footer={
        <>
          <p className="bo-dlg__readonly">{i18n.t(U.required)}</p>
          <DialogFooter saveLabel={i18n.t(unit ? U.editSave : U.addSave)} onClose={onClose} />
        </>
      }
    >
      <div className="bo-dlg bo-dlg--stacked">
        <FormGroup title={i18n.t(U.feed)} hint={i18n.t(U.feedBody)}>
          <YesNo
            label={i18n.t(U.feed)}
            value={form.override}
            onChange={(override) => set({ override })}
            yesHint={i18n.t(U.yesBody)}
            noHint={i18n.t(U.noBody)}
          />
        </FormGroup>

        <FormGroup title={i18n.t(U.details)}>
          <div className="bo-dlg__grid bo-dlg__grid--two">
            <Field label={i18n.t(U.name)} source={sources.name} hint={i18n.t(U.nameHint)}>
              <input className="bo-field" value={form.name} placeholder={i18n.t(U.namePlaceholder)} onChange={(event) => set({ name: event.target.value })} />
            </Field>
            <Field label={i18n.t(U.providerId)} source={sources.providerId}>
              <input
                className="bo-field"
                value={form.providerId}
                placeholder={i18n.t(U.providerIdPlaceholder)}
                onChange={(event) => set({ providerId: event.target.value })}
              />
            </Field>
            <Field label={i18n.t(U.floorPlan)} source={sources.floorplan}>
              <select className="bo-field" value={form.floorplanId} onChange={(event) => set({ floorplanId: event.target.value })}>
                <option value="">{i18n.t(U.noFloorPlan)}</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={String(plan.id)}>
                    {plan.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={i18n.t(U.price)} source={sources.price}>
              <span className="bo-dlg__money">
                <span aria-hidden="true">{inventory.currencySymbol}</span>
                <input className="bo-field" value={form.price} placeholder="0" onChange={(event) => set({ price: event.target.value })} />
              </span>
            </Field>
            <Field label={i18n.t(U.availability)} source={sources.availability} hint={i18n.t(U.availabilityHint)}>
              <select
                className="bo-field"
                value={form.availability}
                onChange={(event) => set({ availability: event.target.value as typeof form.availability })}
              >
                <option value="available">{i18n.t(U.availAvailable)}</option>
                <option value="occupied">{i18n.t(U.availOccupied)}</option>
              </select>
            </Field>
            <Field label={i18n.t(U.availableDate)} source={sources.availableDate}>
              <input
                className="bo-field"
                type="date"
                value={form.availableDate}
                placeholder={i18n.t(U.availableDatePlaceholder)}
                onChange={(event) => set({ availableDate: event.target.value })}
              />
            </Field>
            <Field label={i18n.t(U.unitStatus)}>
              <input
                className="bo-field"
                value={form.unitStatus}
                placeholder={i18n.t(U.unitStatusPlaceholder)}
                onChange={(event) => set({ unitStatus: event.target.value })}
              />
            </Field>
            <Field label={i18n.t(U.tourOrder)} hint={i18n.t(U.tourOrderHint)}>
              <input
                className="bo-field"
                value={form.tourOrder}
                placeholder={i18n.t(U.tourOrderPlaceholder)}
                onChange={(event) => set({ tourOrder: event.target.value })}
              />
            </Field>
          </div>
        </FormGroup>

        <FormGroup title={i18n.t(U.placement)} hint={i18n.t(U.placementHint)}>
          <div className="bo-dlg__grid bo-dlg__grid--three">
            <Field label={i18n.t(U.building)} source={sources.building}>
              <select className="bo-field" value={form.building} onChange={(event) => set({ building: event.target.value })}>
                <option value="">{i18n.t(U.noBuilding)}</option>
                {buildings.map((building) => (
                  <option key={building} value={building}>
                    {building}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={i18n.t(U.floor)} source={sources.floor}>
              <input className="bo-field" value={form.floor} placeholder={i18n.t(U.floorPlaceholder)} onChange={(event) => set({ floor: event.target.value })} />
            </Field>
            <Field label={i18n.t(U.sqft)} source={sources.sqft} hint={i18n.t(U.sqftHint)}>
              <input className="bo-field" value={form.sqft} placeholder="0" onChange={(event) => set({ sqft: event.target.value })} />
            </Field>
          </div>
        </FormGroup>

        <FormGroup title={i18n.t(U.status)}>
          <div className="bo-dlg__grid bo-dlg__grid--two">
            <Field label={i18n.t(U.sold)} source={sources.sold} hint={i18n.t(U.soldHint)}>
              <YesNo label={i18n.t(U.sold)} value={form.sold} onChange={(sold) => set({ sold })} />
            </Field>
            <Field label={i18n.t(U.model)}>
              <span className="bo-dlg__check">
                <input type="checkbox" checked={form.model} onChange={() => set({ model: !form.model })} />
                {i18n.t(U.modelLabel)}
              </span>
            </Field>
          </div>
        </FormGroup>

        <FormGroup title={i18n.t(U.buttons)} hint={i18n.t(U.buttonsHint)}>
          <ButtonFields
            buttons={form.buttons}
            onChange={(buttons) => set({ buttons })}
            labels={[
              { label: i18n.t(U.buttonLabel), url: i18n.t(U.buttonUrl) },
              { label: i18n.t(U.additionalLabel), url: i18n.t(U.additionalUrl) },
              { label: i18n.t(U.additional2Label), url: i18n.t(U.additional2Url) }
            ]}
          />
        </FormGroup>

        <FormGroup title={i18n.t(U.lock)} hint={i18n.t(U.lockHint)}>
          <div className="bo-dlg__grid bo-dlg__grid--two">
            <Field label={i18n.t(U.lockType)}>
              <select className="bo-field" value={form.lockType} onChange={(event) => set({ lockType: event.target.value, lockDevice: '' })}>
                {lockTypeOptions(inventory, unit?.lockProvider ?? '').map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            {form.lockType && form.lockType !== 'Manual' && (
              <Field label={i18n.t(U.lockDevice)} hint={i18n.t(U.lockDeviceHint)}>
                <select className="bo-field" value={form.lockDevice} onChange={(event) => set({ lockDevice: event.target.value })}>
                  {lockDeviceOptions(inventory, form.lockType).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
        </FormGroup>

        <FormGroup title={i18n.t(U.copy)} hint={i18n.t(U.copyHint)}>
          <Field label={i18n.t(U.fees)} wide>
            <textarea className="bo-field bo-dlg__textarea" value={form.fees} placeholder={i18n.t(U.feesPlaceholder)} onChange={(event) => set({ fees: event.target.value })} />
          </Field>
          <Field label={i18n.t(U.detailsTitle)} hint={i18n.t(U.detailsTitleHint)} wide>
            <input className="bo-field" value={form.detailsTitle} placeholder="More Details" onChange={(event) => set({ detailsTitle: event.target.value })} />
          </Field>
          <Field label={i18n.t(U.detailsText)} wide>
            <textarea className="bo-field bo-dlg__textarea" value={form.details} placeholder={i18n.t(U.detailsPlaceholder)} onChange={(event) => set({ details: event.target.value })} />
          </Field>
          <Field label={i18n.t(U.directional)} hint={i18n.t(U.directionalHint)} wide>
            <textarea
              className="bo-field bo-dlg__textarea"
              value={form.directional}
              placeholder={i18n.t(U.directionalPlaceholder)}
              onChange={(event) => set({ directional: event.target.value })}
            />
          </Field>
        </FormGroup>

        <FormGroup title={i18n.t(U.images)} hint={i18n.t(U.imagesHint)}>
          <FormRow label={i18n.t(U.primary)} hint={i18n.t(U.primaryHint)}>
            <UploadSlot
              file={form.primary}
              accept="image/png,image/jpeg"
              hint={i18n.t(U.imageUploadHint)}
              labels={uploadLabels()}
              onPreview={preview(form.primary, onView)}
              onPick={(file) => set({ primary: pick(file) })}
              onRemove={() => set({ primary: null })}
            />
          </FormRow>
          <FormRow label={i18n.t(U.secondary)} hint={i18n.t(U.secondaryHint)}>
            <UploadSlot
              file={form.secondary}
              accept="image/png,image/jpeg"
              hint={i18n.t(U.imageUploadHint)}
              labels={uploadLabels()}
              onPreview={preview(form.secondary, onView)}
              onPick={(file) => set({ secondary: pick(file) })}
              onRemove={() => set({ secondary: null })}
            />
          </FormRow>
          <FormRow label={i18n.t(U.interiors)} hint={i18n.t(U.interiorsHint)}>
            <InteriorGrid
              images={form.interiors}
              onView={(index) => onView(form.interiors, index)}
              onAdd={(files) =>
                set({ interiors: [...form.interiors, ...files.map((file) => ({ name: file.name, src: pick(file).src as string }))] })
              }
              addLabel={i18n.t(S.dialogs.floorplan.addImages)}
              viewAllLabel={i18n.t(S.dialogs.floorplan.viewAll)}
              leadLabel={i18n.t(S.dialogs.floorplan.lead)}
            />
          </FormRow>
        </FormGroup>
      </div>
    </Modal>
  );
};

/* ---------------- Amenity ---------------- */

const AmenityDialog = ({ inventory, id, onClose, onView }: DialogProps) => {
  const amenity = inventory.amenities.find((candidate) => candidate.id === id) ?? null;
  const [form, setForm] = useState(() => amenityForm(amenity));
  const pick = usePickedFiles();
  const A = S.dialogs.amenity;
  const categories = [...new Set([...inventory.amenityCategories, ...(form.category ? [form.category] : [])])];

  return (
    <Modal
      open
      title={amenity ? `${i18n.t(A.editTitle)} · ${amenity.name}` : i18n.t(A.addTitle)}
      width={560}
      onClose={onClose}
      closeLabel={i18n.t(S.dialogs.close)}
      footer={<DialogFooter saveLabel={i18n.t(amenity ? A.editSave : A.addSave)} onClose={onClose} />}
    >
      <div className="bo-dlg bo-dlg--stacked">
        <Field label={i18n.t(A.name)} wide>
          <input className="bo-field" value={form.name} placeholder={i18n.t(A.namePlaceholder)} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </Field>
        <Field label={i18n.t(A.category)} wide>
          <select className="bo-field" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>
            <option value="">{i18n.t(A.noCategory)}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t(A.placement)} wide>
          <select className="bo-field" value={form.placement} onChange={(event) => setForm({ ...form, placement: event.target.value })}>
            {amenityPlacementOptions(inventory).map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={i18n.t(A.gallery)} wide>
          <InteriorGrid
            images={form.photos}
            onView={(index) => onView(form.photos, index)}
            onAdd={(files) =>
              setForm({ ...form, photos: [...form.photos, ...files.map((file) => ({ name: file.name, src: pick(file).src as string }))] })
            }
            addLabel={i18n.t(S.dialogs.floorplan.addImages)}
            viewAllLabel={i18n.t(S.dialogs.floorplan.viewAll)}
            leadLabel={i18n.t(S.dialogs.floorplan.lead)}
          />
        </Field>
      </div>
    </Modal>
  );
};

/* ---------------- Mass overrides ---------------- */

const MassOverrideDialog = ({ count, filtered, onClose }: { count: number; filtered: boolean; onClose: () => void }) => {
  const [action, setAction] = useState<MassOverrideAction>('protect');
  const M = S.dialogs.mass;
  const current = MASS_OVERRIDE_ACTIONS.find((option) => option.id === action) ?? MASS_OVERRIDE_ACTIONS[0];

  return (
    <Modal
      open
      title={i18n.t(M.title)}
      subtitle={massOverrideScope(count, filtered)}
      width={520}
      onClose={onClose}
      closeLabel={i18n.t(S.dialogs.close)}
      footer={<DialogFooter saveLabel={t(M.apply, { count })} onClose={onClose} disabled={count === 0} />}
    >
      <div className="bo-dlg bo-dlg--stacked">
        {count === 0 && <p className="bo-dlg__notice">{i18n.t(M.noUnits)}</p>}
        <Field label={i18n.t(M.action)} wide>
          <select className="bo-field" value={action} onChange={(event) => setAction(event.target.value as MassOverrideAction)}>
            {MASS_OVERRIDE_ACTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {i18n.t(option.label)}
              </option>
            ))}
          </select>
        </Field>
        <p className="bo-dlg__notice">{i18n.t(current.warning)}</p>
      </div>
    </Modal>
  );
};
