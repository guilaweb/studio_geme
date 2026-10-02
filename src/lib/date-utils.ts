/**
 * Utility functions for safe date handling across Firestore timestamps,
 * ISO strings, Date instances, and serialized dates.
 * Prevents "RangeError: Invalid time value" exceptions globally.
 */

// Bulletproof runtime guard against "RangeError: Invalid time value"
export function installSafeDatePrototypes() {
  if (typeof Date !== 'undefined' && typeof Date.prototype.toISOString === 'function') {
    const originalToISOString = Date.prototype.toISOString;
    if (!(originalToISOString as any).__isSafeGuard) {
      const safeToISO = function (this: Date) {
        if (isNaN(this.getTime())) {
          return '';
        }
        return originalToISOString.call(this);
      };
      (safeToISO as any).__isSafeGuard = true;
      Date.prototype.toISOString = safeToISO;
    }
  }
}

// Auto-install on module evaluation
installSafeDatePrototypes();

export function safeParseDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;

  try {
    // 1. If it's already a Date instance
    if (val instanceof Date) {
      return !isNaN(val.getTime()) ? val : null;
    }

    // 2. If it's a Firestore Timestamp with .toDate()
    if (typeof val?.toDate === 'function') {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }

    // 3. If it's a serialized Firestore timestamp object { seconds, nanoseconds }
    if (typeof val?.seconds === 'number') {
      const d = new Date(val.seconds * 1000);
      return !isNaN(d.getTime()) ? d : null;
    }

    // 4. If it's a number (Unix timestamp in ms or seconds)
    if (typeof val === 'number') {
      const d = val < 10000000000 ? new Date(val * 1000) : new Date(val);
      return !isNaN(d.getTime()) ? d : null;
    }

    // 5. If it's a string
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return null;
      
      const d = new Date(trimmed);
      return !isNaN(d.getTime()) ? d : null;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Safely converts any date value to an ISO 8601 string (e.g., "2026-09-30T14:00:00.000Z").
 * Returns fallback (default: "") if the date is invalid or null.
 * NEVER throws RangeError: Invalid time value.
 */
export function safeToIsoString(val: any, fallback: string = ''): string {
  const d = safeParseDate(val);
  if (!d) return fallback;
  try {
    return d.toISOString();
  } catch {
    return fallback;
  }
}

/**
 * Safely converts any date value to a YYYY-MM-DD string for <input type="date">.
 * Returns "" if the date is invalid or null.
 * NEVER throws RangeError: Invalid time value.
 */
export function safeToDateInputValue(val: any): string {
  if (!val) return '';
  // If it's already in YYYY-MM-DD format
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val.trim())) {
    return val.trim();
  }
  const iso = safeToIsoString(val);
  return iso ? iso.split('T')[0] : '';
}

/**
 * Safely formats a date or returns a placeholder if invalid.
 */
export function safeFormatDisplayDate(val: any, fallback: string = 'Data não def.'): string {
  const d = safeParseDate(val);
  if (!d) return fallback;
  try {
    return new Intl.DateTimeFormat('pt-AO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(d);
  } catch {
    return fallback;
  }
}
