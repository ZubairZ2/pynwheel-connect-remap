'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { ChevronRightIcon, ExternalLinkIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { ConfigCardView } from '~/core/components/molecules/ConfigCard';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { Modal } from '~/core/components/molecules/Modal';
import { usePropertyDetail } from '~/core/hooks/usePropertyDetail';
import type { PropertyDetail } from '~/core/models/data/property.data';
import type { ManageGroup, ProfileDraft } from '~/core/utils/generator/propertyDetail.generator';

const S = CORE_STRINGS.propertyDetail;
const t = (key: string): string => i18n.t(key);

interface Props {
  /** Null when the property is not found, or the load failed (then `error` says so). */
  property: PropertyDetail | null;
  error?: string | null;
}

/**
 * Property Detail, on real data: the 22-Sep design's `isPropertyDetail`
 * screen, fed by communities#edit.json. Read-only.
 */
export const PropertyDetailScreen = ({ property, error }: Props) =>
  property ? <PropertyDetailView property={property} /> : <PropertyUnavailable error={error ?? null} />;

const Breadcrumb = ({ current }: { current?: string }) => (
  <nav className="bo-breadcrumb" aria-label="Breadcrumb">
    <Link href={APP_ROUTES.properties} className="bo-breadcrumb__link">
      {t(S.breadcrumb)}
    </Link>
    {current && (
      <>
        <span aria-hidden="true">/</span>
        <span className="bo-breadcrumb__current" aria-current="page">
          {current}
        </span>
      </>
    )}
  </nav>
);

