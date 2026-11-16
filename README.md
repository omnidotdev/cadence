# @omnidotdev/cadence

Headless calendar, date-grid, and iCalendar primitives for Omni scheduling
surfaces. The package is framework-agnostic: it ships pure logic and a
server-safe iCalendar generator, and leaves styling, drag-and-drop, and React
bindings to the consuming app (e.g. the thornberry `calendar` component).

Date math is built on
[`@internationalized/date`](https://react-spectrum.adobe.com/internationalized/date/).
Day keys (`YYYY-MM-DD`) are derived from the local date portion with no timezone
round-trip, so an item lands on the exact day it reads as.

## Install

Consumed as a git dependency (the built `build/` output is committed, so no
build step runs on install). Pin a release tag (see [releases](https://github.com/omnidotdev/cadence/releases)):

```sh
bun add github:omnidotdev/cadence#v0.1.0
```

Releases are cut by Changesets: add a changeset (`bunx changeset`) with any
user-facing change, and merging the generated "version packages" PR tags the
release. A commit sha (`#<sha>`) also works for unreleased changes.

## Entry points

- `@omnidotdev/cadence` - month/week grid, day bucketing, drop resolution
- `@omnidotdev/cadence/ics` - RFC 5545 generation (no React, safe on the server)

## Grid

```ts
import {
  buildMonthGrid,
  buildWeekDays,
  bucketByDay,
  toDayKey,
  resolveCalendarDrop,
} from "@omnidotdev/cadence";
import { today, getLocalTimeZone } from "@internationalized/date";

// a fixed 6x7 month grid; inject `today` so timezone handling stays with you
const weeks = buildMonthGrid("2026-10-15", {
  weekStartsOn: 1,
  today: today(getLocalTimeZone()),
});

// the seven days of a week view
const week = buildWeekDays("2026-10-15");

// group arbitrary items by the day they fall on; you supply the accessor
const byDay = bucketByDay(tasks, (task) =>
  task.dueDate ? toDayKey(task.dueDate) : null,
);

// pure drop resolution (droppable ids are day keys), no drag library imported
const drop = resolveCalendarDrop(dragResult);
if (drop) reschedule(drop.itemId, drop.dayKey);
```

## iCalendar

```ts
import { buildIcsCalendar } from "@omnidotdev/cadence/ics";

const ics = buildIcsCalendar(
  tasks.map((task) => ({
    uid: task.id,
    title: task.title,
    day: toDayKey(task.dueDate),
    url: `https://runa.omni.dev/t/${task.id}`,
  })),
  { calendarName: "My tasks", uidDomain: "runa.omni.dev" },
);
```

## Scope

Month and week grids, day bucketing, drop resolution, and all-day iCalendar
export. Timed-event positioning, recurrence, and availability/booking are
deliberately out of scope for now; the API leaves room for them.

## License

Apache-2.0
