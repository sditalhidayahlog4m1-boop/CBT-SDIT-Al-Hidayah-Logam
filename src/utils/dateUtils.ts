/**
 * Utility functions for handling real-time local date and time formatting,
 * parsing timestamps, and calculating live relative time.
 */
import { ExamResult } from '../types';

/**
 * Formats a Date object, epoch millisecond, or valid date string into
 * the local timezone "YYYY-MM-DD HH:mm"
 */
export function formatToLocalDateTime(date: Date | number | string = new Date()): string {
  let d: Date;
  if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'string') {
    // If it's a numeric string like "1789801234567"
    if (/^\d{12,14}$/.test(date.trim())) {
      d = new Date(Number(date.trim()));
    } else {
      d = new Date(date.replace(' ', 'T'));
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Formats into local timezone "YYYY-MM-DD HH:mm:ss"
 */
export function formatToLocalDateTimeFull(date: Date | number | string = new Date()): string {
  let d: Date;
  if (typeof date === 'number') {
    d = new Date(date);
  } else if (typeof date === 'string') {
    if (/^\d{12,14}$/.test(date.trim())) {
      d = new Date(Number(date.trim()));
    } else {
      d = new Date(date.replace(' ', 'T'));
    }
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Extracts the most accurate epoch timestamp (ms) from an ExamResult.
 * ExamResult IDs are created as 'res-' + Date.now().
 */
export function getExamResultTimestamp(result: {
  id?: string;
  date?: string;
  timestamp?: number;
  completedAt?: string;
}): number {
  if (typeof result.timestamp === 'number' && result.timestamp > 0) {
    return result.timestamp;
  }

  // Check if id contains epoch millisecond (res-1789801234567)
  if (result.id) {
    const match = result.id.match(/^res-(\d{12,14})$/);
    if (match) {
      const ms = Number(match[1]);
      if (!isNaN(ms) && ms > 1500000000000) {
        return ms;
      }
    }
  }

  if (result.completedAt) {
    const parsed = Date.parse(result.completedAt);
    if (!isNaN(parsed)) return parsed;
  }

  if (result.date && result.date.trim() && result.date !== '-') {
    const trimmed = result.date.trim();

    // Check "DD/MM/YYYY HH:mm:ss" or "DD/MM/YYYY HH:mm"
    const matchDmy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (matchDmy) {
      const [, d, m, y, h, min, s] = matchDmy;
      const parsed = new Date(Number(y), Number(m) - 1, Number(d), Number(h || 0), Number(min || 0), Number(s || 0)).getTime();
      if (!isNaN(parsed)) return parsed;
    }

    // Check "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
    const isoLike = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
    const parsed = Date.parse(isoLike);
    if (!isNaN(parsed)) return parsed;
  }

  return 0;
}

/**
 * Formats an exam result's date for display in the local user's timezone.
 * Auto-corrects UTC-stored dates if the result contains an accurate epoch in id or timestamp.
 */
export function formatExamDisplayDate(result: {
  id?: string;
  date?: string;
  timestamp?: number;
}): string {
  // If id has the actual Date.now() timestamp, use that to guarantee local real-time
  if (result.id) {
    const match = result.id.match(/^res-(\d{12,14})$/);
    if (match) {
      const ms = Number(match[1]);
      if (!isNaN(ms) && ms > 1500000000000) {
        return formatToLocalDateTime(ms);
      }
    }
  }

  if (typeof result.timestamp === 'number' && result.timestamp > 0) {
    return formatToLocalDateTime(result.timestamp);
  }

  if (result.date) {
    // If it was stored as UTC ISO string ending in 'Z'
    if (result.date.endsWith('Z')) {
      const ms = Date.parse(result.date);
      if (!isNaN(ms)) return formatToLocalDateTime(ms);
    }
    return result.date;
  }

  return formatToLocalDateTime();
}

/**
 * Returns human-readable relative time (e.g. "Baru saja", "5 mnt lalu", "1 jam lalu", "Kemarin")
 */
export function getLiveRelativeTime(
  nowMs: number,
  timestampMs?: number,
  fallbackStr?: string,
  isCurrent?: boolean
): string {
  if (isCurrent) {
    return 'Online (Sesi Ini)';
  }

  if (!timestampMs || timestampMs <= 0) {
    if (fallbackStr && fallbackStr.trim() && fallbackStr !== '-') return fallbackStr;
    return 'Belum Pernah';
  }

  const diffSec = Math.floor((nowMs - timestampMs) / 1000);

  if (diffSec < 0 || diffSec <= 20) {
    return 'Baru saja';
  }
  if (diffSec < 60) {
    return `${diffSec} dtk lalu`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} mnt lalu`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return `${diffHour} jam lalu`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) {
    return 'Kemarin';
  }
  if (diffDay < 7) {
    return `${diffDay} hr lalu`;
  }
  return formatToLocalDateTime(timestampMs).slice(0, 10);
}

/**
 * Automatically normalizes exam results to ensure local real-time date string
 * and valid numeric epoch timestamps are populated.
 */
export function normalizeExamResults(results: ExamResult[]): ExamResult[] {
  if (!Array.isArray(results)) return [];

  return results.map((r) => {
    let correctedDate = r.date;
    let correctedTimestamp = r.timestamp;

    // Check if id contains epoch millisecond
    if (r.id) {
      const match = r.id.match(/^res-(\d{12,14})$/);
      if (match) {
        const ms = Number(match[1]);
        if (!isNaN(ms) && ms > 1500000000000) {
          correctedTimestamp = ms;
          correctedDate = formatToLocalDateTime(ms);
        }
      }
    }

    if (!correctedTimestamp && r.date) {
      const ms = getExamResultTimestamp(r);
      if (ms > 0) correctedTimestamp = ms;
    }

    if (correctedDate !== r.date || correctedTimestamp !== r.timestamp) {
      return {
        ...r,
        date: correctedDate,
        timestamp: correctedTimestamp,
      };
    }

    return r;
  });
}
