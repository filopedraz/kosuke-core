/**
 * Types for kosuke.config.json structure
 * Defines the structure of project configuration files using Zod
 */

import { z } from 'zod';

const ServiceTypeSchema = z.enum(['bun', 'python']);

// Zod schemas
const ServiceConfigSchema = z.object({
  type: ServiceTypeSchema,
  directory: z.string(),
  is_entrypoint: z.boolean().optional(),
  connection_variable: z.string().optional(),
  external_connection_variable: z.string().optional(),
});

const StorageTypeSchema = z.enum(['postgres', 'redis']);

const StorageConfigSchema = z.object({
  type: StorageTypeSchema,
  connection_variable: z.string(),
});

const StaragesConfigSchema = z.record(z.string(), StorageConfigSchema);
const EnvironmentConfigSchema = z.record(z.string(), z.string());
const ServicesConfigSchema = z.record(z.string(), ServiceConfigSchema);

const PreviewConfigSchema = z
  .object({
    services: ServicesConfigSchema,
    storages: StaragesConfigSchema.optional(),
    environment: EnvironmentConfigSchema.optional(),
  })
  .refine(
    data => {
      // Validate at least one service exists
      return Object.keys(data.services).length > 0;
    },
    {
      message: 'At least one service must be defined',
    }
  )
  .refine(
    data => {
      // Validate exactly one entrypoint service
      const entrypointServices = Object.entries(data.services).filter(
        ([, service]) => service.is_entrypoint === true
      );
      return entrypointServices.length === 1;
    },
    {
      message: 'Exactly one service must be marked as entrypoint (is_entrypoint: true)',
    }
  );

const KosukeConfigSchema = z.object({
  preview: PreviewConfigSchema,
});

// Infer TypeScript types from Zod schemas
export type ServiceType = z.infer<typeof ServiceTypeSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
export type StorageType = z.infer<typeof StorageTypeSchema>;
export type StoragesConfig = z.infer<typeof StaragesConfigSchema>;
type ServicesConfig = z.infer<typeof ServicesConfigSchema>;
export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>;
export type KosukeConfig = z.infer<typeof KosukeConfigSchema>;

/**
 * Validate kosuke config structure using Zod
 * Throws ZodError with detailed error messages if validation fails
 */
export function validateKosukeConfig(config: unknown): KosukeConfig {
  return KosukeConfigSchema.parse(config);
}

/**
 * Get entrypoint service from config
 */
export function getEntrypointService(services: ServicesConfig): {
  name: string;
  config: ServiceConfig;
} {
  const entrypointEntry = Object.entries(services).find(
    ([, service]) => service.is_entrypoint === true
  );

  if (!entrypointEntry) {
    throw new Error('No entrypoint service defined in kosuke.config.json');
  }

  const [name, config] = entrypointEntry;

  return {
    name,
    config,
  };
}
