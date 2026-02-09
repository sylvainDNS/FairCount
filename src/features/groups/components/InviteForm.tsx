import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { type InviteFormValues, inviteSchema } from '@/lib/schemas/group.schema';
import { Button } from '@/shared/components/Button';
import { FormField } from '@/shared/components/FormField';
import { useInvitations } from '../hooks/useInvitations';
import { GROUP_ERROR_MESSAGES, type GroupError } from '../types';

interface InviteFormProps {
  readonly groupId: string;
  readonly onSuccess?: (() => void) | undefined;
}

export const InviteForm = ({ groupId, onSuccess }: InviteFormProps) => {
  const { sendInvitation } = useInvitations(groupId);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: InviteFormValues) => {
    const result = await sendInvitation(data.email);

    if (result.success) {
      setShowSuccess(true);
      reset();
      onSuccess?.();
      setTimeout(() => setShowSuccess(false), 3000);
    } else {
      setError('root', {
        message:
          GROUP_ERROR_MESSAGES[result.error as GroupError] || GROUP_ERROR_MESSAGES.UNKNOWN_ERROR,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField
        label="Adresse email"
        id="invite-email"
        type="email"
        placeholder="email@exemple.com"
        disabled={isSubmitting}
        error={errors.email}
        {...register('email')}
      />

      {errors.root && (
        <div id="invite-error" role="alert" className="text-red-600 dark:text-red-400 text-sm">
          {errors.root.message}
        </div>
      )}

      {showSuccess && (
        <output id="invite-success" className="text-green-600 dark:text-green-400 text-sm">
          Invitation envoyée avec succès
        </output>
      )}

      <Button type="submit" fullWidth loading={isSubmitting} loadingText="Envoi en cours...">
        Envoyer l'invitation
      </Button>
    </form>
  );
};
