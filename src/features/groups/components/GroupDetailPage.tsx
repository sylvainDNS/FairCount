import { Link, useParams } from 'react-router-dom';
import { TabsContent, TabsList, TabsRoot, TabsTrigger } from '@/shared/components';
import { useGroup } from '../hooks/useGroup';
import { isValidTab, useTabState } from '../hooks/useTabState';
import { BalanceTabContent } from './tabs/BalanceTabContent';
import { ExpensesTabContent } from './tabs/ExpensesTabContent';
import { MembersTabContent } from './tabs/MembersTabContent';

export const GroupDetailPage = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { group, isLoading, error } = useGroup(id);
  const { activeTab, setActiveTab } = useTabState();

  if (isLoading) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center py-12">
        <p className="text-red-600 dark:text-red-400">Groupe introuvable ou accès refusé</p>
        <Link
          to="/groups"
          className="text-blue-600 dark:text-blue-400 hover:underline mt-4 inline-block"
        >
          Retour aux groupes
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <header className="mb-4">
        <Link
          to="/groups"
          className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          &larr; Retour aux groupes
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{group.name}</h1>
            {group.description && (
              <p className="text-slate-500 dark:text-slate-400 mt-1">{group.description}</p>
            )}
          </div>
          <Link
            to={`/groups/${id}/settings`}
            className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
          >
            Paramètres
          </Link>
        </div>
      </header>

      {/* lazyMount defers rendering of inactive tabs until first selection.
         No unmountOnExit: previously visited tabs stay mounted for instant switching. */}
      <TabsRoot
        value={activeTab}
        onValueChange={(e) => {
          if (isValidTab(e.value)) setActiveTab(e.value);
        }}
        lazyMount
      >
        <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-950 -mx-4 px-4 pb-4">
          <TabsList aria-label="Sections du groupe">
            <TabsTrigger value="expenses">Dépenses</TabsTrigger>
            <TabsTrigger value="balance">Équilibre</TabsTrigger>
            <TabsTrigger value="members">Membres</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="expenses">
          <ExpensesTabContent groupId={id} currency={group.currency} />
        </TabsContent>
        <TabsContent value="balance">
          <BalanceTabContent groupId={id} currency={group.currency} />
        </TabsContent>
        <TabsContent value="members">
          <MembersTabContent groupId={id} currency={group.currency} />
        </TabsContent>
      </TabsRoot>
    </div>
  );
};
