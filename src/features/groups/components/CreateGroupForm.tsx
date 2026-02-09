import { Field } from '@ark-ui/react/field';
import { Fieldset } from '@ark-ui/react/fieldset';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { type CreateGroupFormValues, createGroupSchema } from '@/lib/schemas/group.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { SegmentedControl } from '@/shared/components/SegmentedControl';
import { Select } from '@/shared/components/Select';
import { useGroups } from '../hooks/useGroups';
import {
  CURRENCIES,
  GROUP_ERROR_MESSAGES,
  INCOME_FREQUENCIES,
  INCOME_FREQUENCY_LABELS,
  isIncomeFrequency,
} from '../types';

export const CreateGroupForm = () => {
  const navigate = useNavigate();
  const { createGroup } = useGroups();

  const {
    register,
    handleSubmit,
    control,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      currency: 'EUR',
      incomeFrequency: 'annual',
    },
  });

  const incomeFrequency = watch('incomeFrequency');

  const onSubmit = async (data: CreateGroupFormValues) => {
    const result = await createGroup({
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      currency: data.currency,
      incomeFrequency: data.incomeFrequency,
    });

    if (!result.success) {
      setError('root', {
        message: GROUP_ERROR_MESSAGES[result.error] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
      return;
    }

    navigate(`/groups/${result.data.id}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField
        label="Nom du groupe"
        type="text"
        placeholder="Ex: Colocation, Vacances 2024..."
        required
        disabled={isSubmitting}
        error={errors.name}
        {...register('name')}
      />

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          placeholder="Décrivez brièvement ce groupe..."
          disabled={isSubmitting}
          rows={3}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 resize-none"
        />
        {errors.description && (
          <p role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {errors.description.message}
          </p>
        )}
      </div>

      <Field.Root
        required
        invalid={!!errors.currency}
        {...(isSubmitting ? { disabled: true } : {})}
      >
        <Field.Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Devise
          <Field.RequiredIndicator className="text-red-500 dark:text-red-400 ml-0.5" />
        </Field.Label>
        <Controller
          name="currency"
          control={control}
          render={({ field }) => (
            <Select
              items={CURRENCIES.map((c) => ({ value: c.code, label: c.label }))}
              value={field.value}
              onValueChange={field.onChange}
            />
          )}
        />
        <Field.ErrorText className="mt-1 text-sm text-red-600 dark:text-red-400">
          {errors.currency?.message}
        </Field.ErrorText>
      </Field.Root>

      <Fieldset.Root {...(isSubmitting ? { disabled: true } : {})}>
        <Fieldset.Legend className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          Saisie des revenus
          <span className="text-red-500 dark:text-red-400 ml-0.5" aria-hidden="true">
            *
          </span>
        </Fieldset.Legend>
        <Controller
          name="incomeFrequency"
          control={control}
          render={({ field }) => (
            <SegmentedControl
              items={INCOME_FREQUENCIES}
              value={field.value}
              onValueChange={(v) => {
                if (isIncomeFrequency(v)) field.onChange(v);
              }}
              aria-label="Fréquence de saisie des revenus"
            />
          )}
        />
        <Fieldset.HelperText className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
          {INCOME_FREQUENCY_LABELS[incomeFrequency].description}
        </Fieldset.HelperText>
      </Fieldset.Root>

      {errors.root && (
        <div id="form-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      <Button type="submit" fullWidth loading={isSubmitting} loadingText="Création en cours...">
        Créer le groupe
      </Button>
    </form>
  );
};
