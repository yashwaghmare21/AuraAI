/**
 * Formats dates deterministically in Asia/Kolkata (IST = UTC + 5:30)
 * Avoids ICU differences between Node.js server and browser runtimes.
 */
export function formatOrderDate(value: string | Date | number | undefined | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';

  // Shift to IST (UTC + 5 hours 30 mins)
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffsetMs);

  const day = istDate.getDate();
  const month = istDate.getMonth() + 1;
  const year = istDate.getFullYear();

  return `${day}/${month}/${year}`;
}

export function formatOrderDateTime(value: string | Date | number | undefined | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';

  const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
  const istDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000 + istOffsetMs);

  const day = istDate.getDate();
  const month = istDate.getMonth() + 1;
  const year = istDate.getFullYear();
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year}, ${hours}:${minutes}`;
}
