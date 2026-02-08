import { Tabs } from '@ark-ui/react/tabs';
import { cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { twMerge } from 'tailwind-merge';

type TabsRootProps = ComponentProps<typeof Tabs.Root>;

export const TabsRoot = ({ className, ...props }: TabsRootProps) => {
  return <Tabs.Root className={twMerge('w-full', className)} {...props} />;
};

const listVariants = cva('flex gap-1 p-1 rounded-lg', {
  variants: {
    variant: {
      segmented: 'bg-slate-100 dark:bg-slate-800',
    },
  },
  defaultVariants: { variant: 'segmented' },
});

type TabsListProps = ComponentProps<typeof Tabs.List>;

export const TabsList = ({ className, ...props }: TabsListProps) => {
  return <Tabs.List className={twMerge(listVariants(), className)} {...props} />;
};

const triggerVariants = cva(
  [
    'flex-1 px-3 py-1.5 rounded-md text-center',
    'text-sm font-medium transition-colors cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
  ].join(' '),
  {
    variants: {
      variant: {
        segmented: [
          'text-slate-600 dark:text-slate-400',
          'hover:text-slate-900 dark:hover:text-white',
          'data-[selected]:bg-white dark:data-[selected]:bg-slate-700',
          'data-[selected]:text-slate-900 dark:data-[selected]:text-white',
          'data-[selected]:shadow-sm',
        ].join(' '),
      },
    },
    defaultVariants: { variant: 'segmented' },
  },
);

type TabsTriggerProps = ComponentProps<typeof Tabs.Trigger>;

export const TabsTrigger = ({ className, ...props }: TabsTriggerProps) => {
  return <Tabs.Trigger className={twMerge(triggerVariants(), className)} {...props} />;
};

type TabsContentProps = ComponentProps<typeof Tabs.Content>;

export const TabsContent = ({ className, ...props }: TabsContentProps) => {
  return <Tabs.Content className={twMerge('focus-visible:outline-none', className)} {...props} />;
};
