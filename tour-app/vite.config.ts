import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * The Tour App builds to a static `dist/` that Capacitor copies into the iOS
 * and Android projects (`webDir` in capacitor.config.ts). Relative asset URLs
 * (`base: './'`) keep the bundle loadable from the native `capacitor://` /
 * `https://localhost` origins and from any static host.
 */
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 700
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node'
  }
});
