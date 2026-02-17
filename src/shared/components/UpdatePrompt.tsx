import { useRegisterSW } from 'virtual:pwa-register/react';
import { useEffect, useRef } from 'react';
import { toaster } from './Toast/toaster';

export const UpdatePrompt = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const prompted = useRef(false);

  useEffect(() => {
    if (needRefresh && !prompted.current) {
      prompted.current = true;
      toaster.create({
        type: 'info',
        title: 'Mise à jour disponible',
        description: 'Une nouvelle version est disponible.',
        duration: Number.MAX_SAFE_INTEGER,
        action: {
          label: 'Actualiser',
          onClick: () => updateServiceWorker(true),
        },
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
};
