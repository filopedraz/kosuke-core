/**
 * Session Manager Tests
 */

import { SessionManager } from '@/lib/sessions/session-manager';
import { existsSync } from 'fs';

// Mock fs and simple-git
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

jest.mock('simple-git', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    status: jest.fn().mockResolvedValue({ current: 'main' }),
  })),
}));

describe('SessionManager', () => {
  let manager: SessionManager;
  const mockExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

  beforeEach(() => {
    manager = new SessionManager();
    jest.clearAllMocks();
  });

  describe('getSessionPath', () => {
    it('should generate correct session path', () => {
      const path = manager.getSessionPath(1, 'test-session-123');
      expect(path).toContain('projects');
      expect(path).toContain('1');
      expect(path).toContain('sessions');
      expect(path).toContain('test-session-123');
    });
  });

  describe('validateSessionDirectory', () => {
    it('should return false if directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false);

      const isValid = await manager.validateSessionDirectory(1, 'test-session');
      expect(isValid).toBe(false);
    });

    it('should return true if directory exists and is valid git repo', async () => {
      mockExistsSync.mockReturnValue(true);

      const isValid = await manager.validateSessionDirectory(1, 'test-session');
      expect(isValid).toBe(true);
    });
  });
});
