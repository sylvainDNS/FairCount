import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../hooks/useGroup';
import { GROUP_ERROR_MESSAGES, type GroupError } from '../types';

interface GroupSettingsProps {
  readonly groupId: string;
}

export const GroupSettings = ({ groupId }: GroupSettingsProps) => {
  const navigate = useNavigate();
  const { group, isLoading, updateGroup, archiveGroup, leaveGroup } = useGroup(groupId);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || '');
    }
  }, [group]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      setErrorMessage(GROUP_ERROR_MESSAGES.INVALID_NAME);
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const result = await updateGroup({
      name: name.trim(),
      description: description.trim() || undefined,
    });

    setSaving(false);

    if (!result.success) {
      setErrorMessage(
        GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      );
    }
  }, [name, description, updateGroup]);

  const handleArchive = useCallback(async () => {
    const result = await archiveGroup();
    if (!result.success) {
      setErrorMessage(
        GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      );
    }
  }, [archiveGroup]);

  const handleLeave = useCallback(async () => {
    const result = await leaveGroup();
    if (result.success) {
      navigate('/groups');
    } else {
      setErrorMessage(
        GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      );
    }
    setShowLeaveConfirm(false);
  }, [leaveGroup, navigate]);

  if (isLoading || !group) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded" />
        <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded" />
      </div>
    );
  }

  const hasChanges = name !== group.name || description !== (group.description || '');

  return (
    <div className="space-y-6">
      {/* Edit section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">Informations du groupe</h2>

        <div>
          <label
            htmlFor="group-name"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Nom
          </label>
          <input
            id="group-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        <div>
          <label
            htmlFor="group-description"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Description
          </label>
          <textarea
            id="group-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
          />
        </div>

        {errorMessage && <p className="text-red-600 dark:text-red-400 text-sm">{errorMessage}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white disabled:text-slate-500 font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {/* Archive section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h2 className="font-semibold text-slate-900 dark:text-white mb-2">Archivage</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {group.archivedAt
            ? 'Ce groupe est archivé. Désarchivez-le pour pouvoir ajouter des dépenses.'
            : 'Archiver ce groupe pour le masquer de la liste principale.'}
        </p>
        <button
          type="button"
          onClick={handleArchive}
          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg transition-colors"
        >
          {group.archivedAt ? 'Désarchiver' : 'Archiver'}
        </button>
      </div>

      {/* Danger zone */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900/50 p-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          Zone de danger
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Actions irréversibles</p>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-900 dark:text-white">Quitter le groupe</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Vous ne pourrez plus accéder aux dépenses
            </p>
          </div>
          {showLeaveConfirm ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className="px-3 py-1 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleLeave}
                className="px-3 py-1 text-sm text-white bg-red-600 hover:bg-red-700 rounded"
              >
                Confirmer
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowLeaveConfirm(true)}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium rounded-lg transition-colors"
            >
              Quitter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
