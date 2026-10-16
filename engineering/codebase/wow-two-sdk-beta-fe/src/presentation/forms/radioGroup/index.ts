export { default as RadioGroup, type RadioGroupProps } from './RadioGroup.vue';
/* React injected per-item state with `cloneElement`; Vue provides this context instead and
   `RadioField` / `ChoiceCard` inject it. Exported so an app can build its own group item. */
export { useRadioGroup, RadioGroupKey, type RadioGroupContextValue } from './RadioGroupContext';
