/**
 * Formats an amount in cents to a localized currency string.
 */
export const formatCurrency = (cents: number, currency: string): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
};
