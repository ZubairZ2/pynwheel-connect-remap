import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  /** Omitted on the current page, which is the last item. */
  href?: string;
}

/** The design's breadcrumb above a record screen: links, then the current page. */
export const Breadcrumb = ({ items }: { items: BreadcrumbItem[] }) => (
  <nav className="bo-breadcrumb" aria-label="Breadcrumb">
    {items.map((item, index) => (
      <span key={`${item.label}-${index}`} className="bo-breadcrumb__item">
        {index > 0 && <span aria-hidden="true">/</span>}
        {item.href ? (
          <Link href={item.href} className="bo-breadcrumb__link">
            {item.label}
          </Link>
        ) : (
          <span className="bo-breadcrumb__current" aria-current="page">
            {item.label}
          </span>
        )}
      </span>
    ))}
  </nav>
);
