<script lang="ts">
/** Defines one option a transfer picker can move between its lists. */
export interface TransferOption<K> {
  /** The option's identity, carried in the model. */
  readonly key: K;

  /** The visible text; also what the search matches. */
  readonly label: string;

  /** The secondary line under the label. */
  readonly description?: string;

  /** Keeps the option where it is. */
  readonly isDisabled?: boolean;
}

/** Defines props for the dual-list transfer picker. */
export interface TransferPickerProps<K> {
  /** Every option, in the order both lists show them. */
  readonly options: ReadonlyArray<TransferOption<K>>;

  /** The keys in the target list, controlled. The `v-model` binding target. */
  readonly modelValue?: ReadonlyArray<K>;

  /** The initial target keys when uncontrolled. */
  readonly defaultValue?: ReadonlyArray<K>;

  /** The source list's heading. Default `"Available"`, localized. */
  readonly sourceLabel?: string;

  /** The target list's heading. Default `"Selected"`, localized. */
  readonly targetLabel?: string;

  /** Whether each list offers a search box. */
  readonly isSearchable?: boolean;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** The hidden input name; each target key ships as its own value. */
  readonly name?: string;
}

/** @internal The two lists. */
type TransferSide = 'source' | 'target';

/** @internal The move buttons' shared look. */
const MoveButtonClass =
  'grid size-8 place-items-center rounded-md border border-border bg-background text-muted-foreground ' +
  'transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 ' +
  'focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40';
</script>

<script setup lang="ts" generic="K">
import { computed, ref, useAttrs, type Ref } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next';
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { inputBaseVariants } from '../InputStyles';
import { ListboxPicker, ListboxPickerEmpty, ListboxPickerItem } from '../listboxPicker';

/**
 * Renders two lists side by side — what is available and what is selected — with buttons that move the checked
 * options, or all of them, across.
 */
defineOptions({ name: 'TransferPicker', inheritAttrs: false });

defineSlots<{
  /** Replaces an option's content in either list. */
  option?(props: { option: TransferOption<K>; side: TransferSide }): unknown;
}>();

const componentProps = withDefaults(defineProps<TransferPickerProps<K>>(), {
  modelValue: undefined,
  defaultValue: () => [],
  isSearchable: false,
  isDisabled: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'TransferPicker', {
  sourceLabel: 'Available',
  targetLabel: 'Selected',
});

const emit = defineEmits<{
  /** Fires when the reader moves options across — the `v-model` half, in target order. */
  'update:modelValue': [keys: K[]];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();
const sourceHeadingId = useId('transfer-source');
const targetHeadingId = useId('transfer-target');

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);

const controlled = useControlled<ReadonlyArray<K>>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue,
  onChange: (next) => {
    emit('update:modelValue', [...next]);
  },
});
const value = controlled.value;

const optionByKey = computed(() => new Map(props.options.map((option) => [option.key, option])));
const targetKeys = computed(() => new Set(value.value));

/** The source list — every option not in the target, in option order. */
const sourceOptions = computed(() => props.options.filter((option) => !targetKeys.value.has(option.key)));

/** The target list — in model order, skipping keys no option describes. */
const targetOptions = computed(() =>
  value.value.flatMap((key) => {
    const option = optionByKey.value.get(key);
    return option ? [option] : [];
  }),
);

const queries: Record<TransferSide, Ref<string>> = { source: ref(''), target: ref('') };
const checked: Record<TransferSide, Ref<K[]>> = { source: ref([]) as Ref<K[]>, target: ref([]) as Ref<K[]> };

/** Whether an option matches its list's search. */
function matches(option: TransferOption<K>, side: TransferSide): boolean {
  const query = queries[side].value.trim().toLocaleLowerCase(locale.locale.value);
  return query === '' || option.label.toLocaleLowerCase(locale.locale.value).includes(query);
}

const visible = computed<Record<TransferSide, ReadonlyArray<TransferOption<K>>>>(() => ({
  source: sourceOptions.value.filter((option) => matches(option, 'source')),
  target: targetOptions.value.filter((option) => matches(option, 'target')),
}));

/** The options a side would move — its checked ones, or every visible one — that are enabled. */
function movable(side: TransferSide, isAll: boolean): ReadonlyArray<K> {
  const picked = new Set(checked[side].value);
  return visible.value[side]
    .filter((option) => !option.isDisabled && (isAll || picked.has(option.key)))
    .map((option) => option.key);
}

/** Moves keys to the other list — appended to the target in source order, or removed from it. */
function move(from: TransferSide, keys: ReadonlyArray<K>): void {
  if (disabled.value || keys.length === 0) return;
  const moving = new Set(keys);
  controlled.setValue(from === 'source' ? [...value.value, ...keys] : value.value.filter((key) => !moving.has(key)));
  checked[from].value = checked[from].value.filter((key) => !moving.has(key));
}

