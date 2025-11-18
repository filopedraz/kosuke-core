/**
 * Go-style error handling utilities
 *
 * These utilities help avoid nested try-catch statements by returning
 * a discriminated union with either data or error, making error handling
 * explicit and type-safe.
 */

// Types for the result object with discriminated union
type Success<T> = {
  data: T;
  error: null;
};

type Failure<E> = {
  data: null;
  error: E;
};

type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Wraps an async operation in a try-catch and returns a Result object
 *
 * @example
 * ```typescript
 * const { data, error } = await tryCatch(fetchUser());
 * if (error) {
 *   console.error('Failed to fetch user:', error);
 *   return;
 * }
 * console.log('User:', data);
 * ```
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}

/**
 * Synchronous version of tryCatch for non-async operations
 *
 * @example
 * ```typescript
 * const { data, error } = tryCatchSync(() => JSON.parse(str));
 * if (error) {
 *   console.error('Failed to parse JSON:', error);
 *   return;
 * }
 * console.log('Parsed:', data);
 * ```
 */
export function tryCatchSync<T, E = Error>(fn: () => T): Result<T, E> {
  try {
    const data = fn();
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as E };
  }
}
