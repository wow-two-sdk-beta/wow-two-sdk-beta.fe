<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState } from '../InputStyles';

export interface MaskedInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The mask pattern. `#` = digit, `A` = alpha, `*` = alphanumeric, anything else = literal. */
  readonly mask: string;

  /** The value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;

  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;
}

export function applyMask(raw: string, mask: string): string {
  /* Hardening past the React original, which read `mask.length` unguarded: `mask` is a
     required prop, but Vue only WARNS on a missing required prop and then renders, so an
     omitted mask turned every keystroke into a TypeError instead of a console warning.
     Passing the raw value through keeps the control usable while the warning still fires. */
  if (!mask) return raw;
  let out = '';
  let r = 0;
  for (let m = 0; m < mask.length && r < raw.length; m++) {
    const tok = mask[m];
    const ch = raw[r];
    if (!tok || !ch) break;
    if (tok === '#') {
      if (/[0-9]/.test(ch)) {
        out += ch;
        r++;
      } else {
        r++;
        m--;
      }
    } else if (tok === 'A') {
      if (/[A-Za-z]/.test(ch)) {
        out += ch;
        r++;
      } else {
        r++;
        m--;
      }
    } else if (tok === '*') {
      if (/[A-Za-z0-9]/.test(ch)) {
        out += ch;
        r++;
      } else {
        r++;
        m--;
      }
    } else {
      // literal
      out += tok;
      if (ch === tok) r++;
    }
  }
  return out;
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

/**
 * Renders a text input that reformats typing against a mask — `#` digit, `A` letter, `*` alphanumeric.
 *
 * Anything else in the mask is a literal that gets auto-inserted as the reader types.
 *
 * Examples: `"###-###-####"` (US phone), `"##/##/####"` (date), `"AAA-####"`.
 */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'MaskedInput', inheritAttrs: false });

const props = withDefaults(defineProps<MaskedInputProps>(), {
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow it. */
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader types and the masked text changes — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const currentValue = controlled.value;

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue(applyMask((event.target as HTMLInputElement).value, props.mask));
}

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? props.readOnly ?? ctx?.isReadOnly);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'value']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default),
    }),
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLInputElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(currentValue.value ?? '');
});

defineExpose({ el: root });
</script>

<template>
  <input
    ref="root"
    type="text"
    :value="currentValue"
    :id="inputId"
    :disabled="finalDisabled"
    :required="finalRequired"
    :readonly="finalReadOnly"
    :aria-invalid="isInvalid"
    :aria-describedby="describedBy"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @input="onInput"
    @compositionend="onInput"
  />
</template>
