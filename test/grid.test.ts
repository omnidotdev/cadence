import { describe, expect, test } from "bun:test";

import { CalendarDate, parseDate } from "@internationalized/date";

import {
  bucketByDay,
  buildMonthGrid,
  buildWeekDays,
  parseDayKey,
  resolveCalendarDrop,
  toDayKey,
} from "../src/grid";

describe("buildMonthGrid", () => {
  const grid = buildMonthGrid("2026-10-15");

  test("is a fixed 6x7 grid", () => {
    expect(grid).toHaveLength(6);
    for (const week of grid) expect(week).toHaveLength(7);
  });

  test("starts on the Sunday on/before the 1st and is contiguous", () => {
    // Oct 1 2026 is a Thursday, so the grid starts Sun Sep 27
    expect(grid[0]![0]!.key).toBe("2026-09-27");
    const flat = grid.flat();
    for (let i = 1; i < flat.length; i++) {
      expect(
        parseDayKey(flat[i - 1]!.key)
          .add({ days: 1 })
          .toString(),
      ).toBe(flat[i]!.key);
    }
  });

  test("marks in-month days correctly (October has 31)", () => {
    expect(grid.flat().filter((d) => d.inMonth)).toHaveLength(31);
    expect(grid.flat().find((d) => d.key === "2026-10-01")?.inMonth).toBe(true);
    expect(grid.flat().find((d) => d.key === "2026-09-30")?.inMonth).toBe(
      false,
    );
  });

  test("exposes the day of month", () => {
    expect(grid.flat().find((d) => d.key === "2026-10-15")?.dayOfMonth).toBe(
      15,
    );
  });

  test("week can start on Monday", () => {
    // Monday on/before Oct 1 2026 (Thu) is Mon Sep 28
    const monday = buildMonthGrid("2026-10-15", { weekStartsOn: 1 });
    expect(monday[0]![0]!.key).toBe("2026-09-28");
  });

  test("marks today using the injected reference date only", () => {
    const withToday = buildMonthGrid("2026-10-15", {
      today: parseDate("2026-10-15"),
    });
    expect(withToday.flat().filter((d) => d.isToday)).toHaveLength(1);
    expect(withToday.flat().find((d) => d.isToday)?.key).toBe("2026-10-15");
  });

  test("accepts a CalendarDate as the view date", () => {
    expect(buildMonthGrid(new CalendarDate(2026, 10, 15))[0]![0]!.key).toBe(
      "2026-09-27",
    );
  });
});

describe("buildWeekDays", () => {
  test("returns the seven days of the week containing the view date", () => {
    // Oct 15 2026 is a Thursday; Sunday-start week is Oct 11-17
    const week = buildWeekDays("2026-10-15");
    expect(week).toHaveLength(7);
    expect(week[0]!.key).toBe("2026-10-11");
    expect(week[6]!.key).toBe("2026-10-17");
  });

  test("honours a Monday week start", () => {
    // Monday-start week containing Thu Oct 15 2026 is Oct 12-18
    const week = buildWeekDays("2026-10-15", { weekStartsOn: 1 });
    expect(week[0]!.key).toBe("2026-10-12");
    expect(week[6]!.key).toBe("2026-10-18");
  });

  test("marks in-month relative to the view date and today from the injected date", () => {
    const week = buildWeekDays("2026-10-15", {
      today: parseDate("2026-10-15"),
    });
    expect(week.filter((d) => d.isToday)).toHaveLength(1);
    expect(week.find((d) => d.isToday)?.key).toBe("2026-10-15");
    expect(week.every((d) => d.inMonth)).toBe(true);
  });
});

describe("toDayKey", () => {
  test("passes a date-only string through", () => {
    expect(toDayKey("2026-10-15")).toBe("2026-10-15");
  });

  test("takes the local date portion of a datetime string without shifting", () => {
    // this is the point of the @internationalized/date port: no tz round-trip,
    // so a late-evening local time never rolls onto the next day
    expect(toDayKey("2026-10-15T12:00:00")).toBe("2026-10-15");
    expect(toDayKey("2026-10-15T23:30:00")).toBe("2026-10-15");
  });

  test("accepts a CalendarDate", () => {
    expect(toDayKey(new CalendarDate(2026, 10, 15))).toBe("2026-10-15");
  });
});

describe("parseDayKey", () => {
  test("round-trips a day key through a CalendarDate", () => {
    expect(parseDayKey("2026-10-15").toString()).toBe("2026-10-15");
  });
});

describe("bucketByDay", () => {
  test("groups items by their day key and omits items without one", () => {
    const items = [
      { id: "a", due: "2026-10-15T09:00:00" },
      { id: "b", due: "2026-10-15T18:00:00" },
      { id: "c", due: "2026-10-16T09:00:00" },
      { id: "d", due: null },
    ];
    const byDay = bucketByDay(items, (item) =>
      item.due ? toDayKey(item.due) : null,
    );
    expect(byDay["2026-10-15"]?.map((i) => i.id)).toEqual(["a", "b"]);
    expect(byDay["2026-10-16"]?.map((i) => i.id)).toEqual(["c"]);
    expect(Object.keys(byDay)).toHaveLength(2);
  });
});

describe("resolveCalendarDrop", () => {
  test("resolves a drop onto a different day", () => {
    expect(
      resolveCalendarDrop({
        draggableId: "t1",
        source: { droppableId: "2026-10-15" },
        destination: { droppableId: "2026-10-20" },
      }),
    ).toEqual({ itemId: "t1", dayKey: "2026-10-20" });
  });

  test("ignores a cancelled drop or a drop on the same day", () => {
    expect(
      resolveCalendarDrop({
        draggableId: "t1",
        source: { droppableId: "2026-10-15" },
        destination: null,
      }),
    ).toBeNull();
    expect(
      resolveCalendarDrop({
        draggableId: "t1",
        source: { droppableId: "2026-10-15" },
        destination: { droppableId: "2026-10-15" },
      }),
    ).toBeNull();
  });
});
