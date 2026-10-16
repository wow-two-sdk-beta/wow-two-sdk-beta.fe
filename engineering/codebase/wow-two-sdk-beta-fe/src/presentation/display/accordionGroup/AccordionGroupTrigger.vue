<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `AccordionGroupTriggerProps` and consumers import it.
   Its only member was `children`, which is the default slot here; every button
   attribute falls through. */
export interface AccordionGroupTriggerProps {}
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, type ComponentPublicInstance } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { useRovingFocusItem } from '../../../foundation/primitives';
import { useAccordionContext, useAccordionItemContext } from './AccordionGroupContext';

/** Renders the clickable header of an `AccordionGroupItem` — toggles its panel and carries the chevron. */
defineOptions({ name: 'AccordionGroupTrigger', inheritAttrs: false });

/** The trigger label — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const accordion = useAccordionContext();
const item = useAccordionItemContext();

/* Reactive object — bound member-by-member below rather than destructured, since
   `tabindex` tracks the group's tab stop. */
const roving = useRovingFocusItem();

/* React composed the roving ref with the forwarded one. Vue has no `composeRefs`,
   so one function ref feeds both the group and `defineExpose`. */
const el = shallowRef<HTMLButtonElement | null>(null);

function setEl(node: Element | ComponentPublicInstance | null): void {
  el.value = (node as HTMLButtonElement | null) ?? null;
  roving.ref(node);
}

/* Own handler runs after any consumer `@click` that arrived through `rest`, so
   `defaultPrevented` is the consumer's opt-out — React's `onClick?.(e)` then
   `if (e.defaultPrevented || item.disabled) return` in the same order. */
function onClick(event: MouseEvent): void {
  if (event.defaultPrevented || item.disabled) return;
  accordion.toggle(item.value);
}

const classes = computed(() =>
  cn(
    'flex w-full items-center justify-between gap-2 px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    attrs.class as string | undefined,
  ),
);

const chevronClasses = computed(() =>
  cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', item.open && 'rotate-180'),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <h3 class="flex">
    <button
      :id="item.triggerId"
      :ref="setEl"
      type="button"
      :aria-expanded="item.open"
      :aria-controls="item.contentId"
      :data-state="item.open ? 'open' : 'closed'"
      :data-disabled="dataAttr(item.disabled)"
      :disabled="item.disabled"
      :tabindex="roving.tabindex"
      data-roving-focus-item
      v-bind="rest"
      :class="classes"
      @focus="roving.onFocus"
      @keydown="roving.onKeydown"
      @click="onClick"
    >
      <span class="flex-1"><slot /></span>
      <ChevronDown :class="chevronClasses" />
    </button>
  </h3>
</template>
