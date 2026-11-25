<script lang="ts">
import type { IconAdapter } from '../../../foundation/icons';

/** Defines the hint card for an option. */
export interface ChipSelectOptionHint {
  /** The one-line definition under the label. */
  readonly description: string;

  /** The image on top of the card, larger than the row's `icon`, which it replaces there. */
  readonly imageSrc?: string;

  /** The image's alternative text. Default empty — the label under it already names the option. */
  readonly imageAlt?: string;
}

/** Defines one choice of a `ChipSelect`. */
export interface ChipSelectOption {
  /** The value stored in the selection. */
  readonly value: string;

  /** The text of the row and the accessible name of the option's chip. */
  readonly label: string;

  /** How many rows this value would match. The consumer counts; the control only renders it. */
  readonly count?: number;

  /** The icon of the row and, alone, of the option's chip. An option without one shows its label on the chip. */
  readonly icon?: IconAdapter;

  /** The hint card for the row and its chip. Without it, the chip uses the label as its native title. */
  readonly hint?: ChipSelectOptionHint;
}

/** Defines props for the chip select. */
export interface ChipSelectProps {
  /** The choices, in display order. */
  readonly options: ReadonlyArray<ChipSelectOption>;

  /**
   * The chosen value of a single select (`null` for none), or the chosen values of a multiple one — the `v-model`
   * target.
   */
  readonly modelValue?: string | ReadonlyArray<string> | null;

  /** The initial choice when uncontrolled. Default none. */
  readonly defaultValue?: string | ReadonlyArray<string> | null;

  /** Whether the select takes several values. Default `false`: a pick chooses one and closes the panel. */
  readonly isMultiple?: boolean;

  /** The field's text while nothing is chosen. Default: the `label`. */
  readonly placeholder?: string;

  /** The control's name, the prefix of its accessible name — `Format: Conference, Fair`. Default: the `placeholder`. */
  readonly label?: string;

  /** Whether the field is disabled: it neither opens nor changes. Default `false`. */
  readonly isDisabled?: boolean;

  /**
   * The text of the panel row that clears a single select, and of the field's name with nothing chosen. Default
   * `"Any"`, localized.
   */
  readonly anyLabel?: string;

  /**
   * The field's accessible name with more than a few values chosen; `{count}` marks their number. Default
   * `"{count} selected"`, localized.
   */
  readonly selectedLabel?: string;

  /**
   * The `+N` chip's accessible name; `{count}` marks the number of chosen options it stands for. Default
   * `"{count} more selected"`, localized.
   */
  readonly moreLabel?: string;

  /** The count line of a hint card; `{count}` marks the number. Default `"{count}"`, localized. */
  readonly hintCountLabel?: string;

  /** Whether dropdown rows show option hints. Default `true`. */
  readonly showRowHints?: boolean;

  /** How long a chip or row waits before its hint card opens, in ms. Default: the tooltip's own, 700. */
  readonly hintOpenDelay?: number;

  /** How long a hint card takes to fade in and out, in ms. Default: none — it appears and vanishes at once. */
  readonly hintFadeDuration?: number;
}

/** The most chosen labels the field's accessible name lists; past it the name carries their number instead. */
const NamedUpTo = 3;

/** The slack, in px, a sub-pixel layout gets before a chip counts as not fitting. */
const FitTolerance = 0.5;

/**
 * How many chips fit a field `available` px wide, or `null` when every one does. With some hidden the `+N` chip
 * takes `moreWidth` and one `gap` before it, so it counts against the room the visible chips share.
 */
function chipsThatFit(widths: ReadonlyArray<number>, gap: number, moreWidth: number, available: number): number | null {
  const total = widths.reduce((sum, width) => sum + width, 0) + gap * (widths.length - 1);
  if (total <= available + FitTolerance) return null;
  let used = moreWidth;
  let fits = 0;
  for (const width of widths) {
    if (used + gap + width > available + FitTolerance) break;
    used += gap + width;
    fits += 1;
  }
  return fits;
}
</script>

