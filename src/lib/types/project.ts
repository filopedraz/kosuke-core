// Project Creation and Update Types
export interface CreateProjectData {
  name: string;
  prompt: string;
  github: {
    type: 'create' | 'import';
    repositoryName?: string; // For create mode
    repositoryUrl?: string; // For import mode
    description?: string;
    isPrivate?: boolean;
  };
}

// Project Creation Flow Types
export interface ProjectCreationStep {
  step: 'project-details' | 'github-setup' | 'creating' | 'complete';
  data?: Partial<CreateProjectData>;
  error?: string;
}
