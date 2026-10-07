/**
 * Build-time configuration (Vite `import.meta.env`, set in `.env.*` files or
 * the shell). Nothing here is a secret: the API URL is public by nature.
 *
 *   VITE_TOUR_API_URL      the Pynwheel Tour App API base, e.g. http://127.0.0.1:8000
 *   VITE_TOUR_DATA_SOURCE  'pynwheel-api' (default) | 'dummy' (offline demo data, development only)
 *   VITE_TOUR_API_TIMEOUT  request timeout in ms (default 20000)
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
