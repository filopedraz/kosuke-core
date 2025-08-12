export interface Project {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  githubUrl?: string;
  repositoryName?: string;
  isPrivate: boolean;
  status: string;
}

export interface GroupedProjects {
  date: string;
  data: Project[];
}

export interface UseProjectsOptions {
  searchText?: string;
  enabled?: boolean;
}

export type FlatProjectData = Project | { type: 'separator'; date: string; id: string };
