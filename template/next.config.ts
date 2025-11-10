import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize compilation speed
  swcMinify: true,

  // Optimize package imports to reduce bundle size and compilation time
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

  // Modularize imports for faster compilation
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
      skipDefaultConversion: true,
    },
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

  // Optimize webpack configuration for development
  webpack: (config, { dev }) => {
    // In development, reduce the work webpack has to do
    if (dev) {
      // Disable source maps in development for faster compilation
      // Re-enable if you need to debug compiled code
      config.devtool = false;

      // Reduce optimization work in development
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
    }

    return config;
  },
};

export default nextConfig;