<script setup lang="ts">
import { computed, onMounted, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Check, ChevronDown } from 'lucide-vue-next';
import { interpolate, useLocaleDefaults, useLocaleFormatters } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { useId } from '../../../foundation/identifiers';
import { useResizeObserver } from '../../../foundation/observers';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays';
import { ListboxPicker, ListboxPickerIndicator, ListboxPickerItem } from '../listboxPicker';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import ChipSelectChip from './ChipSelectChip.vue';
import ChipSelectHint from './ChipSelectHint.vue';

/**
 * Renders a choice as a single field — a combobox button holding the chosen options as chips, and a panel that lists
 * every option with its icon, label, count and a check. The chips are icons only; the ones the field has no room for
 * collapse into one `+N` chip, measured against the field's width. A multiple select toggles an option per click and
 * keeps the panel open; a single one picks one and closes, its "Any" row clearing the choice. An option's hint opens
 * when its chip is hovered. Rows show hints on hover and keyboard navigation when enabled.
 */
defineOptions({ name: 'ChipSelect', inheritAttrs: false });

const componentProps = withDefaults(defineProps<ChipSelectProps>(), {
  modelValue: undefined,
  defaultValue: undefined,
  isMultiple: false,
  placeholder: undefined,
  label: undefined,
  isDisabled: false,
  showRowHints: true,
  hintOpenDelay: undefined,
  hintFadeDuration: undefined,
});
const props = useLocaleDefaults(componentProps, 'ChipSelect', {
  anyLabel: 'Any',
  selectedLabel: '{count} selected',
  moreLabel: '{count} more selected',
  hintCountLabel: '{count}',
});

const emit = defineEmits<{
  /** Fires when the reader changes the choice — a value or `null` for a single select, the set when `isMultiple`. */
  'update:modelValue': [value: string | ReadonlyArray<string> | null];
}>();

defineSlots<{
  /** Custom content for an option's hint. The surface identifies the tooltip's anchor. */
  hint?(props: { option: ChipSelectOption; surface: 'chip' | 'row' }): unknown;
}>();

const attrs = useAttrs();
const formatters = useLocaleFormatters();
const listboxId = useId('chip-select');

const valueCtl = useControlled<string | ReadonlyArray<string> | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? (props.isMultiple ? [] : null),
  onChange: (next) => emit('update:modelValue', next),
});

/** The chosen values, in the order the value holds them. */
const chosenValues = computed<ReadonlyArray<string>>(() => {
  const value = valueCtl.value.value;
  if (value === null || value === '') return [];
  return typeof value === 'string' ? [value] : value;
});

/** The chosen options, in the select's display order — the chips and the field's name read this. */
const chosenOptions = computed(() => props.options.filter((option) => chosenValues.value.includes(option.value)));

/** The listbox's value: the set when `isMultiple`, the key otherwise, where the empty key is the "Any" row. */
const listValue = computed(() => (props.isMultiple ? chosenValues.value : (chosenValues.value[0] ?? '')));

/** The field's text with nothing chosen. */
const placeholderText = computed(() => props.placeholder ?? props.label);

/** The field's accessible name: the control's name and what is chosen — `Format: Conference, Fair`. */
const fieldName = computed(() => {
  const labels = chosenOptions.value.map((option) => option.label);
  const summary =
    labels.length === 0
      ? props.anyLabel
      : labels.length > NamedUpTo
        ? interpolate(props.selectedLabel, { count: formatters.value.number(labels.length) })
        : formatters.value.list(labels);
  const name = props.label ?? props.placeholder;
  return name === undefined ? summary : `${name}: ${summary}`;
});

const isOpen = shallowRef(false);

/** Whether the option is not chosen and holds no rows — its `count` is exactly `0` — so its row reads muted. */
function isEmpty(option: ChipSelectOption): boolean {
  return option.count === 0 && !chosenValues.value.includes(option.value);
}

function isChosen(value: string): boolean {
  return chosenValues.value.includes(value);
}

function countText(count: number | undefined): string | undefined {
  return count === undefined ? undefined : formatters.value.number(count);
}

const field = useTemplateRef<HTMLButtonElement>('field');
const strip = useTemplateRef<HTMLElement>('strip');
const probe = useTemplateRef<HTMLElement>('probe');

