export { default as TabsGroup, type TabsGroupProps } from './TabsGroup.vue';
/* React attached these as `TabsGroup.List` / `.Tab` / `.Panel` via `Object.assign`. An
   SFC's generated default export cannot carry statics cleanly, so they ship as siblings. */
export { default as TabsGroupList, type TabsGroupListProps } from './TabsGroupList.vue';
export { default as TabsGroupTab, type TabsGroupTabProps } from './TabsGroupTab.vue';
export { default as TabsGroupPanel, type TabsGroupPanelProps } from './TabsGroupPanel.vue';
export { TabsGroupActivationMode, useTabsContext, type TabsGroupContextValue } from './TabsGroupContext';
