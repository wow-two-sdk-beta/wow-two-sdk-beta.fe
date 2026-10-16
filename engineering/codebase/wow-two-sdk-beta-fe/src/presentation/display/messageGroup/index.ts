export { default as MessageGroup, type MessageGroupProps, type MessageGroupHandle } from './MessageGroup.vue';
/* React attached this as `MessageGroup.DaySeparator` via `Object.assign`. An SFC's
   generated default export cannot carry statics cleanly, so it ships as a sibling. */
export { default as DaySeparator, type DaySeparatorProps } from './DaySeparator.vue';
