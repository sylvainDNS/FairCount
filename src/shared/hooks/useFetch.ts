import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Résultat d'un fetch - soit les données, soit une erreur
 */
type FetchResult<T> = T | { error: string };

/**
 * Vérifie si le résultat contient une erreur.
 * Un résultat est considéré comme une erreur s'il contient une propriété "error"
 * et que ce n'est pas un type de données valide (qui aurait aussi une clé "error").
 */
function hasError<T>(result: FetchResult<T>): result is { error: string } {
  return (
    result !== null &&
    typeof result === 'object' &&
    'error' in result &&
    typeof (result as { error: unknown }).error === 'string'
  );
}

export interface UseFetchResult<T, E extends string> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: E | null;
  readonly refetch: () => Promise<void>;
  readonly reset: () => void;
}

export interface UseFetchOptions {
  /**
   * Si true, ne lance pas le fetch automatiquement au mount
   * @default false
   */
  readonly skip?: boolean;
}

/**
 * Hook générique pour le fetching de données avec gestion des états
 * et protection contre les race conditions.
 *
 * @param fetcher - Fonction qui retourne une Promise avec les données ou une erreur
 * @param deps - Dépendances pour le refetch automatique
 * @param options - Options de configuration
 */
export function useFetch<T, E extends string = string>(
  fetcher: () => Promise<FetchResult<T>>,
  deps: readonly unknown[] = [],
  options: UseFetchOptions = {},
): UseFetchResult<T, E> {
  const { skip = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(!skip);
  const [error, setError] = useState<E | null>(null);

  // Compteur de requêtes pour éviter les race conditions
  const requestIdRef = useRef(0);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  const fetchData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcher();

      // Ignorer si une nouvelle requête a été lancée entre-temps
      if (currentRequestId !== requestIdRef.current) return;

      if (hasError(result)) {
        setError((result.error as E) || ('UNKNOWN_ERROR' as E));
        setData(null);
      } else {
        setData(result);
      }
    } catch {
      if (currentRequestId === requestIdRef.current) {
        setError('UNKNOWN_ERROR' as E);
        setData(null);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps are passed dynamically by the caller
  }, deps);

  useEffect(() => {
    if (!skip) {
      fetchData();
    }
  }, [fetchData, skip]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    reset,
  };
}
