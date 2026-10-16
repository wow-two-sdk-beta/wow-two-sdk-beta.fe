<script lang="ts">
import type { SelectPickerSize } from '../selectPicker';

/** Defines one node of a tree-select picker. */
export interface TreeSelectNode {
  /** The node's identity — the model value for a leaf, the expansion key for a branch. */
  readonly value: string;

  /** The visible text. */
  readonly label: string;

  /** The nested nodes; a node with children is a branch and cannot be picked itself. */
  readonly children?: ReadonlyArray<TreeSelectNode>;

  /** Blocks picking the leaf, or expanding the branch. */
  readonly isDisabled?: boolean;
}

/** Defines props for the tree-select picker. */
export interface TreeSelectPickerProps {
  /** The tree's top-level nodes. */
  readonly nodes: ReadonlyArray<TreeSelectNode>;

  /** The picked leaf's value, controlled. The `v-model` binding target; `null` picks nothing. */
  readonly modelValue?: string | null;

  /** The initial leaf when uncontrolled. */
  readonly defaultValue?: string | null;

  /** Whether the trigger shows the leaf's full path (`Europe / France / Paris`). Default `false`. */
  readonly isPathShown?: boolean;

  /** The trigger text with nothing picked. Default `"Pick an item"`, localized. */
  readonly placeholder?: string;

  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The trigger's id. Auto-filled from `Field` context when omitted. */
  readonly id?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Prevents changes while keeping the value submitted. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The hidden input name; the leaf value ships with the form. */
  readonly name?: string;
}

/** @internal A leaf's label and the labels and values of the branches above it. */
interface LeafEntry {
  readonly label: string;
  readonly path: ReadonlyArray<string>;
  readonly ancestors: ReadonlyArray<string>;
}

/** @internal Indexes every leaf by value. */
function indexLeaves(
  nodes: ReadonlyArray<TreeSelectNode>,
  path: ReadonlyArray<string> = [],
  ancestors: ReadonlyArray<string> = [],
  into = new Map<string, LeafEntry>(),
): Map<string, LeafEntry> {
  for (const node of nodes) {
    if (node.children && node.children.length > 0) {
      indexLeaves(node.children, [...path, node.label], [...ancestors, node.value], into);
    } else {
      into.set(node.value, { label: node.label, path: [...path, node.label], ancestors });
    }
  }
  return into;
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { TreeViewer } from '../../display';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { InputState } from '../InputStyles';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import { useNativeFormReset } from '../UseNativeFormReset';
import TreeSelectPickerNode from './TreeSelectPickerNode.vue';

/** Renders a trigger that opens a tree of options and shows the picked leaf. */
defineOptions({ name: 'TreeSelectPicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<TreeSelectPickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  isPathShown: false,
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'TreeSelectPicker', { placeholder: 'Pick an item' });

const emit = defineEmits<{
  /** Fires when the reader picks a leaf — the `v-model` half. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();
const field = useFormControl();

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

const controlled = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});
const value = controlled.value;

const open = ref(false);
const leaves = computed(() => indexLeaves(props.nodes));
const picked = computed(() => (value.value === null ? undefined : leaves.value.get(value.value)));

/** Opens with the picked leaf's branches expanded, so the pick is in view. */
const initialExpanded = computed(() => [...(picked.value?.ancestors ?? [])]);

function onPick(next: string): void {
  if (disabled.value || readOnly.value) return;
  controlled.setValue(next);
  open.value = false;
}

const displayText = computed(() => {
  if (!picked.value) return value.value ?? props.placeholder;
  return props.isPathShown ? picked.value.path.join(' / ') : picked.value.label;
});

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const formId = computed(() => (typeof attrs.form === 'string' ? attrs.form : undefined));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'form', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const triggerClass = computed(() =>
  cn(
    selectTriggerVariants({ size: props.size, state: invalid.value ? InputState.Invalid : InputState.Default }),
    attrs.class as ClassValue,
  ),
);
const labelClass = computed(() => cn('truncate', !picked.value && value.value === null && 'text-muted-foreground'));

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <Popover :key="formResetRevision" v-model:open="open" placement="bottom-start" :offset="6">
    <PopoverTrigger
      :id="props.id ?? field?.id"
      :disabled="disabled || readOnly"
      :aria-invalid="invalid || undefined"
      :aria-label="ariaLabel"
      :aria-labelledby="labelledBy"
      :aria-describedby="field?.describedBy"
      :class="triggerClass"
      v-bind="passthroughAttrs"
    >
      <span :class="labelClass">{{ displayText }}</span>
      <ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
    </PopoverTrigger>
    <PopoverContent class="max-h-80 min-w-56 overflow-y-auto p-1">
      <TreeViewer
        :model-value="value"
        :default-expanded="initialExpanded"
        :aria-label="ariaLabel"
        :aria-labelledby="labelledBy"
        @update:model-value="onPick"
      >
        <TreeSelectPickerNode v-for="node in props.nodes" :key="node.value" :node="node" />
      </TreeViewer>
    </PopoverContent>
    <input
      v-if="props.name"
      type="hidden"
      :disabled="disabled"
      :form="formId"
      :name="props.name"
      :value="value ?? ''"
    />
    <input ref="formResetAnchor" type="hidden" :form="formId" aria-hidden="true" />
  </Popover>
</template>
