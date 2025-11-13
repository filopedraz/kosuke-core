// Environment Variable Types
export interface EnvironmentVariable {
  id: string;
  projectId: string;
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