/**
 * How many chips the field has room for: `null` while every one fits, or before a measure. The off-screen `probe` row
 * lays every chosen chip and a `+N` chip out in a line at their natural widths, so a chip is measured whether or not
 * the visible row shows it.
 */
const fitCount = shallowRef<number | null>(null);

const shownOptions = computed(() =>
  fitCount.value === null ? chosenOptions.value : chosenOptions.value.slice(0, fitCount.value),
);
const hiddenCount = computed(() => chosenOptions.value.length - shownOptions.value.length);
const moreName = computed(() => interpolate(props.moreLabel, { count: formatters.value.number(hiddenCount.value) }));

function measure(): void {
  const row = probe.value;
  const room = strip.value;
  const chips = row ? Array.from(row.children) : [];
  const more = chips.pop();
  if (!row || !room || !more || chips.length === 0) {
    fitCount.value = null;
    return;
  }
  const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;
  fitCount.value = chipsThatFit(
    chips.map((chip) => chip.getBoundingClientRect().width),
    gap,
    more.getBoundingClientRect().width,
    room.getBoundingClientRect().width,
  );
}

useResizeObserver(strip, measure);
watch(chosenOptions, measure, { flush: 'post' });
onMounted(measure);

/**
 * Whether the last input was the keyboard. An option row never takes DOM focus — the listbox keeps it and points at the
 * active row — so a hovered row opens its hint through the pointer and a keyboard-active row through a virtual focus.
 */
let isKeyboardDriven = false;
let virtuallyFocused: HTMLElement | null = null;

function setVirtualFocus(next: HTMLElement | null): void {
  if (virtuallyFocused === next) return;
  virtuallyFocused?.dispatchEvent(new FocusEvent('blur'));
  virtuallyFocused = next;
  next?.dispatchEvent(new FocusEvent('focus'));
}

/** Gives the hint tooltip of the row the keyboard moved to the focus it would have on a button. */
function onActiveChange(id: string | null): void {
  const row =
    props.showRowHints && id !== null && isKeyboardDriven
      ? (field.value?.ownerDocument.getElementById(id) ?? null)
      : null;
  setVirtualFocus(row);
}

watch(isOpen, (open) => {
  if (!open) virtuallyFocused = null;
});

function close(): void {
  isOpen.value = false;
}

/** Re-emits a pick; the "Any" row (the empty key) means no value, and a single pick closes the panel. */
function onPick(next: unknown): void {
  if (props.isMultiple) {
    valueCtl.setValue(next as ReadonlyArray<string>);
    return;
  }
  valueCtl.setValue(next === '' || next === undefined || next === null ? null : (next as string));
  close();
}

/** Closes a single panel on a pick of the chosen row too, which the listbox does not report as a change. */
function onRowClick(): void {
  if (!props.isMultiple) close();
}

function onListKeydown(event: KeyboardEvent): void {
  isKeyboardDriven = true;
  if (!props.isMultiple && (event.key === 'Enter' || event.key === ' ')) close();
}

function onListPointerMove(): void {
  isKeyboardDriven = false;
}

/** Focuses the button before the panel opens, so closing returns focus to it in browsers that do not focus on click. */
function onFieldClick(event: MouseEvent): void {
  isKeyboardDriven = event.detail === 0;
  (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
}

/** A combobox opens on the arrow keys, as the SDK pickers do. */
function onFieldKeydown(event: KeyboardEvent): void {
  isKeyboardDriven = true;
  if (event.defaultPrevented || event.isComposing || isOpen.value) return;
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault();
    isOpen.value = true;
  }
}

const fieldClass = computed(() =>
  cn(
    selectTriggerVariants({ size: 'md' }),
    'h-9 w-72 max-w-full min-w-[min(12rem,100%)] shrink gap-1.5 rounded-full ps-1.5 pe-3',
    attrs.class as ClassValue,
  ),
);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const chevronClass = computed(() =>
  cn('size-4 shrink-0 text-muted-foreground motion-safe:transition-transform', isOpen.value && 'rotate-180'),
);
</script>

