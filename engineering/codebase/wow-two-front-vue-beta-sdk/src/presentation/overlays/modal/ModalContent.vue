<script lang="ts">
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

/** Defines the max-width step of a `ModalContent` panel. */
export const ModalSize = {
  /** Refers to a narrow panel (24rem) — confirmations and short prompts. */
  Sm: 'sm',
  /** Refers to the default panel (32rem). */
  Md: 'md',
  /** Refers to a wide panel (42rem) — forms with paired fields. */
  Lg: 'lg',
  /** Refers to an extra-wide panel (56rem) — tables and multi-column forms. */
  Xl: 'xl',
  /** Refers to a panel that spans the window, inside its gutter. */
  Full: 'full',
} as const;

export type ModalSize = (typeof ModalSize)[keyof typeof ModalSize];

const ModalSizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none',
};

/**
 * Represents the prop surface of `ModalContent`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are
 * spelled out here because the SFC compiler's type resolver cannot follow a
 * `VariantProps<typeof …>` base and fails the build on it. The aliases below
 * are the canonical ones from `foundation/styles`, already locked against the
 * `surfaceVariants` config there, so the two cannot drift.
 */
export interface ModalContentProps {
  /** Shows the default backdrop behind the panel. Default `true`. */
  readonly showBackdrop?: boolean;
  /** @deprecated Use `showBackdrop` (inverted); this alias is removed next release. */
  readonly hideBackdrop?: boolean;

  /** The backdrop-blur toggle. */
  readonly isBlurred?: boolean;

  /** The panel's max-width step; a `max-w-*` class still overrides it. Default `md`. */
  readonly size?: ModalSize;

  /** The visual recipe. Default `elevated`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. Default `lg`. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Default `xl`. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. */
  readonly elevation?: SurfaceElevation;
}
</script>

<script setup lang="ts">
import { computed, provide, useAttrs, useTemplateRef } from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { DismissableLayer, FocusScope, Portal, Presence, ScrollLockProvider } from '../../../foundation/primitives';
import BackdropOverlay from '../backdropOverlay/BackdropOverlay.vue';
import { overlayChromeContextKey } from '../OverlayChrome';
import { useModalContext } from './Modal.vue';

/** Renders the portalled dialog surface — scrim, focus trap, scroll lock, and the a11y panel. */
defineOptions({ name: 'ModalContent', inheritAttrs: false });

/** The panel content — chrome subcomponents and the dialog body. React's `children`. */
defineSlots<{ default(): unknown }>();

const props = withDefaults(defineProps<ModalContentProps>(), {
  size: 'md',
  showBackdrop: undefined,
  hideBackdrop: undefined,
});

/** `showBackdrop` first, then the inverted deprecated `hideBackdrop`. */
const hasBackdrop = computed(() => props.showBackdrop ?? !(props.hideBackdrop ?? false));

const attrs = useAttrs();
const context = useModalContext();
const el = useTemplateRef<HTMLDivElement>('el');

/* Refs lifted to setup consts so the template auto-unwraps them (a plain injected object does not). */
const isOpen = context.open;
const role = context.role;
const dismissOnEscape = context.dismissOnEscape;

function close(): void {
  context.setOpen(false);
}

provide(overlayChromeContextKey, {
  titleId: context.titleId,
  descriptionId: context.descriptionId,
  close,
});

const classes = computed(() =>
  cn(
    'ui-modal-content relative w-full',
    ModalSizeClass[props.size],
    /* The panel never outgrows the window: it caps at the viewport and its body scrolls under a fixed header and
       footer. A panel without a body part scrolls whole. */
    'flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto overscroll-contain',
    'motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:group-data-[state=closed]:animate-(--animate-pop-out)',
    surfaceVariants({
      variant: props.variant ?? 'elevated',
      tone: props.tone,
      radius: props.radius ?? 'lg',
      padding: props.padding ?? 'xl',
      elevation: props.elevation,
    }),
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** Outside-click dismissal — `.self` is React's `e.target !== e.currentTarget` guard. */
function handleOutsideClick(): void {
  if (context.dismissOnOutsideClick.value) context.setOpen(false);
}

function handleEscape(): void {
  context.setOpen(false);
}

defineExpose({ el });
</script>

<template>
  <Portal>
    <!-- Lock follows open state, not mount — Content can mount closed. -->
    <ScrollLockProvider :is-enabled="isOpen">
      <!-- The scrim runs on `BackdropOverlay`'s own `Presence` (its `isOpen` prop) so the
           fade-out plays before it unmounts. React wrapped it in a second, outer
           `Presence`, whose injected `data-state` the inner one then overwrote —
           passing the state straight in is the same intent without the masking. -->
      <BackdropOverlay v-if="hasBackdrop" is-inline :is-open="isOpen" :is-blurred="props.isBlurred" />
      <!-- Outside-click dismissal lives on the centering wrapper (it covers the
           backdrop): a click on the padding (`.self`) = outside. The wrapper is the
           Presence-animated node — `Presence` injects `data-state` + `ref` onto it and
           watches *its own* animations (no subtree walk), so the wrapper carries a
           (transparent) fade and the visible pop lands on the panel via
           `group-data-[state=*]`. Both share the same token timing, so the wrapper fade
           gates unmount correctly. -->
      <Presence :is-present="isOpen">
        <div
          :class="
            cn(
              'ui-modal-layer group fixed inset-0 z-modal grid place-items-center overflow-y-auto p-4',
              'motion-safe:data-[state=open]:animate-(--animate-fade-in)',
              'motion-safe:data-[state=closed]:animate-(--animate-fade-out)',
            )
          "
          @click.self="handleOutsideClick"
        >
          <!-- The layer is the grid item, so it spans the window's width: a shrink-wrapped layer would hold the
               panel's `w-full` to its content width. It centers the panel in turn. -->
          <FocusScope as-child is-trapped can-loop is-modal>
            <DismissableLayer
              class="ui-modal-frame grid w-full justify-items-center"
              :is-escape-disabled="!dismissOnEscape"
              is-outside-click-disabled
              :on-escape="handleEscape"
            >
              <div
                ref="el"
                :role="role"
                aria-modal="true"
                :aria-labelledby="context.titleId"
                :aria-describedby="context.descriptionId"
                v-bind="rest"
                :class="classes"
              >
                <slot />
              </div>
            </DismissableLayer>
          </FocusScope>
        </div>
      </Presence>
    </ScrollLockProvider>
  </Portal>
</template>
