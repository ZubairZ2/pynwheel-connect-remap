'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { ExternalLinkIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { usePropertyDetail } from '~/core/hooks/usePropertyDetail';
import type { PropertyDetail } from '~/core/models/data/property.data';
import type {
  ConfigCard,
  ConfigRow,
  ProfileDraft
} from '~/core/utils/generator/propertyDetail.generator';

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
    manageLinks,
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

      <DetailSection
        className="bo-section--bar"
        icon="compass"
        title={t(S.manage.title)}
        subtitle={t(S.manage.subtitle)}
        action={manageLinks.map((link) => (
          <Link key={link.id} href={link.href} className="bo-linkbutton">
            {link.label}
          </Link>
        ))}
      />

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

      <div className="bo-configs">
        {configCards.map((card) => (
          <ConfigCardView key={card.id} card={card} />
        ))}
      </div>

      <DetailSection
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

const ConfigCardView = ({ card }: { card: ConfigCard }) => (
  <DetailSection
    className={`bo-section--config${card.id === 'settings' ? ' bo-section--wide' : ''}${card.active ? '' : ' bo-section--off'}${
      card.active ? ' bo-section--accent-icon' : ' bo-section--neutral-icon'
    }`}
    icon={card.icon}
    title={card.title}
    subtitle={card.subtitle}
  >
    {card.offNote && <div className="bo-offnote">{card.offNote}</div>}
    <div className={card.groups.length > 1 ? 'bo-configgroups' : undefined}>
      {card.groups.map((group) => (
        <div key={group.id} className="bo-configgroup">
          {group.title && <h4 className="bo-configgroup__title">{group.title}</h4>}
          {group.rows.map((row) => (
            <ConfigRowView key={row.label} row={row} />
          ))}
        </div>
      ))}
    </div>
    {card.links.length > 0 && (
      <div className="bo-configlinks">
        {card.links.map((link) => (
          <Link key={link.id} href={link.href} className="bo-linkbutton bo-linkbutton--quiet bo-configlinks__link">
            {link.label}
          </Link>
        ))}
      </div>
    )}
  </DetailSection>
);

/** The design's controls, showing the stored value only (Connect is read-only, so they are disabled). */
const ConfigRowView = ({ row }: { row: ConfigRow }) => (
  <div className="bo-configrow" title={row.kind === 'value' ? undefined : t(S.config.readOnly)}>
    <span className="bo-configrow__label">{row.label}</span>
    {row.kind === 'toggle' && (
      <Switch on={row.on} label={`${row.label}: ${t(row.on ? S.products.enabled : S.products.notEnabled)}`} />
    )}
    {row.kind === 'value' && <span className="bo-configrow__value">{row.value}</span>}
    {row.kind === 'input' && (
      <input
        className="bo-field bo-configrow__control"
        value={row.value}
        placeholder={row.placeholder}
        aria-label={row.label}
        readOnly
        disabled
      />
    )}
    {row.kind === 'date' && (
      <input
        type="date"
        className="bo-field bo-configrow__control"
        value={row.value ?? ''}
        aria-label={row.label}
        readOnly
        disabled
      />
    )}
    {row.kind === 'select' && (
      <select
        className={`bo-field bo-configrow__control${row.narrow ? ' bo-configrow__control--narrow' : ''}`}
        value={row.value}
        aria-label={row.label}
        disabled
      >
        {row.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )}
  </div>
);

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
