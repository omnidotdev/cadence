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

describe("buildIcsCalendar timed events", () => {
  test("emits a timed VEVENT (UTC DTSTART/DTEND) when start is set", () => {
    const start = new Date("2026-10-15T14:30:00Z");
    const ics = buildIcsCalendar(
      [{ uid: "t1", title: "Standup", day: "2026-10-15", start }],
      { now },
    );
    expect(ics).toContain("DTSTART:20261015T143000Z");
    // default one-hour duration
    expect(ics).toContain("DTEND:20261015T153000Z");
    expect(ics).not.toContain("DTSTART;VALUE=DATE");
  });

  test("still emits an all-day VEVENT when start is absent", () => {
    const ics = buildIcsCalendar(
      [{ uid: "t2", title: "Ship", day: "2026-10-15" }],
      { now },
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20261015");
    expect(ics).not.toContain("DTEND");
  });
});

describe("buildIcsCalendar line folding", () => {
  const utf8 = new TextEncoder();

  /** Physical lines of a document (without the trailing empty segment) */
  const physicalLines = (ics: string): string[] =>
    ics.split("\r\n").filter((line) => line !== "");

  /** Undo RFC 5545 folding: drop each CRLF followed by a single space */
  const unfold = (ics: string): string => ics.replace(/\r\n /g, "");

  const summaryOf = (ics: string): string => {
    const line = unfold(ics)
      .split("\r\n")
      .find((entry) => entry.startsWith("SUMMARY:"));
    return (line ?? "").slice("SUMMARY:".length);
  };

  const expectFoldedWithinLimit = (ics: string) => {
    for (const line of physicalLines(ics)) {
      expect(utf8.encode(line).length).toBeLessThanOrEqual(75);
    }
  };

  const build = (title: string) =>
    buildIcsCalendar([{ uid: "t1", title, day: "2026-10-15" }], { now });

  test("leaves a line of exactly 75 octets unfolded", () => {
    // "SUMMARY:" is 8 octets
    const title = "a".repeat(67);
    const ics = build(title);
    expect(ics).toContain(`\r\nSUMMARY:${title}\r\n`);
  });

  test("folds a long ASCII line into 75-octet physical lines", () => {
    const title = "x".repeat(300);
    const ics = build(title);
    expectFoldedWithinLimit(ics);
    const lines = physicalLines(ics);
    const start = lines.findIndex((line) => line.startsWith("SUMMARY:"));
    expect(utf8.encode(lines[start] ?? "").length).toBe(75);
    // continuations carry one leading space plus 74 octets of content
    expect(lines[start + 1]?.startsWith(" ")).toBe(true);
    expect(utf8.encode(lines[start + 1] ?? "").length).toBe(75);
    expect(summaryOf(ics)).toBe(title);
  });

  test("folds on UTF-8 octets for multibyte text", () => {
    // each "é" is two octets, so a length-based fold would overrun 75 octets
    const title = "é".repeat(120);
    const ics = build(title);
    expectFoldedWithinLimit(ics);
    // no physical line splits a two-octet sequence
    for (const line of physicalLines(ics)) {
      expect(line).not.toContain("�");
    }
    expect(summaryOf(ics)).toBe(title);
  });

  test("never splits an emoji at the fold boundary", () => {
    // 8 ("SUMMARY:") + 66 = 74 octets, so the 4-octet emoji straddles 75
    const title = `${"a".repeat(66)}😀${"b".repeat(20)}`;
    const ics = build(title);
    expectFoldedWithinLimit(ics);
    const lines = physicalLines(ics);
    const start = lines.findIndex((line) => line.startsWith("SUMMARY:"));
    expect(lines[start]).toBe(`SUMMARY:${"a".repeat(66)}`);
    expect(lines[start + 1]?.startsWith(" 😀")).toBe(true);
    for (const line of lines) {
      // no lone surrogate halves on either side of a fold
      expect(line).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
      expect(line).not.toMatch(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/);
    }
    expect(summaryOf(ics)).toBe(title);
  });

  test("keeps a multi-code-point grapheme cluster on one line", () => {
    // family emoji: four people joined by ZWJs, 25 octets in one cluster
    const family = "👨‍👩‍👧‍👦";
    const title = `${"a".repeat(60)}${family}${"b".repeat(10)}`;
    const ics = build(title);
    expectFoldedWithinLimit(ics);
    expect(physicalLines(ics).some((line) => line.includes(family))).toBe(true);
    expect(summaryOf(ics)).toBe(title);
  });

  test("round-trips a long mixed-script title", () => {
    const title = "Réunion 東京 🚀 planning, ".repeat(12);
    const ics = build(title);
    expectFoldedWithinLimit(ics);
    expect(summaryOf(ics)).toBe(title.replace(/,/g, "\\,"));
  });
});
