// src/ics.ts
var DEFAULT_EVENT_MS = 60 * 60 * 1000;
var escapeText = (value) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
var toIcsDate = (day) => day.replace(/-/g, "");
var toIcsTimestamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
var MAX_LINE_OCTETS = 75;
var utf8 = new TextEncoder;
var octetLength = (value) => utf8.encode(value).length;
var graphemeSegmenter;
var splitCharacters = (line) => {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter = typeof Intl !== "undefined" && typeof Intl.Segmenter === "function" ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  }
  if (!graphemeSegmenter)
    return Array.from(line);
  return Array.from(graphemeSegmenter.segment(line), ({ segment }) => segment);
};
var foldLine = (line) => {
  if (octetLength(line) <= MAX_LINE_OCTETS)
    return line;
  const physical = [];
  let current = "";
  let size = 0;
  const append = (piece, pieceSize) => {
    const limit = physical.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (current && size + pieceSize > limit) {
      physical.push(current);
      current = "";
      size = 0;
    }
    current += piece;
    size += pieceSize;
  };
  for (const character of splitCharacters(line)) {
    const characterSize = octetLength(character);
    if (characterSize <= MAX_LINE_OCTETS - 1) {
      append(character, characterSize);
    } else {
      for (const codePoint of character) {
        append(codePoint, octetLength(codePoint));
      }
    }
  }
  if (current)
    physical.push(current);
  return physical.join(`\r
 `);
};
var buildIcsCalendar = (events, options = {}) => {
  const {
    calendarName = "Cadence",
    uidDomain = "cadence.omni.dev",
    now = new Date
  } = options;
  const dtstamp = toIcsTimestamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Omni//Cadence//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`
  ];
  for (const event of events) {
    lines.push("BEGIN:VEVENT", `UID:${escapeText(event.uid)}@${uidDomain}`, `DTSTAMP:${dtstamp}`);
    if (event.start) {
      const start = new Date(event.start);
      const end = event.end ? new Date(event.end) : new Date(start.getTime() + DEFAULT_EVENT_MS);
      lines.push(`DTSTART:${toIcsTimestamp(start)}`, `DTEND:${toIcsTimestamp(end)}`);
    } else {
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(event.day)}`);
    }
    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.url)
      lines.push(`URL:${escapeText(event.url)}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.map(foldLine).join(`\r
`)}\r
`;
};
export {
  buildIcsCalendar
};
