// Re-export database types
export type { ProjectStatus } from '@/lib/db/schema';

// Project Creation and Update Types
export interface CreateProjectData {
  name: string;
  prompt: string;
  github: {
    type: 'create' | 'import';
    repositoryUrl?: string;
    description?: string;
  };
}

// Project Creation Flow Types
export interface ProjectCreationStep {
  step: 'project-details' | 'github-setup' | 'creating' | 'complete';
  data?: Partial<CreateProjectData>;
  error?: string;
}
