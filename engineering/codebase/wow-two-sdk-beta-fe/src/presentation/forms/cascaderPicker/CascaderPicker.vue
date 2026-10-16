<script lang="ts">
import type { SelectPickerSize } from '../selectPicker';

/** Defines one option of a cascader — a branch with children, or a pickable leaf. */
export interface CascaderOption {
  /** The option's identity among its siblings. */
  readonly value: string;

  /** The visible text. */
  readonly label: string;

  /** The next column's options; an option with children is a branch. */
  readonly children?: ReadonlyArray<CascaderOption>;

  /** Blocks picking the leaf or opening the branch. */
  readonly isDisabled?: boolean;
}

/** Defines props for the cascading-columns picker. */
export interface CascaderPickerProps {
  /** The first column's options. */
  readonly options: ReadonlyArray<CascaderOption>;

  /** The picked path of values, root first, controlled. The `v-model` binding target; `null` picks nothing. */
  readonly modelValue?: ReadonlyArray<string> | null;

  /** The initial path when uncontrolled. */
  readonly defaultValue?: ReadonlyArray<string> | null;

  /** The trigger text with nothing picked. Default `"Pick an option"`, localized. */
  readonly placeholder?: string;

  /** The joiner between path labels on the trigger. Default `" / "`. */
  readonly separator?: string;

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

  /** The hidden input name; each path value ships as its own entry, root first. */
  readonly name?: string;
}

/** @internal Whether an option opens another column. */
function isBranch(option: CascaderOption): boolean {
  return (option.children?.length ?? 0) > 0;
}

/** @internal The options along a path, stopping at the first value no option matches. */
function resolvePath(options: ReadonlyArray<CascaderOption>, path: ReadonlyArray<string>): CascaderOption[] {
  const resolved: CascaderOption[] = [];
  let level: ReadonlyArray<CascaderOption> = options;
  for (const value of path) {
    const option = level.find((candidate) => candidate.value === value);
    if (!option) break;
    resolved.push(option);
    level = option.children ?? [];
  }
  return resolved;
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { InputState } from '../InputStyles';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import { useNativeFormReset } from '../UseNativeFormReset';

/**
 * Renders a trigger that opens side-by-side columns — each pick opens the next level — and shows the picked
 * path, such as country → region → city.
 */
defineOptions({ name: 'CascaderPicker', inheritAttrs: false });

const componentProps = withDefaults(defineProps<CascaderPickerProps>(), {
  modelValue: undefined,
  defaultValue: null,
  separator: ' / ',
  size: undefined,
  id: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'CascaderPicker', { placeholder: 'Pick an option' });

const emit = defineEmits<{
  /** Fires when the reader picks a leaf — the `v-model` half, carrying the path root first. */
  'update:modelValue': [path: string[] | null];
}>();

const attrs = useAttrs();
const field = useFormControl();
const baseId = useId('cascader');

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);

const controlled = useControlled<ReadonlyArray<string> | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next === null ? null : [...next]);
  },
});
const value = controlled.value;

const open = ref(false);
const columnsEl = useTemplateRef<HTMLElement>('columnsEl');

/** The path the reader is browsing — seeded from the pick whenever the popover opens. */
const browsePath = ref<string[]>([]);
watch(open, (isOpen) => {
  if (isOpen) browsePath.value = resolvePath(props.options, value.value ?? []).map((option) => option.value);
});

const browsed = computed(() => resolvePath(props.options, browsePath.value));

/** The visible columns: the roots, then the children of every browsed branch. */
const columns = computed(() => {
  const list: ReadonlyArray<CascaderOption>[] = [props.options];
  for (const option of browsed.value) {
    if (!isBranch(option)) break;
    list.push(option.children!);
  }
  return list;
});

/** The option each column's roving tab stop sits on — the browsed one, else the first enabled. */
function tabStop(column: number): string | undefined {
  const onPath = browsed.value[column]?.value;
  if (onPath !== undefined) return onPath;
  return columns.value[column]?.find((option) => !option.isDisabled)?.value;
}

function optionId(column: number, option: CascaderOption): string {
  return `${baseId}-${column}-${option.value}`;
}

async function focusOption(column: number, value: string | undefined): Promise<void> {
  await nextTick();
  if (value === undefined) return;
  const option = columns.value[column]?.find((candidate) => candidate.value === value);
  if (option) document.getElementById(optionId(column, option))?.focus();
}

