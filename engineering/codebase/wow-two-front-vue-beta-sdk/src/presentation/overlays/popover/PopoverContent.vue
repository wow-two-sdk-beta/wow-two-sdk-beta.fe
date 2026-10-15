<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/**
 * Represents the prop surface of `PopoverContent`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are
 * spelled out here because the SFC compiler's type resolver cannot follow a
 * `VariantProps<typeof …>` base and fails the build on it. The aliases below
 * are the canonical ones from `foundation/styles`, already locked against the
 * `surfaceVariants` config there, so the two cannot drift.
 */
export interface PopoverContentProps {
  /** The bare toggle — skips the surface chrome (bg/border/shadow); keeps only z-index + animation. */
  readonly isBare?: boolean;

  /** The visual recipe. Default `raised`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Defaults to `lg` with chrome on, `none` when bare. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
}

/** Contains the default chrome width that preserves the historical look. */
const DefaultWidth = 'w-72';
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { AnchoredPositioner, DismissableLayer, FocusScope, Portal, Presence } from '../../../foundation/primitives';
import { usePopoverContext } from './Popover.vue';

/** Renders the anchored, dismissable popover panel. */
defineOptions({ name: 'PopoverContent', inheritAttrs: false });

/** The panel content — React's `children`. */
defineSlots<{ default(): unknown }>();

const props = defineProps<PopoverContentProps>();

const attrs = useAttrs();
const context = usePopoverContext();

/* Refs lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = context.open;
const placement = context.placement;
const offset = context.offset;
const isModal = context.isModal;
const dismissOnEscape = context.dismissOnEscape;
const dismissOnOutsideClick = context.dismissOnOutsideClick;

const anchor = computed(() => context.triggerEl.value);

/** Default to `lg` padding when chrome is on (matches the old `p-4`); the caller can override. */
const resolvedPadding = computed(() => props.padding ?? (props.isBare ? 'none' : 'lg'));

const classes = computed(() =>
  cn(
    /* pop (fade+scale) gated on the portal-root data-state + motion-safe
       so reduced-motion users get no movement. */
    'outline-hidden',
    'motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:group-data-[state=closed]:animate-(--animate-pop-out) motion-reduce:animate-none',
    !props.isBare &&
      cn(
        DefaultWidth,
        surfaceVariants({
          variant: props.variant ?? 'raised',
          tone: props.tone,
          radius: props.radius,
          padding: resolvedPadding.value,
          elevation: props.elevation,
        }),
      ),
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

function handleEscape(): void {
  context.setOpen(false);
}

function handleOutsidePointerDown(event: PointerEvent): void {
  if (context.triggerEl.value?.contains(event.target as Node)) return;
  context.setOpen(false);
}
</script>

<template>
  <!--
    React portalled from *inside* the Presence-cloned root; Vue resolves a cloned
    `ref` through `$el` and a Teleport has no element, so `Portal` is hoisted and
    the `contents` root stays the Presence node — which is what carries
    `data-state` for the panel's `group-data-[state=*]` pop.
  -->
  <Portal>
    <Presence :is-present="isOpen">
      <!--
        `Presence`-clonable root: accepts `data-state` + `ref`, marked `group` so
        the panel animates off it, and holds no layout of its own
        (`display: contents`) so anchored positioning is unaffected.
      -->
      <div class="group contents">
        <!-- z-popover (80) on the SC root (transform makes the stacking context) so a
             popover from a Modal (z-modal, 70) paints above it — both portal to body. -->
        <AnchoredPositioner :anchor="anchor" :placement="placement" :offset="offset" class="z-popover">
          <!--
            `FocusScope as-child` merges into `DismissableLayer`, whose own root div
            *is* the panel — React kept a layer div around a separate panel div. The
            two share a box, and collapsing them puts `role`, the surface classes and
            the outside-click boundary on one node.
          -->
          <FocusScope as-child :is-trapped="isModal" :can-loop="isModal" :is-modal="isModal">
            <DismissableLayer
              :is-escape-disabled="!dismissOnEscape"
              :is-outside-click-disabled="!dismissOnOutsideClick"
              :on-escape="handleEscape"
              :on-outside-pointer-down="handleOutsidePointerDown"
              role="dialog"
              :aria-modal="isModal || undefined"
              v-bind="rest"
              :class="classes"
            >
              <slot />
            </DismissableLayer>
          </FocusScope>
        </AnchoredPositioner>
      </div>
    </Presence>
  </Portal>
</template>
