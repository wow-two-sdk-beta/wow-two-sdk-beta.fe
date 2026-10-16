<script lang="ts">
/**
 * The prop surface of `DropdownMenuContent`.
 *
 * React declared `className` and `'aria-label'`; both are fallthrough attrs
 * here. `class` lands on the animated panel (as React's did), everything else —
 * `aria-label` above all — is relayed to `Menu`, which puts it on the menu
 * surface. A declared `'aria-label'` would arrive as `props.ariaLabel` and never
 * render, so it stays an attr.
 */
export type DropdownMenuContentProps = Record<string, never>;
</script>

<script setup lang="ts">
import { computed, shallowRef, useAttrs, watch } from 'vue';
import { cn } from '../../../foundation/styles';
import { useReducedMotion } from '../../../foundation/device';
import { Presence } from '../../../foundation/primitives';
import Menu from '../menu/Menu.vue';
import { useDropdownMenuContext } from './DropdownMenuContext';

/**
 * Renders the animated panel handed to `Menu` as its child. `Presence` clones `data-state`
 * ("open" | "closed") onto the panel div, so the pop tokens below run gated on
 * that state.
 */
defineOptions({ name: 'DropdownMenuContent', inheritAttrs: false });

/** The menu contents — React's `children`. */
defineSlots<{ default(): unknown }>();

const attrs = useAttrs();
const context = useDropdownMenuContext();
const reducedMotion = useReducedMotion();

/* Lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = context.open;
const anchor = computed(() => context.triggerEl.value);
const placement = context.placement;
const offset = context.offset;

const panelEl = shallowRef<HTMLElement | null>(null);

/* Keep `Menu` (positioner / focus scope / dismiss layer) mounted while the
   pop-out plays — `Menu` unmounts with this component, which would kill the exit.
   Opening flips this true synchronously; closing defers the unmount until the
   panel's exit animation ends (`animationend` below). Under reduced motion no
   animation fires, so drop it on the next frame instead. Presence removing the
   closed panel also drops it (`setPanel` below): an exit that never animates —
   a close inside the enter frames, or no animation support — must not leave an
   empty, focus-trapping surface behind. */
const mounted = shallowRef(context.open.value);

watch(
  [() => context.open.value, reducedMotion],
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

/* ArrowUp-open focuses the LAST enabled row of any kind — plain, checkbox, radio or submenu
   trigger (APG menu-button pattern); the trigger arms `openFocus` per gesture and this consumes
   it. Other opens leave it at 'first' and FocusScope's default first-tabbable autofocus applies. */
function focusLastEnabledItem(panel: HTMLElement): void {
  if (context.openFocus.current !== 'last') return;
  context.openFocus.current = 'first';
  const items = panel.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])');
  items[items.length - 1]?.focus();
}

/* Both the mount path (panel enters the DOM a commit after `mounted` flips) and
   the reopen path (an open while the exit animation still has the panel mounted,
   which fires no fresh ref) are the same watch here — React needed a callback ref
   plus a second effect to cover them separately. */
watch(
  [panelEl, () => context.open.value],
  ([panel, open]) => {
    if (!panel || !open) return;
    focusLastEnabledItem(panel);
  },
  { flush: 'post' },
);

function setPanel(node: unknown): void {
  panelEl.value = (node ?? null) as HTMLElement | null;
  /* The panel left the DOM after its exit: drop `Menu` with it. */
  if (node === null && !context.open.value) mounted.value = false;
}

function handleClose(): void {
  context.setOpen(false);
}

function handleAnimationEnd(): void {
  /* Drop `Menu` once the exit animation completes. */
  if (!context.open.value) mounted.value = false;
}

const panelClasses = computed(() =>
  cn(
    /* pop (fade + slight scale) gated on data-state; motion-safe so
       reduced-motion users get no movement. */
    'motion-safe:data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-pop-out)',
    'motion-reduce:animate-none',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class` — relayed to `Menu`, which lands `aria-label` on the surface. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <Menu
    v-if="mounted"
    :open="mounted"
    :anchor="anchor"
    :placement="placement"
    :offset="offset"
    v-bind="rest"
    @update:open="handleClose"
  >
    <Presence :is-present="isOpen">
      <div :ref="setPanel" :class="panelClasses" @animationend="handleAnimationEnd">
        <slot />
      </div>
    </Presence>
  </Menu>
</template>
