export { default as Timeline, type TimelineProps } from './Timeline.vue';
/* React attached these as `Timeline.Item` / `.Title` / `.Description` via `Object.assign`.
   An SFC's generated default export cannot carry statics cleanly, so they ship as siblings —
   the same shape every other compound family in this group uses. */
export { default as TimelineItem, type TimelineItemProps } from './TimelineItem.vue';
export { default as TimelineTitle, type TimelineTitleProps } from './TimelineTitle.vue';
export { default as TimelineDescription, type TimelineDescriptionProps } from './TimelineDescription.vue';
export {
  TimelineStatus,
  TimelineAlign,
  TimelineKey,
  useTimelineContext,
  type TimelineContextValue,
} from './TimelineContext';
