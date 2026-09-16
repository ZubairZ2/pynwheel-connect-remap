import { IdentityIcon, LockIcon, PmsIcon } from '~/core/components/atoms/Icons';
import { StatusPill } from '~/core/components/atoms/StatusPill';
import type { CellDescriptor, ColumnDescriptor, RowDescriptor } from '~/core/utils/generator/listing.types';
import type { IntegrationState } from '~/core/models/data/property.data';

interface Props {
  columns: ColumnDescriptor[];
  rows: RowDescriptor[];
  emptyLabel: string;
  caption: string;
}

const DOT_COLOR: Record<IntegrationState, string> = {
  ok: 'var(--dot-ok)',
  warn: 'var(--dot-warn)',
  crit: 'var(--dot-crit)',
  neutral: 'var(--dot-neutral)'
};

const DOT_ICON: Record<string, () => React.JSX.Element> = {
  lock: LockIcon,
  identity: IdentityIcon,
  pms: PmsIcon
};

/**
 * The one table renderer (`CustomTable` in the reference implementation): it
 * knows cell *types*, never modules. Everything module-specific arrives as
 * descriptors from a generator.
 */
export const CustomTable = ({ columns, rows, emptyLabel, caption }: Props) => (
  <div className="bo-panel">
    <table className="bo-table">
      <caption className="sr-only" style={{ position: 'absolute', left: '-10000px' }}>
        {caption}
      </caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column.id} className={`bo-cell--${column.align}`} scope="col">
              {column.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((column) => (
              <td key={column.id} className={`bo-cell--${column.align}`}>
                <Cell descriptor={row.cells[column.id]} />
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
  </div>
);

const Cell = ({ descriptor }: { descriptor?: CellDescriptor }) => {
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
          <div className="bo-celltitle">{descriptor.title}</div>
          <div className="bo-cellsubtitle">{descriptor.subtitle}</div>
        </div>
      );

    case 'text':
      return <span className={descriptor.tone === 'muted' ? 'bo-text--muted' : undefined}>{descriptor.value}</span>;

    case 'number':
      return <span>{descriptor.value}</span>;

    case 'pill':
      return <StatusPill label={descriptor.label} variant={descriptor.variant} />;

    case 'integrations':
      return (
        <div className="bo-integrations">
          <div className="bo-integrations__products">
            {descriptor.products.map((product) => (
              <span key={product} className="bo-producttag">
                {product}
              </span>
            ))}
            {descriptor.products.length === 0 && (
              <span className="bo-producttag bo-producttag--none">None</span>
            )}
          </div>
          <div className="bo-integrations__dots">
            {descriptor.dots.map((dot) => {
              const Icon = DOT_ICON[dot.id];
              return (
                <span
                  key={dot.id}
                  title={`${dot.title}: ${dot.state}`}
                  aria-label={`${dot.title}: ${dot.state}`}
                  style={{ display: 'flex', color: DOT_COLOR[dot.state] }}
                >
                  {Icon ? <Icon /> : null}
                </span>
              );
            })}
          </div>
        </div>
      );

    default:
      return <span>—</span>;
  }
};
