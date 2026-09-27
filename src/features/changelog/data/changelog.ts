import type { ChangelogRelease } from '../types';

// User-facing changelog, newest first. Update it in the same PR as the
// package.json version bump (see constitution « Releases et changelog »).
// Texts: French, plain language, inclusive writing.
export const changelog = [
  {
    version: '0.3.0',
    date: '2026-09-30',
    changes: [
      {
        category: 'feature',
        text: "Programmez des dépenses récurrentes : elles s'ajoutent toutes seules au jour prévu",
      },
      {
        category: 'improvement',
        text: 'Des messages de confirmation plus sobres, qui ne se confondent plus avec vos soldes',
      },
    ],
  },
  {
    version: '0.2.0',
    date: '2026-09-27',
    changes: [
      { category: 'feature', text: "Désignez un compte commun comme payeur d'une dépense" },
      {
        category: 'feature',
        text: 'Retrouvez les nouveautés de chaque version depuis votre profil',
      },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-02-09',
    changes: [
      { category: 'feature', text: 'Première version de FairCount' },
      { category: 'feature', text: 'Connexion par lien magique, sans mot de passe' },
      { category: 'feature', text: 'Groupes, invitations par email ou par lien' },
      {
        category: 'feature',
        text: 'Répartition des dépenses selon les revenus de chaque personne membre',
      },
      { category: 'feature', text: 'Soldes recalculés automatiquement et remboursements' },
    ],
  },
] as const satisfies readonly ChangelogRelease[];
