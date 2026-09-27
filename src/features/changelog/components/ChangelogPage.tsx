import { useEffect, useId } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/shared/components';
import { changelog } from '../data/changelog';
import { useChangelogState } from '../hooks/useChangelogState';
import { APP_VERSION } from '../lib/app-version';
import { CATEGORY_ORDER, CATEGORY_SECTION_TITLES, formatReleaseDate } from '../lib/format';
import { withOccurrenceKeys } from '../lib/keyed';
import type { ChangelogRelease } from '../types';

const ChevronLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

interface ReleaseCardProps {
  readonly release: ChangelogRelease;
  readonly isCurrent: boolean;
}

const ReleaseCard = ({ release, isCurrent }: ReleaseCardProps) => {
  const titleId = useId();

  return (
    <article
      aria-labelledby={titleId}
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4"
    >
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id={titleId} className="font-semibold text-slate-900 dark:text-white tabular-nums">
          Version {release.version}
        </h2>
        <span className="text-sm text-slate-500 dark:text-slate-400">
          {formatReleaseDate(release.date)}
        </span>
        {isCurrent && (
          <Badge variant="info" appearance="soft" size="sm" className="ml-auto">
            Version actuelle
          </Badge>
        )}
      </header>

      <div className="mt-4 space-y-4">
        {CATEGORY_ORDER.map((category) => {
          const texts = release.changes
            .filter((change) => change.category === category)
            .map((change) => change.text);
          if (texts.length === 0) return null;

          return (
            <section key={category} className="space-y-2">
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {CATEGORY_SECTION_TITLES[category]}
              </h3>
              <ul className="space-y-2">
                {withOccurrenceKeys(texts).map(({ key, text }) => (
                  <li key={key} className="text-sm text-slate-900 dark:text-slate-100 text-pretty">
                    {text}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </article>
  );
};

interface ChangelogHistoryProps {
  readonly releases: readonly ChangelogRelease[];
  readonly currentVersion: string;
}

export const ChangelogHistory = ({ releases, currentVersion }: ChangelogHistoryProps) => (
  <div className="space-y-4">
    {releases
      .filter((release) => release.changes.length > 0)
      .map((release) => (
        <ReleaseCard
          key={release.version}
          release={release}
          isCurrent={release.version === currentVersion}
        />
      ))}
  </div>
);

export const ChangelogPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { markConsulted } = useChangelogState();

  useEffect(() => {
    markConsulted();
  }, [markConsulted]);

  // `default` is the key of the first location of the session: nothing in-app to go back to
  const handleBack = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/profile');
  };

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={handleBack}
          className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <ChevronLeftIcon />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Nouveautés</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Vous utilisez la version {APP_VERSION}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
          Build {__GIT_SHA__.slice(0, 7)}
        </p>
      </div>

      <ChangelogHistory releases={changelog} currentVersion={APP_VERSION} />
    </div>
  );
};
