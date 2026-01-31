import { useCallback, useState } from 'react';
import { isValidEmail } from '@/lib/validation';
import { Button } from '@/shared/components/Button';
import { TextInput } from '@/shared/components/TextInput';
import { useInvitations } from '../hooks/useInvitations';
import { GROUP_ERROR_MESSAGES, type GroupError } from '../types';

interface InviteFormProps {
  readonly groupId: string;
  readonly onSuccess?: (() => void) | undefined;
}

type FormState = 'idle' | 'loading' | 'success' | 'error';

export const InviteForm = ({ groupId, onSuccess }: InviteFormProps) => {
  const { sendInvitation } = useInvitations(groupId);

  const [email, setEmail] = useState('');
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();

      if (!isValidEmail(email)) {
        setFormState('error');
        setErrorMessage('Adresse email invalide');
        return;
      }

      setFormState('loading');
      setErrorMessage('');

      const result = await sendInvitation(email);

      if (result.success) {
        setFormState('success');
        setEmail('');
        onSuccess?.();
        setTimeout(() => setFormState('idle'), 3000);
      } else {
        setFormState('error');
        setErrorMessage(
          GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
        );
      }
    },
    [email, sendInvitation, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="invite-email"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
        >
          Adresse email
        </label>
        <TextInput
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (formState !== 'idle') {
              setFormState('idle');
              setErrorMessage('');
            }
          }}
          placeholder="email@exemple.com"
          required
          disabled={formState === 'loading'}
          aria-describedby={
            formState === 'error'
              ? 'invite-error'
              : formState === 'success'
                ? 'invite-success'
                : undefined
          }
          aria-invalid={formState === 'error'}
        />
      </div>

      {formState === 'error' && errorMessage && (
        <div id="invite-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errorMessage}
        </div>
      )}

      {formState === 'success' && (
        <output id="invite-success" className="text-green-600 dark:text-green-400 text-sm">
          Invitation envoyée avec succès
        </output>
      )}

      <Button
        type="submit"
        fullWidth
        disabled={!email}
        loading={formState === 'loading'}
        loadingText="Envoi en cours..."
      >
        Envoyer l'invitation
      </Button>
    </form>
  );
};
