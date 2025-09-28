import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['dockerode'],
  output: 'standalone',
  experimental: {
    externalDir: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Alias '@sentry/nextjs' to a tiny local stub in development
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@sentry/nextjs': require('path').resolve(__dirname, 'lib/stubs/sentry-nextjs.ts'),
      } as Record<string, string>;
    }
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
    ],
  },
};

const isProd = process.env.NODE_ENV === 'production';

const sentryOptions = {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'jo-and-ko',
  project: 'kosuke-core',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

let config: NextConfig = nextConfig;
if (isProd) {
  // Use require here to avoid static ESM import in dev and to keep this file synchronous
  // next.config.ts is transpiled to CJS by Next's require-hook

  const { withSentryConfig } = require('@sentry/nextjs');
  config = withSentryConfig(nextConfig, sentryOptions);
}

export default config;
