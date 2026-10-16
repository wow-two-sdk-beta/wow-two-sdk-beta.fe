import { inject, toValue, watch, type InjectionKey, type MaybeRefOrGetter } from 'vue';

/** The chrome slots a form control can be described/named by. */
export const FormControlChromeKind = {
  /** Names the control — its rendered id joins `aria-labelledby`. */
  Label: 'label',

  /** Describes the control in the resting case — its id joins `aria-describedby`. */
  Helper: 'helper',

  /** Describes the control's validation failure — its id joins `aria-describedby` and wins over the helper. */
  Error: 'error',
} as const;

/** The chrome slots a form control can be described/named by. */
export type FormControlChromeKind = (typeof FormControlChromeKind)[keyof typeof FormControlChromeKind];

export interface FormControlContextValue {
  readonly id: string;
  readonly labelId: string;
  readonly helperId: string;
  readonly errorId: string;
  /**
   * The `aria-labelledby` target — `labelId` only while a Label chrome is actually
   * mounted, else `undefined`. Widgets that can't be named via `for` (button
   * triggers, ARIA sliders) reference THIS, never `labelId` directly — referencing
   * a non-rendered id is an axe `aria-valid-attr-value` violation.
   */
  readonly labelledBy?: string;
  /**
   * The `aria-describedby` target — only the ids of helper/error chrome actually
   * mounted (space-joined), else `undefined`. Controls wire this verbatim; never
   * hand-compose `helperId`/`errorId` (dangling ids when the chrome isn't rendered).
   */
  readonly describedBy?: string;
  /**
   * The field's error messages (client + server merged, client first) — fed by the
   * forms-engine `Field` glue so error chrome (`FormErrorMessage`) renders them
   * without hand-wiring. `undefined` outside an engine-driven field.
   */
  readonly errors?: ReadonlyArray<string>;
  readonly isInvalid: boolean;
  readonly isDisabled: boolean;
  readonly isRequired: boolean;
  readonly isReadOnly: boolean;
  /** Registers a chrome node (label/helper/error); returns the unregister. Called by {@link useFormControlChrome}. */
  registerChrome: (kind: FormControlChromeKind) => () => void;
}

export const FormControlKey: InjectionKey<FormControlContextValue> = Symbol('wow-two.formControl');

/**
 * Read the surrounding form-control context. Returns `null` when used
 * outside a provider — atoms gracefully degrade to standalone mode.
 *
 * Every field on the returned object is a live getter, so `ctx.describedBy`
 * re-reads on each access. Destructuring takes a one-time snapshot; bind to
 * the object instead.
 */
export function useFormControl(): FormControlContextValue | null {
  return inject(FormControlKey, null);
}

/**
 * Registers a chrome node (label/helper/error) with the surrounding form control
 * while `isRendered` — flips the context's `labelledBy`/`describedBy` to include
 * the node's id only for the frames it actually exists. Call unconditionally;
 * pass `isRendered: false` when the chrome renders nothing or renders under an
 * explicit `id` prop instead of the context id.
 *
 * `isRendered` accepts a ref or getter as well as a plain boolean — the React
 * version re-ran its effect on every render, where Vue needs the reactive source
 * named. `flush: 'post'` is the `useLayoutEffect` equivalent: the registration
 * lands after the DOM updates, before paint.
 */
export function useFormControlChrome(kind: FormControlChromeKind, isRendered: MaybeRefOrGetter<boolean>): void {
  const context = useFormControl();
  watch(
    () => toValue(isRendered),
    (isRenderedNow, _previous, onCleanup) => {
      if (!isRenderedNow || !context) return;
      onCleanup(context.registerChrome(kind));
    },
    { immediate: true, flush: 'post' },
  );
}
