import { NavLink } from 'react-router-dom';
import { UnreadDot, useChangelogUnread } from '@/features/changelog';

interface NavItem {
  readonly path: string;
  readonly label: string;
  readonly icon: React.ReactNode;
}

const GroupIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
    aria-hidden="true"
  >
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const ProfileIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
    aria-hidden="true"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const navItems: readonly NavItem[] = [
  { path: '/groups', label: 'Groupes', icon: <GroupIcon /> },
  { path: '/profile', label: 'Profil', icon: <ProfileIcon /> },
] as const;

export const BottomNav = () => {
  const changelogUnread = useChangelogUnread();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const unread = item.path === '/profile' && changelogUnread;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={unread ? `${item.label}, nouveautés non lues` : item.label}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-4 py-2 text-sm rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`
              }
            >
              <span className="relative">
                {item.icon}
                {unread && <UnreadDot className="absolute -top-0.5 -right-0.5" />}
              </span>
              <span className="text-xs">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
