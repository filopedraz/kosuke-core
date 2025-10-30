// API Error Types
type ErrorDetail = string | number | boolean | null | undefined | ErrorDetailObject | ErrorDetail[];

export interface ErrorDetailObject {
  [key: string]: ErrorDetail;
}

// API Response Types
type MetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | MetadataObject
  | MetadataValue[];
export interface MetadataObject {
  [key: string]: MetadataValue;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: MetadataObject;
}

export interface ApiError {
  error: string;
  details?: ErrorDetailObject;
  code?: string;
}

export type HandleableError = Error | { message: string } | unknown;
