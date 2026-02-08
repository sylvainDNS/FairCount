import { Portal } from '@ark-ui/react/portal';
import { Select as ArkSelect, createListCollection } from '@ark-ui/react/select';
import { cva, type VariantProps } from 'class-variance-authority';
import { useMemo } from 'react';
import { twMerge } from 'tailwind-merge';

const selectTriggerVariants = cva(
  'flex items-center justify-between w-full px-3 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-slate-400 dark:hover:border-slate-500 focus:ring-blue-500',
        error:
          'border-red-500 dark:border-red-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-red-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface SelectItem {
  readonly value: string;
  readonly label: string;
}

interface SelectProps extends VariantProps<typeof selectTriggerVariants> {
  readonly items: readonly SelectItem[];
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly 'aria-label'?: string | undefined;
  readonly 'aria-invalid'?: boolean | undefined;
  readonly 'aria-describedby'?: string | undefined;
}

export const Select = ({
  items,
  value,
  onValueChange,
  placeholder = 'Sélectionner...',
  disabled,
  variant,
  className,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedby,
}: SelectProps) => {
  const collection = useMemo(() => createListCollection({ items: items as SelectItem[] }), [items]);

  return (
    <ArkSelect.Root
      collection={collection}
      value={value !== undefined ? [value] : []}
      onValueChange={(details) => onValueChange?.(details.value[0] ?? '')}
      disabled={disabled}
    >
      <ArkSelect.Control>
        <ArkSelect.Trigger
          className={twMerge(selectTriggerVariants({ variant }), className)}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedby}
        >
          <ArkSelect.ValueText placeholder={placeholder} />
          <ArkSelect.Indicator>
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </ArkSelect.Indicator>
        </ArkSelect.Trigger>
      </ArkSelect.Control>

      <Portal>
        <ArkSelect.Positioner>
          <ArkSelect.Content className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-[60] min-w-[var(--reference-width)] max-h-60 overflow-y-auto">
            {items.map((item) => (
              <ArkSelect.Item
                key={item.value}
                item={item}
                className="flex items-center justify-between px-3 py-2 cursor-pointer text-sm text-slate-900 dark:text-white data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700"
              >
                <ArkSelect.ItemText>{item.label}</ArkSelect.ItemText>
                <ArkSelect.ItemIndicator>
                  <svg
                    className="w-4 h-4 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </ArkSelect.ItemIndicator>
              </ArkSelect.Item>
            ))}
          </ArkSelect.Content>
        </ArkSelect.Positioner>
      </Portal>

      <ArkSelect.HiddenSelect />
    </ArkSelect.Root>
  );
};
