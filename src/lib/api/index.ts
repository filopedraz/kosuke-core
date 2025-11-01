// API Handler Classes
export { ApiErrorHandler } from './errors';
export { ApiResponseHandler } from './responses';

// Generic API response envelope used by Next API routes
export interface ApiResponse<T> {
  data: T;
  success?: boolean;
  error?: string;
}
