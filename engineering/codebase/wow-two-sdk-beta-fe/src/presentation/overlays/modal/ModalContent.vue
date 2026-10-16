<script lang="ts">
import {
  cn,
  type SurfaceElevation,
  type SurfacePadding,
  type SurfaceRadius,
  type SurfaceTone,
  type SurfaceVariant,
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

/** Defines how a `ModalContent` panel lays out below the `sm` breakpoint; from `sm` up it is the centred card. */
export const ModalPhoneLayout = {
  /** Refers to a panel that fills the screen — header on top, a scrolling body, the footer pinned to the bottom. */
  Fullscreen: 'fullscreen',
  /** Refers to a sheet docked to the bottom edge, rounded on top, that slides up. */
  Sheet: 'sheet',
  /** Refers to the centred card, as on wider screens. */
  Card: 'card',
} as const;

export type ModalPhoneLayout = (typeof ModalPhoneLayout)[keyof typeof ModalPhoneLayout];

const ModalSizeClass: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-none',
};

/* The layer, frame and panel classes per phone layout. Each is prefixed `max-sm:`, so wider screens keep the card. */
const LayerPhoneClass: Record<ModalPhoneLayout, string> = {
  fullscreen: 'max-sm:place-items-stretch max-sm:p-0',
  sheet: 'max-sm:items-end max-sm:justify-items-stretch max-sm:p-0',
  card: '',
};

const FramePhoneClass: Record<ModalPhoneLayout, string> = {
  fullscreen: 'max-sm:justify-items-stretch',
  sheet: 'max-sm:justify-items-stretch',
  card: '',
};

/* A wrapping `<form>` joins the fullscreen column, so its `ModalBody` takes the free height and the footer pins. */
const PanelPhoneClass: Record<ModalPhoneLayout, string> = {
  fullscreen: cn(
    'max-sm:h-dvh max-sm:max-h-dvh max-sm:w-full max-sm:max-w-none max-sm:rounded-none',
    'max-sm:[--ui-overlay-inset-top:env(safe-area-inset-top)]',
    'max-sm:[&>form]:flex max-sm:[&>form]:min-h-0 max-sm:[&>form]:flex-1 max-sm:[&>form]:flex-col',
  ),
  sheet: 'max-sm:w-full max-sm:max-w-none max-sm:rounded-t-2xl max-sm:rounded-b-none',
  card: '',
};

/* Phones rise from the bottom edge; the card keeps its pop wherever it shows. */
const PanelMotionClass: Record<ModalPhoneLayout, string> = {
  fullscreen: cn(
    'sm:motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'sm:motion-safe:group-data-[state=closed]:animate-(--animate-pop-out)',
    'max-sm:motion-safe:group-data-[state=open]:animate-(--animate-sheet-in)',
    'max-sm:motion-safe:group-data-[state=closed]:animate-(--animate-sheet-out)',
  ),
  sheet: cn(
    'sm:motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'sm:motion-safe:group-data-[state=closed]:animate-(--animate-pop-out)',
    'max-sm:motion-safe:group-data-[state=open]:animate-(--animate-sheet-in)',
    'max-sm:motion-safe:group-data-[state=closed]:animate-(--animate-sheet-out)',
  ),
  card: cn(
    'motion-safe:group-data-[state=open]:animate-(--animate-pop-in)',
    'motion-safe:group-data-[state=closed]:animate-(--animate-pop-out)',
  ),
};

/** The drag past which a released sheet handle dismisses: this many pixels, or a third of the sheet if shorter. */
const HandleDismissDistance = 96;

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

  /** The layout below the `sm` breakpoint; wider screens always get the centred card. Default `fullscreen`. */
  readonly phoneLayout?: ModalPhoneLayout;

  /**
   * Shows a grab handle on a phone `sheet`. Dragging it down dismisses the dialog where outside clicks may, and
   * springs back where they may not. Default `false`.
   */
  readonly showHandle?: boolean;
}
</script>

<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef, watch } from 'vue';
import { surfaceVariants } from '../../../foundation/styles';
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
  phoneLayout: ModalPhoneLayout.Fullscreen,
  showHandle: false,
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

/* Safe-area spacers keep content clear of the notch and the home indicator; they collapse from `sm` up. */
const hasBottomInset = computed(() => props.phoneLayout !== ModalPhoneLayout.Card);
const hasTopInset = computed(() => props.phoneLayout === ModalPhoneLayout.Fullscreen);
const hasHandle = computed(() => props.showHandle && props.phoneLayout === ModalPhoneLayout.Sheet);

