import { create, StateCreator } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

export interface Project {
  id: number;
  name: string;
  description: string | null;
  userId: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
  isArchived: boolean | null;
}

// Define the possible view types
type ProjectView = 'preview' | 'code' | 'branding';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  // Add new state properties for UI
  currentView: ProjectView;
  isChatCollapsed: boolean;

  // Action signatures
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addProject: (project: Project) => void;
  removeProject: (projectId: number) => void;
  updateProject: (projectId: number, updates: Partial<Project>) => void;
  // Add new action signatures
  setCurrentView: (view: ProjectView) => void;
  toggleChatCollapsed: () => void;
}

type ProjectPersist = (
  config: StateCreator<ProjectState>,
  options: PersistOptions<ProjectState>
) => StateCreator<ProjectState>;

export const useProjectStore = create<ProjectState>()(
  (persist as ProjectPersist)(
    (set): ProjectState => ({
      // Initial state values
      projects: [],
      currentProject: null,
      isLoading: false,
      error: null,
      currentView: 'preview', // Default view
      isChatCollapsed: false, // Default chat state

      // Action implementations
      setProjects: (projects: Project[]) => set({ projects }),
      setCurrentProject: (project: Project | null) => set({ currentProject: project }),
      setIsLoading: (isLoading: boolean) => set({ isLoading }),
      setError: (error: string | null) => set({ error }),
      addProject: (project: Project) =>
        set(state => ({
          projects: [...state.projects, project],
        })),
      removeProject: (projectId: number) =>
        set(state => ({
          projects: state.projects.filter(p => p.id !== projectId),
        })),
      updateProject: (projectId: number, updates: Partial<Project>) =>
        set(state => ({
          projects: state.projects.map(p => (p.id === projectId ? { ...p, ...updates } : p)),
          currentProject:
            state.currentProject?.id === projectId
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),
      // Add new action implementations
      setCurrentView: (view: ProjectView) => set({ currentView: view }),
      toggleChatCollapsed: () => set(state => ({ isChatCollapsed: !state.isChatCollapsed })),
    }),
    {
      name: 'project-storage',
      // Optionally, define which parts of the state to persist
      // partialize: (state) => ({ projects: state.projects, currentProject: state.currentProject }),
    }
  )
);
