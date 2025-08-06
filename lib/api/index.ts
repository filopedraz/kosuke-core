// API Handler Classes
export { ApiResponseHandler } from './responses';
export { ApiErrorHandler } from './errors';

// Environment Variables
export { getProjectEnvironmentVariables } from './environment';

// Common interfaces for async operations
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}
