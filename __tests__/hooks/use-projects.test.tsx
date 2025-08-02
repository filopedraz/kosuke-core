import {
  useCreateProject,
  useDeleteProject,
  useProject,
  useProjects,
  useUpdateProject,
} from '@/hooks/use-projects';
import { useProjectStore, type Project } from '@/lib/stores/projectStore';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

// Mock the project store
jest.mock('@/lib/stores/projectStore', () => ({
  useProjectStore: jest.fn(),
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Create a test component that uses the hook
function TestComponent({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Sample project data
const mockProject: Project = {
  id: 1,
  name: 'Test Project',
  description: 'A test project',
  userId: 'user_123',
  createdBy: 'user_123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  isArchived: false,
  githubRepoUrl: null,
  githubOwner: null,
  githubRepoName: null,
  githubBranch: null,
  autoCommit: null,
  lastGithubSync: null,
};

const mockProjects: Project[] = [mockProject];

// Mock store functions
const mockSetProjects = jest.fn();
const mockAddProject = jest.fn();
const mockRemoveProject = jest.fn();
const mockUpdateProject = jest.fn();

describe('useProjects', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      setProjects: mockSetProjects,
      addProject: mockAddProject,
      removeProject: mockRemoveProject,
      updateProject: mockUpdateProject,
    });
  });

  function UseProjectsTestComponent() {
    const { data, isLoading, error } = useProjects({
      userId: 'user_123',
      initialData: [],
    });

    return (
      <div>
        <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
        <div data-testid="error">{error?.message || 'no error'}</div>
        <div data-testid="projects-count">{data?.length || 0}</div>
        {data?.map(project => (
          <div key={project.id} data-testid={`project-${project.id}`}>
            {project.name}
          </div>
        ))}
      </div>
    );
  }

  it('should fetch projects successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProjects,
    });

    render(
      <TestComponent>
        <UseProjectsTestComponent />
      </TestComponent>
    );

    // Wait for the actual data to be loaded
    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    expect(screen.getByTestId('project-1')).toHaveTextContent('Test Project');
    expect(mockSetProjects).toHaveBeenCalledWith(mockProjects);
    expect(mockFetch).toHaveBeenCalledWith('/api/projects?userId=user_123');
  });

  it('should handle fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(
      <TestComponent>
        <UseProjectsTestComponent />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    // Should fall back to initial data
    expect(screen.getByTestId('projects-count')).toHaveTextContent('0');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });

  it('should use initial data when API fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    function UseProjectsWithInitialDataTestComponent() {
      const { data } = useProjects({
        userId: 'user_123',
        initialData: mockProjects,
      });

      return (
        <div>
          <div data-testid="projects-count">{data?.length || 0}</div>
        </div>
      );
    }

    render(
      <TestComponent>
        <UseProjectsWithInitialDataTestComponent />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('projects-count')).toHaveTextContent('1');
    });
  });
});

describe('useProject', () => {
  function UseProjectTestComponent({ projectId }: { projectId: number }) {
    const { data, isLoading, error } = useProject(projectId);

    return (
      <div>
        <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
        <div data-testid="error">{error?.message || 'no error'}</div>
        <div data-testid="project-name">{data?.name || 'no project'}</div>
      </div>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch a single project successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockProject }),
    });

    render(
      <TestComponent>
        <UseProjectTestComponent projectId={1} />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('loaded');
    });

    expect(screen.getByTestId('project-name')).toHaveTextContent('Test Project');
    expect(screen.getByTestId('error')).toHaveTextContent('no error');
  });

  it('should handle project fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(
      <TestComponent>
        <UseProjectTestComponent projectId={999} />
      </TestComponent>
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to fetch project');
    });
  });
});

describe('useCreateProject', () => {
  function UseCreateProjectTestComponent() {
    const createProject = useCreateProject();

    const handleCreate = () => {
      createProject.mutate({
        prompt: 'Test prompt',
        name: 'New Project',
      });
    };

    return (
      <div>
        <button onClick={handleCreate} data-testid="create-button">
          Create Project
        </button>
        <div data-testid="loading">{createProject.isPending ? 'creating' : 'idle'}</div>
        <div data-testid="error">{createProject.error?.message || 'no error'}</div>
        <div data-testid="success">{createProject.isSuccess ? 'success' : 'not success'}</div>
      </div>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      setProjects: mockSetProjects,
      addProject: mockAddProject,
      removeProject: mockRemoveProject,
      updateProject: mockUpdateProject,
    });
  });

  it('should create a project successfully', async () => {
    const newProject = { ...mockProject, id: 2, name: 'New Project' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newProject }),
    });

    render(
      <TestComponent>
        <UseCreateProjectTestComponent />
      </TestComponent>
    );

    const createButton = screen.getByTestId('create-button');

    await act(async () => {
      createButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('success');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Test prompt',
        name: 'New Project',
      }),
    });
    expect(mockAddProject).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        name: 'New Project',
      })
    );
  });

  it('should handle creation error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    render(
      <TestComponent>
        <UseCreateProjectTestComponent />
      </TestComponent>
    );

    const createButton = screen.getByTestId('create-button');

    await act(async () => {
      createButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to create project');
    });
  });
});

