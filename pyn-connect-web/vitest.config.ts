import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/** Unit tests of the pure generators (no DOM, no server): `npm test`. */
export default defineConfig({
  resolve: { alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
});
