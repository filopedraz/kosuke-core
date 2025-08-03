// API Handler Classes
export { ApiResponseHandler } from './responses';
export { ApiErrorHandler } from './errors';

// Common interfaces for async operations
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
