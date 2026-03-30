export function parseGermanDate(input: string): Date | null {
  input = input.trim();

  // Format: DD.MM.YYYY HH:MM
  const fullMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s+(\d{1,2}):(\d{2})$/);
  if (fullMatch) {
    const [, day, month, year, hour, minute] = fullMatch;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute)
    );
    return isNaN(date.getTime()) ? null : date;
  }

  // Format: DD.MM.YYYY
  const dateMatch = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dateMatch) {
    const [, day, month, year] = dateMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 23, 59, 59);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function formatGermanDate(date: Date): string {
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getDueDateStatus(dueDate: Date | null): string {
  if (!dueDate) return "";
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (diff < 0) return "🔴 **ÜBERFÄLLIG**";
  if (days === 0) return "🟠 **Heute fällig!**";
  if (days === 1) return "🟡 **Morgen fällig**";
  if (days <= 3) return `🟡 In ${days} Tagen fällig`;
  return `🟢 In ${days} Tagen fällig`;
}
