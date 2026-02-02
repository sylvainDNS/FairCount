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
