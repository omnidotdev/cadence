// src/ics.ts
var DEFAULT_EVENT_MS = 60 * 60 * 1000;
var escapeText = (value) => value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
var toIcsDate = (day) => day.replace(/-/g, "");
var toIcsTimestamp = (date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
var foldLine = (line) => {
  if (line.length <= 75)
    return line;
  const parts = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  parts.push(` ${rest}`);
  return parts.join(`\r
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
