import '@testing-library/jest-dom';
import { TextEncoder } from 'util';

// Setup global TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder as unknown as typeof global.TextEncoder;

// Mock fetch globally
global.fetch = jest.fn();

// Mock tiktoken (ES module that Jest can't handle)
jest.mock('tiktoken', () => ({
  encoding_for_model: jest.fn(() => ({
    encode: jest.fn((text: string) => {
      // Simple mock: 1 token per 4 characters
      return new Array(Math.ceil(text.length / 4));
    }),
    free: jest.fn(),
  })),
}));

// Suppress console.error and console.warn during tests unless explicitly needed
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: Parameters<typeof console.error>) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('Error:'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: Parameters<typeof console.warn>) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
