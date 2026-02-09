import { forwardRef, useId } from 'react';
import type { FieldError } from 'react-hook-form';
import { TextInput, type TextInputProps } from './TextInput';

interface FormFieldProps extends TextInputProps {
  readonly label: string;
  readonly error?: FieldError | undefined;
  readonly required?: boolean | undefined;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, required, id, ...props }, ref) => {
    const reactId = useId();
    const fieldId = id ?? reactId;
    const errorId = `${fieldId}-error`;

    return (
      <div>
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          {label}
          {required && ' *'}
        </label>
        <TextInput
          ref={ref}
          id={fieldId}
          variant={error ? 'error' : 'default'}
          aria-invalid={!!error}
          {...(required ? { 'aria-required': true } : {})}
          {...(error ? { 'aria-describedby': errorId } : {})}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error.message}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = 'FormField';
