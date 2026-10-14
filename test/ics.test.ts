import { describe, expect, test } from "bun:test";

import { buildIcsCalendar } from "../src/ics";

const now = new Date("2026-10-14T08:30:00Z");

describe("buildIcsCalendar", () => {
  test("wraps events in a VCALENDAR with CRLF line endings", () => {
    const ics = buildIcsCalendar([], { calendarName: "Cadence", now });
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("X-WR-CALNAME:Cadence");
    // every line is CRLF-terminated
    expect(ics.split("\r\n").length).toBeGreaterThan(1);
    expect(ics).not.toMatch(/[^\r]\n/);
  });

  test("emits one all-day VEVENT per event", () => {
    const ics = buildIcsCalendar(
      [
        { uid: "t1", title: "Ship cadence", day: "2026-10-15" },
        { uid: "t2", title: "Review PR", day: "2026-10-16" },
      ],
      { now },
    );
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261015");
    expect(ics).toContain("SUMMARY:Ship cadence");
    expect(ics).toContain("DTSTAMP:20261014T083000Z");
  });

  test("escapes RFC 5545 TEXT special characters in the summary", () => {
    const ics = buildIcsCalendar(
      [{ uid: "t1", title: "Plan; refine, draft\\final", day: "2026-10-15" }],
      { now },
    );
    expect(ics).toContain("SUMMARY:Plan\\; refine\\, draft\\\\final");
  });

  test("includes a URL line only when a link is supplied", () => {
    const withUrl = buildIcsCalendar(
      [
        {
          uid: "t1",
          title: "Task",
          day: "2026-10-15",
          url: "https://runa.omni.dev/t/1",
        },
      ],
      { now },
    );
    const withoutUrl = buildIcsCalendar(
      [{ uid: "t1", title: "Task", day: "2026-10-15" }],
      { now },
    );
    expect(withUrl).toContain("URL:https://runa.omni.dev/t/1");
    expect(withoutUrl).not.toContain("URL:");
  });
});
