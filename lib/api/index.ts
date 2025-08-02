// API Infrastructure Types
export * from './responses';
export * from './errors';

// Async Operation Configuration Types
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

// Form Handling Types
export interface FormSubmissionOptions extends AsyncOperationOptions {
  resetForm?: boolean;
  redirectTo?: string;
}

// File Upload Types
export interface FileUploadOptions extends AsyncOperationOptions {
  allowedTypes?: string[];
  maxSize?: number;
  multiple?: boolean;
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Pagination Types
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, unknown>;
}

// Loading State Types
export interface LoadingState {
  isLoading: boolean;
  isError: boolean;
  error: string | null;
}

export interface SubmissionState extends LoadingState {
  isSubmitting: boolean;
  isSuccess: boolean;
  successMessage: string | null;
}

// Query Configuration Types
export interface QueryConfig {
  staleTime?: number;
  cacheTime?: number;
  retry?: number | boolean;
  retryDelay?: number;
  refetchOnWindowFocus?: boolean;
}

// Mutation Configuration Types
export interface MutationConfig extends AsyncOperationOptions {
  invalidateQueries?: string[][];
  optimisticUpdate?: boolean;
}