function onChecked(side: TransferSide, keys: unknown): void {
  checked[side].value = Array.isArray(keys) ? (keys as K[]) : [];
}

function onSearch(side: TransferSide, event: Event): void {
  queries[side].value = (event.target as HTMLInputElement).value;
}

/** The `checked / total` tally in a list's heading row. */
function tally(side: TransferSide): string {
  const total = side === 'source' ? sourceOptions.value.length : targetOptions.value.length;
  return locale.t('TransferPicker.count', { checked: checked[side].value.length, total }, '{checked}/{total}');
}

function emptyText(side: TransferSide): string {
  return queries[side].value.trim()
    ? locale.t('TransferPicker.noMatches', undefined, 'No matches')
    : locale.t('TransferPicker.empty', undefined, 'Nothing here');
}

const sides = computed(() => [
  { side: 'source' as const, label: props.sourceLabel, headingId: sourceHeadingId },
  { side: 'target' as const, label: props.targetLabel, headingId: targetHeadingId },
]);

const searchLabel = computed(() => locale.t('TransferPicker.search', undefined, 'Filter'));

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const rootClass = computed(() =>
  cn('grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-2', attrs.class as ClassValue),
);
const searchClass = inputBaseVariants({ size: 'sm' });
</script>

<template>
  <div v-bind="rest" role="group" :aria-labelledby="field?.labelledBy" :class="rootClass">
    <template v-for="(panel, position) in sides" :key="panel.side">
      <div v-if="position === 1" class="flex flex-col items-center justify-center gap-1.5">
        <button
          type="button"
          :class="MoveButtonClass"
          :aria-label="locale.t('TransferPicker.addChecked', undefined, 'Add checked')"
          :disabled="disabled || movable('source', false).length === 0"
          @click="move('source', movable('source', false))"
        >
          <ChevronRight class="size-4 rtl:-scale-x-100" />
        </button>
        <button
          type="button"
          :class="MoveButtonClass"
          :aria-label="locale.t('TransferPicker.addAll', undefined, 'Add all')"
          :disabled="disabled || movable('source', true).length === 0"
          @click="move('source', movable('source', true))"
        >
          <ChevronsRight class="size-4 rtl:-scale-x-100" />
        </button>
        <button
          type="button"
          :class="MoveButtonClass"
          :aria-label="locale.t('TransferPicker.removeChecked', undefined, 'Remove checked')"
          :disabled="disabled || movable('target', false).length === 0"
          @click="move('target', movable('target', false))"
        >
          <ChevronLeft class="size-4 rtl:-scale-x-100" />
        </button>
        <button
          type="button"
          :class="MoveButtonClass"
          :aria-label="locale.t('TransferPicker.removeAll', undefined, 'Remove all')"
          :disabled="disabled || movable('target', true).length === 0"
          @click="move('target', movable('target', true))"
        >
          <ChevronsLeft class="size-4 rtl:-scale-x-100" />
        </button>
      </div>
      <section class="flex min-w-0 flex-col gap-1.5 rounded-md border border-border p-2" :data-side="panel.side">
        <div class="flex items-center justify-between gap-2 px-1 text-sm">
          <span :id="panel.headingId" class="font-medium">{{ panel.label }}</span>
          <span class="text-xs text-muted-foreground tabular-nums" aria-hidden="true">{{ tally(panel.side) }}</span>
        </div>
        <input
          v-if="props.isSearchable"
          type="search"
          :aria-label="`${searchLabel} ${panel.label}`"
          :placeholder="searchLabel"
          :value="queries[panel.side].value"
          :disabled="disabled"
          :class="searchClass"
          @input="onSearch(panel.side, $event)"
        />
        <ListboxPicker
          is-multiple
          :is-disabled="disabled"
          :model-value="checked[panel.side].value"
          :aria-labelledby="panel.headingId"
          class="h-56 overflow-y-auto"
          @update:model-value="onChecked(panel.side, $event)"
        >
          <ListboxPickerItem
            v-for="option in visible[panel.side]"
            :key="String(option.key)"
            :value="option.key"
            :is-disabled="option.isDisabled"
            @dblclick="move(panel.side, option.isDisabled ? [] : [option.key])"
          >
            <slot name="option" :option="option" :side="panel.side">
              <span class="flex min-w-0 flex-col">
                <span class="truncate">{{ option.label }}</span>
                <span v-if="option.description" class="truncate text-xs text-muted-foreground">
                  {{ option.description }}
                </span>
              </span>
            </slot>
          </ListboxPickerItem>
          <ListboxPickerEmpty v-if="visible[panel.side].length === 0">{{ emptyText(panel.side) }}</ListboxPickerEmpty>
        </ListboxPicker>
      </section>
    </template>
    <template v-if="props.name">
      <input
        v-for="key in value"
        :key="String(key)"
        type="hidden"
        :name="props.name"
        :value="String(key)"
        :disabled="disabled"
      />
    </template>
  </div>
</template>
