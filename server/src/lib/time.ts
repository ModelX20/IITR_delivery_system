// The store operates on India time (Asia/Kolkata, UTC+05:30, no daylight saving).
const IST_OFFSET = '+05:30';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Start of the given IST calendar day ("YYYY-MM-DD") as a UTC Date. */
export function istDayStart(date: string): Date {
  return new Date(`${date}T00:00:00${IST_OFFSET}`);
}

/** Start of the IST day after the given one: use as an exclusive upper bound. */
export function istNextDayStart(date: string): Date {
  return new Date(istDayStart(date).getTime() + DAY_MS);
}

/** Start of the IST calendar month containing the given day ("YYYY-MM-DD"). */
export function istMonthStart(date: string): Date {
  return istDayStart(`${date.slice(0, 7)}-01`);
}

/** Today's date in IST as "YYYY-MM-DD". */
export function istToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}
