import { Link, useParams } from 'react-router-dom';
import { GroupSettings } from './GroupSettings';

export const GroupSettingsPage = () => {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          to={`/groups/${id}`}
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          &larr; Retour au groupe
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
          Paramètres du groupe
        </h1>
      </div>
      <GroupSettings groupId={id} />
    </div>
  );
};
