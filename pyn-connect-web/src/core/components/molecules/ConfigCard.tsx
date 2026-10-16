import Link from 'next/link';

import { CORE_STRINGS } from '~/config/app/strings';
import { Switch } from '~/core/components/atoms/Switch';
import { DetailSection } from '~/core/components/molecules/DetailSection';
import { i18n } from '~/resources/i18n';
import type { ConfigCard, ConfigRow } from '~/core/utils/generator/propertyDetail.generator';

const S = CORE_STRINGS.propertyDetail;
const t = (key: string): string => i18n.t(key);

/**
 * One of the Property Settings / Touch / Tour / Maps configuration cards, as
 * Property Detail and the Product Setup pages draw it. The controls show the
 * stored value only: Connect is read-only here, so they are disabled.
 */
export const ConfigCardView = ({ card, className }: { card: ConfigCard; className?: string }) => (
  <DetailSection
    className={`bo-section--config${card.id === 'settings' ? ' bo-section--wide' : ''}${card.active ? '' : ' bo-section--off'}${
      card.active ? ' bo-section--accent-icon' : ' bo-section--neutral-icon'
    }${className ? ` ${className}` : ''}`}
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
export const ConfigRowView = ({ row }: { row: ConfigRow }) => (
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
