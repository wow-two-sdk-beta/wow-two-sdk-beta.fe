<script lang="ts">
import type { ListboxPickerIndicator } from './ListboxPickerContext';

/** Represents the prop surface of `ListboxPicker.Item`. */
export interface ListboxPickerItemProps {
  /** The item value; compared via the parent listbox's `isEqual`. */
  readonly value: unknown;

  /** The disabled state for this item. */
  readonly isDisabled?: boolean;

  /** The per-item indicator, overriding the listbox-level indicator. */
  readonly indicator?: ListboxPickerIndicator;
}
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, useAttrs, useTemplateRef, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { Check } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useId } from '../../../foundation/identifiers';
import { listboxItemVariants, ListboxPickerItemState } from './ListboxPicker.variants';
import { useListboxContext, ListboxPickerIndicator as ListboxPickerIndicatorValue } from './ListboxPickerContext';

const CheckIcon = Check;

/** Renders one selectable option row with its check, checkbox, radio or dot indicator. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ListboxPickerItem', inheritAttrs: false });

const props = withDefaults(defineProps<ListboxPickerItemProps>(), {
  isDisabled: false,
});

defineSlots<{
  /** The option's content, rendered between the leading and trailing indicators. */
  default(): unknown;
}>();

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useListboxContext();

const id = useId();

/* React registered in an effect keyed on `[id, value, isDisabled]`; the Vue counterpart is a
   watcher with `immediate` so the entry exists before the parent's mount-time auto-active runs. */
watch(
  () => ({ value: props.value, isDisabled: props.isDisabled }),
  ({ value, isDisabled }) => ctx.registerItem({ id, value, isDisabled }),
  { immediate: true },
);
onBeforeUnmount(() => ctx.unregisterItem(id));

const indicator = computed(() => props.indicator ?? ctx.indicator);
const isSelected = computed(() => ctx.values.some((v) => ctx.isEqual(v, props.value)));
const isActive = computed(() => ctx.activeId === id);

const state = computed<ListboxPickerItemState>(() => {
  if (props.isDisabled || ctx.isDisabled) return ListboxPickerItemState.Disabled;
  if (isSelected.value) return ListboxPickerItemState.Selected;
  if (isActive.value) return ListboxPickerItemState.Active;
  return ListboxPickerItemState.Default;
});

function onClick(event: MouseEvent): void {
  /* `ctx.isDisabled` = listbox-level disabled — keyboard is blocked in the root's key handler;
     mirror it for mouse. */
  if (event.defaultPrevented || props.isDisabled || ctx.isDisabled) return;
  ctx.onItemSelect(props.value);
}

function onPointerEnter(): void {
  if (!props.isDisabled && !ctx.isDisabled) ctx.setActiveId(id);
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn(listboxItemVariants({ state: state.value }), attrs.class as ClassValue));

const root = useTemplateRef<HTMLDivElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <div
    ref="root"
    :id="id"
    role="option"
    :aria-selected="isSelected"
    :aria-disabled="isDisabled || ctx.isDisabled || undefined"
    :data-active="isActive ? '' : undefined"
    :data-selected="isSelected ? '' : undefined"
    :data-disabled="isDisabled ? '' : undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
    @click="onClick"
    @pointerenter="onPointerEnter"
  >
    <!-- Leading indicator: checkbox · radio · dot. -->
    <span
      v-if="indicator === ListboxPickerIndicatorValue.Checkbox"
      aria-hidden="true"
      :class="
        cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border',
          isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
        )
      "
    >
      <CheckIcon v-if="isSelected" class="h-3 w-3" />
    </span>
    <span
      v-else-if="indicator === ListboxPickerIndicatorValue.Radio"
      aria-hidden="true"
      :class="
        cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          isSelected ? 'border-primary' : 'border-border',
        )
      "
    >
      <span v-if="isSelected" class="h-2 w-2 rounded-full bg-primary" />
    </span>
    <span
      v-else-if="indicator === ListboxPickerIndicatorValue.Dot"
      aria-hidden="true"
      :class="cn('h-1.5 w-1.5 shrink-0 rounded-full', isSelected ? 'bg-primary' : 'bg-transparent')"
    />

    <!--
      `data-listbox-item-content` is a stable hook for hosts that need to target the option's
      content wrapper (e.g. SelectPicker's `hasTriggerWidth` truncation) without a brittle structural selector.
    -->
    <span data-listbox-item-content class="flex min-w-0 flex-1 items-center gap-2">
      <slot />
    </span>

    <!-- Trailing indicator: check icon. -->
    <CheckIcon
      v-if="indicator === ListboxPickerIndicatorValue.Check && isSelected"
      :class="cn('h-4 w-4 shrink-0', !ctx.isMultiple && 'opacity-80')"
    />
  </div>
</template>
