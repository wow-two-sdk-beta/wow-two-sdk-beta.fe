import { computed, shallowRef, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue';

/** Defines the options of a typed confirmation. */
export interface UseTypedConfirmationOptions {
  /**
   * Whether the action asks for the typed confirmation now — a prod target, say. Default `true`. While `false`,
   * `isConfirmed` is `true` and `confirm` is `undefined`.
   */
  readonly isNeeded?: MaybeRefOrGetter<boolean>;
}

/** Defines the live state of a typed confirmation and the operation over it. */
export interface TypedConfirmationControls {
  /** The typed text — bind it to `TypedConfirmField`'s `v-model`. */
  readonly typed: Ref<string>;

  /** Whether the action asks for the typed confirmation now. */
  readonly isNeeded: ComputedRef<boolean>;

  /** Whether the action may run: no confirmation is needed, or the typed text equals the expected text exactly. */
  readonly isConfirmed: ComputedRef<boolean>;

  /** The value for the API's `confirm` member: the typed text while needed, else `undefined`. */
  readonly confirm: ComputedRef<string | undefined>;

  /** Clears the typed text — call it when the dialog opens again. */
  readonly reset: () => void;
}

/**
 * Holds the text a reader types to confirm a dangerous action on `expected`, and clears it whenever `expected`
 * changes, so text typed for one target never confirms another.
 * ```ts
 * const { typed, isConfirmed, confirm } = useTypedConfirmation(() => target.value, { isNeeded: () => isProd.value });
 * // <TypedConfirmField v-if="isProd" v-model="typed" :expected="target" />, then Deploy :is-disabled="!isConfirmed"
 * await start({ target: target.value, ...(confirm.value ? { confirm: confirm.value } : {}) });
 * ```
 */
export function useTypedConfirmation(
  expected: MaybeRefOrGetter<string>,
  options: UseTypedConfirmationOptions = {},
): TypedConfirmationControls {
  const typed = shallowRef('');
  const isNeeded = computed(() => toValue(options.isNeeded) ?? true);
  const isMatched = computed(() => {
    const target = toValue(expected);
    return target.length > 0 && typed.value === target;
  });
  const isConfirmed = computed(() => !isNeeded.value || isMatched.value);
  const confirm = computed(() => (isNeeded.value ? typed.value : undefined));

  const reset = (): void => {
    typed.value = '';
  };

  watch(() => toValue(expected), reset);

  return { typed, isNeeded, isConfirmed, confirm, reset };
}
