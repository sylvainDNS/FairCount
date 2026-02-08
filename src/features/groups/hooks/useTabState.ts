import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const VALID_TABS = ['expenses', 'balance', 'members'] as const;
const DEFAULT_TAB = 'expenses';

export type GroupTab = (typeof VALID_TABS)[number];

export function isValidTab(value: string): value is GroupTab {
  return (VALID_TABS as readonly string[]).includes(value);
}

export const useTabState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab') ?? DEFAULT_TAB;
  const activeTab: GroupTab = isValidTab(raw) ? raw : DEFAULT_TAB;

  const setActiveTab = useCallback(
    (tab: GroupTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === DEFAULT_TAB) {
            next.delete('tab');
          } else {
            next.set('tab', tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return { activeTab, setActiveTab } as const;
};
