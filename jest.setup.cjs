// Mock Next.js response
jest.mock('next/server', () => {
  const originalModule = jest.requireActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      json: jest.fn((body, init) => {
        const response = { 
          body, 
          ...init,
          headers: new Map([['content-type', 'application/json']]),
          status: init?.status || 200,
          json: jest.fn().mockResolvedValue(body),
          text: jest.fn().mockResolvedValue(JSON.stringify(body)),
        };
        return response;
      }),
      next: jest.fn(),
    },
    // Add constructor for Request
    Request: jest.fn().mockImplementation((url, options) => {
      return {
        url,
        method: options?.method || 'GET',
        headers: new Headers(options?.headers || {}),
        json: jest.fn().mockResolvedValue(options?.body ? JSON.parse(options.body) : {}),
      };
    }),
  };
});

// Create response constructor class for tests that use new Response()
global.Response = jest.fn().mockImplementation((body, init) => {
  return {
    body,
    ...init,
    headers: new Headers(init?.headers || {}),
    status: init?.status || 200,
    statusText: init?.statusText || '',
    json: jest.fn().mockResolvedValue(typeof body === 'string' ? JSON.parse(body) : body),
    text: jest.fn().mockResolvedValue(typeof body === 'string' ? body : JSON.stringify(body)),
  };
});

// Mock auth session
jest.mock('@/lib/auth/session', () => ({
  getSession: jest.fn(),
}));

// Mock database queries
jest.mock('@/lib/db/queries', () => ({
  getUser: jest.fn(),
  getActivityLogs: jest.fn(),
  getChatMessagesWithUserDetails: jest.fn(),
  getDiffsWithChatDetails: jest.fn(),
  updateDiffStatus: jest.fn(),
  getProjectWithDetails: jest.fn(),
})); 