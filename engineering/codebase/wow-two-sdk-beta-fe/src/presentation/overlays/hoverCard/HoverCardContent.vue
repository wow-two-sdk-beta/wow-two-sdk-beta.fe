<script lang="ts">
/**
 * The prop surface of `HoverCardContent`.
 *
 * Attributes reach the root through `useAttrs` and the content is the default
 * slot, which leaves no declared prop.
 */
export type HoverCardContentProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';
import { AnchoredPositioner, Portal, Presence } from '../../../foundation/primitives';
import { useHoverCardContext } from './HoverCard.vue';

/** Renders the anchored hover-card panel, which stays open while the pointer is over it. */
defineOptions({ name: 'HoverCardContent', inheritAttrs: false });

/** The card content. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const context = useHoverCardContext();
const el = useTemplateRef<HTMLDivElement>('el');

/* Refs lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = context.open;
const placement = context.placement;
const offset = context.offset;

const anchor = computed(() => context.triggerEl.value);

const classes = computed(() =>
  cn(
    'w-64 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md outline-hidden',
    'motion-safe:data-[state=open]:animate-(--animate-pop-in) motion-safe:data-[state=closed]:animate-(--animate-pop-out) motion-reduce:animate-none',
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
  <!--
    Vue resolves a cloned `ref` through `$el` and a Teleport has no element, so
    `Portal` and `AnchoredPositioner` are hoisted above `Presence` and the panel
    stays Presence's direct child — keeping `data-state` and the pop animation on
    the same node. The trade: the positioner stays mounted (empty) while closed.
  -->
  <Portal>
    <AnchoredPositioner :anchor="anchor" :placement="placement" :offset="offset" class="z-dropdown">
      <Presence :is-present="isOpen">
        <div
          ref="el"
          v-bind="rest"
          :class="classes"
          @pointerenter="context.cancelHide()"
          @pointerleave="context.hide()"
        >
          <slot />
        </div>
      </Presence>
    </AnchoredPositioner>
  </Portal>
</template>
