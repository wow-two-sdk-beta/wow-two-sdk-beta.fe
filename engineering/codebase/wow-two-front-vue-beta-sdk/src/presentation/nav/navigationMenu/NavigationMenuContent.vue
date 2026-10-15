<script lang="ts">
/**
 * The prop surface of `NavigationMenuContent`.
 *
 * React declared `extends HTMLAttributes<HTMLDivElement>` plus `children`;
 * attributes reach the panel through `useAttrs` here and `children` is the
 * default slot, which leaves no declared prop.
 */
export type NavigationMenuContentProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';
import { AnchoredPositioner, DismissableLayer, Portal, Presence } from '../../../foundation/primitives';
import { useNavigationMenuContext, useNavigationMenuItemContext } from './NavigationMenuContext';

/**
 * Renders the anchored panel for one item. `Presence` clones `data-state`
 * ("open" | "closed") onto the panel div, so the pop tokens below run gated on
 * that state.
 */
defineOptions({ name: 'NavigationMenuContent', inheritAttrs: false });

/** The panel content — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const nav = useNavigationMenuContext();
const item = useNavigationMenuItemContext();
const reducedMotion = useReducedMotion();

/* Lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = item.open;
const anchor = computed(() => item.triggerEl.value);

const el = shallowRef<HTMLElement | null>(null);

/* Keep the positioner / dismiss layer mounted while the pop-out plays — the
   stack unmounts with this component, which would kill the exit. Opening flips
   this true synchronously; closing defers the unmount until the panel's exit
   animation ends (`animationend` below). Under reduced motion no animation
   fires, so drop it on the next frame instead. */
const mounted = shallowRef(item.open.value);

watch(
  [() => item.open.value, reducedMotion],
  ([open, isReduced], _previous, onCleanup) => {
    if (open) {
      mounted.value = true;
      return;
    }
    if (!isReduced) return;
    /* `immediate: true` makes this watcher run during SSR too, where there is no
       `requestAnimationFrame`. */
    if (typeof requestAnimationFrame === 'undefined') return;
    const raf = requestAnimationFrame(() => {
      mounted.value = false;
    });
    onCleanup(() => cancelAnimationFrame(raf));
  },
  { immediate: true, flush: 'post' },
);

function handleClose(): void {
  if (el.value?.contains(el.value.ownerDocument.activeElement)) item.triggerEl.value?.focus();
  nav.setActiveId(null);
}

function handleOutsidePointerDown(event: PointerEvent): void {
  if (item.triggerEl.value?.contains(event.target as Node)) return;
  nav.setActiveId(null);
}

function handleAnimationEnd(): void {
  /* Drop the positioner stack once the exit animation completes. */
  if (!item.open.value) mounted.value = false;
}

function setPanel(node: unknown): void {
  el.value = (node ?? null) as HTMLElement | null;
}

const classes = computed(() =>
  cn(
    /* pop (fade + slight scale) gated on data-state; motion-safe so
       reduced-motion users get no movement. */
    'min-w-[12rem] outline-hidden',
    'motion-safe:data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-pop-out)',
    'motion-reduce:animate-none',
    surfaceVariants({ variant: 'raised', radius: 'md', padding: 'md' }),
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
  <Portal v-if="mounted">
    <AnchoredPositioner :anchor="anchor" placement="bottom-start" :offset="6" class="z-dropdown">
      <DismissableLayer :on-escape="handleClose" :on-outside-pointer-down="handleOutsidePointerDown">
        <Presence :is-present="isOpen">
          <div
            :id="item.contentId"
            :aria-labelledby="item.triggerId"
            v-bind="rest"
            :ref="setPanel"
            :class="classes"
            @animationend="handleAnimationEnd"
          >
            <slot />
          </div>
        </Presence>
      </DismissableLayer>
    </AnchoredPositioner>
  </Portal>
</template>
