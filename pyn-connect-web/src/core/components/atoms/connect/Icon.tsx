import type { CSSProperties } from 'react';

import { ICONS } from '~/data/mock/icons.mock';

interface Props {
  name: string;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

/**
 * Renders one entry of the design's icon sheet.
 *
 * The markup is a module constant written by us — never user input — which is
 * why `dangerouslySetInnerHTML` is safe here. It replaces the design's
 * `paintIcons()` DOM pass with something React can reconcile.
 */
export const Icon = ({ name, style, className, title }: Props) => (
  <span
    className={className}
    title={title}
    aria-hidden={title ? undefined : true}
    style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}
    dangerouslySetInnerHTML={{ __html: ICONS[name] ?? '' }}
  />
);
