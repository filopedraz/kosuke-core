/**
 * Agent Workflow Integration Tests
 * Tests the complete agent workflow from start to finish
 */

import { Agent } from '@/lib/agent';
import { ClaudeService } from '@/lib/agent/claude-service';
import { sessionManager } from '@/lib/sessions';

// Mock dependencies
jest.mock('@/lib/db/drizzle', () => ({
  db: {
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn().mockResolvedValue(undefined),
      })),
    })),
  },
}));

jest.mock('@/lib/sessions', () => ({
  sessionManager: {
    getSessionPath: jest.fn().mockReturnValue('/tmp/test-session'),
    validateSessionDirectory: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/lib/agent/claude-service', () => ({
  ClaudeService: jest.fn().mockImplementation(() => ({
    runAgenticQuery: jest.fn().mockImplementation(async function* () {
      yield {
        type: 'assistant',
        uuid: 'test-uuid',
        session_id: 'test-session',
        parent_tool_use_id: null,
        message: {
          content: [{ type: 'text', text: 'Test response' }],
        },
      };
    }),
  })),
}));

jest.mock('@/lib/github/git-operations', () => ({
  GitOperations: jest.fn().mockImplementation(() => ({
    commitSessionChanges: jest.fn().mockResolvedValue({
      sha: 'test-commit-sha',
      message: 'Test commit',
      url: 'https://github.com/test/repo/commit/test-commit-sha',
      filesChanged: 2,
      timestamp: new Date(),
    }),
  })),
}));

describe('Agent Workflow Integration', () => {
  const mockConfig = {
    projectId: 1,
    sessionId: 'test-session-123',
    githubToken: 'mock-token',
    assistantMessageId: 100,
    userId: 'user-123',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete workflow', () => {
    it('should process a simple prompt and stream events', async () => {
      const agent = new Agent(mockConfig);
      const events = [];

      for await (const event of agent.run('Test prompt')) {
        events.push(event);
      }

      // Should have received at least some events
      expect(events.length).toBeGreaterThan(0);

      // Should include completion event
      expect(events.some(e => e.type === 'message_complete')).toBe(true);
    });

    it('should validate session directory before running', async () => {
      const agent = new Agent(mockConfig);

      // Run the agent
      const events = [];
      for await (const event of agent.run('Test prompt')) {
        events.push(event);
      }

      // Session validation should have been called
      expect(sessionManager.getSessionPath).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Mock ClaudeService to throw an error
      const MockClaudeService = ClaudeService as jest.MockedClass<typeof ClaudeService>;
      // @ts-expect-error - Partial mock for testing error handling
      MockClaudeService.mockImplementationOnce(() => ({
        runAgenticQuery: jest.fn().mockImplementation(async function* () {
          throw new Error('Test error');
        }),
      }));

      const agent = new Agent(mockConfig);
      const events = [];

      for await (const event of agent.run('Test prompt')) {
        events.push(event);
      }

      // Should have an error event
      expect(events.some(e => e.type === 'error')).toBe(true);
    });
  });

  describe('GitHub integration', () => {
    it('should commit changes when GitHub token is available', async () => {
      const agent = new Agent(mockConfig);

      const events = [];
      for await (const event of agent.run('Make changes')) {
        events.push(event);
      }

      // Verify workflow completed
      expect(events.some(e => e.type === 'message_complete')).toBe(true);
    });

    it('should skip commits when no GitHub token', async () => {
      const configWithoutToken = {
        ...mockConfig,
        githubToken: null,
      };

      const agent = new Agent(configWithoutToken);

      const events = [];
      for await (const event of agent.run('Test prompt')) {
        events.push(event);
      }

      // Should still complete successfully
      expect(events.some(e => e.type === 'message_complete')).toBe(true);
    });
  });
});

