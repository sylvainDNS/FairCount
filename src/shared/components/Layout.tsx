import type { ReactNode } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { ChangelogSummaryGate, UnreadDot, useChangelogUnread } from '@/features/changelog';
import { AppVersion } from './AppVersion';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  readonly children?: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <main className="pb-20 md:pb-0 md:pl-64">
        <div className="max-w-2xl mx-auto px-4 py-6">{children ?? <Outlet />}</div>
      </main>

      {/* Bottom nav for mobile */}
      <div className="md:hidden">
        <BottomNav />
      </div>

      {/* Sidebar for desktop */}
      <aside className="hidden md:block fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
        <DesktopSidebar />
      </aside>

      <ChangelogSummaryGate />
    </div>
  );
};

const DesktopSidebar = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const changelogUnread = useChangelogUnread();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">FairCount</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Partage équitable</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          <SidebarLink to="/groups" label="Groupes" />
          <SidebarLink to="/profile" label="Profil" unread={changelogUnread} />
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
        >
          Se déconnecter
        </button>
        <AppVersion />
      </div>
    </div>
  );
};

interface SidebarLinkProps {
  readonly to: string;
  readonly label: string;
  readonly unread?: boolean | undefined;
}

const SidebarLink = ({ to, label, unread = false }: SidebarLinkProps) => {
  return (
    <li>
      <NavLink
        to={to}
        aria-label={unread ? `${label}, nouveautés non lues` : label}
        className={({ isActive }) =>
          `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${
            isActive
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`
        }
      >
        {label}
        {unread && <UnreadDot className="ring-0" />}
      </NavLink>
    </li>
  );
};
