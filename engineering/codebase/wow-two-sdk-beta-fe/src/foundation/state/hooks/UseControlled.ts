import { computed, shallowRef, toValue, type MaybeRefOrGetter, type ShallowRef, type WritableComputedRef } from 'vue';

interface UseControlledOptions<T> {
  controlled: MaybeRefOrGetter<T | undefined>;
  default: MaybeRefOrGetter<T>;
  onChange?: (value: T) => void;
}

/** The controlled/uncontrolled handle — a writable value plus the explicit setter it delegates to. */
export interface ControlledValue<T> {
  /**
   * The resolved value. Writable: `value.value = next` runs the same path as `setValue(next)`,
   * so it drops straight into `v-model`. A writable computed rather than a plain ref because the
   * controlled branch must never keep its own copy of the value.
   */
  readonly value: WritableComputedRef<T>;

  /** Sets the next value — updates internal state when uncontrolled, and emits `onChange` only for a distinct value. */
  readonly setValue: (value: T) => void;

  /** Fixed ownership chosen at setup. */
  readonly isControlled: boolean;

  /** Requests the original default through the same ownership path as user edits. */
  readonly reset: () => void;
}

/**
 * Standard controlled/uncontrolled pattern.
 *
 * - If `controlled` initially resolves to a defined value, the component is controlled — internal state is
 *   ignored, `setValue` only fires `onChange`.
 * - Otherwise the component owns its state, `setValue` updates it, and `onChange`
 *   still fires for consumers that want to observe changes.
 *
 * Pass `controlled` as a getter (`() => props.value`) so the controlled branch tracks the prop.
 * `default` is read once, at setup — it seeds the uncontrolled state, exactly as the original's
 * `useState(defaultValue)` did.
 */
export function useControlled<T>({
  controlled,
  default: defaultValue,
  onChange,
}: UseControlledOptions<T>): ControlledValue<T> {
  // Cast: `shallowRef`'s return type is a conditional over an unresolved `T`, which leaves
  // `.value` unassignable until `T` is known. The cast pins it to the shape it always has here.
  const seed = toValue(defaultValue);
  const initialControlled = toValue(controlled);
  const isControlled = initialControlled !== undefined;
  const uncontrolled = shallowRef(seed) as ShallowRef<T>;

  const setValue = (next: T): void => {
    if (Object.is(value.value, next)) return;
    if (!isControlled) uncontrolled.value = next;
    onChange?.(next);
  };

  const value = computed<T>({
    get: () => {
      const external = toValue(controlled);
      if (!isControlled) return uncontrolled.value;
      // Removing a controlled value violates the fixed-mode contract; retain the initial value
      // instead of silently changing ownership.
      return external === undefined ? (initialControlled as T) : external;
    },
    set: setValue,
  });

  return { value, setValue, isControlled, reset: () => setValue(seed) };
}
