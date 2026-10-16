import { Temporal } from 'temporal-polyfill';
import type { EventCalendarViewerEvent } from './EventCalendarViewerTypes';

/** A calendar hour boundary; 24 means midnight of the following day. */
export function calendarHour(day: Temporal.PlainDate, hour: number, timeZone: string): Temporal.ZonedDateTime {
  return (hour === 24 ? day.add({ days: 1 }) : day).toZonedDateTime({
    timeZone,
    plainTime: new Temporal.PlainTime(hour === 24 ? 0 : hour),
  });
}

/** Projects absolute events into the displayed zone using an exclusive end boundary. */
export function intersectsCalendarDay(event: EventCalendarViewerEvent, day: Temporal.PlainDate, zone: string): boolean {
  const start = calendarHour(day, 0, zone);
  const end = calendarHour(day, 24, zone);
  const compare = Temporal.ZonedDateTime.compare;
  if (compare(event.end, event.start) < 0) return false;
  if (compare(event.end, event.start) === 0) return compare(event.start, start) >= 0 && compare(event.start, end) < 0;
  return compare(event.start, end) < 0 && compare(event.end, start) > 0;
}

/** Invalid visual options fall back to a complete day; data values remain unrestricted. */
export function calendarHourRange(range: readonly [number, number]): readonly [number, number] {
  const [start, end] = range;
  return Number.isInteger(start) && Number.isInteger(end) && start >= 0 && start < end && end <= 24
    ? [start, end]
    : [0, 24];
}

export interface CalendarEventLayout {
  event: EventCalendarViewerEvent;
  start: number;
  end: number;
  column: number;
  columns: number;
}

/** Packs intersecting events into separate columns on the calendar's wall-clock axis. */
export function layoutCalendarEvents(
  events: ReadonlyArray<EventCalendarViewerEvent>,
  day: Temporal.PlainDate,
  zone: string,
  range: readonly [number, number],
): ReadonlyArray<CalendarEventLayout> {
  const [first, last] = calendarHourRange(range);
  const lower = calendarHour(day, first, zone);
  const upper = calendarHour(day, last, zone);
  const compare = Temporal.ZonedDateTime.compare;
  const minutes = (instant: Temporal.ZonedDateTime): number => {
    const local = instant.withTimeZone(zone);
    const dateOrder = Temporal.PlainDate.compare(local.toPlainDate(), day);
    return dateOrder < 0 ? 0 : dateOrder > 0 ? 1440 : local.hour * 60 + local.minute + local.second / 60;
  };
  const items: CalendarEventLayout[] = events
    .filter(
      (event) =>
        !event.isAllDay &&
        intersectsCalendarDay(event, day, zone) &&
        compare(event.start, upper) < 0 &&
        (compare(event.end, lower) > 0 || compare(event.start, lower) === 0),
    )
    .map((event) => {
      const start = Math.max(first * 60, minutes(event.start));
      const clippedStart = compare(event.start, lower) < 0 ? lower : event.start;
      const clippedEnd = compare(event.end, upper) > 0 ? upper : event.end;
      const elapsed = Number(clippedEnd.epochNanoseconds - clippedStart.epochNanoseconds) / 60_000_000_000;
      const wallEnd = minutes(event.end);
      // A repeated hour can move the displayed clock backwards; preserve that event's elapsed duration.
      const projectedEnd = wallEnd <= start ? start + elapsed : wallEnd;
      const end = Math.min(last * 60, Math.max(start + 15, projectedEnd));
      return { event, start, end, column: 0, columns: 1 };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);
  let group: CalendarEventLayout[] = [];
  let ends: number[] = [];
  let groupEnd = -Infinity;
  const finish = (): void => {
    for (const item of group) item.columns = ends.length;
  };
  for (const item of items) {
    if (item.start >= groupEnd) {
      finish();
      group = [];
      ends = [];
      groupEnd = -Infinity;
    }
    const available = ends.findIndex((end) => end <= item.start);
    item.column = available < 0 ? ends.length : available;
    ends[item.column] = item.end;
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  finish();
  return items;
}
