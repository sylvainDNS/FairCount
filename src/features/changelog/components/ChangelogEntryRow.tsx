import { Link } from 'react-router-dom';
import { CHANGELOG_ROUTE } from '../constants';
import { useChangelogUnread } from '../hooks/useChangelogUnread';
import { APP_VERSION } from '../lib/app-version';
import { UnreadDot } from './UnreadDot';

const ChevronRightIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 text-slate-400 dark:text-slate-500"
    aria-hidden="true"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const ChangelogEntryRow = () => {
  const unread = useChangelogUnread();

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
      <Link
        to={CHANGELOG_ROUTE}
        aria-label={
          unread
            ? `Nouveautés, version ${APP_VERSION}, nouveautés non lues`
            : `Nouveautés, version ${APP_VERSION}`
        }
        className="flex min-h-11 items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        <span className="flex-1 min-w-0">
          <span className="block font-medium text-slate-900 dark:text-white">Nouveautés</span>
          <span className="block text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Version {APP_VERSION}
          </span>
        </span>
        {unread && <UnreadDot className="ring-0" />}
        <ChevronRightIcon />
      </Link>
    </div>
  );
};
