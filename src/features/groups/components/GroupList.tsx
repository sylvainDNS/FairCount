import { Link } from 'react-router-dom';
import { useGroups } from '../hooks/useGroups';
import { GroupCard } from './GroupCard';

export const GroupList = () => {
  const { groups, isLoading, error } = useGroups();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 animate-pulse"
          >
            <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-2" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">Erreur lors du chargement des groupes</p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">Aucun groupe pour le moment</p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          Créez votre premier groupe pour commencer
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {groups.map((group) => (
        <li key={group.id}>
          <Link to={`/groups/${group.id}`}>
            <GroupCard group={group} />
          </Link>
        </li>
      ))}
    </ul>
  );
};
