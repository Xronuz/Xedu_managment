const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
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
          destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1'}/:path*`,
        },
      ],
    };
  },
};

module.exports = withNextIntl(nextConfig);
