import { Link } from 'react-router-dom';
import { CreateGroupForm } from './CreateGroupForm';

export const CreateGroupPage = () => {
  return (
    <div className="p-4 max-w-md mx-auto">
      <div className="mb-6">
        <Link
          to="/groups"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          &larr; Retour aux groupes
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">Créer un groupe</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Créez un nouveau groupe pour partager des dépenses
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <CreateGroupForm />
      </div>
    </div>
  );
};
