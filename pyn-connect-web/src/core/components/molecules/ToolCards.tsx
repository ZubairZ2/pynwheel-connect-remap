import Link from 'next/link';

import { Icon } from '~/core/components/atoms/connect/Icon';
import { ChevronRightIcon } from '~/core/components/atoms/Icons';
import type { ManageItem } from '~/core/utils/generator/propertyDetail.generator';

/** The Product Setup page's tool cards: a tile, a label, a line and a chevron, each a link. */
export const ToolCards = ({ tools, label }: { tools: ManageItem[]; label: string }) => (
  <ul className="bo-tools" aria-label={label}>
    {tools.map((item) => (
      <li key={item.id}>
        <Link href={item.href} className="bo-tools__card">
          <span className="bo-tools__icon" aria-hidden="true">
            <Icon name={item.icon} />
          </span>
          <span className="bo-tools__text">
            <span className="bo-tools__label">{item.label}</span>
            <br />
            <span className="bo-tools__sub">{item.sub}</span>
          </span>
          <span className="bo-manage__chevron" aria-hidden="true">
            <ChevronRightIcon />
          </span>
        </Link>
      </li>
    ))}
  </ul>
);
