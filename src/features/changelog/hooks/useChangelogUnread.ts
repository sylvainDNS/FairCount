import { useChangelogState } from './useChangelogState';

export const useChangelogUnread = (): boolean => useChangelogState().unread;
