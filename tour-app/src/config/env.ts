/**
 * Build-time configuration (Vite `import.meta.env`, set in `.env.*` files or
 * the shell). Nothing here is a secret: the API URL is public by nature.
 *
 *   VITE_TOUR_API_URL      the Pynwheel CMS base (the Tour App API lives under /api/tour/v1), e.g. http://127.0.0.1:3000
 *   VITE_TOUR_DATA_SOURCE  'pynwheel-api' (default) | 'dummy' (offline demo data, development only)
 *   VITE_TOUR_API_TIMEOUT  request timeout in ms (default 20000)
 *   VITE_DEMO_SCENARIOS    'on' shows the Settings › Demo scenarios panel in a production build (always on in dev)
 */

export type DataSource = 'pynwheel-api' | 'dummy';

const read = (key: string): string | undefined => {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  return value && value.trim() ? value.trim() : undefined;
};

export const env = {
  apiUrl: read('VITE_TOUR_API_URL')?.replace(/\/+$/, '') ?? null,
  dataSource: (read('VITE_TOUR_DATA_SOURCE') === 'dummy' ? 'dummy' : 'pynwheel-api') as DataSource,
  apiTimeoutMs: Number(read('VITE_TOUR_API_TIMEOUT') ?? 20000),
  mode: import.meta.env.MODE
};

/** The Demo scenarios panel (the design's Tweaks) is for review builds: on in dev, or when the flag is set. */
export const DEMO_SCENARIOS_ENABLED: boolean = import.meta.env.DEV === true || read('VITE_DEMO_SCENARIOS') === 'on';
