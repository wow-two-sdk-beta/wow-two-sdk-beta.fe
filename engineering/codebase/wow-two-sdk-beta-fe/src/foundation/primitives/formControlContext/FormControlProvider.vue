<script lang="ts">
export interface FormControlProviderProps {
  /** The id override for the auto-generated id (also used as control's `id`). */
  readonly id?: string;
  /** The field's error messages — exposed to chrome via context. */
  readonly errors?: ReadonlyArray<string>;
  readonly isInvalid?: boolean;
  readonly isDisabled?: boolean;
  readonly isRequired?: boolean;
  readonly isReadOnly?: boolean;
}

type ChromeCounts = Record<'label' | 'helper' | 'error', number>;
</script>

<script setup lang="ts">
import { provide, shallowRef, useId } from 'vue';
import { FormControlKey, type FormControlChromeKind, type FormControlContextValue } from './FormControlContext';

/**
 * Renders no element of its own — the slot passes straight through — while wiring
 * Label ↔ control ↔ HelperText/ErrorMessage via stable IDs and shared state flags.
 * Used by `Field` (L4) and the forms-engine `Field` glue — atoms (Input, Label,
 * etc.) read via `useFormControl()` to get the right `id`/`for`/`aria-describedby`.
 * Chrome nodes self-register on mount, so `labelledBy`/`describedBy` only ever
 * reference ids that exist in the DOM.
 */
defineOptions({ name: 'FormControlProvider' });

const props = withDefaults(defineProps<FormControlProviderProps>(), {
  isInvalid: false,
  isDisabled: false,
  isRequired: false,
  isReadOnly: false,
});

defineSlots<{
  /** The field subtree — the control plus its label, helper, and error chrome. */
  default(): unknown;
}>();

// Vue 3.5's own `useId` — SSR-stable and hydration-safe, the same guarantee
// React's `useId` gave. The React package wrapped it in `hooks/useId` only to
// add a debug prefix.
const generatedId = useId();

const chrome = shallowRef<ChromeCounts>({ label: 0, helper: 0, error: 0 });

function registerChrome(kind: FormControlChromeKind): () => void {
  chrome.value = { ...chrome.value, [kind]: chrome.value[kind] + 1 };
  return () => {
    chrome.value = { ...chrome.value, [kind]: chrome.value[kind] - 1 };
  };
}

const id = (): string => props.id ?? generatedId;

// Getters, so every field re-reads on access exactly like the React context
// object that was rebuilt each render.
const context: FormControlContextValue = {
  get id() {
    return id();
  },
  get labelId() {
    return `${id()}-label`;
  },
  get helperId() {
    return `${id()}-helper`;
  },
  get errorId() {
    return `${id()}-error`;
  },
  get labelledBy() {
    return chrome.value.label > 0 ? `${id()}-label` : undefined;
  },
  get describedBy() {
    return (
      [chrome.value.helper > 0 && `${id()}-helper`, chrome.value.error > 0 && `${id()}-error`]
        .filter(Boolean)
        .join(' ') || undefined
    );
  },
  get errors() {
    return props.errors;
  },
  get isInvalid() {
    return props.isInvalid;
  },
  get isDisabled() {
    return props.isDisabled;
  },
  get isRequired() {
    return props.isRequired;
  },
  get isReadOnly() {
    return props.isReadOnly;
  },
  registerChrome,
};

provide(FormControlKey, context);
</script>

<template>
  <slot />
</template>
