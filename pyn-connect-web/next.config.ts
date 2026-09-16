import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Every Rails call is made server-side (route handlers / server components),
  // so no rewrites or CORS configuration are required.
};

export default nextConfig;
