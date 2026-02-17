import { AppVersion } from '@/shared/components';
import { ConceptSection } from './ConceptSection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <HeroSection />
      <ConceptSection />
      <FeaturesSection />

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>FairCount — Partage équitable des dépenses</p>
        <p className="mt-2">
          <AppVersion />
        </p>
      </footer>
    </div>
  );
};
