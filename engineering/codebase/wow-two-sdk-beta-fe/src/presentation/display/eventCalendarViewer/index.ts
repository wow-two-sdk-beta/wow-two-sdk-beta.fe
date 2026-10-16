export { default as EventCalendarViewer, type EventCalendarViewerProps } from './EventCalendarViewer.vue';
/* React declared these beside the component; here they sit in a sibling module so the
   private `MonthView.vue` / `TimeGridView.vue` / `AgendaView.vue` can share them. The
   exported surface is unchanged — `startOfWeek`, `startOfCellInstant` and
   `EventCalendarViewerViews` stay internal, exactly as they were in `EventCalendarViewer.tsx`. */
export { EventCalendarViewerView, type EventCalendarViewerEvent } from './EventCalendarViewerTypes';
