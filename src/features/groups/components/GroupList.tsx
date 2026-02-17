import { Link } from 'react-router-dom';
import { EmptyState, EmptyStateIcons, Skeleton } from '@/shared/components';
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
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4"
          >
            <Skeleton className="h-5 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
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
      <EmptyState
        icon={<EmptyStateIcons.Users />}
        title="Aucun groupe pour le moment"
        description="Créez votre premier groupe pour commencer à partager vos dépenses équitablement."
        action={{ label: 'Créer un groupe', to: '/groups/new' }}
      />
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
