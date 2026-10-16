<script lang="ts">
/* eslint-disable-next-line @typescript-eslint/no-empty-object-type -- kept as an
   exported name: React declared `AccordionGroupContentProps` and consumers import it.
   Its only member was `children`, which is the default slot here; every div
   attribute falls through. */
export interface AccordionGroupContentProps {}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { Presence } from '../../../foundation/primitives';
import { useAccordionItemContext } from './AccordionGroupContext';

/** Renders the collapsible panel body of an `AccordionGroupItem`, mounted while its trigger is open. */
defineOptions({ name: 'AccordionGroupContent', inheritAttrs: false });

/** The panel body — React's required `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const item = useAccordionItemContext();

const classes = computed(() =>
  cn(
    'grid text-sm text-foreground',
    'motion-safe:transition-[grid-template-rows] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out) motion-reduce:transition-none',
    'data-[state=open]:grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <Presence :is-present="item.open">
    <!--
      Height expand/collapse via grid-template-rows 0fr -> 1fr. The outer
      grid row is what animates; the inner `min-h-0 overflow-hidden` track
      clips the content so it can collapse to zero height. `data-state`
      (and the ref) are injected by Presence so the exit transition can play
      before unmount. Motion-safe-gated; reduced-motion gets an instant snap.
    -->
    <div ref="el" :id="item.contentId" role="region" :aria-labelledby="item.triggerId" v-bind="rest" :class="classes">
      <!-- Content padding is consumer-owned (no default) — wrap the slot with your own
           padding so each panel sets any value; it collapses cleanly inside this clip. -->
      <div class="min-h-0 overflow-hidden"><slot /></div>
    </div>
  </Presence>
</template>
