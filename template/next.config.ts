import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize package imports to reduce bundle size and compilation time
  // This works with both Turbopack and webpack
  experimental: {
    optimizePackageImports: [
      // Common large packages that benefit from tree-shaking
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
    ],
  },

  // Skip type checking during dev builds (much faster)
  // Type checking should be done in CI/CD pipeline
  typescript: {
    ignoreBuildErrors: process.env.NODE_ENV === 'development',
  },

  // Skip ESLint during dev builds
  eslint: {
    ignoreDuringBuilds: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;
