'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';

import { InventoryIcon, MapPinIcon, PaletteIcon, PlugIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import type {
  CellDescriptor,
  ColumnDescriptor,
  LinkIcon,
  RowDescriptor
} from '~/core/utils/generator/listing.types';

interface Props {
  columns: ColumnDescriptor[];
  rows: RowDescriptor[];
  emptyLabel: string;
  caption: string;
}

const LINK_ICON: Record<LinkIcon, () => React.JSX.Element> = {
  inventory: InventoryIcon,
  map: MapPinIcon,
  integrations: PlugIcon,
  branding: PaletteIcon
};

const cellClass = (column: ColumnDescriptor): string =>
  `bo-cell--${column.align}${column.kind ? ` bo-cell--${column.kind}` : ''}`;

/**
 * The one table renderer (`CustomTable` in the reference implementation): it
 * knows cell *types*, never modules. Everything module-specific arrives as
 * descriptors from a generator.
 */
export const CustomTable = ({ columns, rows, emptyLabel, caption }: Props) => {
  const router = useRouter();

  // A row with an `href` opens on a click anywhere in it, as the design's rows
  // do. Its title cell is a real link, so keyboard, middle-click and "open in
  // new tab" keep working; clicks on that link or on a cell's own buttons and
  // links are theirs to handle.
  const openRow = (href: string) => (event: MouseEvent<HTMLTableRowElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    if (window.getSelection()?.toString()) return;

    if (event.metaKey || event.ctrlKey) window.open(href, '_blank', 'noopener');
    else router.push(href);
  };

  return (
    <table className="bo-table">
      <caption className="sr-only" style={{ position: 'absolute', left: '-10000px' }}>
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id} className={cellClass(column)} scope="col">
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={row.href ? 'bo-row--link' : undefined}
            onClick={row.href ? openRow(row.href) : undefined}
          >
            {columns.map((column) => (
              <td key={column.id} className={cellClass(column)}>
                <Cell descriptor={row.cells[column.id]} href={row.href} />
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={columns.length} className="bo-empty">
              {emptyLabel}
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
};

const Cell = ({ descriptor, href }: { descriptor?: CellDescriptor; href?: string }) => {
  if (!descriptor) return <span>—</span>;

  switch (descriptor.type) {
    case 'identity':
      return (
        <div className="bo-identity">
          <span className="bo-identity__badge" aria-hidden="true">
            {descriptor.initials}
          </span>
          <span className="bo-identity__label">{descriptor.label}</span>
        </div>
      );

    case 'title':
      return (
        <div>
          {href ? (
            <Link href={href} className="bo-celltitle bo-celltitle--link">
              {descriptor.title}
            </Link>
          ) : (
            <div className="bo-celltitle">{descriptor.title}</div>
          )}
          <div className="bo-cellsubtitle">{descriptor.subtitle}</div>
        </div>
      );

    case 'text':
      return <span className={descriptor.tone === 'muted' ? 'bo-text--muted' : undefined}>{descriptor.value}</span>;

    case 'number':
      return <span>{descriptor.value}</span>;

    case 'pill':
      return <StatusPill label={descriptor.label} variant={descriptor.variant} />;

    case 'tags':
      return (
        <div className="bo-tags">
          {descriptor.tags.map((tag) => (
            <span key={tag} className="bo-producttag">
              {tag}
            </span>
          ))}
          {descriptor.tags.length === 0 && (
            <span className="bo-producttag bo-producttag--none">{descriptor.emptyLabel}</span>
          )}
        </div>
      );

    case 'links':
      return (
        <div className="bo-goto">
          {descriptor.links.map((link) => {
            const Icon = LINK_ICON[link.icon];
            return (
              <Link
                key={link.id}
                href={link.href}
                title={link.title}
                aria-label={link.ariaLabel}
                className="bo-goto__link"
              >
                <Icon />
                <span className="bo-goto__label">{link.label}</span>
              </Link>
            );
          })}
        </div>
      );

    default:
      return <span>—</span>;
  }
};
