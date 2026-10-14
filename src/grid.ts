/**
 * Headless month-grid and day-bucketing helpers, built on
 * `@internationalized/date`. Day keys are `YYYY-MM-DD` and are derived without a
 * timezone round-trip, so an item lands on the exact local day it reads as (the
 * reason this is a `CalendarDate` port rather than a `Date`/`dayjs` one).
 */

import {
  fromDate,
  getDayOfWeek,
  getLocalTimeZone,
  parseDate,
  parseDateTime,
  toCalendarDate,
} from "@internationalized/date";

import type { CalendarDate } from "@internationalized/date";

/** One cell in a month grid. */
export interface CalendarDay {
  /** Local day key, `YYYY-MM-DD`. */
  key: string;
  /** Day of month (1-31). */
  dayOfMonth: number;
  /** Whether the day belongs to the viewed month (vs. a padding day). */
  inMonth: boolean;
  /** Whether the day matches the reference "today" passed to the grid. */
  isToday: boolean;
}

/** Weekday with Sunday = 0 ... Saturday = 6, independent of locale. */
const sundayBasedWeekday = (date: CalendarDate): number =>
  getDayOfWeek(date, "en-US");

const asCalendarDate = (value: string | CalendarDate): CalendarDate =>
  typeof value === "string" ? parseDate(value) : value;

/** Build one grid cell, judging `inMonth` against `referenceMonth`. */
const toCalendarDay = (
  day: CalendarDate,
  referenceMonth: CalendarDate,
  today?: CalendarDate,
): CalendarDay => ({
  key: day.toString(),
  dayOfMonth: day.day,
  inMonth:
    day.month === referenceMonth.month && day.year === referenceMonth.year,
  isToday: today ? day.compare(today) === 0 : false,
});

/**
 * A fixed 6x7 month grid covering `viewDate`'s month, padded with trailing days
 * of the previous month and leading days of the next so every week is full.
 * `weekStartsOn` is 0 (Sunday) by default. `today` is injected so the grid is
 * deterministic in tests and timezone handling stays with the caller.
 */
export const buildMonthGrid = (
  viewDate: string | CalendarDate,
  options: { weekStartsOn?: 0 | 1; today?: CalendarDate } = {},
): CalendarDay[][] => {
  const { weekStartsOn = 0, today } = options;
  const month = asCalendarDate(viewDate);
  const firstOfMonth = month.set({ day: 1 });
  const offset = (sundayBasedWeekday(firstOfMonth) - weekStartsOn + 7) % 7;

  let cursor = firstOfMonth.subtract({ days: offset });
  const weeks: CalendarDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: CalendarDay[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(toCalendarDay(cursor, month, today));
      cursor = cursor.add({ days: 1 });
    }
    weeks.push(week);
  }
  return weeks;
};

/**
 * The seven days of the week containing `viewDate`, as a flat row. `inMonth` is
 * judged against `viewDate`'s month, matching how a week view shades days that
 * spill into an adjacent month.
 */
export const buildWeekDays = (
  viewDate: string | CalendarDate,
  options: { weekStartsOn?: 0 | 1; today?: CalendarDate } = {},
): CalendarDay[] => {
  const { weekStartsOn = 0, today } = options;
  const date = asCalendarDate(viewDate);
  const offset = (sundayBasedWeekday(date) - weekStartsOn + 7) % 7;

  let cursor = date.subtract({ days: offset });
  const days: CalendarDay[] = [];
  for (let d = 0; d < 7; d++) {
    days.push(toCalendarDay(cursor, date, today));
    cursor = cursor.add({ days: 1 });
  }
  return days;
};

/**
 * The `YYYY-MM-DD` local day a value falls on. Date-only and local-datetime
 * strings keep their date portion with no timezone shift; a `CalendarDate`
 * serializes directly; a `Date` (an absolute instant, e.g. a `timestamptz`) is
 * resolved to its calendar day in `timeZone` (default: the local zone).
 */
export const toDayKey = (
  value: string | CalendarDate | Date,
  options: { timeZone?: string } = {},
): string => {
  if (value instanceof Date) {
    return toCalendarDate(
      fromDate(value, options.timeZone ?? getLocalTimeZone()),
    ).toString();
  }
  if (typeof value !== "string") return value.toString();
  const date =
    value.length > 10 ? toCalendarDate(parseDateTime(value)) : parseDate(value);
  return date.toString();
};

/** Parse a `YYYY-MM-DD` day key back into a `CalendarDate`. */
export const parseDayKey = (dayKey: string): CalendarDate => parseDate(dayKey);

/**
 * Group items by day key. The caller supplies the accessor, so the grid never
 * needs to know an item's shape; items whose key is null/undefined are omitted.
 */
export const bucketByDay = <T>(
  items: readonly T[],
  getKey: (item: T) => string | null | undefined,
): Record<string, T[]> => {
  const byDay: Record<string, T[]> = {};
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    const bucket = byDay[key] ?? [];
    bucket.push(item);
    byDay[key] = bucket;
  }
  return byDay;
};

/** The shape of a drag result (droppable ids are day keys). */
export interface DropResult {
  draggableId: string;
  source: { droppableId: string };
  destination?: { droppableId: string } | null;
}

/** A resolved reschedule: move `itemId` onto the day `dayKey`. */
export interface CalendarDrop {
  itemId: string;
  dayKey: string;
}

/**
 * Turn a drag result into a reschedule, or null when the drop was cancelled or
 * landed back on the same day. Pure, so the drop decision is testable without
 * driving a drag library.
 */
export const resolveCalendarDrop = (
  result: DropResult,
): CalendarDrop | null => {
  const destination = result.destination;
  if (!destination || destination.droppableId === result.source.droppableId) {
    return null;
  }
  return { itemId: result.draggableId, dayKey: destination.droppableId };
};
