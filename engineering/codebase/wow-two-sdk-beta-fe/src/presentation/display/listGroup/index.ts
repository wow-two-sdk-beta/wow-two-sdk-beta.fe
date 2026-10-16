export { default as ListGroup, type ListGroupProps } from './ListGroup.vue';
/* React attached this as `ListGroup.Item` via `Object.assign`. An SFC's generated default
   export cannot carry statics cleanly, so it ships as a sibling — the same shape every
   other compound family in this group uses. */
export { default as ListGroupItem, type ListGroupItemProps } from './ListGroupItem.vue';
export { listVariants, ListGroupMarker, ListGroupSpacing, type ListGroupVariants } from './ListGroup.variants';
export { ListGroupKey, useListContext, type ListGroupContextValue } from './ListGroupContext';
