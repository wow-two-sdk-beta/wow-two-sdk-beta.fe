<script lang="ts">
/** Defines props for the field where a reader types a target's ID to enable a dangerous action. */
export interface TypedConfirmFieldProps {
  /** The exact text the reader types — the target's ID or name. Case and whitespace count. */
  readonly expected: string;

  /** The typed text, controlled. The `v-model` binding target; send it as the API's `confirm`. */
  readonly modelValue?: string;

  /** The initial typed text when uncontrolled. Default `''`. */
  readonly defaultValue?: string;

  /**
   * The label template; `{expected}` marks where the expected text shows as code. Default
   * `"Type {expected} to confirm"`, localized. The `label` slot is the rich override.
   */
  readonly label?: string;

  /** The helper beneath the input, hidden while an error shows. The `helper` slot is the rich override. */
  readonly helper?: string;

  /**
   * The error once the reader leaves the input holding other text; `{expected}` marks the expected text. Default
   * `"Type {expected} exactly as shown."`, localized.
   */
  readonly mismatchError?: string;

  /** The error that replaces the mismatch error — a refusal the API sent back, say. */
  readonly error?: string;

  /** The announcement once the typed text matches. Default `"The text matches."`, localized. */
  readonly matchedLabel?: string;

  /** The required state. Default `true`. */
  readonly isRequired?: boolean;

  /** The disabled state. */
  readonly isDisabled?: boolean;

  /** Keeps the typed text and focus but blocks changes — set it while the confirmed action runs. */
  readonly isReadOnly?: boolean;
}

/** @internal The token a label or error template marks the expected text with. */
const ExpectedToken = '{expected}';
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, useSlots, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../../foundation/styles';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useControlled } from '../../../foundation/state';
import { Announce } from '../../../foundation/primitives';
import CodeText from '../../display/codeText/CodeText.vue';
import Field from '../field/Field.vue';
import TextInput from '../textInput/TextInput.vue';

/**
 * Renders a label naming the expected text, a text input, a helper and an error as one field; the reader types the
 * expected text exactly before a dangerous action runs.
 */
/* `inheritAttrs: false`: `class` lands on the field root through `cn()`; every other attribute reaches the input. */
defineOptions({ name: 'TypedConfirmField', inheritAttrs: false });

defineSlots<{
  /** The rich override for the `label` prop. */
  label?(): unknown;

  /** The rich override for the `helper` prop. */
  helper?(): unknown;
}>();

const componentProps = withDefaults(defineProps<TypedConfirmFieldProps>(), {
  modelValue: undefined,
  defaultValue: '',
  label: undefined,
  helper: undefined,
  mismatchError: undefined,
  error: undefined,
  matchedLabel: undefined,
  isRequired: true,
  isDisabled: undefined,
  isReadOnly: undefined,
});
const props = useLocaleDefaults(componentProps, 'TypedConfirmField', {
  label: 'Type {expected} to confirm',
  mismatchError: 'Type {expected} exactly as shown.',
  matchedLabel: 'The text matches.',
});

const emit = defineEmits<{
  /** Fires when the typed text changes — the `v-model` half. */
  'update:modelValue': [value: string];
}>();

const attrs = useAttrs();
const slots = useSlots();

const controlled = useControlled<string>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (value) => {
    emit('update:modelValue', value);
  },
});

const typed = controlled.value;

/** Whether the typed text equals the expected text exactly; an empty expected text never matches. */
const isConfirmed = computed(() => props.expected.length > 0 && typed.value === props.expected);

/** Whether the reader has left the input once — the mismatch error waits for it. */
const hasLeft = shallowRef(false);

/* A new target starts a new confirmation: the uncontrolled text clears and the mismatch error waits again. */
watch(
  () => props.expected,
  () => {
    hasLeft.value = false;
    if (!controlled.isControlled) controlled.reset();
  },
);

const labelParts = computed(() => props.label.split(ExpectedToken));

const errorText = computed(() => {
  if (props.error) return props.error;
  if (!hasLeft.value || typed.value === '' || isConfirmed.value) return undefined;
  return props.mismatchError.split(ExpectedToken).join(props.expected);
});

const hasHelper = computed(() => Boolean(props.helper) || Boolean(slots.helper));

const rootClass = computed(() => cn(attrs.class as ClassValue));

/** Everything but `class`, which stays on the root. */
const inputAttrs = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

function handleBlur(): void {
  hasLeft.value = true;
}

const inner = useTemplateRef<{ el: HTMLInputElement | null }>('inner');

/** The rendered `<input>`, and whether the typed text matches. */
defineExpose({ el: computed(() => inner.value?.el ?? null), isConfirmed });
</script>

<template>
  <Field
    :class="rootClass"
    :error="errorText"
    :helper="props.helper"
    :is-required="props.isRequired"
    :is-disabled="props.isDisabled"
    :is-read-only="props.isReadOnly"
    :data-confirmed="isConfirmed || undefined"
  >
    <template #label>
      <slot name="label">
        <template v-for="(part, index) in labelParts" :key="index">
          <CodeText v-if="index > 0" class="select-all">{{ props.expected }}</CodeText
          >{{ part }}
        </template>
      </slot>
    </template>
    <template v-if="hasHelper && $slots.helper" #helper>
      <slot name="helper" />
    </template>
    <TextInput
      ref="inner"
      :model-value="typed"
      autocomplete="off"
      autocapitalize="none"
      autocorrect="off"
      spellcheck="false"
      v-bind="inputAttrs"
      @update:model-value="controlled.setValue"
      @blur="handleBlur"
    />
    <Announce>{{ isConfirmed ? props.matchedLabel : '' }}</Announce>
  </Field>
</template>
