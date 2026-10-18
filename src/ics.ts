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

/** Default timed-event duration (ms) when no `end` is given. */
const DEFAULT_EVENT_MS = 60 * 60 * 1000;

/** Options controlling the generated calendar. */
export interface IcsOptions {
  /** `X-WR-CALNAME` display name. */
  calendarName?: string;
  /** Domain appended to each UID. */
  uidDomain?: string;
  /** Injected so DTSTAMP is deterministic in tests. */
  now?: Date;
}

/** Escape a TEXT value per RFC 5545 (backslash, comma, semicolon, newline). */
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

/** `YYYY-MM-DD` -> `YYYYMMDD` for a DATE value. */
const toIcsDate = (day: string): string => day.replace(/-/g, "");

/** A JS `Date` as a UTC `YYYYMMDDTHHMMSSZ` timestamp. */
const toIcsTimestamp = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

/**
 * Fold a content line to <=75 octets per RFC 5545 (continuations start with a
 * space). Approximated on string length, correct for ASCII content.
 */
const foldLine = (line: string): string => {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  parts.push(` ${rest}`);
  return parts.join("\r\n");
};

/**
 * Build an iCalendar document (CRLF line endings) with one all-day VEVENT per
 * event.
 */
export const buildIcsCalendar = (
  events: readonly IcsEvent[],
  options: IcsOptions = {},
): string => {
  const {
    calendarName = "Cadence",
    uidDomain = "cadence.omni.dev",
    now = new Date(),
  } = options;
  const dtstamp = toIcsTimestamp(now);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omni//Cadence//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}@${uidDomain}`,
      `DTSTAMP:${dtstamp}`,
    );
    if (event.start) {
      // timed event: emit UTC instants so clients convert to the viewer's zone
      const start = new Date(event.start);
      const end = event.end
        ? new Date(event.end)
        : new Date(start.getTime() + DEFAULT_EVENT_MS);
      lines.push(
        `DTSTART:${toIcsTimestamp(start)}`,
        `DTEND:${toIcsTimestamp(end)}`,
      );
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.day)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.url) lines.push(`URL:${escapeText(event.url)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
};
