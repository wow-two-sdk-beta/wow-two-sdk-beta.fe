/**
 * Shared vocabulary for the EventCalendarViewer folder.
 *
 * React kept these next to the component in `EventCalendarViewer.tsx`, where the private
 * `MonthView` / `TimeGridView` / `AgendaView` closed over them. Here each view is its
 * own SFC, so the enum, the event shape and the two date helpers live in a sibling
 * module all four files import — the same split `dataGrid/` uses for `DataGridEditorTypes.ts`.
 * `startOfWeek` / `startOfCellInstant` stay out of the folder barrel, exactly as they
 * were module-private in React.
 */
import type { Temporal } from 'temporal-polyfill';
import { zonedAtHour } from '../../forms/DateExtensions';

/** Defines the EventCalendarViewer visible range mode. */
export const EventCalendarViewerView = {
  /** Refers to the month grid. */
  Month: 'month',
  /** Refers to the week columns. */
  Week: 'week',
  /** Refers to the single-day view. */
  Day: 'day',
  /** Refers to the chronological agenda list. */
  Agenda: 'agenda',
} as const;

export type EventCalendarViewerView = (typeof EventCalendarViewerView)[keyof typeof EventCalendarViewerView];

export interface EventCalendarViewerEvent {
  readonly id: string;
  /** The event title. React took a `ReactNode`; it is narrowed to a scalar for the port. */
  readonly title?: string | number;
  readonly start: Temporal.ZonedDateTime;
  readonly end: Temporal.ZonedDateTime;
  readonly color?: string;
  readonly isAllDay?: boolean;
}

/** First visible day of the week that contains `d`, honoring `weekStart`. */
export function startOfWeek(d: Temporal.PlainDate, weekStart: 0 | 1): Temporal.PlainDate {
  // Temporal `dayOfWeek`: 1 (Mon) … 7 (Sun). Map to a Sunday=0 index, then shift.
  const sundayIdx = d.dayOfWeek % 7;
  const diff = (sundayIdx - weekStart + 7) % 7;
  return d.subtract({ days: diff });
}

/** Midnight instant for a calendar day in `timeZone` — the range-anchor for all-day/multi-day spans. */
export function startOfCellInstant(day: Temporal.PlainDate, timeZone: string): Temporal.ZonedDateTime {
  return zonedAtHour(day, 0, timeZone);
}

/** The order the header's view switcher renders its radios in. */
export const EventCalendarViewerViews: ReadonlyArray<EventCalendarViewerView> = [
  EventCalendarViewerView.Month,
  EventCalendarViewerView.Week,
  EventCalendarViewerView.Day,
  EventCalendarViewerView.Agenda,
];
