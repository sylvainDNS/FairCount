import { LinkButton } from '@/shared/components';

export const HeroSection = () => {
  return (
    <section className="text-center py-16 px-4">
      <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
        Fair<span className="text-blue-600 dark:text-blue-400">Count</span>
      </h1>
      <p className="mt-4 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        Le partage de dépenses équitable, où chacun contribue selon ses moyens.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
        <LinkButton to="/login" size="lg">
          Commencer gratuitement
        </LinkButton>
      </div>
    </section>
  );
};
