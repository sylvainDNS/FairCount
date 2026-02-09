import { Field } from '@ark-ui/react/field';
import { forwardRef } from 'react';
import type { FieldError } from 'react-hook-form';
import { TextInput, type TextInputProps } from './TextInput';

interface FormFieldProps extends TextInputProps {
  readonly label: string;
  readonly error?: FieldError | undefined;
  readonly required?: boolean | undefined;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, required, id, disabled, ...rest }, ref) => {
    return (
      <Field.Root
        {...(id ? { id } : {})}
        {...(required ? { required } : {})}
        invalid={!!error}
        {...(disabled ? { disabled } : {})}
      >
        <Field.Label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
          <Field.RequiredIndicator className="text-slate-500 dark:text-slate-400 ml-0.5" />
        </Field.Label>
        <Field.Input asChild>
          <TextInput ref={ref} variant={error ? 'error' : 'default'} {...rest} />
        </Field.Input>
        <Field.ErrorText className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error?.message}
        </Field.ErrorText>
      </Field.Root>
    );
  },
);

FormField.displayName = 'FormField';
