/** The handful of icons the Accounts navigation and listings use. */
const base = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

export const OrgsIcon = () => (
  <svg {...base}>
    <path d="M3 21h18" />
    <path d="M5 21V7l8-4v18" />
    <path d="M19 21V11l-6-4" />
    <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
  </svg>
);

export const PropertiesIcon = () => (
  <svg {...base}>
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    <path d="M9 8h.01M9 12h.01M15 8h.01M15 12h.01M10 21v-4h4v4" />
  </svg>
);

export const SearchIcon = () => (
  <svg {...base} width={16} height={16}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export const SignOutIcon = () => (
  <svg {...base}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

/** The Properties listing's Go To buttons: 15px, a lighter stroke. */
const goTo = { ...base, width: 15, height: 15, strokeWidth: 1.9 };

export const InventoryIcon = () => (
  <svg {...goTo}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5" />
    <path d="M12 12v9" />
  </svg>
);

export const MapPinIcon = () => (
  <svg {...goTo}>
    <path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
);

export const PlugIcon = () => (
  <svg {...goTo}>
    <path d="M9 3v6" />
    <path d="M15 3v6" />
    <path d="M7 9h10v3a5 5 0 01-10 0V9z" />
    <path d="M12 17v4" />
  </svg>
);

export const PaletteIcon = () => (
  <svg {...goTo}>
    <circle cx="13.5" cy="6.5" r="1.6" />
    <circle cx="17.5" cy="11" r="1.6" />
    <circle cx="8.5" cy="7.5" r="1.6" />
    <circle cx="6.5" cy="12.5" r="1.6" />
    <path d="M12 22a4 4 0 010-8 3 3 0 003-3 8 8 0 10-8 11h5z" />
  </svg>
);

export const ChevronDownIcon = () => (
  <svg {...base} width={14} height={14} strokeWidth={2.4}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export const CheckIcon = () => (
  <svg {...base} width={11} height={11} stroke="#fff" strokeWidth={3.4}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

/** Marks a link that opens outside Connect (the legacy CMS), in a new tab. */
export const ExternalLinkIcon = () => (
  <svg {...base} width={13} height={13} aria-hidden="true">
    <path d="M14 4h6v6" />
    <path d="M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);