const layerClasses = computed(() =>
  cn(
    'ui-modal-layer group fixed inset-0 z-modal grid place-items-center overflow-y-auto p-4',
    'motion-safe:data-[state=open]:animate-(--animate-fade-in)',
    'motion-safe:data-[state=closed]:animate-(--animate-fade-out)',
    LayerPhoneClass[props.phoneLayout],
  ),
);

const frameClasses = computed(() =>
  cn('ui-modal-frame grid w-full justify-items-center', FramePhoneClass[props.phoneLayout]),
);

const classes = computed(() =>
  cn(
    'ui-modal-content relative w-full',
    ModalSizeClass[props.size],
    /* The panel never outgrows the window: it caps at the viewport and its body scrolls under a fixed header and
       footer. A panel without a body part scrolls whole. */
    'flex max-h-[calc(100dvh-2rem)] flex-col overflow-y-auto overscroll-contain',
    PanelMotionClass[props.phoneLayout],
    surfaceVariants({
      variant: props.variant ?? 'elevated',
      tone: props.tone,
      radius: props.radius ?? 'lg',
      padding: props.padding ?? 'xl',
      elevation: props.elevation,
    }),
    attrs.class as string | undefined,
    /* Last, so a caller's width, height or radius serves the card and the phone layout still fills the screen. */
    PanelPhoneClass[props.phoneLayout],
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/* The sheet handle drag. The offset rides on the panel's transform; a release past the distance closes the dialog,
   and the exit keyframe leaves from that offset. Anything shorter springs back. */
const dragOffset = shallowRef(0);
const isDragging = shallowRef(false);
let dragPointer: { readonly id: number; readonly startY: number } | null = null;

watch(isOpen, (open) => {
  if (open) dragOffset.value = 0;
});

const dragStyle = computed(() =>
  hasHandle.value
    ? {
        transform: dragOffset.value > 0 ? `translateY(${dragOffset.value}px)` : undefined,
        transition: isDragging.value ? 'none' : 'transform var(--duration-base) var(--ease-out)',
      }
    : undefined,
);

function handlePointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  dragPointer = { id: event.pointerId, startY: event.clientY };
  isDragging.value = true;
  try {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  } catch {
    /* A synthetic or already-released pointer has nothing to capture; the drag still tracks moves on the handle. */
  }
}

function handlePointerMove(event: PointerEvent): void {
  if (dragPointer?.id !== event.pointerId) return;
  dragOffset.value = Math.max(0, event.clientY - dragPointer.startY);
}

function handlePointerEnd(event: PointerEvent): void {
  if (dragPointer?.id !== event.pointerId) return;
  dragPointer = null;
  isDragging.value = false;
  const height = el.value?.offsetHeight ?? 0;
  const distance = Math.min(HandleDismissDistance, height / 3);
  if (event.type === 'pointerup' && dragOffset.value > distance && context.dismissOnOutsideClick.value) {
    context.setOpen(false);
    return;
  }
  dragOffset.value = 0;
}

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
        <div :class="layerClasses" :data-phone-layout="props.phoneLayout" @click.self="handleOutsideClick">
          <!-- The layer is the grid item, so it spans the window's width: a shrink-wrapped layer would hold the
               panel's `w-full` to its content width. It centers the panel in turn. -->
          <FocusScope as-child is-trapped can-loop is-modal>
            <DismissableLayer
              :class="frameClasses"
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
                :data-phone-layout="props.phoneLayout"
                v-bind="rest"
                :class="classes"
                :style="dragStyle"
              >
                <div
                  v-if="hasHandle"
                  data-modal-handle
                  aria-hidden="true"
                  class="absolute inset-x-0 top-0 z-raised flex h-6 cursor-grab touch-none justify-center pt-2 sm:hidden"
                  @pointerdown="handlePointerDown"
                  @pointermove="handlePointerMove"
                  @pointerup="handlePointerEnd"
                  @pointercancel="handlePointerEnd"
                >
                  <span class="h-1 w-10 rounded-full bg-border-strong forced-colors:bg-[CanvasText]" />
                </div>
                <span
                  v-if="hasTopInset"
                  aria-hidden="true"
                  class="block h-[env(safe-area-inset-top)] shrink-0 sm:hidden"
                />
                <slot />
                <span
                  v-if="hasBottomInset"
                  aria-hidden="true"
                  class="block h-[env(safe-area-inset-bottom)] shrink-0 sm:hidden"
                />
              </div>
            </DismissableLayer>
          </FocusScope>
        </div>
      </Presence>
    </ScrollLockProvider>
  </Portal>
</template>
