<script lang="ts">
import type { Placement } from '@floating-ui/vue';

export interface MultiSelectPickerProps {
  /** The selected values, controlled. The `v-model` binding target. */
  readonly modelValue?: ReadonlyArray<string>;

  /** The initial selected values when uncontrolled. */
  readonly defaultValue?: ReadonlyArray<string>;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents editing while preserving selected values in form submission. */
  readonly isReadOnly?: boolean;

  /** The hidden-input name; one hidden input is rendered per selected value. */
  readonly name?: string;

  /** The invalid surface override. Falls back to the surrounding form control's `isInvalid`. */
  readonly isInvalid?: boolean;

  /** The initial open state of the dropdown when uncontrolled. */
  readonly defaultOpen?: boolean;

  /** The dropdown open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The floating placement of the dropdown. */
  readonly placement?: Placement;

  /**
   * Resolves a chip label for a value whose row has not mounted yet — `null` when unknown.
   *
   * `MultiSelectPickerItem` registers its label only while the panel is open, so a preselected
   * value renders as its raw key until the first open. Supply this (or open the panel) to
   * label a closed trigger. The mirror of `SelectPicker`'s prop of the same name.
   */
  readonly getOptionLabel?: (value: string) => string | number | null;
}
</script>

<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, provide, ref } from 'vue';
import { useControlled } from '../../../foundation/state';
import { useFormControl } from '../../../foundation/primitives';
import { Popover } from '../../overlays';
import { multiSelectContextKey, type MultiSelectPickerContextValue } from './MultiSelectPickerContext';

/** Renders a many-choice dropdown — the popover hosting trigger and panel, plus one hidden input per value. */
defineOptions({ name: 'MultiSelectPicker', inheritAttrs: false });

/** The MultiSelectPicker tree — trigger and content. React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<MultiSelectPickerProps>(), {
  defaultOpen: false,
  placement: 'bottom',
  /* Explicit `undefined` defaults are load-bearing: `useControlled` keys on `=== undefined`,
     and Vue casts an absent `boolean` prop to `false`. Without these, `open` would
     read as "controlled, and closed" — pinning the dropdown shut and making `defaultOpen`
     dead — and `isDisabled`/`isInvalid` would shadow the surrounding `<Field>` context. */
  modelValue: undefined,
  open: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader adds or removes a selection — the `v-model` half, carrying the whole set. */
  'update:modelValue': [values: ReadonlyArray<string>];
  /** Fires when the reader opens or dismisses the dropdown — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

/* `field` is a live-getter object — read fields off it, never destructure. */
const field = useFormControl();

const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const finalReadOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const inactive = computed(() => finalDisabled.value || finalReadOnly.value);
const finalInvalid = computed(() => props.isInvalid ?? field?.isInvalid);

const openCtl = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});

const valuesCtl = useControlled<ReadonlyArray<string>>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? [],
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const labels = ref<Record<string, string | number>>({});

function registerLabel(value: string, label: string | number): void {
  if (labels.value[value] === label) return;
  labels.value = { ...labels.value, [value]: label };
}

function unregisterLabel(value: string): void {
  if (!(value in labels.value)) return;
  const next = { ...labels.value };
  delete next[value];
  labels.value = next;
}

/* Wrapped rather than passed through: the context field is non-optional, so consumers read
   one shape whether or not the prop was supplied. The `Fn` suffix is not cosmetic — a local
   named exactly like a declared prop trips `vue/no-dupe-keys`, which is why `SelectPicker` spells
   its own the same way. */
function getOptionLabelFn(value: string): string | number | null {
  return props.getOptionLabel?.(value) ?? null;
}

provide<MultiSelectPickerContextValue>(multiSelectContextKey, {
  get open() {
    return openCtl.value.value;
  },
  setOpen: (next) => {
    if (!next || !inactive.value) openCtl.setValue(next);
  },
  get values() {
    return valuesCtl.value.value;
  },
  setValues: (next) => {
    if (!inactive.value) valuesCtl.setValue([...new Set(next)]);
  },
  get labels() {
    return labels.value;
  },
  registerLabel,
  unregisterLabel,
  getOptionLabel: getOptionLabelFn,
  get isDisabled() {
    return inactive.value;
  },
  get name() {
    return props.name;
  },
  get isInvalid() {
    return finalInvalid.value;
  },
  get fieldId() {
    return field?.id;
  },
  get labelId() {
    return field?.labelledBy;
  },
  get describedBy() {
    return field?.describedBy;
  },
});

const isOpenNow = computed(() => openCtl.value.value);
const selected = computed(() => valuesCtl.value.value);

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  openCtl.reset();
  valuesCtl.reset();
});
</script>

<template>
  <Popover
    :key="formResetRevision"
    :open="isOpenNow"
    :placement="placement"
    :offset="6"
    @update:open="openCtl.setValue"
  >
    <slot />
    <!-- Always-rendered — inside PopoverContent they would vanish from form submission when closed. -->
    <template v-if="name">
      <input
        v-for="v in selected"
        :key="v"
        type="hidden"
        :disabled="finalDisabled"
        :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
        :name="name"
        :value="v"
      />
    </template>
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </Popover>
</template>
