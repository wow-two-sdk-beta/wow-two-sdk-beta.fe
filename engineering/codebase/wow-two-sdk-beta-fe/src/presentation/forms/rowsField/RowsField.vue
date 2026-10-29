<script lang="ts">
/** Defines one column of a rows field: the record key its cells edit and the heading over them. */
export interface RowsFieldColumn {
  /** The record key the column's cells edit; it keys the cell slot. */
  readonly key: string;

  /** The heading over the column, and the label over each cell on phones. */
  readonly label: string;
}

/** Defines one rendered row — a stable `key` for identity through reorder plus its live index (`FieldArrayRow`). */
export interface RowsFieldRow {
  /** The row's stable identity. */
  readonly key: string;

  /** The row's current position in the list. */
  readonly index: number;
}

/** Defines props for the field that edits a list of records, a row of cells each. */
export interface RowsFieldProps {
  /** The list's legend. */
  readonly label: string;

  /** The columns, left to right. */
  readonly columns: ReadonlyArray<RowsFieldColumn>;

  /** The rows to render — `useFieldArray(form, path).rows` in a form. */
  readonly rows: ReadonlyArray<RowsFieldRow>;

  /** The add control's text. Default `"Add row"`, localized. */
  readonly addLabel?: string;

  /** The remove control's name; `{row}` marks the row's 1-based number. Default `"Remove row {row}"`, localized. */
  readonly removeLabel?: string;

  /** The list's own refusals — too few rows, a duplicate — shown under the rows. */
  readonly errors?: ReadonlyArray<string>;

  /** Disables the add and remove controls. */
  readonly isDisabled?: boolean;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { Plus, X } from 'lucide-vue-next';
import { ButtonType } from '../../../foundation/dom';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { cn } from '../../../foundation/styles';
import Button from '../../actions/button/Button.vue';

/**
 * Renders a list of records as rows of cells: column headings, a remove control per row, the list's own refusals and
 * one add control. Below the `sm` breakpoint the headings give way to a label over each cell and every record stacks
 * in its own bordered block. Engine-free: the caller renders each cell's input through the `cell` slot, typically a
 * `form.Field` over `useFieldArray`.
 */
defineOptions({ name: 'RowsField', inheritAttrs: false });

defineSlots<{
  /** One cell's input; `label` is its accessible name, the column heading plus the row number. */
  cell(props: { row: RowsFieldRow; column: RowsFieldColumn; label: string }): unknown;
}>();

const componentProps = withDefaults(defineProps<RowsFieldProps>(), {
  addLabel: undefined,
  removeLabel: undefined,
  errors: () => [],
  isDisabled: false,
});
const props = useLocaleDefaults(componentProps, 'RowsField', {
  addLabel: 'Add row',
  removeLabel: 'Remove row {row}',
});

const emit = defineEmits<{
  /** Fires when the reader asks for a new row; append a blank record. */
  add: [];

  /** Fires when the reader removes a row, with its index. */
  remove: [index: number];
}>();

const attrs = useAttrs();

/** The columns from `sm` up, then the remove control's column; below it each row stacks. */
const grid = computed(() => ({ '--rows-columns': `repeat(${props.columns.length}, minmax(0, 1fr)) auto` }));

const classes = computed(() => cn('flex min-w-0 flex-col gap-2', attrs.class as string | undefined));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The remove control's name for a row. */
function removeName(row: RowsFieldRow): string {
  return props.removeLabel.replace('{row}', String(row.index + 1));
}
</script>

<template>
  <fieldset v-bind="rest" :class="classes">
    <legend class="mb-1 text-sm font-medium text-foreground">{{ props.label }}</legend>
    <div
      v-if="props.rows.length"
      data-rows-headings
      class="hidden gap-2 text-xs text-muted-foreground sm:grid sm:[grid-template-columns:var(--rows-columns)]"
      :style="grid"
      aria-hidden="true"
    >
      <span v-for="column in props.columns" :key="column.key">{{ column.label }}</span>
      <span class="w-10" />
    </div>
    <div
      v-for="row in props.rows"
      :key="row.key"
      data-rows-row
      class="flex min-w-0 flex-col gap-2 rounded-md border border-border p-3 sm:grid sm:items-start sm:rounded-none sm:border-0 sm:p-0 sm:[grid-template-columns:var(--rows-columns)]"
      :style="grid"
    >
      <div v-for="column in props.columns" :key="column.key" data-rows-cell class="flex min-w-0 flex-col gap-1">
        <span class="text-xs text-muted-foreground sm:hidden" aria-hidden="true">{{ column.label }}</span>
        <slot name="cell" :row="row" :column="column" :label="`${column.label} ${row.index + 1}`" />
      </div>
      <Button
        :type="ButtonType.Button"
        variant="ghost"
        tone="neutral"
        size="md"
        shape="square"
        class="self-end sm:self-auto"
        :aria-label="removeName(row)"
        :is-disabled="props.isDisabled"
        @click="emit('remove', row.index)"
      >
        <Icon :icon="X" :size="14" />
      </Button>
    </div>
    <p v-for="message in props.errors" :key="message" role="alert" class="text-sm text-destructive-soft-foreground">
      {{ message }}
    </p>
    <Button
      :type="ButtonType.Button"
      variant="outline"
      tone="neutral"
      size="sm"
      class="self-start"
      :is-disabled="props.isDisabled"
      @click="emit('add')"
    >
      <template #leading><Icon :icon="Plus" :size="14" /></template>
      {{ props.addLabel }}
    </Button>
  </fieldset>
</template>
