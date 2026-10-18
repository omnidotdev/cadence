/**
 * RFC 5545 (iCalendar) generation. Pure and dependency-free: the feed/route
 * layer fetches the dated items and hands them here. Each item becomes an
 * all-day VEVENT on its day, or a timed VEVENT when it carries a `start`
 * instant. Server-safe, so it is published as its own (`./ics`) entry point
 * with no React surface.
 */
/** One item to publish as a calendar event. */
export interface IcsEvent {
    /** Stable unique id (e.g. the source record id). */
    uid: string;
    /** Event title. */
    title: string;
    /** Local day, `YYYY-MM-DD`. Used for an all-day event (when `start` is unset). */
    day: string;
    /**
     * Start instant for a timed event. When set, the item is emitted as a timed
     * VEVENT (UTC `DTSTART`/`DTEND`, so calendar clients convert to the viewer's
     * zone) instead of an all-day event; `day` is then ignored.
     */
    start?: Date | string;
    /** End instant for a timed event; defaults to one hour after `start`. */
    end?: Date | string;
    /** Optional link back to the source record. */
    url?: string;
}
/** Options controlling the generated calendar. */
export interface IcsOptions {
    /** `X-WR-CALNAME` display name. */
    calendarName?: string;
    /** Domain appended to each UID. */
    uidDomain?: string;
    /** Injected so DTSTAMP is deterministic in tests. */
    now?: Date;
}
/**
 * Build an iCalendar document (CRLF line endings) with one all-day VEVENT per
 * event.
 */
export declare const buildIcsCalendar: (events: readonly IcsEvent[], options?: IcsOptions) => string;
//# sourceMappingURL=ics.d.ts.map