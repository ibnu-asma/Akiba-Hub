import type { NextConfig } from 'next';

/** Web app — BFF route handlers call the Hub API server-side; secrets never reach the browser. */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
};

export default nextConfig;
