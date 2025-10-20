import type { ProjectEnvironmentVariable, ProjectIntegration } from '@/lib/db/schema';

// Environment Variable Types
export interface EnvironmentVariable {
  id: number;
  projectId: number;
  key: string;
  value: string;
  isSecret: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEnvironmentVariableData {
  key: string;
  value: string;
  isSecret: boolean;
  description?: string;
}

export interface UpdateEnvironmentVariableData {
  value?: string;
  isSecret?: boolean;
  description?: string;
}

// Project Integration Types
export interface Integration {
  id: number;
  projectId: number;
  integrationType: 'clerk' | 'polar' | 'stripe' | 'custom';
  integrationName: string;
  config: Record<string, unknown>;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateIntegrationData {
  integrationType: 'clerk' | 'polar' | 'stripe' | 'custom';
  integrationName: string;
  config: Record<string, unknown>;
  enabled?: boolean;
}

export interface UpdateIntegrationData {
  integrationName?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

// Integration Templates for common integrations
export interface IntegrationTemplate {
  type: 'clerk' | 'polar' | 'stripe' | 'custom';
  name: string;
  description: string;
  requiredVars: {
    key: string;
    description: string;
    isSecret: boolean;
    placeholder?: string;
  }[];
}

// Utility types for transforming database models
export type EnvironmentVariableFromDB = Omit<
  ProjectEnvironmentVariable,
  'createdAt' | 'updatedAt'
> & {
  createdAt: Date;
  updatedAt: Date;
};

export type IntegrationFromDB = Omit<ProjectIntegration, 'createdAt' | 'updatedAt' | 'config'> & {
  createdAt: Date;
  updatedAt: Date;
  config: Record<string, unknown>;
};
