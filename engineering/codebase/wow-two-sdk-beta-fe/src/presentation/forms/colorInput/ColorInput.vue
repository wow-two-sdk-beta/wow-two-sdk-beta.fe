<script lang="ts">
import type { NativeInputAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';
import type { SwatchShape } from '../../display/colorSwatchPreview';

export interface ColorInputProps extends /* @vue-ignore */ NativeInputAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The committed hex, controlled. The `v-model` binding target. */
  readonly modelValue?: string | null;

  /** The initial hex when uncontrolled. */
  readonly defaultValue?: string | null;

  /** The swatch outline shape shown inside the field. */
  readonly swatchShape?: SwatchShape;

  /** Whether a committed hex keeps its alpha channel (`#RRGGBBAA`). */
  readonly hasAlpha?: boolean;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's `isDisabled`. */
  readonly isDisabled?: boolean;

  /** @deprecated Use `isDisabled`; this alias is removed next release. */
  readonly disabled?: boolean;
  /** Keeps the value but blocks changes. Falls back to the surrounding field's `isReadOnly`. */
  readonly isReadOnly?: boolean;

  /** @deprecated Use `isReadOnly`; this alias is removed next release. */
  readonly readonly?: boolean;

  /** The required state. Falls back to the surrounding field's `isRequired`. */
  readonly isRequired?: boolean;

  /** @deprecated Use `isRequired`; this alias is removed next release. */
  readonly required?: boolean;
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';
import { formatHex, parseHex } from '../ColorExtensions';
import ColorSwatchPreview from '../../display/colorSwatchPreview/ColorSwatchPreview.vue';
import { SwatchShape as SwatchShapeValue } from '../../display/colorSwatchPreview';

/** Renders a hex text field with a live swatch, committing on blur or Enter and reverting an unparseable draft. */
/* `inheritAttrs: false` so `class` folds into the input's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorInput', inheritAttrs: false });

const props = withDefaults(defineProps<ColorInputProps>(), {
  swatchShape: SwatchShapeValue.Square,
  hasAlpha: false,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form control
     context, and Vue casts an absent `boolean` prop to `false` — which would shadow the
     context with a hard "not disabled / not required". */
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isRequired: undefined,
  required: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader commits a new hex on blur or Enter — the `v-model` half. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<string | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL committed value ("no color"), and `??` would
     fall through it to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const committed = controlled.value;

/** The in-flight text — free-form while typing, reconciled with `committed` on commit. */
const draft = ref<string>(committed.value ?? '');

/* Syncs the draft when the committed value changes from the outside. */
watch(committed, (next) => {
  draft.value = next ?? '';
});

function commitHex(text: string, hasAlpha: boolean): string | null {
  const normalised = text.startsWith('#') ? text : `#${text}`;
  const rgb = parseHex(normalised);
  if (!rgb) return null;
  return formatHex(rgb, { withAlpha: hasAlpha });
}

function commit(): void {
  if (finalDisabled.value || finalReadOnly.value) return;
  if (!draft.value) {
    controlled.setValue(null);
    return;
  }
  const next = commitHex(draft.value, props.hasAlpha);
  if (next) {
    controlled.setValue(next);
    draft.value = next;
  } else {
    /* Invalid — revert. */
    draft.value = committed.value ?? '';
  }
}

function onInput(event: Event): void {
  if (event.defaultPrevented || finalDisabled.value || finalReadOnly.value) {
    (event.target as HTMLInputElement).value = String(committed.value ?? '');
    return;
  }
  if ((event as InputEvent).isComposing) return;
  draft.value = (event.target as HTMLInputElement).value;
}

/* Runs after any caller-supplied `@blur` (declared after `v-bind`). Not gated on
   `defaultPrevented`, unlike `onKeydown` below. */
function onBlur(): void {
  commit();
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented) return;
  if (event.key === 'Enter') {
    event.preventDefault();
    commit();
  }
}

const swatchColor = computed(() => committed.value ?? '#00000000');

const inputId = computed(() => props.id ?? ctx?.id);
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? ctx?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? ctx?.isReadOnly ?? false);
const finalRequired = computed(() => props.isRequired ?? props.required ?? ctx?.isRequired);
const isInvalid = computed(() => ctx?.isInvalid || undefined);
const describedBy = computed(() => ctx?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'value']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const inputClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default),
      border: props.border,
      ring: props.ring,
    }),
    'pl-9 font-mono uppercase',
    attrs.class as ClassValue,
  ),
);

const root = useTemplateRef<HTMLInputElement>('root');

/** The rendered `<input>`. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(draft.value ?? '');
});

defineExpose({ el: root });
</script>

<template>
  <div class="relative inline-flex w-full items-stretch">
    <span class="pointer-events-none absolute inset-y-0 left-2 flex items-center">
      <ColorSwatchPreview :color="swatchColor" size="sm" :shape="swatchShape" />
    </span>
    <input
      ref="root"
      type="text"
      :id="inputId"
      :disabled="finalDisabled"
      :required="finalRequired"
      :readonly="finalReadOnly"
      :aria-invalid="isInvalid"
      :aria-describedby="describedBy"
      :spellcheck="false"
      autocapitalize="none"
      autocorrect="off"
      :value="draft"
      :class="inputClass"
      v-bind="passthroughAttrs"
      @input="onInput"
      @compositionend="onInput"
      @blur="onBlur"
      @keydown="onKeydown"
    />
  </div>
</template>
