/**
 * Headless month-grid and day-bucketing helpers, built on
 * `@internationalized/date`. Day keys are `YYYY-MM-DD` and are derived without a
 * timezone round-trip, so an item lands on the exact local day it reads as (the
 * reason this is a `CalendarDate` port rather than a `Date`/`dayjs` one).
 */
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
/**
 * A fixed 6x7 month grid covering `viewDate`'s month, padded with trailing days
 * of the previous month and leading days of the next so every week is full.
 * `weekStartsOn` is 0 (Sunday) by default. `today` is injected so the grid is
 * deterministic in tests and timezone handling stays with the caller.
 */
export declare const buildMonthGrid: (viewDate: string | CalendarDate, options?: {
    weekStartsOn?: 0 | 1;
    today?: CalendarDate;
}) => CalendarDay[][];
/**
 * The seven days of the week containing `viewDate`, as a flat row. `inMonth` is
 * judged against `viewDate`'s month, matching how a week view shades days that
 * spill into an adjacent month.
 */
export declare const buildWeekDays: (viewDate: string | CalendarDate, options?: {
    weekStartsOn?: 0 | 1;
    today?: CalendarDate;
}) => CalendarDay[];
/**
 * The `YYYY-MM-DD` local day a value falls on. Date-only and local-datetime
 * strings keep their date portion with no timezone shift; a `CalendarDate`
 * serializes directly.
 */
export declare const toDayKey: (value: string | CalendarDate) => string;
/** Parse a `YYYY-MM-DD` day key back into a `CalendarDate`. */
export declare const parseDayKey: (dayKey: string) => CalendarDate;
/**
 * Group items by day key. The caller supplies the accessor, so the grid never
 * needs to know an item's shape; items whose key is null/undefined are omitted.
 */
export declare const bucketByDay: <T>(items: readonly T[], getKey: (item: T) => string | null | undefined) => Record<string, T[]>;
/** The shape of a drag result (droppable ids are day keys). */
export interface DropResult {
    draggableId: string;
    source: {
        droppableId: string;
    };
    destination?: {
        droppableId: string;
    } | null;
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
export declare const resolveCalendarDrop: (result: DropResult) => CalendarDrop | null;
//# sourceMappingURL=grid.d.ts.map