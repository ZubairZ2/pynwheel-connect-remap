import Link from 'next/link';

import type { SetupSwitchOption } from '~/core/utils/generator/productSetup.generator';

/** The design's segmented control between Tour Setup, Touch Setup and Map Setup: links, so each is a page. */
export const SetupSwitcher = ({ options, label }: { options: SetupSwitchOption[]; label: string }) => (
  <nav className="bo-switcher" aria-label={label}>
    {options.map((option) => (
      <Link
        key={option.id}
        href={option.href}
        aria-current={option.on ? 'page' : undefined}
        className={`bo-switcher__option${option.on ? ' bo-switcher__option--on' : ''}`}
      >
        {option.label}
      </Link>
    ))}
  </nav>
);
