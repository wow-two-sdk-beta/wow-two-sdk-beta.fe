export { default as WizardForm, type WizardFormProps } from './WizardForm.vue';
/* React attached these as `WizardForm.Steps` / `.Step` / `.Footer` via `Object.assign`. An
   SFC's generated default export cannot carry statics cleanly, so they ship as siblings. */
export { default as WizardFormFooter, type WizardFormFooterProps } from './WizardFormFooter.vue';
export { default as WizardFormStep, type WizardFormStepProps } from './WizardFormStep.vue';
export { default as WizardFormSteps, type WizardFormStepsProps } from './WizardFormSteps.vue';
export { useWizard, type StepInfo, type WizardFormContextValue } from './WizardFormContext';
/* React shipped the compound root as the module default too; the Vue default is the root SFC
   (the parts are the flat named exports above). */
export { default } from './WizardForm.vue';
