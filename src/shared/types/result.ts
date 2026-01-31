/**
 * Type générique pour les résultats d'opérations.
 * Utilise une union discriminée pour un typage strict :
 * - Si success=true, data est disponible (sauf pour T=void)
 * - Si success=false, error contient le code d'erreur
 *
 * @example
 * // Opération avec données
 * type GetUserResult = Result<User, 'NOT_FOUND' | 'UNAUTHORIZED'>;
 *
 * // Opération sans données (T=void par défaut)
 * type DeleteResult = Result<void, 'NOT_FOUND'>;
 */
export type Result<T = void, E extends string = string> = T extends void
  ? { readonly success: true } | { readonly success: false; readonly error: E }
  : { readonly success: true; readonly data: T } | { readonly success: false; readonly error: E };