<template>
  <Popover :open="isOpen" placement="bottom-start" :offset="6" is-modal @update:open="isOpen = $event">
    <PopoverTrigger as-child>
      <button
        ref="field"
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="isOpen"
        :aria-controls="isOpen ? listboxId : undefined"
        :aria-label="fieldName"
        :disabled="isDisabled"
        :class="fieldClass"
        data-chip-select
        v-bind="rest"
        @click="onFieldClick"
        @keydown="onFieldKeydown"
      >
        <span
          ref="strip"
          class="relative flex h-full min-w-0 flex-1 items-center gap-1 overflow-hidden"
          data-chip-select-chips
        >
          <span
            v-if="chosenOptions.length === 0"
            class="truncate ps-1.5 text-muted-foreground"
            data-chip-select-placeholder
          >
            {{ placeholderText }}
          </span>
          <template v-else>
            <ChipSelectHint
              v-for="option in shownOptions"
              :key="option.value"
              :option="option"
              :hint-count-label="props.hintCountLabel"
              :hint-open-delay="hintOpenDelay"
              :hint-fade-duration="hintFadeDuration"
              :is-disabled="isOpen || isDisabled"
            >
              <ChipSelectChip :option="option" :is-empty="option.count === 0" />
              <template v-if="$slots.hint" #content>
                <slot name="hint" :option="option" surface="chip" />
              </template>
            </ChipSelectHint>
            <ChipSelectChip v-if="hiddenCount > 0" :more-count="hiddenCount" :more-label="moreName" />
            <span
              ref="probe"
              aria-hidden="true"
              class="pointer-events-none invisible absolute start-0 top-0 flex w-max items-center gap-1"
              data-chip-select-probe
            >
              <ChipSelectChip v-for="option in chosenOptions" :key="option.value" :option="option" />
              <ChipSelectChip :more-count="chosenOptions.length" />
            </span>
          </template>
        </span>
        <ChevronDown :class="chevronClass" aria-hidden="true" />
      </button>
    </PopoverTrigger>
    <PopoverContent
      padding="none"
      :aria-label="label ?? placeholder"
      class="w-auto max-w-[calc(100vw-2.5rem)] min-w-(--anchor-width) overflow-hidden"
      data-chip-select-panel
    >
      <ListboxPicker
        :id="listboxId"
        :aria-label="label ?? placeholder"
        :is-multiple="isMultiple"
        :model-value="listValue"
        :indicator="ListboxPickerIndicator.None"
        variant="flat"
        radius="none"
        @update:model-value="onPick"
        @active-change="onActiveChange"
        @keydown="onListKeydown"
        @pointermove="onListPointerMove"
      >
        <ListboxPickerItem v-if="!isMultiple" value="" class="max-lg:min-h-10" data-chip-select-any @click="onRowClick">
          <span class="min-w-0 flex-1 truncate">{{ props.anyLabel }}</span>
          <span class="size-4 shrink-0">
            <Check v-if="chosenOptions.length === 0" class="size-4" data-chip-select-check />
          </span>
        </ListboxPickerItem>
        <ChipSelectHint
          v-for="option in options"
          :key="option.value"
          :option="showRowHints ? option : undefined"
          :hint-count-label="props.hintCountLabel"
          :hint-open-delay="hintOpenDelay"
          :hint-fade-duration="hintFadeDuration"
          placement="right"
        >
          <ListboxPickerItem
            :value="option.value"
            :data-empty="isEmpty(option) ? '' : undefined"
            class="data-[empty]:text-muted-foreground data-[empty]:opacity-60 max-lg:min-h-10"
            @click="onRowClick"
          >
            <Icon v-if="option.icon" :icon="option.icon" :size="16" class="text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
            <span
              v-if="option.count !== undefined"
              data-chip-select-count
              class="min-w-[2ch] text-end tabular-nums text-muted-foreground"
            >
              {{ countText(option.count) }}
            </span>
            <span class="size-4 shrink-0">
              <Check v-if="isChosen(option.value)" class="size-4" data-chip-select-check />
            </span>
          </ListboxPickerItem>
          <template v-if="$slots.hint" #content>
            <slot name="hint" :option="option" surface="row" />
          </template>
        </ChipSelectHint>
      </ListboxPicker>
    </PopoverContent>
  </Popover>
</template>
