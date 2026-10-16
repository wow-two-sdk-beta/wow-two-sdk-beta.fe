<script lang="ts">
export interface KeyboardShortcutPickerProps {
  /** The captured chord, controlled. The `v-model` binding target. */
  readonly modelValue?: ReadonlyArray<string>;

  /** The initial chord when uncontrolled. */
  readonly defaultValue?: ReadonlyArray<string>;

  /** The idle label. Fill the `placeholder` slot for richer content. */
  readonly placeholder?: string | number;

  /** The listening label. Fill the `recordLabel` slot for richer content. */
  readonly recordLabel?: string | number;

  /** The hidden input name; the hidden input emits the `+`-joined chord. */
  readonly name?: string;

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
}

// SSR-safe: `navigator` is undefined in Node < 21.
const IsMac = typeof navigator !== 'undefined' && navigator.platform?.toLowerCase().includes('mac');

const ModifierNames: Record<string, string> = {
  Control: 'Ctrl',
  Meta: IsMac ? '⌘' : 'Meta',
  Alt: 'Alt',
  Shift: 'Shift',
};

function isModifier(key: string): boolean {
  return ['Control', 'Meta', 'Alt', 'Shift'].includes(key);
}

function normalizeKey(key: string): string {
  if (key === ' ') return 'Space';
  if (key.length === 1) return key.toUpperCase();
  return key;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, ref, watch, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useEventListener } from '../../../foundation/dom';
import { useFormControl } from '../../../foundation/primitives';
import KbdText from '../../display/kbdText/KbdText.vue';

/**
 * Renders a record button that captures the next key chord the reader presses.
 *
 * While listening, Escape cancels the recording and Backspace clears the chord; a captured chord
 * is a normalized name array such as `['Meta', 'Shift', 'K']`.
 */
/* `inheritAttrs: false` so `class` folds into the button's own `cn()` call, and so the rest of
   the attrs land on the button rather than being dropped by the multi-root template. */
defineOptions({ name: 'KeyboardShortcutPicker', inheritAttrs: false });

const inputProps = withDefaults(defineProps<KeyboardShortcutPickerProps>(), {
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  isDisabled: undefined,
  disabled: undefined,
  isReadOnly: undefined,
  readonly: undefined,
});
const props = useLocaleDefaults(inputProps, 'KeyboardShortcutPicker', {
  placeholder: 'Click to record',
  recordLabel: 'Press keys…',
});

const emit = defineEmits<{
  /** Fires when the reader records or clears a chord — the `v-model` half. */
  'update:modelValue': [keys: ReadonlyArray<string>];
}>();

defineSlots<{
  placeholder?(): unknown;
  recordLabel?(): unknown;
}>();

const attrs = useAttrs();

/* Inherits id/disabled/invalid/labelledby/describedby from a surrounding <Field>;
   standalone props win when provided, context fills the gaps (SelectPicker parity). */
const field = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? props.disabled ?? field?.isDisabled);
const finalReadOnly = computed(() => props.isReadOnly ?? props.readonly ?? field?.isReadOnly);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);

const controlled = useControlled<ReadonlyArray<string>>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? [],
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const keys = controlled.value;
const recording = ref(false);
const button = useTemplateRef<HTMLButtonElement>('button');
watch(inactive, (value) => {
  if (value) recording.value = false;
});

/* Never declared props — a declared `'aria-label'` would arrive as `props.ariaLabel` and stop
   reaching the DOM. Read off the attrs so the consumer's value can override the context's. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
const ariaLabelledBy = computed(() => attrs[AriaAttribute.LabelledBy] as string | undefined);
const ariaDescribedBy = computed(() => attrs[AriaAttribute.DescribedBy] as string | undefined);

/* The document listeners are attached only while recording: the target getter returns `null`
   otherwise, which is what detaches them. `useEventListener` is post-flush and guards
   `typeof document`, so nothing here reaches the DOM during SSR. */
const listenerTarget = computed<Document | null>(() => {
  if (!recording.value || inactive.value) return null;
  return button.value?.ownerDocument ?? null;
});

useEventListener(
  'keydown',
  (event) => {
    const e = event as KeyboardEvent;
    if (e.defaultPrevented || e.isComposing || inactive.value) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.key === 'Escape') {
      recording.value = false;
      return;
    }
    if (e.key === 'Backspace') {
      controlled.setValue([]);
      recording.value = false;
      return;
    }
    if (isModifier(e.key)) return;
    const captured: Array<string> = [];
    if (e.metaKey) captured.push('Meta');
    if (e.ctrlKey) captured.push('Control');
    if (e.altKey) captured.push('Alt');
    if (e.shiftKey) captured.push('Shift');
    captured.push(normalizeKey(e.key));
    controlled.setValue(captured);
    recording.value = false;
  },
  listenerTarget,
  true,
);

useEventListener(
  'pointerdown',
  (event) => {
    const target = (event as MouseEvent).target as Node | null;
    if (button.value && target && !button.value.contains(target)) recording.value = false;
  },
  listenerTarget,
);

function startRecord(): void {
  if (inactive.value) return;
  recording.value = true;
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.defaultPrevented) return;
  if (recording.value) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    startRecord();
  }
}

function modifierLabel(key: string): string {
  return ModifierNames[key] ?? key;
}

const buttonId = computed(() => props.id ?? field?.id);
/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => ariaLabelledBy.value ?? (ariaLabel.value ? undefined : field?.labelledBy));
const describedBy = computed(() => ariaDescribedBy.value ?? field?.describedBy);
const hiddenValue = computed(() => keys.value.join('+'));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', AriaAttribute.LabelledBy, AriaAttribute.DescribedBy]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const buttonClass = computed(() =>
  cn(
    'inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
    recording.value && 'border-primary bg-primary-soft text-primary-soft-foreground',
    attrs.class as ClassValue,
  ),
);

/** The rendered `<button>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: button });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <button
    :key="formResetRevision"
    ref="button"
    type="button"
    :id="buttonId"
    :aria-pressed="recording"
    :aria-invalid="field?.isInvalid || undefined"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :disabled="inactive"
    :class="buttonClass"
    v-bind="passthroughAttrs"
    @click="startRecord"
    @keydown="onKeydown"
  >
    <span v-if="recording" class="text-xs text-muted-foreground">
      <slot name="recordLabel">{{ props.recordLabel }}</slot>
    </span>
    <span v-else-if="keys.length === 0" class="text-xs text-muted-foreground">
      <slot name="placeholder">{{ props.placeholder }}</slot>
    </span>
    <span v-else class="inline-flex items-center gap-1 text-muted-foreground">
      <template v-for="(k, i) in keys" :key="k">
        <span v-if="i > 0" aria-hidden="true">+</span>
        <KbdText>{{ modifierLabel(k) }}</KbdText>
      </template>
    </span>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </button>
  <input
    v-if="name"
    type="hidden"
    :disabled="finalDisabled"
    :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
    :name="name"
    :value="hiddenValue"
  />
</template>
