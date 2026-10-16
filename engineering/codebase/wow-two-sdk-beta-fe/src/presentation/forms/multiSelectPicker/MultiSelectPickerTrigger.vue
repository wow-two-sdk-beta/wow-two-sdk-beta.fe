<script lang="ts">
import type { InputState } from '../InputStyles';
import type { SelectPickerSize } from '../selectPicker/SelectPicker.variants';

export interface MultiSelectPickerTriggerProps {
  /** The trigger size. */
  readonly size?: SelectPickerSize;

  /** The validity surface. */
  readonly state?: InputState;

  /**
   * The chip budget handed to the default `<MultiSelectPickerTags />` — past it the rest collapse
   * into a `+N` block. Ignored when the trigger's default slot is filled.
   */
  readonly maxVisibleTags?: number;
}
/* React also inherited `Omit<SelectPickerTriggerVariants, 'size' | 'state'>` — the `border` / `ring`
   axes — but never forwarded them to `selectTriggerVariants`, so they were dead props that
   landed on the DOM as unknown attributes. Only the two axes the original consumed are here. */
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronDown } from 'lucide-vue-next';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { PopoverTrigger } from '../../overlays';
import { InputState as InputStateValue } from '../InputStyles';
import { selectTriggerVariants } from '../selectPicker/SelectPicker.variants';
import { useMultiSelectContext } from './MultiSelectPickerContext';
import MultiSelectPickerTags from './MultiSelectPickerTags.vue';

/** Renders the button that opens the dropdown, showing the selected chips and a chevron; Backspace drops the last. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call, and so the rest
   of the attrs land on the inner `<button>`. */
defineOptions({ name: 'MultiSelectPickerTrigger', inheritAttrs: false });

/** The trigger content — defaults to `<MultiSelectPickerTags />`. React's `children`. */
defineSlots<{ default?(): unknown }>();

const props = defineProps<MultiSelectPickerTriggerProps>();

const attrs = useAttrs();
const slots = useSlots();
const root = useTemplateRef<HTMLButtonElement>('root');

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useMultiSelectContext();

/* `aria-label` is read off `attrs`, never declared: a declared `'aria-label'` prop arrives as
   `props.ariaLabel`, so `props['aria-label']` is always undefined and no accessible name
   renders. Left in the fallthrough set, it also still lands on the button. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

const triggerState = computed(() => props.state ?? (ctx.isInvalid ? InputStateValue.Invalid : InputStateValue.Default));

/* Names the trigger from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (!ariaLabel.value ? ctx.labelId : undefined));

function onKeydown(event: KeyboardEvent): void {
  if (event.isComposing) return;
  /* Runs after any caller-supplied `@keydown` (declared after `v-bind`), exactly as React's
     `onKeyDown?.(e)` ran before this body. */
  if (event.defaultPrevented) return;
  if (event.key === 'Backspace' && ctx.values.length > 0) {
    ctx.setValues(ctx.values.slice(0, -1));
  }
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const buttonClass = computed(() =>
  cn(
    selectTriggerVariants({ size: props.size, state: triggerState.value }),
    'h-auto min-h-10 flex-wrap py-1.5',
    attrs.class as ClassValue,
  ),
);

/* Chevron rotate kept; gated motion-safe so reduced-motion users get an instant flip, not a
   tween. Panel pop-in/out is owned by PopoverContent (Presence + --animate-pop-*). */
const chevronClass = computed(() =>
  cn('h-4 w-4 shrink-0 self-center text-muted-foreground motion-safe:transition-transform', ctx.open && 'rotate-180'),
);

const hasContent = computed(() => Boolean(slots.default));

const ChevronDownIcon = ChevronDown;

/** The rendered `<button>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <PopoverTrigger as-child>
    <button
      ref="root"
      type="button"
      :id="ctx.fieldId"
      :disabled="ctx.isDisabled"
      :aria-invalid="triggerState === 'invalid' || undefined"
      :aria-labelledby="labelledBy"
      :aria-describedby="ctx.describedBy"
      :class="buttonClass"
      v-bind="passthroughAttrs"
      @keydown="onKeydown"
    >
      <slot v-if="hasContent" />
      <MultiSelectPickerTags v-else :max-visible="maxVisibleTags" />
      <ChevronDownIcon :class="chevronClass" />
    </button>
  </PopoverTrigger>
</template>
