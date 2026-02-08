import { Link } from 'react-router-dom';
import { GroupList } from './GroupList';
import { PendingInvitationsBanner } from './PendingInvitationsBanner';

export const GroupsPage = () => {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <PendingInvitationsBanner />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mes groupes</h1>
        <Link
          to="/groups/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          Nouveau groupe
        </Link>
      </div>
      <GroupList />
    </div>
  );
};
