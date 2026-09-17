import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle (.next/standalone) so the app can be deployed
  // to a host or container without shipping node_modules. See DEPLOYMENT.md.
  output: 'standalone',
  // Every Rails call is made server-side (route handlers / server components),
  // so no rewrites or CORS configuration are required.
};

export default nextConfig;
