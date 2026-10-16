export { default as ActivityTimeline, type ActivityTimelineProps } from './ActivityTimeline.vue';
/* React attached this as `ActivityTimeline.Item` via `Object.assign`. An SFC's generated
   default export cannot carry statics cleanly, so it ships as a sibling. */
export { default as ActivityItem, type ActivityItemProps } from './ActivityItem.vue';
