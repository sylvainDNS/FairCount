import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { type InviteFormValues, inviteSchema } from '@/lib/schemas/group.schema';
import { Button, FormField, toaster } from '@/shared/components';
import { useInvitations } from '../hooks/useInvitations';
import { GROUP_ERROR_MESSAGES, type GroupError } from '../types';

interface InviteFormProps {
  readonly groupId: string;
  readonly onSuccess?: (() => void) | undefined;
}

export const InviteForm = ({ groupId, onSuccess }: InviteFormProps) => {
  const { sendInvitation } = useInvitations(groupId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: InviteFormValues) => {
    const result = await sendInvitation(data.email);

    if (result.success) {
      toaster.success({ title: 'Invitation envoyée' });
      reset();
      onSuccess?.();
    } else {
      toaster.error({
        title:
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
        required
        disabled={isSubmitting}
        error={errors.email}
        {...register('email')}
      />

      <Button type="submit" fullWidth loading={isSubmitting} loadingText="Envoi en cours...">
        Envoyer l'invitation
      </Button>
    </form>
  );
};
