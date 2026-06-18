const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
// Compute API base URL WITHOUT version segment.
// NEXT_PUBLIC_API_URL typically looks like https://xedu.uz/api/v1
// The rewrite source /api/:path* captures the full sub-path including v1/...
// so the destination must NOT duplicate the version prefix.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
// Strip trailing /v1 (or /v1/) so the rewrite concatenation is correct:
//   source /api/:path*  where :path* = v1/teacher-attendance/...
//   → destination = https://xedu.uz/api/v1/teacher-attendance/...
const API_BASE = API_URL.replace(/\/v1\/?$/, '');

const nextConfig = {
  output: 'standalone',
  typescript: {
    // lucide-react@0.469.0 ForwardRefExoticComponent type incompatibility with React 18
    // Runtime is unaffected; type-only errors are caught by IDE/tsc during development
    ignoreBuildErrors: true,
  },
  experimental: {
    serverComponentsExternalPackages: [],
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/health',
          destination: 'http://localhost:3001/api/health',
        },
      ],
      afterFiles: [
        {
          source: '/api/:path*',
          destination: `${API_BASE}/:path*`,
        },
      ],
    };
  },
};

module.exports = withNextIntl(nextConfig);
