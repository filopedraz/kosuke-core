import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@docker/node-sdk'],
  output: 'standalone',
  experimental: {
    externalDir: true,
    webpackMemoryOptimizations: true,
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
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      // Ghost CMS images
      {
        protocol: 'https',
        hostname: '*.ghost.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'static.ghost.org',
      },
    ],
  },
  async headers() {
    const ghostUrl = process.env.NEXT_PUBLIC_GHOST_URL ?? '';
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? '';
    const posthogAssets = posthogHost.replace('.i.posthog.com', '-assets.i.posthog.com');

    const isDev = process.env.NODE_ENV !== 'production';

    const cspHeader = `
      default-src 'self';
      script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : ''} https://*.clerk.accounts.dev https://challenges.cloudflare.com https://plausible.io ${posthogHost};
      style-src 'self' ${isDev ? "'unsafe-inline'" : ''};
      img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://lh3.googleusercontent.com https://avatar.vercel.sh ${ghostUrl} https://images.unsplash.com https://static.ghost.org https://img.clerk.com;
      font-src 'self' data:;
      connect-src 'self' https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.sentry.io wss://*.clerk.accounts.dev https://plausible.io ${posthogHost} ${posthogAssets} ${ghostUrl};
      worker-src 'self' blob:;
      frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `;

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },

  webpack: (config, { dev }) => {
    // Suppress OpenTelemetry warnings in development
    if (dev) {
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /node_modules\/@opentelemetry\/instrumentation/,
          message: /Critical dependency: the request of a dependency is an expression/,
        },
      ];
    }
    return config;
  },
};

// Only apply Sentry configuration in production
const finalConfig =
  process.env.NODE_ENV === 'production'
    ? withSentryConfig(nextConfig, {
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
      })
    : nextConfig;

export default finalConfig;
