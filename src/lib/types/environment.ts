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