describe('useDeleteProject', () => {
  function UseDeleteProjectTestComponent() {
    const deleteProject = useDeleteProject();

    const handleDelete = () => {
      deleteProject.mutate(1);
    };

    return (
      <div>
        <button onClick={handleDelete} data-testid="delete-button">
          Delete Project
        </button>
        <div data-testid="loading">{deleteProject.isPending ? 'deleting' : 'idle'}</div>
        <div data-testid="error">{deleteProject.error?.message || 'no error'}</div>
        <div data-testid="success">{deleteProject.isSuccess ? 'success' : 'not success'}</div>
      </div>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      setProjects: mockSetProjects,
      addProject: mockAddProject,
      removeProject: mockRemoveProject,
      updateProject: mockUpdateProject,
    });

    // Mock console.log and console.error for delete function
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();

    // Use fake timers for better control over async operations
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('should delete a project successfully', async () => {
    // Mock file deletion API
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      // Mock project deletion API
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    render(
      <TestComponent>
        <UseDeleteProjectTestComponent />
      </TestComponent>
    );

    const deleteButton = screen.getByTestId('delete-button');

    // Start the deletion
    await act(async () => {
      deleteButton.click();
    });

    // First check that the deletion starts
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('deleting');
    });

    // Fast forward through the minimum operation time
    await act(async () => {
      jest.advanceTimersByTime(2100); // 2.1 seconds to ensure we pass the minimum
    });

    // Wait for success
    await waitFor(
      () => {
        expect(screen.getByTestId('success')).toHaveTextContent('success');
      },
      { timeout: 1000 }
    );

    expect(mockRemoveProject).toHaveBeenCalledWith(1);
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/1/files', {
      method: 'DELETE',
    });
    expect(mockFetch).toHaveBeenCalledWith('/api/projects/1', {
      method: 'DELETE',
    });
  });

  it('should handle deletion error', async () => {
    // Mock file deletion to succeed but project deletion to fail
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(
      <TestComponent>
        <UseDeleteProjectTestComponent />
      </TestComponent>
    );

    const deleteButton = screen.getByTestId('delete-button');

    await act(async () => {
      deleteButton.click();
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('error')).toHaveTextContent('Failed to delete project');
      },
      { timeout: 5000 }
    );

    expect(mockRemoveProject).not.toHaveBeenCalled();
  });
});

describe('useUpdateProject', () => {
  function UseUpdateProjectTestComponent() {
    const updateProject = useUpdateProject();

    const handleUpdate = () => {
      updateProject.mutate({
        projectId: 1,
        updates: { name: 'Updated Project' },
      });
    };

    return (
      <div>
        <button onClick={handleUpdate} data-testid="update-button">
          Update Project
        </button>
        <div data-testid="loading">{updateProject.isPending ? 'updating' : 'idle'}</div>
        <div data-testid="error">{updateProject.error?.message || 'no error'}</div>
        <div data-testid="success">{updateProject.isSuccess ? 'success' : 'not success'}</div>
      </div>
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectStore as unknown as jest.Mock).mockReturnValue({
      setProjects: mockSetProjects,
      addProject: mockAddProject,
      removeProject: mockRemoveProject,
      updateProject: mockUpdateProject,
    });
  });

  it('should update a project successfully', async () => {
    const updatedProject = { ...mockProject, name: 'Updated Project' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedProject,
    });

    render(
      <TestComponent>
        <UseUpdateProjectTestComponent />
      </TestComponent>
    );

    const updateButton = screen.getByTestId('update-button');

    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('success')).toHaveTextContent('success');
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/projects/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Project' }),
    });
    expect(mockUpdateProject).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        name: 'Updated Project',
      })
    );
  });

  it('should handle update error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    render(
      <TestComponent>
        <UseUpdateProjectTestComponent />
      </TestComponent>
    );

    const updateButton = screen.getByTestId('update-button');

    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Failed to update project');
    });
  });
});
