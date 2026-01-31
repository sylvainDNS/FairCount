import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth';
import { Loading } from '@/shared/components/Loading';
import { ConceptSection } from './ConceptSection';
import { FeaturesSection } from './FeaturesSection';
import { HeroSection } from './HeroSection';

export const LandingPage = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect authenticated users to groups
  if (isLoading) {
    return <Loading fullPage message="Chargement..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/groups" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <HeroSection />
      <ConceptSection />
      <FeaturesSection />

      {/* Footer */}
      <footer className="py-8 px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>FairCount — Partage équitable des dépenses</p>
      </footer>
    </div>
  );
};
