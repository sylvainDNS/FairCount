/**
 * Returns today's date as a YYYY-MM-DD string in the local timezone.
 * Avoids timezone issues with toISOString() which uses UTC.
 */
export function getLocalDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
