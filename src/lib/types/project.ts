// Project Management Types
import type { Project } from '@/lib/db/schema';

// Extended Project Types
export interface ProjectWithStats extends Project {
  messageCount?: number;
  lastActivity?: Date;
  previewUrl?: string;
}

export interface ProjectListItem
  extends Pick<Project, 'id' | 'name' | 'description' | 'createdAt' | 'updatedAt'> {
  messageCount: number;
  lastActivity?: Date;
}

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

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

// Project Filtering and Sorting
export type SortOption = 'newest' | 'oldest' | 'name-asc' | 'name-desc' | 'updated';

export interface ProjectFilters {
  search: string;
  sort: SortOption;
  page: number;
  limit: number;
}

export interface ProjectsResponse {
  projects: ProjectListItem[];
  total: number;
  totalPages: number;
  currentPage: number;
  hasMore: boolean;
}

// Project Operations
export interface DeleteProjectRequest {
  projectId: number;
  confirmationName: string;
}

export interface ProjectOperationResponse {
  success: boolean;
  message?: string;
  project?: Project;
}

// Project State Management
export interface ProjectGridState {
  projects: ProjectListItem[];
  isLoading: boolean;
  error: string | null;
  filters: ProjectFilters;
  hasMore: boolean;
}

export interface ProjectCreationState {
  isCreating: boolean;
  isModalOpen: boolean;
  initialProjectName: string;
  prompt: string;
}

// File Operations for Projects
export interface ProjectFile {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
  content?: string;
}

export interface ProjectFilesResponse {
  files: ProjectFile[];
  totalSize: number;
}

// Project Creation Flow Types
export interface ProjectCreationStep {
  step: 'project-details' | 'github-setup' | 'creating' | 'complete';
  data?: Partial<CreateProjectData>;
  error?: string;
}
