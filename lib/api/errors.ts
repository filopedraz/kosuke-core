import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

/**
 * Type for error details - similar to MetadataValue but specific to errors
 */
export type ErrorDetail =
  | string
  | number
  | boolean
  | null
  | undefined
  | ErrorDetailObject
  | ErrorDetail[];

export interface ErrorDetailObject {
  [key: string]: ErrorDetail;
}

/**
 * Standard error response structure
 */
export interface ApiError {
  error: string;
  details?: ErrorDetailObject;
  code?: string;
}

/**
 * Type for handleable errors
 */
export type HandleableError = Error | ZodError | { message: string } | unknown;

/**
 * Error handler for API routes
 */
export class ApiErrorHandler {
  /**
   * Handle unauthorized errors (401)
   */
  static unauthorized(message = 'Unauthorized'): NextResponse<ApiError> {
    return NextResponse.json({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  /**
   * Handle forbidden errors (403)
   */
  static forbidden(message = 'Forbidden'): NextResponse<ApiError> {
    return NextResponse.json({ error: message, code: 'FORBIDDEN' }, { status: 403 });
  }

  /**
   * Handle not found errors (404)
   */
  static notFound(message = 'Not found'): NextResponse<ApiError> {
    return NextResponse.json({ error: message, code: 'NOT_FOUND' }, { status: 404 });
  }

  /**
   * Handle bad request errors (400)
   */
  static badRequest(message = 'Bad request', details?: ErrorDetailObject): NextResponse<ApiError> {
    return NextResponse.json({ error: message, details, code: 'BAD_REQUEST' }, { status: 400 });
  }

  /**
   * Handle validation errors (400)
   */
  static validationError(error: ZodError): NextResponse<ApiError> {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: error.format(),
        code: 'VALIDATION_ERROR',
      },
      { status: 400 }
    );
  }

  /**
   * Handle internal server errors (500)
   */
  static serverError(error: HandleableError): NextResponse<ApiError> {
    console.error('Server error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'SERVER_ERROR',
        details: process.env.NODE_ENV === 'development' ? { message: errorMessage } : undefined,
      },
      { status: 500 }
    );
  }

  /**
   * Handle any error with appropriate status code
   */
  static handle(error: HandleableError): NextResponse<ApiError> {
    if (error instanceof ZodError) {
      return this.validationError(error);
    }

    return this.serverError(error);
  }
}
