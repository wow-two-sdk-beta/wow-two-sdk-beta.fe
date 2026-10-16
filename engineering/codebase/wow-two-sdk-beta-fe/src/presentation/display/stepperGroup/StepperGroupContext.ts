import { inject, type InjectionKey } from 'vue';
import type { Orientation } from '../../../foundation/styles';

/** Defines a step's position relative to the active step. */
export const StepStatus = {
  /** Refers to a step ahead of the active one (not yet reached). */
  Pending: 'pending',
  /** Refers to the currently active step. */
  Active: 'active',
  /** Refers to a step behind the active one (already passed). */
  Complete: 'complete',
} as const;

export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

/**
 * The seam between `StepperGroup` and its `StepperGroupList` / `StepperGroupStep` / `StepperGroupPanel` children.
 *
 * React attached those as `StepperGroup.List` / `.Step` / `.Panel` statics over a `createContext`.
 * An SFC's generated default export cannot carry statics cleanly, so they ship as sibling
 * components and share state through provide/inject instead.
 *
 * Every field but the setters is a live getter — read them off the object, don't destructure.
 */
export interface StepperGroupContextValue {
  /** The active step value. */
  readonly value: string;
  /** Selects a step. */
  setValue: (value: string) => void;
  /** The layout axis. */
  readonly orientation: Orientation;
  /** The id prefix shared by every step / panel pair. */
  readonly baseId: string;
  /**
   * The registered step values in mount order.
   *
   * React kept this in a `useRef` array, which never re-rendered a step when a sibling
   * registered — the very first step could render its connector against a stale length.
   * A reactive array here closes that, and matches how `SelectPicker` registers its items.
   */
  readonly steps: ReadonlyArray<string>;
  registerStep: (token: symbol, value: string) => void;
  unregisterStep: (token: symbol) => void;
}

export const StepperGroupKey: InjectionKey<StepperGroupContextValue> = Symbol('wow-two.stepper');

/** Reads the surrounding stepper context; throws when used outside a `<StepperGroup>`. */
export function useStepperContext(): StepperGroupContextValue {
  const context = inject(StepperGroupKey, null);
  if (!context) throw new Error('StepperGroup.* must be used inside <StepperGroup>');
  return context;
}
