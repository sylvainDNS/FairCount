import type { FieldArrayWithId, UseFormRegister } from 'react-hook-form';
import type { ExpenseFormValues } from '@/lib/schemas/expense.schema';
import { Checkbox } from '@/shared/components/Checkbox';
import { TextInput } from '@/shared/components/TextInput';

interface ParticipantListProps {
  readonly fields: FieldArrayWithId<ExpenseFormValues, 'participants', 'id'>[];
  readonly watchedParticipants: ExpenseFormValues['participants'];
  readonly isSubmitting: boolean;
  readonly register: UseFormRegister<ExpenseFormValues>;
  readonly onToggle: (index: number) => void;
  readonly onCustomAmountToggle: (index: number) => void;
}

export const ParticipantList = ({
  fields,
  watchedParticipants,
  isSubmitting,
  register,
  onToggle,
  onCustomAmountToggle,
}: ParticipantListProps) => {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2">
      {fields.map((field, index) => {
        const participant = watchedParticipants[index];
        if (!participant) return null;

        return (
          <div
            key={field.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
          >
            <Checkbox
              checked={participant.selected}
              onCheckedChange={() => onToggle(index)}
              disabled={isSubmitting}
              size="sm"
              className="flex-1"
            >
              {participant.memberName}
            </Checkbox>

            {participant.selected && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCustomAmountToggle(index)}
                  aria-label={`${participant.useCustomAmount ? 'Revenir à la part équitable' : 'Définir un montant fixe'} pour ${participant.memberName}`}
                  className={`text-xs px-2 py-1 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 ${
                    participant.useCustomAmount
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                  disabled={isSubmitting}
                >
                  {participant.useCustomAmount ? 'Montant fixe' : 'Part équitable'}
                </button>

                {participant.useCustomAmount && (
                  <TextInput
                    type="number"
                    min="0"
                    step="0.01"
                    fullWidth={false}
                    className="w-20 px-2 py-1 text-sm"
                    placeholder="0.00"
                    aria-label={`Montant fixe pour ${participant.memberName}`}
                    disabled={isSubmitting}
                    {...register(`participants.${index}.customAmount`)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
