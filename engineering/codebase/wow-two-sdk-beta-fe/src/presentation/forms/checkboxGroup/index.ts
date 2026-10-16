export { default as CheckboxGroup, type CheckboxGroupProps } from './CheckboxGroup.vue';
/* React injected per-item state with `cloneElement`; Vue provides this context instead and
   `CheckboxField` injects it. Exported so an app can build its own group item. */
export { useCheckboxGroup, CheckboxGroupKey, type CheckboxGroupContextValue } from './CheckboxGroupContext';
