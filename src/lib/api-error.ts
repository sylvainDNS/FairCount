interface ApiError {
  readonly error: string;
}

function isApiError(result: unknown): result is ApiError {
  return (
    result !== null &&
    typeof result === 'object' &&
    'error' in result &&
    typeof (result as ApiError).error === 'string'
  );
}

/**
 * Throws if the API result contains an error.
 * Compatible with the existing { error: string } pattern.
 */
export function throwIfError<T>(result: T | ApiError): T {
  if (isApiError(result)) {
    throw new Error(result.error);
  }
  return result;
}

/**
 * Extracts error message from a TanStack Query error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'UNKNOWN_ERROR';
}

/**
 * Validates and maps an error to a known error type.
 * Returns 'UNKNOWN_ERROR' if the error doesn't match any known type.
 *
 * @param error - The error to validate and map
 * @param validErrors - Array of valid error type values
 * @returns A valid error type value or 'UNKNOWN_ERROR'
 *
 * @example
 * const error = toTypedError(err, ['GROUP_NOT_FOUND', 'MEMBER_NOT_FOUND', 'UNKNOWN_ERROR', 'NOT_A_MEMBER'] as const);
 */
export function toTypedError<T extends string>(error: unknown, validErrors: readonly T[]): T {
  const message = getErrorMessage(error);
  return validErrors.includes(message as T) ? (message as T) : ('UNKNOWN_ERROR' as T);
}
