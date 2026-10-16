<script lang="ts">
import type { NativeTextareaAttributes } from '../NativeControlAttributes';
import type { InputSize, InputState, InputBorder, InputRing } from '../InputStyles';

export interface TextAreaInputProps extends /* @vue-ignore */ NativeTextareaAttributes {
  /** The control size. */
  readonly size?: InputSize;
  /** The validity surface. */
  readonly state?: InputState;
  /** The border weight. */
  readonly border?: InputBorder;
  /** The focus-ring weight. */
  readonly ring?: InputRing;

  /** The visible row count. Default 3. */
  readonly rows?: number;

  /** The value, controlled. The `v-model` binding target. */
  readonly modelValue?: string | number;

  /** The initial value when uncontrolled. */
  readonly defaultValue?: string | number;

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

  /** Draws the control as its own placeholder, inert; defaults to the nearest `DataRegion` first load. */
  readonly isSkeleton?: boolean;
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { useSkeletonState } from '../../feedback/skeletonState/SkeletonStateContext';
import { inputBaseVariants, InputState as InputStateValue } from '../InputStyles';

/** Renders a fixed-height multi-line textarea on the shared input visual base, sized by `rows`. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'TextAreaInput', inheritAttrs: false });

const props = withDefaults(defineProps<TextAreaInputProps>(), {
  rows: 3,
  /* Explicit `undefined` defaults are load-bearing: each flag falls back to the form
     control context, and Vue casts an absent `boolean` prop to `false` — which would
     shadow the context with a hard "not disabled / not required / not read-only". */
  isDisabled: undefined,
  disabled: undefined,
  isRequired: undefined,
  required: undefined,
  readOnly: undefined,
  isReadOnly: undefined,
  readonly: undefined,
  isSkeleton: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the text — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useFormControl();

const controlled = useControlled<string | number>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', String(next));
  },
});

const currentValue = controlled.value;

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  controlled.setValue((event.target as HTMLTextAreaElement).value);
}

const finalState = computed(() => props.state ?? (ctx?.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

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

/* The control keeps its rows, radius and border width; its fill, border colour, value and placeholder are masked. */
const skeleton = useSkeletonState(() => props.isSkeleton);

const rootClass = computed(() =>
  cn(
    inputBaseVariants({
      size: props.size,
      state: finalState.value,
      border: props.border,
      ring: props.ring,
    }),
    'h-auto resize-y py-2',
    attrs.class as ClassValue,
    skeleton.boxClass.value,
    skeleton.isSkeleton.value && 'resize-none',
  ),
);

const root = useTemplateRef<HTMLTextAreaElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
useNativeFormReset(root, controlled.reset, () => {
  if (root.value) root.value.value = String(currentValue.value ?? '');
});

defineExpose({ el: root });
</script>

<template>
  <textarea
    ref="root"
    :rows="rows"
    :id="inputId"
    :value="currentValue"
    :disabled="finalDisabled"
    :required="finalRequired"
    :readonly="finalReadOnly"
    :aria-invalid="isInvalid"
    :aria-describedby="describedBy"
    :data-skeleton="skeleton.isSkeleton.value || undefined"
    :inert="skeleton.isSkeleton.value || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @input="onInput"
    @compositionend="onInput"
  />
</template>
