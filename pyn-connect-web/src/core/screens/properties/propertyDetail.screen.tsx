'use client';

import Link from 'next/link';

import { APP_ROUTES } from '~/config/app/urls';
import { CORE_STRINGS } from '~/config/app/strings';
import { i18n } from '~/resources/i18n';
import { Icon } from '~/core/components/atoms/connect/Icon';
import { ExternalLinkIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import { Switch } from '~/core/components/atoms/Switch';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { usePropertyDetail } from '~/core/hooks/usePropertyDetail';
import type { Property } from '~/core/models/data/property.data';

interface Props {
  /** Null when the lookup found nothing, or failed (then `error` says so). */
  property: Property | null;
  error?: string | null;
}

/**
 * Property Detail, on real data: the 22-Sep design's `isPropertyDetail`
 * screen, limited to what `GET /communities.json` returns for the property.
 */
export const PropertyDetailScreen = ({ property, error }: Props) =>
  property ? <PropertyDetail property={property} /> : <PropertyUnavailable error={error ?? null} />;

const Breadcrumb = ({ current }: { current?: string }) => (
  <nav className="bo-breadcrumb" aria-label="Breadcrumb">
    <Link href={APP_ROUTES.properties} className="bo-breadcrumb__link">
      {i18n.t(CORE_STRINGS.propertyDetail.breadcrumb)}
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

const PropertyDetail = ({ property }: { property: Property }) => {
  const {
    header,
    manageLinks,
    lifecycle,
    profileGroups,
    profileEditURL,
    productCards,
    inventoryCards,
    inventoryHref
  } = usePropertyDetail(property);

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
        title={i18n.t(CORE_STRINGS.propertyDetail.manage.title)}
        subtitle={i18n.t(CORE_STRINGS.propertyDetail.manage.subtitle)}
        action={manageLinks.map((link) => (
          <Link key={link.id} href={link.href} className="bo-linkbutton">
            {link.label}
          </Link>
        ))}
      />

      <DetailSection
        title={i18n.t(CORE_STRINGS.propertyDetail.lifecycle.title)}
        subtitle={`${i18n.t(CORE_STRINGS.propertyDetail.lifecycle.current)} ${lifecycle.currentLabel}`}
      >
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
        title={i18n.t(CORE_STRINGS.propertyDetail.profile.title)}
        subtitle={i18n.t(CORE_STRINGS.propertyDetail.profile.subtitle)}
        action={
          profileEditURL && (
            <a
              href={profileEditURL}
              target="_blank"
              rel="noopener noreferrer"
              className="bo-linkbutton bo-linkbutton--quiet"
              title={i18n.t(CORE_STRINGS.propertyDetail.profile.editHint)}
            >
              {i18n.t(CORE_STRINGS.propertyDetail.profile.edit)}
              <ExternalLinkIcon />
            </a>
          )
        }
      >
        <div className="bo-profile">
          {profileGroups.map((group) => (
            <div key={group.id} className="bo-profile__group">
              <h4 className="bo-profile__heading">{group.title}</h4>
              <dl className="bo-profile__fields">
                {group.fields.map((field) => (
                  <div key={field.label}>
                    <dt className="bo-profile__label">{field.label}</dt>
                    <dd className="bo-profile__value">{field.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </DetailSection>

      <div className="bo-detail__pair">
        <DetailSection title={i18n.t(CORE_STRINGS.propertyDetail.products.title)} className="bo-section--tight">
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
          title={i18n.t(CORE_STRINGS.propertyDetail.inventory.title)}
          action={
            <Link href={inventoryHref} className="bo-linkbutton bo-linkbutton--quiet bo-linkbutton--small">
              {i18n.t(CORE_STRINGS.propertyDetail.inventory.manage)}
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
        </DetailSection>
      </div>
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
        <h2 className="bo-section__title">{i18n.t(CORE_STRINGS.propertyDetail.notFound.title)}</h2>
        <p className="bo-section__subtitle">{i18n.t(CORE_STRINGS.propertyDetail.notFound.body)}</p>
        <Link href={APP_ROUTES.properties} className="bo-linkbutton">
          {i18n.t(CORE_STRINGS.propertyDetail.notFound.back)}
        </Link>
      </div>
    )}
  </div>
);
