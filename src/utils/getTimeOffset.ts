/**
 * Returns the current date adjusted to local timezone
 */
export function getLocalDate(date: Date): Date {
  const d = new Date(date)
  const tzOffset = d.getTimezoneOffset() * 60000; // offset in ms
  return new Date(d.getTime() - tzOffset);
}
