// API Handler Classes
export { ApiErrorHandler } from './errors';
export { ApiResponseHandler } from './responses';

// Common interfaces for async operations
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Generic API response envelope used by Next API routes
export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  error?: string;
}
