<script lang="ts">
import type { Placement } from '@floating-ui/vue';
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of `ComboboxPickerContent`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are spelled out here
 * because the SFC compiler's type resolver cannot follow a `VariantProps<typeof …>` base and
 * fails the build on it. The aliases below are the canonical ones from `foundation/styles`,
 * already locked against the `surfaceVariants` config there, so the two cannot drift.
 */
export interface ComboboxPickerContentProps {
  /** The floating placement of the panel. */
  readonly placement?: Placement;

  /** The gap between the input and the panel, in px. */
  readonly offset?: number;

  /** The visual recipe. Default `raised`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Defaults to `xs` (p-1), so items breathe — same as ListboxPicker. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
}
</script>

<script setup lang="ts">
import { computed, ref, useAttrs, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { AnchoredPositioner, DismissableLayer, Portal, Presence } from '../../../foundation/primitives';
import { listboxVariants } from '../listboxPicker/ListboxPicker.variants';
import { useComboboxContext } from './ComboboxPickerContext';

/** Renders the option rows in a portalled panel anchored under the input, dismissed on Escape or outside click. */
defineOptions({ name: 'ComboboxPickerContent', inheritAttrs: false });

/** The `ComboboxPickerItem` rows — React's required `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ComboboxPickerContentProps>(), {
  placement: 'bottom',
  offset: 6,
});

const attrs = useAttrs();

/* `ctx` is a live-getter object — read fields off it, never destructure. */
const ctx = useComboboxContext();

/**
 * Keeps `activeId` pointing at a visible, enabled option.
 *
 * React split this across two effects — this one clamped a stale id after filtering, and every
 * `ComboboxPickerItem` seeded the first option when the id was null. Both collapse here: the item
 * registry is reactive, so one watcher on it covers register, unregister and the null case,
 * instead of N duplicate per-item watchers.
 */
watch(
  [() => ctx.open, () => ctx.items, () => ctx.activeId],
  ([open, items, activeId]) => {
    if (!open) return;
    const list = items.filter((i) => !i.isDisabled);
    if (!activeId) {
      if (list[0]) ctx.setActiveId(list[0].id);
      return;
    }
    if (!list.some((i) => i.id === activeId)) ctx.setActiveId(list[0]?.id ?? null);
  },
  { flush: 'post' },
);

function setRef(node: unknown): void {
  ctx.contentEl.value = ((node as { $el?: HTMLElement } | null)?.$el ?? node ?? null) as HTMLElement | null;
}

/**
 * The panel's min-width, matched to the input.
 *
 * React read `offsetWidth` inline during render. It is captured in a NON-immediate post-flush
 * watcher here: an immediate one would run during SSR, where there is no element to measure.
 */
const minWidth = ref<number | undefined>(undefined);
watch(
  () => ctx.open,
  (open) => {
    minWidth.value = open ? ctx.inputEl.value?.offsetWidth : undefined;
  },
  { flush: 'post' },
);

const isOpen = computed(() => ctx.open);
const anchor = computed(() => ctx.inputEl.value);
const panelStyle = computed(() => (minWidth.value != null ? { minWidth: `${minWidth.value}px` } : undefined));

/* Default to `xs` (p-1) so items breathe — same as ListboxPicker. */
const resolvedPadding = computed(() => props.padding ?? 'xs');

function onEscape(): void {
  ctx.setOpen(false);
}

function onOutsidePointerDown(event: PointerEvent): void {
  if (ctx.inputEl.value?.contains(event.target as Node)) return;
  ctx.setOpen(false);
}

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const panelClass = computed(() =>
  cn(
    /* pop (fade+scale) gated on the portal-root data-state + motion-safe
       so reduced-motion users get no movement. */
    'motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:group-data-[state=closed]:animate-(--animate-pop-out) motion-reduce:animate-none',
    surfaceVariants({
      variant: props.variant ?? 'raised',
      tone: props.tone,
      radius: props.radius,
      padding: resolvedPadding.value,
      elevation: props.elevation,
    }),
    listboxVariants(),
    attrs.class as ClassValue,
  ),
);
</script>

<template>
  <!--
    React portalled from *inside* the Presence-cloned root; Vue resolves a cloned `ref` through
    `$el` and a Teleport has no element, so `Portal` is hoisted and the `contents` root stays
    the Presence node — which is what carries `data-state` for the panel's `group-data-[state=*]`
    pop. Same shape as `PopoverContent`.
  -->
  <Portal>
    <Presence :is-present="isOpen">
      <div class="group contents">
        <AnchoredPositioner :anchor="anchor" :placement="placement" :offset="offset" class="z-dropdown">
          <DismissableLayer
            :ref="setRef"
            :on-escape="onEscape"
            :on-outside-pointer-down="onOutsidePointerDown"
            :id="ctx.listboxId"
            role="listbox"
            :style="panelStyle"
            v-bind="passthroughAttrs"
            :class="panelClass"
          >
            <slot />
          </DismissableLayer>
        </AnchoredPositioner>
      </div>
    </Presence>
  </Portal>
</template>
