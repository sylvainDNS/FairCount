import { Drawer } from '@ark-ui/react/drawer';
import { Portal } from '@ark-ui/react/portal';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components';
import { CHANGELOG_ROUTE } from '../constants';
import {
  CATEGORY_SECTION_TITLES,
  formatFixCount,
  formatReleaseDate,
  formatVersionRange,
} from '../lib/format';
import { withOccurrenceKeys } from '../lib/keyed';
import type { ChangelogDigest } from '../types';

interface WhatsNewSheetProps {
  readonly digest: ChangelogDigest;
  readonly open: boolean;
  readonly onClose: () => void;
}

interface SectionProps {
  readonly title: string;
  readonly items: readonly string[];
}

const Section = ({ title, items }: SectionProps) => {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</h3>
      <ul className="space-y-2">
        {withOccurrenceKeys(items).map(({ key, text }) => (
          <li key={key} className="text-sm text-slate-900 dark:text-slate-100 text-pretty">
            {text}
          </li>
        ))}
      </ul>
    </section>
  );
};

export const WhatsNewSheet = ({ digest, open, onClose }: WhatsNewSheetProps) => {
  const navigate = useNavigate();
  const fixLine = formatFixCount(digest.fixCount);

  const handleOpenHistory = () => {
    onClose();
    navigate(CHANGELOG_ROUTE);
  };

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => {
        // Only user-initiated closes: a parent-driven `open={false}` also emits this event
        if (!details.open && open) onClose();
      }}
      swipeDirection="down"
      unmountOnExit
    >
      <Portal>
        <Drawer.Backdrop
          className={[
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-[sheet-fade-in_240ms_ease-out]',
            'data-[state=closed]:animate-[sheet-fade-out_180ms_ease-in]',
          ].join(' ')}
        />
        <Drawer.Positioner className="fixed inset-x-0 bottom-0 z-50 flex justify-center">
          <Drawer.Content
            className={[
              'flex w-full max-h-[80dvh] flex-col sm:max-w-md',
              'rounded-t-xl bg-white shadow-xl dark:bg-slate-900',
              'dark:border-t dark:border-x dark:border-slate-800',
              'focus:outline-none transition-transform duration-300 ease-out',
              'data-[state=open]:animate-[sheet-slide-in_240ms_cubic-bezier(0.22,1,0.36,1)]',
              'data-[state=closed]:animate-[sheet-slide-out_180ms_cubic-bezier(0.4,0,1,1)]',
              'motion-reduce:data-[state=open]:animate-[sheet-fade-in_200ms_ease-out]',
              'motion-reduce:data-[state=closed]:animate-[sheet-fade-out_150ms_ease-in]',
            ].join(' ')}
          >
            <Drawer.Grabber className="flex shrink-0 cursor-grab justify-center pt-3 pb-2">
              <Drawer.GrabberIndicator className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </Drawer.Grabber>

            <div className="overflow-y-auto overscroll-contain px-6 pt-2">
              <header className="mb-6">
                <Drawer.Title className="text-lg font-semibold text-slate-900 dark:text-white text-balance">
                  Quoi de neuf
                </Drawer.Title>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatVersionRange(digest.fromVersion, digest.toVersion)} ·{' '}
                  {formatReleaseDate(digest.date)}
                </p>
              </header>

              <div className="space-y-6">
                <Section title={CATEGORY_SECTION_TITLES.feature} items={digest.features} />
                <Section title={CATEGORY_SECTION_TITLES.improvement} items={digest.improvements} />
                {fixLine && <p className="text-sm text-slate-500 dark:text-slate-400">{fixLine}</p>}
              </div>
            </div>

            <footer className="shrink-0 space-y-2 px-6 pt-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <Drawer.CloseTrigger asChild>
                <Button type="button" fullWidth>
                  C'est noté
                </Button>
              </Drawer.CloseTrigger>
              <Button type="button" variant="ghost" fullWidth onClick={handleOpenHistory}>
                Tout l'historique
              </Button>
            </footer>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};
