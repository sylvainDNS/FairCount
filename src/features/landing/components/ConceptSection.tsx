export const ConceptSection = () => {
  return (
    <section className="py-12 px-4" aria-labelledby="concept-heading">
      <div className="max-w-2xl mx-auto">
        <h2
          id="concept-heading"
          className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-8"
        >
          L'équité, pas l'égalité
        </h2>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Les applications classiques divisent les dépenses en parts égales. Mais est-ce vraiment
            juste ?
          </p>

          {/* Example visualization */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                A
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-900 dark:text-white">Alex</span>
                  <span className="text-slate-500">3 000 €/mois</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full" style={{ width: '50%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Contribution : 50% → 60 €</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-semibold">
                S
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-900 dark:text-white">Sam</span>
                  <span className="text-slate-500">2 000 €/mois</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-emerald-600 rounded-full" style={{ width: '33%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Contribution : 33% → 40 €</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 font-semibold">
                C
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-900 dark:text-white">Charlie</span>
                  <span className="text-slate-500">1 000 €/mois</span>
                </div>
                <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-amber-600 rounded-full" style={{ width: '17%' }} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Contribution : 17% → 20 €</p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-slate-400 text-center">
            Pour une dépense de 120 €, chacun paie selon ses revenus.
          </p>
        </div>
      </div>
    </section>
  );
};
