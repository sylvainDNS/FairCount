const REPO_URL = 'https://github.com/sylvainDNS/FairCount';

export const AppVersion = () => {
  const shortSha = __GIT_SHA__.slice(0, 7);
  const commitUrl = `${REPO_URL}/commit/${__GIT_SHA__}`;

  const buildDateFormatted = new Date(__BUILD_DATE__).toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  });

  return (
    <span className="text-xs text-slate-400 dark:text-slate-500">
      <a
        href={commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        v{shortSha}
      </a>
      {' — '}
      {buildDateFormatted}
    </span>
  );
};
