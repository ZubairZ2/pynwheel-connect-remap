import type { ReactNode } from 'react';

import { Icon } from '~/core/components/atoms/connect/Icon';

interface Props {
  title: string;
  subtitle?: string;
  /** A name from the design's icon sheet, shown in a tile before the title. */
  icon?: string;
  /** Buttons or links at the end of the heading row. */
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * The design's detail-page panel: a white card with a title, an optional
 * subtitle and icon, and an action slot, then its body.
 */
export const DetailSection = ({ title, subtitle, icon, action, children, className }: Props) => (
  <section className={`bo-section${className ? ` ${className}` : ''}`}>
    <div className="bo-section__head">
      {icon && (
        <span className="bo-section__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <div className="bo-section__heading">
        <h3 className="bo-section__title">{title}</h3>
        {subtitle && <p className="bo-section__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="bo-section__actions">{action}</div>}
    </div>
    {children}
  </section>
);