const PropertyDetailView = ({ property }: { property: PropertyDetail }) => {
  const view = usePropertyDetail(property);
  const {
    header,
    manageGroups,
    lifecycle,
    profileGroups,
    profileEditURL,
    productCards,
    inventoryCards,
    inventoryHref,
    inventorySummary,
    partners,
    configCards,
    billing,
    profileDraft,
    ratesDraft,
    notice
  } = view;

  const readOnlyNotice = (
    <div className="bo-notice" role="status">
      <span>{t(S.edit.readOnly)}</span>
      {profileEditURL && (
        <a href={profileEditURL} target="_blank" rel="noopener noreferrer" className="bo-notice__link">
          {t(S.edit.openInCms)}
          <ExternalLinkIcon />
        </a>
      )}
      <button type="button" className="bo-notice__dismiss" onClick={view.dismissNotice}>
        {t(S.edit.dismiss)}
      </button>
    </div>
  );

  return (
    <div className="bo-detail">
      <Breadcrumb current={header.name} />

      <div className="bo-detail__header">
        <div className="bo-detail__titlerow">
          <h2 className="bo-detail__title">{header.name}</h2>
          <StatusPill label={header.statusLabel} variant={header.statusVariant} />
        </div>
        <p className="bo-detail__subtitle">{header.subtitle}</p>
      </div>

      <DetailSection icon="compass" title={t(S.manage.title)} subtitle={t(S.manage.subtitle)}>
        <ManageGrid groups={manageGroups} />
      </DetailSection>

      <DetailSection title={t(S.lifecycle.title)} subtitle={`${t(S.lifecycle.current)} ${lifecycle.currentLabel}`}>
        <ol className="bo-steps">
          {lifecycle.steps.map((step) => (
            <li
              key={step.key}
              className={`bo-steps__step bo-steps__step--${step.state}`}
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              <div className="bo-steps__track">
                <span className="bo-steps__line" />
                <span className="bo-steps__num">{step.num}</span>
                <span className="bo-steps__line" />
              </div>
              <div>
                <div className="bo-steps__label">{step.label}</div>
                <div className="bo-steps__desc">{step.description}</div>
              </div>
            </li>
          ))}
        </ol>
      </DetailSection>

      <DetailSection
        title={t(S.profile.title)}
        subtitle={t(S.profile.subtitle)}
        action={
          profileDraft ? (
            <>
              <button type="button" className="bo-linkbutton bo-linkbutton--quiet" onClick={view.cancelProfile}>
                {t(S.edit.cancel)}
              </button>
              <button type="button" className="bo-primarybutton" onClick={view.saveProfile}>
                {t(S.edit.save)}
              </button>
            </>
          ) : (
            <button type="button" className="bo-linkbutton bo-linkbutton--quiet" onClick={view.editProfile}>
              {t(S.profile.edit)}
            </button>
          )
        }
      >
        {notice === 'profile' && readOnlyNotice}
        {profileDraft ? (
          <ProfileForm draft={profileDraft} onChange={view.changeProfile} />
        ) : (
          <div className="bo-profile">
            {profileGroups.map((group) => (
              <div key={group.id} className="bo-profile__group">
                <h4 className="bo-profile__heading">{group.title}</h4>
                <dl className="bo-profile__fields">
                  {group.fields.map((field) => (
                    <div key={field.label}>
                      <dt className="bo-profile__label">{field.label}</dt>
                      <dd className="bo-profile__value">{field.value}</dd>
                      {field.note && <dd className="bo-profile__note">{field.note}</dd>}
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </DetailSection>

      <div className="bo-detail__pair">
        <DetailSection title={t(S.products.title)} className="bo-section--tight">
          <ul className="bo-products">
            {productCards.map((product) => (
              <li
                key={product.id}
                className={`bo-products__item${product.enabled ? ' bo-products__item--on' : ''}`}
              >
                <span className="bo-products__icon" aria-hidden="true">
                  <Icon name={product.icon} />
                </span>
                <div className="bo-products__text">
                  <div className="bo-products__name">{product.name}</div>
                  <div className="bo-products__metric">{product.metric}</div>
                </div>
                {product.embed && (
                  <button type="button" className="bo-linkbutton bo-linkbutton--small bo-products__embed" onClick={view.openEmbed}>
                    {t(CORE_STRINGS.embed.button)}
                  </button>
                )}
                <Switch on={product.enabled} label={`${product.name}: ${product.stateLabel}`} />
              </li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection
          title={t(S.inventory.title)}
          subtitle={inventorySummary.subtitle}
          action={
            <Link href={inventoryHref} className="bo-linkbutton bo-linkbutton--quiet bo-linkbutton--small">
              {t(S.inventory.manage)}
            </Link>
          }
        >
          <div className="bo-stats">
            {inventoryCards.map((card) => (
              <Link key={card.id} href={card.href} className="bo-stat">
                <span className="bo-stat__icon" aria-hidden="true">
                  <Icon name={card.icon} />
                </span>
                <span>
                  <span className="bo-stat__value">{card.value}</span>
                  <span className="bo-stat__label">{card.label}</span>
                </span>
              </Link>
            ))}
          </div>
          {inventorySummary.subCommunities.length > 0 && (
            <div className="bo-subcommunities">
              <h4 className="bo-profile__heading">{t(S.inventory.subHeading)}</h4>
              <ul className="bo-subcommunities__list">
                {inventorySummary.subCommunities.map((sub) => (
                  <li key={sub.name} className="bo-subcommunities__item">
                    <span className="bo-subcommunities__name">{sub.name}</span>
                    <span className="bo-subcommunities__units">{sub.units}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DetailSection>
      </div>

      <DetailSection icon="broadcast" className="bo-section--neutral-icon" title={t(S.ils.title)} subtitle={t(S.ils.subtitle)}>
        <ul className="bo-toggles">
          {partners.map((partner) => (
            <li key={partner.key} className="bo-toggles__item">
              <div className="bo-toggles__text">
                <div className="bo-toggles__name">{partner.name}</div>
                <div className="bo-toggles__status">{partner.statusLabel}</div>
              </div>
              <Switch on={partner.on} label={`${partner.name}: ${partner.statusLabel}`} />
            </li>
          ))}
        </ul>
      </DetailSection>

      <div className="bo-configs" id="prop-config">
        {configCards.map((card) => (
          <ConfigCardView key={card.id} card={card} />
        ))}
      </div>

      <EmbedMapDialog open={view.embedOpen} onClose={view.closeEmbed} />

      <DetailSection
        id="prop-billing"
        title={t(S.billing.title)}
        subtitle={billing.subtitle}
        action={
          ratesDraft ? (
            <>
              <button type="button" className="bo-linkbutton bo-linkbutton--quiet bo-linkbutton--small" onClick={view.cancelRates}>
                {t(S.edit.cancel)}
              </button>
              <button type="button" className="bo-primarybutton bo-primarybutton--small" onClick={view.saveRates}>
                {t(S.edit.save)}
              </button>
            </>
          ) : (
            <button type="button" className="bo-linkbutton bo-linkbutton--quiet bo-linkbutton--small" onClick={view.editRates}>
              {t(S.billing.editRates)}
            </button>
          )
        }
      >
        {notice === 'rates' && readOnlyNotice}
        <div className="bo-rates">
          {billing.rates.map((rate) => (
            <div key={rate.id} className={`bo-rate${rate.accent ? ' bo-rate--accent' : ''}`}>
              <div className="bo-rate__label">{rate.label}</div>
              {ratesDraft ? (
                <input
                  className="bo-field bo-rate__input"
                  aria-label={rate.label}
                  value={ratesDraft[rate.id]}
                  onChange={(event) => view.changeRate(rate.id, event.target.value)}
                />
              ) : (
                <div className="bo-rate__value">{rate.value}</div>
              )}
            </div>
          ))}
        </div>
        {ratesDraft && (
          <label className="bo-form__field bo-form__field--narrow">
            <span className="bo-form__label">{t(S.billing.month)}</span>
            <input
              className="bo-field bo-form__input"
              value={ratesDraft.month}
              onChange={(event) => view.changeRate('month', event.target.value)}
            />
          </label>
        )}
      </DetailSection>
    </div>
  );
};

/** The design's "Manage This Property" grid: three groups of screens, each item an icon tile, a label, a line and a chevron. */
export const ManageGrid = ({ groups }: { groups: ManageGroup[] }) => (
  <div className="bo-manage">
    {groups.map((group) => (
      <div key={group.id} className="bo-manage__group">
        <h4 className="bo-profile__heading">{group.title}</h4>
        <ul className="bo-manage__list">
          {group.items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`bo-manage__item${item.dim ? ' bo-manage__item--dim' : ''}`}
                title={item.dim ? `${item.label} · ${t(CORE_STRINGS.manage.productOff)}` : undefined}
              >
                <span className="bo-manage__icon" aria-hidden="true">
                  <Icon name={item.icon} />
                </span>
                <span className="bo-manage__text">
                  <span className="bo-manage__label">
                    {item.label}
                    {item.dim && ` · ${t(CORE_STRINGS.manage.productOff)}`}
                  </span>
                  <br />
                  <span className="bo-manage__sub">{item.sub}</span>
                </span>
                <span className="bo-manage__chevron" aria-hidden="true">
                  <ChevronRightIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ))}
  </div>
);

/**
 * The design's Embed Map dialog. The Maps product publishes the marketing and
 * ops map URLs; communities#edit.json does not carry them, so the dialog says
 * so instead of showing made-up links.
 */
const EmbedMapDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const E = CORE_STRINGS.embed;
  const row = (title: string, sub: string) => (
    <div className="bo-embed__row">
      <div>
        <div className="bo-embed__title">{title}</div>
        <div className="bo-embed__sub">{sub}</div>
      </div>
      <div className="bo-embed__url" role="status">
        {t(E.notAvailable)}
      </div>
      <div className="bo-embed__actions">
        <button type="button" className="bo-linkbutton bo-linkbutton--small" disabled title={t(E.notAvailable)}>
          {t(E.copyUrl)}
        </button>
        <button type="button" className="bo-linkbutton bo-linkbutton--small" disabled title={t(E.notAvailable)}>
          {t(E.copyCode)}
        </button>
        <button type="button" className="bo-linkbutton bo-linkbutton--small" disabled title={t(E.notAvailable)}>
          {t(E.open)}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      title={t(E.title)}
      subtitle={t(E.subtitle)}
      width={620}
      onClose={onClose}
      closeLabel={t(E.close)}
      dismissOnBackdrop
      footer={
        <button type="button" className="bo-btn bo-btn--secondary" onClick={onClose}>
          {t(E.close)}
        </button>
      }
    >
      <div className="bo-embed">
        <div className="bo-offnote">{t(E.unavailable)}</div>
        {row(t(E.marketing), t(E.marketingSub))}
        {row(t(E.ops), t(E.opsSub))}
      </div>
    </Modal>
  );
};

/** The design's inline Edit Details form. It edits a local draft only. */
const ProfileForm = ({
  draft,
  onChange
}: {
  draft: ProfileDraft;
  onChange: <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => void;
}) => {
  const field = (key: keyof ProfileDraft, label: string, extra?: { span?: 2 | 3; disabled?: boolean }): ReactNode => (
    <label
      key={key}
      className={`bo-form__field${extra?.span ? ` bo-form__field--span${extra.span}` : ''}`}
    >
      <span className="bo-form__label">{label}</span>
      <input
        className="bo-field bo-form__input"
        value={String(draft[key])}
        disabled={extra?.disabled}
        onChange={(event) => onChange(key, event.target.value as ProfileDraft[typeof key])}
      />
    </label>
  );

  const choice = <K extends 'overrideGeo' | 'mapMode'>(
    key: K,
    label: string,
    options: { value: ProfileDraft[K]; label: string }[]
  ) => (
    <div className="bo-form__field" role="group" aria-label={label}>
      <span className="bo-form__label">{label}</span>
      <div className="bo-segmented">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={draft[key] === option.value}
            className={`bo-segmented__option${draft[key] === option.value ? ' bo-segmented__option--on' : ''}`}
            onClick={() => onChange(key, option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bo-form">
      {field('name', t(S.profile.name), { span: 2 })}
      {field('units', t(S.edit.units))}
      {field('street', t(S.profile.street), { span: 3 })}
      {field('city', t(S.edit.city))}
      {field('state', t(S.edit.state))}
      {field('zip', t(S.edit.zip))}
      {choice('overrideGeo', t(S.edit.overrideGeo), [
        { value: true, label: t(S.edit.manual) },
        { value: false, label: t(S.edit.auto) }
      ])}
      {field('lat', t(S.edit.latitude), { disabled: !draft.overrideGeo })}
      {field('lng', t(S.edit.longitude), { disabled: !draft.overrideGeo })}
      {field('phone', t(S.edit.leasingPhone))}
      {field('email', t(S.edit.leasingEmail))}
      {field('website', t(S.profile.website))}
      {field('pmName', t(S.edit.pmName))}
      {field('pmPhone', t(S.edit.pmPhone))}
      {field('pmEmail', t(S.edit.pmEmail))}
      {choice('mapMode', t(S.profile.mapMode), [
        { value: 'map', label: t(S.profile.propertyMap) },
        { value: 'floorplates', label: t(S.profile.floorplates) }
      ])}
      <label className="bo-form__field bo-form__field--span3">
        <span className="bo-form__label">{t(S.profile.notes)}</span>
        <textarea
          className="bo-field bo-form__textarea"
          value={draft.notes}
          onChange={(event) => onChange('notes', event.target.value)}
        />
      </label>
    </div>
  );
};

/** No property to show: the id is not in the user's scope, or Rails failed. */
const PropertyUnavailable = ({ error }: { error: string | null }) => (
  <div className="bo-detail">
    <Breadcrumb />
    {error ? (
      <div className="bo-error" role="alert">
        {error}
      </div>
    ) : (
      <div className="bo-section bo-section--empty" role="status">
        <h2 className="bo-section__title">{t(S.notFound.title)}</h2>
        <p className="bo-section__subtitle">{t(S.notFound.body)}</p>
        <Link href={APP_ROUTES.properties} className="bo-linkbutton">
          {t(S.notFound.back)}
        </Link>
      </div>
    )}
  </div>
);
