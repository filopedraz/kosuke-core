const knipConfig = {
  $schema: 'https://unpkg.com/knip@latest/schema.json',
  ignore: [
    'projects/**',
    // Shadcn/UI components, we keep them as part of the template
    'src/components/ui/**',
    // Library barrel exports, infrastructure for template users
    'src/lib/**/index.ts',
  ],
  ignoreDependencies: [
    // Shadcn/UI dependencies (only used in components/ui/** which is ignored)
    '@radix-ui/*',
    'embla-carousel-react',
    'input-otp',
    'react-resizable-panels',
    'tailwindcss',
    'vaul',
    'ts-node',
    // Dependencies used in configuration files or by frameworks
    '@clerk/themes',
    'dockerode',
    'react-day-picker',
    'recharts',
    'server-only',
    'sonner',
    'eslint-config-next',
    'eslint-config-prettier',
    // Dependencies used in build scripts or configuration
    '@eslint/eslintrc',
  ],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'warn',
    unlisted: 'error',
    binaries: 'error',
    unresolved: 'error',
    exports: 'error',
    types: 'error',
    nsExports: 'error',
    nsTypes: 'error',
    duplicates: 'error',
    enumMembers: 'error',
    classMembers: 'error',
  },
};

export default knipConfig;
