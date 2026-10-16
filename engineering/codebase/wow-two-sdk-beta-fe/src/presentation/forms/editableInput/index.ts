export { default as EditableInput, type EditableInputProps } from './EditableInput.vue';
/* React attached these as `EditableInput.Preview` / `.Input` / `.Submit` / `.Cancel` via
   `Object.assign`. An SFC's generated default export cannot carry statics cleanly, so they
   ship as siblings. `EditableInputButtonProps` types both buttons, exactly as it did in React. */
export { default as EditableInputCancel } from './EditableInputCancel.vue';
export { default as EditableInputInput, type EditableInputInputProps } from './EditableInputInput.vue';
export { default as EditableInputPreview, type EditableInputPreviewProps } from './EditableInputPreview.vue';
export { default as EditableInputSubmit, type EditableInputButtonProps } from './EditableInputSubmit.vue';
export { useEditableContext, type EditableInputContextValue } from './EditableInputContext';
/* React shipped the compound root as the module default too; the Vue default is the root SFC
   (the parts are the flat named exports above). */
export { default } from './EditableInput.vue';
