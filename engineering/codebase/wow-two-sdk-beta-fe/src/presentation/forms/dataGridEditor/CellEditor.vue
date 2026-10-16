<script lang="ts">
import { DataGridEditorCellType, type DataGridEditorMove } from './DataGridEditorTypes';

export interface CellEditorProps {
  /** The cell's editable data type — decides which editor renders. Default `text`. */
  readonly type?: DataGridEditorCellType;
  /** The choices for a `select` cell. */
  readonly options?: Array<{ value: string | number; label: string | number }>;
  /** The draft text under edit. */
  readonly modelValue: string;
}

const BaseClass =
  'h-7 w-full rounded-sm border border-input bg-background px-2 text-sm outline-hidden focus-visible:ring-2 focus-visible:ring-ring';
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, onMounted, useTemplateRef } from 'vue';

/**
 * Renders the editor for the active `DataGridEditor` cell, focusing itself on mount.
 *
 * Private to the folder — React kept it in the same file and never exported it, and the folder barrel still does not.
 *
 * React drove focus from the parent through a forwarded ref; here the editor focuses itself on mount, which removes
 * the ref plumbing and is immune to the mount/unmount ordering of two cells swapping in one patch.
 */
defineOptions({ name: 'CellEditor' });

const props = withDefaults(defineProps<CellEditorProps>(), {
  type: undefined,
  options: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader types or picks a value, with the editor's current text. */
  'update:modelValue': [value: string];
  /** Fires when the edit commits, with the cursor advance and the fresh raw text. */
  commit: [move?: DataGridEditorMove, rawValue?: string];
  /** Fires when the edit is abandoned. */
  cancel: [];
}>();

const el = useTemplateRef<HTMLInputElement | HTMLSelectElement>('el');

onMounted(() => {
  const node = el.value;
  if (!node) return;
  node.focus();
  if ('select' in node && typeof node.select === 'function') node.select();
});

const isSelect = computed(() => props.type === DataGridEditorCellType.Select && !!props.options);
const isBoolean = computed(() => props.type === DataGridEditorCellType.Boolean);
const inputType = computed(() => (props.type === DataGridEditorCellType.Number ? 'number' : 'text'));

/** A `<select>` change is both the edit and its commit — React committed with the fresh
    value because the parent's draft state was still stale in the same event. */
function onSelectChange(event: Event): void {
  const next = (event.target as HTMLSelectElement).value;
  emit('update:modelValue', next);
  emit('commit', 'down', next);
}

function onInput(event: Event): void {
  if ((event as InputEvent).isComposing) return;
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}

function onBlur(): void {
  emit('commit');
}

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
}

const locale = useLocale();
</script>

<template>
  <select
    v-if="isSelect"
    ref="el"
    :value="modelValue"
    :class="BaseClass"
    @change="onSelectChange"
    @blur="onBlur"
    @keydown="onKeydown"
  >
    <option v-for="option in options" :key="String(option.value)" :value="String(option.value)">
      {{ String(option.label) }}
    </option>
  </select>
  <select
    v-else-if="isBoolean"
    ref="el"
    :value="modelValue"
    :class="BaseClass"
    @change="onSelectChange"
    @blur="onBlur"
    @keydown="onKeydown"
  >
    <option value="true">{{ locale.t('CellEditor.true', undefined, 'true') }}</option>
    <option value="false">{{ locale.t('CellEditor.false', undefined, 'false') }}</option>
  </select>
  <input
    v-else
    ref="el"
    :type="inputType"
    :value="modelValue"
    :class="BaseClass"
    @input="onInput"
    @compositionend="onInput"
    @blur="onBlur"
    @keydown="onKeydown"
  />
</template>
