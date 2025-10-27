/**
 * Git Operations Tests
 */

import { GitOperations } from '@/lib/github/git-operations';

// Mock getGitHubToken
jest.mock('@/lib/github/auth', () => ({
  getGitHubToken: jest.fn().mockResolvedValue('mock-github-token'),
}));

// Mock simple-git
const mockPush = jest.fn().mockResolvedValue(undefined);
const mockCommit = jest.fn().mockResolvedValue({ commit: 'abc123' });
const mockAdd = jest.fn().mockResolvedValue(undefined);
const mockCheckout = jest.fn().mockResolvedValue(undefined);
const mockCheckoutLocalBranch = jest.fn().mockResolvedValue(undefined);
const mockBranchLocal = jest.fn().mockResolvedValue({ all: [] });
const mockStatus = jest.fn().mockResolvedValue({
  modified: ['file1.ts'],
  created: ['file2.ts'],
  deleted: [],
  renamed: [],
  not_added: [],
});
const mockRemote = jest.fn().mockResolvedValue(undefined);
const mockGetRemotes = jest.fn().mockResolvedValue([
  {
    name: 'origin',
    refs: {
      fetch: 'https://github.com/test/repo.git',
      push: 'https://github.com/test/repo.git',
    },
  },
]);

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    push: mockPush,
    commit: mockCommit,
    add: mockAdd,
    checkout: mockCheckout,
    checkoutLocalBranch: mockCheckoutLocalBranch,
    branchLocal: mockBranchLocal,
    status: mockStatus,
    remote: mockRemote,
    getRemotes: mockGetRemotes,
  })),
}));

describe('GitOperations', () => {
  let gitOps: GitOperations;

  beforeEach(() => {
    gitOps = new GitOperations('user-123');
    jest.clearAllMocks();
  });

  describe('commitSessionChanges', () => {
    it('should return null when no changes detected', async () => {
      mockStatus.mockResolvedValueOnce({
        modified: [],
        created: [],
        deleted: [],
        renamed: [],
        not_added: [],
      });

      const result = await gitOps.commitSessionChanges({
        sessionPath: '/path/to/session',
        sessionId: 'test-session',
        githubToken: 'test-token',
        userId: 'user-123',
      });

      expect(result).toBeNull();
      expect(mockCommit).not.toHaveBeenCalled();
    });

    it('should commit and push changes when files are modified', async () => {
      const result = await gitOps.commitSessionChanges({
        sessionPath: '/path/to/session',
        sessionId: 'test-session',
        githubToken: 'test-token',
        userId: 'user-123',
      });

      expect(result).not.toBeNull();
      expect(result?.sha).toBe('abc123');
      expect(mockAdd).toHaveBeenCalled();
      expect(mockCommit).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalled();
    });

    it('should create branch if it does not exist', async () => {
      mockBranchLocal.mockResolvedValueOnce({ all: [] });

      await gitOps.commitSessionChanges({
        sessionPath: '/path/to/session',
        sessionId: 'test-session',
        githubToken: 'test-token',
        userId: 'user-123',
      });

      expect(mockCheckoutLocalBranch).toHaveBeenCalled();
    });

    it('should handle custom commit message', async () => {
      await gitOps.commitSessionChanges({
        sessionPath: '/path/to/session',
        sessionId: 'test-session',
        message: 'Custom commit message',
        githubToken: 'test-token',
        userId: 'user-123',
      });

      expect(mockCommit).toHaveBeenCalledWith('Custom commit message');
    });
  });
});
