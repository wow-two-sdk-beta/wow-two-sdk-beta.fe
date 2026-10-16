export { default as AccordionGroup, type AccordionGroupProps } from './AccordionGroup.vue';
/* React attached these as `AccordionGroup.Item` / `.Trigger` / `.Content` via `Object.assign`.
   An SFC's generated default export cannot carry statics cleanly, so they ship as siblings. */
export { default as AccordionGroupItem, type AccordionGroupItemProps } from './AccordionGroupItem.vue';
export { default as AccordionGroupTrigger, type AccordionGroupTriggerProps } from './AccordionGroupTrigger.vue';
export { default as AccordionGroupContent, type AccordionGroupContentProps } from './AccordionGroupContent.vue';
export {
  AccordionGroupType,
  useAccordionContext,
  useAccordionItemContext,
  type AccordionGroupContextValue,
  type AccordionGroupItemContextValue,
} from './AccordionGroupContext';
