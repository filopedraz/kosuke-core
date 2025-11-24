/**
 * Types for kosuke.config.json structure
 * Defines the structure of project configuration files using Zod
 */

import { z } from 'zod';

// Zod schemas
const ServiceConfigSchema = z.object({
  type: z.enum(['bun', 'python']),
  directory: z.string(),
  is_entrypoint: z.boolean().optional(),
  connection_variable: z.string().optional(),
  external_connection_variable: z.string().optional(),
});

const StorageConfigSchema = z.object({
  type: z.enum(['postgres', 'redis']),
  connection_variable: z.string(),
});

const PreviewConfigSchema = z
  .object({
    services: z.record(z.string(), ServiceConfigSchema),
    storages: z.record(z.string(), StorageConfigSchema).optional(),
    environment: z.record(z.string(), z.string()).optional(),
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
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
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
export function getEntrypointService(kosukeConfig: KosukeConfig): {
  name: string;
  config: ServiceConfig;
} {
  const entrypointEntry = Object.entries(kosukeConfig.preview.services).find(
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
