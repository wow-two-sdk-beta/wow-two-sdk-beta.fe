export { default as CollapsibleGroup, type CollapsibleGroupProps } from './CollapsibleGroup.vue';
/* React attached these as `CollapsibleGroup.Trigger` / `.Content` via `Object.assign`. An SFC's
   generated default export cannot carry statics cleanly, so they ship as siblings — the
   same shape every other compound family in this group uses. */
export { default as CollapsibleGroupTrigger, type CollapsibleGroupTriggerProps } from './CollapsibleGroupTrigger.vue';
export { default as CollapsibleGroupContent, type CollapsibleGroupContentProps } from './CollapsibleGroupContent.vue';
export {
  CollapsibleGroupKey,
  useCollapsibleContext,
  type CollapsibleGroupContextValue,
} from './CollapsibleGroupContext';
