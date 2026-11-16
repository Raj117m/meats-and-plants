/**
 * Formats an ISO string or time string into a 12-hour format e.g. "12:04 PM"
 */
export function formatTime12(timeStr: string | null | undefined): string {
  if (!timeStr) return '--:--';

  let dateObj: Date;
  if (timeStr.includes('T')) {
    dateObj = new Date(timeStr);
  } else if (timeStr.includes(':')) {
    const parts = timeStr.split(':').map(Number);
    dateObj = new Date();
    dateObj.setHours(parts[0], parts[1], parts[2] || 0);
  } else {
    return timeStr;
  }

  return dateObj.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formats seconds into HH:MM:SS or MM:SS (e.g. 02:14:05)
 */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Formats worked seconds into human-readable duration e.g. "8h 15m" or "45m"
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hrs > 0) {
    return `${hrs}h ${mins}m`;
  }
  return `${mins}m`;
}

/**
 * Formats a date string into readable date e.g. "Sunday, 15 Nov 2026"
 */
export function formatDateReadable(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}
