<script lang="ts">
export interface EditableInputProps {
  /** The committed value, controlled. The `v-model` binding target. */
  readonly modelValue?: string;

  /** The initial committed value when uncontrolled. */
  readonly defaultValue?: string;

  /** The edit-mode state, controlled. The `v-model:editing` binding target. */
  readonly editing?: boolean;

  /** The initial edit-mode state when uncontrolled. Default `false`. */
  readonly defaultEditing?: boolean;

  /** The preview text shown when the value is empty. */
  readonly placeholder?: string;

  /** Whether blurring the input commits the draft. Default `true`. */
  readonly canSubmitOnBlur?: boolean;

  /** Whether Enter commits the draft. Default `true`. */
  readonly canSubmitOnEnter?: boolean;

  /** Whether Escape discards the draft. Default `true`. */
  readonly canCancelOnEscape?: boolean;

  /** The disabled state. Default `false`. */
  readonly isDisabled?: boolean;

  /** The read-only state. Default `false`. */
  readonly isReadOnly?: boolean;

  /** The hidden input name; the hidden input emits the committed value. */
  readonly name?: string;
}
</script>

<script setup lang="ts">
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, provide, ref, shallowRef, useAttrs, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { EditableInputKey, type EditableInputContextValue } from './EditableInputContext';

/**
 * Renders the inline-edit root, owning the committed value, the draft text and edit mode.
 *
 * Publishes all three to `EditableInputPreview` / `EditableInputInput` / `EditableInputSubmit` / `EditableInputCancel`
 * through injection — React attached those as `EditableInput.Preview` / `.Input` / … statics, which an
 * SFC's default export cannot carry.
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'EditableInput', inheritAttrs: false });

/** The EditableInput tree — preview, input and the submit/cancel buttons. React's `children`. */
defineSlots<{ default(): unknown }>();

const inputProps = withDefaults(defineProps<EditableInputProps>(), {
  defaultEditing: false,

  canSubmitOnBlur: true,
  canSubmitOnEnter: true,
  canCancelOnEscape: true,
  isDisabled: undefined,
  isReadOnly: undefined,
  /* Explicit `undefined` defaults are load-bearing: `useControlled` keys on `=== undefined`,
     and Vue casts an absent `boolean` prop to `false` — without these, `editing`/`editing`
     would read as "controlled, and closed", pinning the control out of edit mode and making
     `defaultEditing` dead. */
  modelValue: undefined,
  editing: undefined,
});
const props = useLocaleDefaults(inputProps, 'EditableInput', { placeholder: 'Click to edit' });

const emit = defineEmits<{
  /** Fires when the reader commits the draft — the `v-model` half. */
  'update:modelValue': [value: string];
  /** Fires when the row enters or leaves edit mode — the `v-model:editing` half. */
  'update:editing': [editing: boolean];
}>();

const attrs = useAttrs();
const field = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);

const valueCtl = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? '',
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const editingCtl = useControlled<boolean>({
  controlled: () => props.editing,
  default: () => props.defaultEditing,
  onChange: (next) => {
    emit('update:editing', next);
  },
});

/* Named `committed` / `editMode`, not `modelValue` / `editing`: a setup const sharing a prop's
   name collides with it in the template scope (`vue/no-dupe-keys`). */
const committed = valueCtl.value;
const editMode = editingCtl.value;

const draft = ref(committed.value);
const inputEl = shallowRef<HTMLInputElement | null>(null);

/* Syncs the draft when entering edit mode or when the committed value changes externally.
   Not `immediate` — `draft` is already seeded from `modelValue` above, and nothing here touches
   the DOM, so there is no first-run work to do. */
watch([editMode, committed], ([isEditing, next]) => {
  if (isEditing) draft.value = next;
});

function submit(): void {
  if (inactive.value) return;
  valueCtl.setValue(draft.value);
  editingCtl.setValue(false);
}

function cancel(): void {
  draft.value = committed.value;
  editingCtl.setValue(false);
}

/* Live getters, not a snapshot — every flag on the root has to reach already-mounted parts. */
provide<EditableInputContextValue>(EditableInputKey, {
  get value() {
    return committed.value;
  },
  get draft() {
    return draft.value;
  },
  setDraft: (next) => {
    if (!inactive.value) draft.value = next;
  },
  get isEditing() {
    return editMode.value;
  },
  setEditing: (next) => {
    if (!next || !inactive.value) editingCtl.setValue(next);
  },
  submit,
  cancel,
  get placeholder() {
    return props.placeholder;
  },
  get isDisabled() {
    return finalDisabled.value;
  },
  get isReadOnly() {
    return finalReadOnly.value;
  },
  get canSubmitOnBlur() {
    return props.canSubmitOnBlur;
  },
  get canSubmitOnEnter() {
    return props.canSubmitOnEnter;
  },
  get canCancelOnEscape() {
    return props.canCancelOnEscape;
  },
  inputEl,
});

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('inline-flex items-center gap-1.5', attrs.class as ClassValue));

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  valueCtl.reset();
  editingCtl.reset();

  draft.value = committed.value;
});
</script>

<template>
  <div :key="formResetRevision" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
    <input
      v-if="name"
      type="hidden"
      :disabled="finalDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="committed"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
