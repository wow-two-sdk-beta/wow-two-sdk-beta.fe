import { inject, type InjectionKey } from 'vue';

/** Describes one registered wizard step. */
export interface StepInfo {
  id: string;
  /** React typed this `ReactNode`; it is scalar here because `WizardFormSteps` renders it as
   *  the tab's text. A rich step tab is not part of the original's contract either. */
  label?: string | number;
  isOptional?: boolean;
  isFinal?: boolean;
}

/**
 * The seam between `WizardForm` and its `Steps` / `Step` / `Footer` children.
 *
 * React attached those as `WizardForm.Steps` / `.Step` / `.Footer` statics over a `createContext`,
 * and pre-walked `Children.toArray` to discover step ids before mount. An SFC's default export
 * cannot carry statics and Vue has no children-walk, so the parts ship as siblings and register
 * themselves through provide/inject — the same conversion `checkboxGroup` / `radioGroup` made.
 *
 * Every field but the functions is a live getter — read them off the object, don't destructure.
 */
export interface WizardFormContextValue {
  readonly steps: ReadonlyArray<StepInfo>;
  readonly currentIndex: number;
  readonly currentStep: StepInfo | undefined;
  goTo: (idOrIndex: string | number) => void;
  next: () => Promise<void>;
  back: () => void;
  readonly canGoBack: boolean;
  readonly visited: ReadonlySet<string>;
  registerStep: (info: StepInfo) => void;
  unregisterStep: (id: string) => void;
  registerValidator: (id: string, validator: () => boolean | Promise<boolean>) => void;
  unregisterValidator: (id: string) => void;
  readonly isPending: boolean;
  /** The wizard-scoped prefix for its tab and panel ids, so two wizards never share one. */
  readonly idBase: string;
  /** Whether a `WizardFormSteps` strip is mounted — only then does a tab exist to name each panel. */
  readonly hasStrip: boolean;
  /** Registers a mounted step strip; returns its release. */
  registerStrip: () => () => void;
}

/** The id of a step's tab in the strip, or of its panel — the pair that names and controls each other. */
export function wizardPartId(idBase: string, part: 'tab' | 'panel', stepId: string): string {
  return `${idBase}-${part}-${stepId}`;
}

export const wizardContextKey: InjectionKey<WizardFormContextValue> = Symbol('wow-two.wizard');

/** Reads the surrounding wizard context; throws when used outside a `<WizardForm>`. */
export function useWizard(): WizardFormContextValue {
  const ctx = inject(wizardContextKey, null);
  if (!ctx) throw new Error('useWizard must be used inside <WizardForm>');
  return ctx;
}
