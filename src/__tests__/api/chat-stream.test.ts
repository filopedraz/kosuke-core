/**
 * Chat Stream API Tests
 * Tests for the POST /api/projects/[id]/chat-sessions/[sessionId] endpoint
 * @jest-environment node
 */

import { POST } from '@/app/api/projects/[id]/chat-sessions/[sessionId]/route';
import { Agent } from '@/lib/agent';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db/drizzle';
import { getUserGitHubToken } from '@/lib/github/client';
import { sessionManager } from '@/lib/sessions';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ userId: 'test-user-123' }),
}));

jest.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      projects: {
        findFirst: jest.fn().mockResolvedValue({
          id: '1',
          name: 'Test Project',
          createdBy: 'test-user-123',
          orgId: 'test-org-123',
        }),
      },
    },
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn().mockResolvedValue([
          {
            id: '1',
            name: 'Test Project',
            createdBy: 'test-user-123',
            orgId: 'test-org-123',
          },
        ]),
      })),
    })),
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn().mockResolvedValue([
          {
            id: '1',
            content: 'Test message',
            role: 'user',
          },
        ]),
      })),
    })),
  },
}));

jest.mock('@/lib/db/schema', () => ({
  projects: {},
  chatSessions: {},
  chatMessages: {},
}));

jest.mock('@/lib/github/client', () => ({
  getUserGitHubToken: jest.fn().mockResolvedValue('mock-github-token'),
  getKosukeGitHubToken: jest.fn().mockResolvedValue('mock-github-app-token'),
  createUserOctokit: jest.fn(),
  createKosukeOctokit: jest.fn(),
  getUserGitHubInfo: jest.fn(),
}));

jest.mock('@/lib/agent', () => {
  const mockAgentInstance = {
    run: jest.fn().mockImplementation(async function* () {
      yield { type: 'content_block_start' };
      yield { type: 'content_block_delta', delta_type: 'text_delta', text: 'Hello', index: 0 };
      yield { type: 'content_block_stop' };
      yield { type: 'message_complete' };
    }),
  };

  return {
    Agent: {
      create: jest.fn().mockResolvedValue(mockAgentInstance),
    },
  };
});

jest.mock('@/lib/sessions', () => ({
  sessionManager: {
    validateSessionDirectory: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/lib/clerk', () => ({
  clerkService: {
    getUserMemberships: jest.fn().mockResolvedValue({
      data: [
        {
          organization: { id: 'test-org-123' },
          role: 'org:admin',
        },
      ],
    }),
  },
}));

describe('Chat Stream API', () => {
  const mockParams = Promise.resolve({ id: '1', sessionId: 'test-session-123' });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/projects/[id]/chat-sessions/[sessionId]', () => {
    it('should return 401 if user is not authenticated', async () => {
      const mockAuth = auth as jest.MockedFunction<typeof auth>;
      mockAuth.mockResolvedValueOnce({ userId: null } as Awaited<ReturnType<typeof auth>>);

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: mockParams });
      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent project ID', async () => {
      const invalidParams = Promise.resolve({ id: 'non-existent-uuid', sessionId: 'test-session' });

      // Mock the database to return no project for this test only
      const mockFindFirst = db.query.projects.findFirst as jest.Mock;
      mockFindFirst.mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/projects/non-existent-uuid/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: invalidParams });
      expect(response.status).toBe(404);
    });

    it('should stream response for valid request', async () => {
      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const response = await POST(request, { params: mockParams });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('Cache-Control')).toContain('no-cache');
    });

    it('should return 404 if session environment not found', async () => {
      const mockSessionManager = sessionManager as jest.Mocked<typeof sessionManager>;
      mockSessionManager.validateSessionDirectory.mockResolvedValueOnce(false);

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: mockParams });
      expect(response.status).toBe(404);
    });

    it('should handle streaming errors gracefully', async () => {
      (Agent.create as jest.Mock).mockResolvedValueOnce({
        run: jest.fn().mockImplementation(async function* () {
          yield { type: 'content_block_start' };
          throw new Error('Test streaming error');
        }),
      });

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: mockParams });

      // Should still return a streaming response
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });

    it('should save user message before streaming', async () => {
      const insertSpy = jest.spyOn(db, 'insert');

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      await POST(request, { params: mockParams });

      // Should have inserted both user message and assistant placeholder
      expect(insertSpy).toHaveBeenCalledTimes(2);
    });

    it('should work with GitHub token when available', async () => {
      const mockGetGitHubToken = getUserGitHubToken as jest.MockedFunction<
        typeof getUserGitHubToken
      >;
      mockGetGitHubToken.mockResolvedValueOnce('mock-token');

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: mockParams });
      expect(response.status).toBe(200);
    });

    it('should work without GitHub token', async () => {
      const mockGetGitHubToken = getUserGitHubToken as jest.MockedFunction<
        typeof getUserGitHubToken
      >;
      mockGetGitHubToken.mockResolvedValueOnce(null);

      const request = new NextRequest(
        'http://localhost/api/projects/1/chat-sessions/test-session',
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Test message' }),
        }
      );

      const response = await POST(request, { params: mockParams });
      expect(response.status).toBe(200);
    });
  });
});