/** Opens a branch's column, or picks a leaf and closes. */
function activate(column: number, option: CascaderOption, isKeyboard: boolean): void {
  if (option.isDisabled || disabled.value || readOnly.value) return;
  const path = [...browsePath.value.slice(0, column), option.value];
  browsePath.value = path;
  if (isBranch(option)) {
    if (isKeyboard) void focusOption(column + 1, tabStop(column + 1));
    return;
  }
  controlled.setValue(path);
  open.value = false;
}

/** `1` in a left-to-right layout, `-1` in a right-to-left one — the direction deeper columns sit on screen. */
function deeper(): 1 | -1 {
  return columnsEl.value && getComputedStyle(columnsEl.value).direction === 'rtl' ? -1 : 1;
}

function onOptionKeydown(event: KeyboardEvent, column: number, option: CascaderOption): void {
  const siblings = columns.value[column]!.filter((candidate) => !candidate.isDisabled);
  const position = siblings.findIndex((candidate) => candidate.value === option.value);
  const inward = deeper() === 1 ? 'ArrowRight' : 'ArrowLeft';
  const outward = deeper() === 1 ? 'ArrowLeft' : 'ArrowRight';
  let target: string | undefined;
  if (event.key === 'ArrowDown') target = siblings[Math.min(siblings.length - 1, position + 1)]?.value;
  else if (event.key === 'ArrowUp') target = siblings[Math.max(0, position - 1)]?.value;
  else if (event.key === 'Home') target = siblings[0]?.value;
  else if (event.key === 'End') target = siblings[siblings.length - 1]?.value;
  else if (event.key === 'Enter' || event.key === ' ' || (event.key === inward && isBranch(option))) {
    event.preventDefault();
    activate(column, option, true);
    return;
  } else if (event.key === outward && column > 0) {
    event.preventDefault();
    browsePath.value = browsePath.value.slice(0, column);
    void focusOption(column - 1, browsePath.value[column - 1]);
    return;
  } else return;
  event.preventDefault();
  void focusOption(column, target);
}

const picked = computed(() => resolvePath(props.options, value.value ?? []));
const displayText = computed(() => {
  if (value.value === null || value.value.length === 0) return props.placeholder;
  return picked.value.length === value.value.length
    ? picked.value.map((option) => option.label).join(props.separator)
    : value.value.join(props.separator);
});

/** The column's accessible name — the branch it lists, or the picker's own name for the roots. */
function columnName(column: number): string | undefined {
  if (column === 0) return (attrs[AriaAttribute.Label] as string | undefined) ?? props.placeholder;
  return browsed.value[column - 1]?.label;
}

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
const labelClass = computed(() => cn('truncate', value.value === null && 'text-muted-foreground'));

function optionClass(column: number, option: CascaderOption): string {
  const isOnPath = browsed.value[column]?.value === option.value;
  return cn(
    'flex h-8 cursor-default items-center gap-2 rounded-sm px-2 text-sm outline-hidden transition-colors',
    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring',
    isOnPath && 'bg-primary-soft text-primary-soft-foreground hover:bg-primary-soft',
    option.isDisabled && 'pointer-events-none opacity-40',
  );
}

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
    <PopoverContent class="max-w-[calc(100vw-2rem)] overflow-x-auto p-0">
      <div ref="columnsEl" class="flex divide-x divide-border rtl:divide-x-reverse">
        <div
          v-for="(options, column) in columns"
          :key="`${column}-${browsePath.slice(0, column).join('/')}`"
          role="listbox"
          :aria-label="columnName(column)"
          class="flex max-h-72 min-w-40 flex-col gap-0.5 overflow-y-auto p-1"
          :data-column="column"
        >
          <div
            v-for="option in options"
            :id="optionId(column, option)"
            :key="option.value"
            role="option"
            :aria-selected="browsed[column]?.value === option.value"
            :aria-disabled="option.isDisabled || undefined"
            :aria-haspopup="isBranch(option) ? 'listbox' : undefined"
            :tabindex="tabStop(column) === option.value ? 0 : -1"
            :class="optionClass(column, option)"
            @click="activate(column, option, false)"
            @keydown="onOptionKeydown($event, column, option)"
          >
            <span class="flex-1 truncate">{{ option.label }}</span>
            <ChevronRight v-if="isBranch(option)" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
          </div>
        </div>
      </div>
    </PopoverContent>
    <template v-if="props.name">
      <input
        v-for="(segment, depth) in value ?? []"
        :key="depth"
        type="hidden"
        :disabled="disabled"
        :form="formId"
        :name="props.name"
        :value="segment"
      />
    </template>
    <input ref="formResetAnchor" type="hidden" :form="formId" aria-hidden="true" />
  </Popover>
</template>
