<script lang="ts">
import { inject, type ComputedRef, type InjectionKey, type Ref } from 'vue';
import type {
  SurfaceElevation,
  SurfacePadding,
  SurfaceRadius,
  SurfaceTone,
  SurfaceVariant,
} from '../../../foundation/styles';

export type SnapPoint = number | string;

/** The value `useBottomSheet()` hands to anything rendered inside the sheet. */
export interface BottomSheetContextValue {
  /** The resolved open state. Writable — an assignment routes through `setOpen`. */
  open: Ref<boolean>;
  setOpen: (open: boolean) => void;
  /** The index of the active snap point. */
  currentSnap: Ref<number>;
  setCurrentSnap: (index: number) => void;
  snapPoints: ComputedRef<ReadonlyArray<SnapPoint>>;
}

export const bottomSheetContextKey: InjectionKey<BottomSheetContextValue> = Symbol('wow-two.bottomSheet');

export function useBottomSheet(): BottomSheetContextValue {
  const context = inject(bottomSheetContextKey, null);
  if (!context) throw new Error('useBottomSheet must be used inside <BottomSheet>');
  return context;
}

export function resolveSnapPx(point: SnapPoint, viewport: number): number {
  if (typeof point === 'number') return point;
  const trimmed = point.trim();
  if (trimmed.endsWith('vh')) return (parseFloat(trimmed) / 100) * viewport;
  if (trimmed.endsWith('px')) return parseFloat(trimmed);
  if (trimmed.endsWith('%')) return (parseFloat(trimmed) / 100) * viewport;
  // Fallback: try parseFloat as px.
  const n = parseFloat(trimmed);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Represents the prop surface of `BottomSheet`.
 *
 * React declared the surface axes by `extends SurfaceLayoutVariants`; they are
 * spelled out here because the SFC compiler's type resolver cannot follow a
 * `VariantProps<typeof …>` base and fails the build on it. The aliases below
 * are the canonical ones from `foundation/styles`, already locked against the
 * `surfaceVariants` config there, so the two cannot drift.
 */
export interface BottomSheetProps {
  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The heights the sheet snaps between — px numbers or CSS lengths. Default `['40vh', '90vh']`. */
  readonly snapPoints?: ReadonlyArray<SnapPoint>;

  /** The snap index the sheet opens at. Default 0. */
  readonly initialSnap?: number;

  /** The outside-click dismissal toggle. Default `true`. */
  readonly canDismissOnOutsideClick?: boolean;
  /** @deprecated Use `canDismissOnOutsideClick`; this alias is removed next release. */
  readonly dismissOnOutsideClick?: boolean;

  /** The Escape dismissal toggle. Default `true`. */
  readonly canDismissOnEscape?: boolean;
  /** @deprecated Use `canDismissOnEscape`; this alias is removed next release. */
  readonly dismissOnEscape?: boolean;

  /** The drag-below-lowest-snap dismissal toggle. Default `true`. */
  readonly canDragToDismiss?: boolean;
  /** @deprecated Use `canDragToDismiss`; this alias is removed next release. */
  readonly dragToDismiss?: boolean;

  /** The visual recipe. Default `elevated`. */
  readonly variant?: SurfaceVariant;

  /** The color tone the recipe is tinted with. */
  readonly tone?: SurfaceTone;

  /** The corner rounding. Default `none`. */
  readonly radius?: SurfaceRadius;

  /** The inner spacing step. Default `none`. */
  readonly padding?: SurfacePadding;

  /** The shadow depth. Default `5`. */
  readonly elevation?: SurfaceElevation;
}
</script>

<script setup lang="ts">
import {
  computed,
  normalizeStyle,
  provide,
  ref,
  shallowRef,
  useAttrs,
  useTemplateRef,
  watch,
  type ComponentPublicInstance,
} from 'vue';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { useId } from '../../../foundation/identifiers';
import { DismissableLayer, FocusScope, Portal, Presence, ScrollLockProvider } from '../../../foundation/primitives';
import BackdropOverlay from '../backdropOverlay/BackdropOverlay.vue';
import { overlayChromeContextKey } from '../OverlayChrome';
import { OverlayExtensions } from '../OverlayExtensions';
import { useLocale } from '../../../foundation/i18n';

/**
 * Renders a mobile bottom sheet with a drag handle and snap points.
 * Pointer-event drag moves between heights; releasing snaps to the nearest point. Past the lowest
 * snap with `canDragToDismiss`, the sheet closes.
 */
defineOptions({ name: 'BottomSheet', inheritAttrs: false });

/** The sheet content — `BottomSheetTitle` / `BottomSheetDescription` and the body. React's `children`. */
defineSlots<{ default(): unknown }>();

/** `open` default to `undefined` so an absent prop cannot read as an explicit `false`. */
const props = withDefaults(defineProps<BottomSheetProps>(), {
  open: undefined,
  defaultOpen: false,
  snapPoints: () => ['40vh', '90vh'],
  initialSnap: 0,
  canDismissOnOutsideClick: undefined,
  dismissOnOutsideClick: undefined,
  canDismissOnEscape: undefined,
  dismissOnEscape: undefined,
  canDragToDismiss: undefined,
  dragToDismiss: undefined,
});

/* Each flag reads its `can*` name first, then the deprecated alias. */
const dismissesOnOutsideClick = computed(() => props.canDismissOnOutsideClick ?? props.dismissOnOutsideClick ?? true);
const dismissesOnEscape = computed(() => props.canDismissOnEscape ?? props.dismissOnEscape ?? true);
const dismissesOnDrag = computed(() => props.canDragToDismiss ?? props.dragToDismiss ?? true);

const emit = defineEmits<{
  /** Fires when the sheet opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];
}>();

const attrs = useAttrs();

const controlled = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (value) => {
    emit('update:open', value);
  },
});

const resolvedOpen = controlled.value;
const currentSnap = ref(Math.min(props.initialSnap, props.snapPoints.length - 1));
const dragHeight = shallowRef<number | null>(null);
const locale = useLocale();
const titleId = useId('bottom-sheet-title');
const descriptionId = useId('bottom-sheet-description');

const panel = useTemplateRef<ComponentPublicInstance>('panel');
const handle = useTemplateRef<HTMLDivElement>('handle');

let startY: number | null = null;
let startHeight = 0;

/* Reset to `initialSnap` each time the sheet re-opens. */
watch(
  () => [resolvedOpen.value, props.initialSnap, props.snapPoints.length] as const,
  () => {
    if (resolvedOpen.value) currentSnap.value = Math.min(props.initialSnap, props.snapPoints.length - 1);
  },
);

provide(bottomSheetContextKey, {
  open: resolvedOpen,
  setOpen: controlled.setValue,
  currentSnap,
  setCurrentSnap: (index: number) => {
    currentSnap.value = index;
  },
  snapPoints: computed(() => props.snapPoints),
});

// The chrome pieces wire `id={titleId}` / `id={descriptionId}`, which is what
// the panel's `aria-labelledby` / `aria-describedby` resolve against.
provide(overlayChromeContextKey, {
  titleId,
  descriptionId,
  close: () => controlled.setValue(false),
});

/** `DismissableLayer` renders the panel div and exposes it, so `$el` is the sheet element. */
function panelEl(): HTMLElement | null {
  return OverlayExtensions.toHtmlElement(panel.value?.$el);
}

function handlePointerDown(event: PointerEvent): void {
  startY = event.clientY;
  const rect = panelEl()?.getBoundingClientRect();
  startHeight = rect ? rect.height : 0;
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent): void {
  if (startY === null) return;
  const dy = event.clientY - startY;
  dragHeight.value = Math.max(0, startHeight - dy);
}

function handlePointerUp(event: PointerEvent): void {
  if (startY === null) return;
  startY = null;
  (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);

  const viewport = typeof window !== 'undefined' ? window.innerHeight : 800;
  const heights = props.snapPoints.map((point) => resolveSnapPx(point, viewport));
  const liveHeight = dragHeight.value ?? heights[currentSnap.value] ?? 0;
  dragHeight.value = null;

  // Below lowest snap by 60px → dismiss.
  if (dismissesOnDrag.value && liveHeight < (heights[0] ?? 0) - 60) {
    controlled.setValue(false);
    return;
  }
  // Snap to nearest.
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  heights.forEach((height, index) => {
    const distance = Math.abs(height - liveHeight);
    if (distance < bestDist) {
      bestDist = distance;
      bestIdx = index;
    }
  });
  currentSnap.value = bestIdx;
}

function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'ArrowUp' && currentSnap.value < props.snapPoints.length - 1) {
    event.preventDefault();
    currentSnap.value += 1;
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    if (currentSnap.value > 0) currentSnap.value -= 1;
    else if (dismissesOnDrag.value) controlled.setValue(false);
  }
}

/**
 * The drag handle is the sheet's primary keyboard affordance (ArrowUp/ArrowDown
 * drive the snap state) — give it initial focus instead of FocusScope's default
 * first-tabbable walk, which falls back to the layer container here.
 */
function handleMountAutoFocus(event: CustomEvent): void {
  event.preventDefault();
  handle.value?.focus();
}

/** The handle's spoken position, so the snap it moves between is announced, not just an index. */
const handleValueText = computed(() =>
  locale.t(
    'BottomSheet.snapPosition',
    { index: currentSnap.value + 1, count: props.snapPoints.length },
    'Height {index} of {count}',
  ),
);

function handleBackdropClick(): void {
  if (dismissesOnOutsideClick.value) controlled.setValue(false);
}

function handleEscape(): void {
  controlled.setValue(false);
}

const heightStyle = computed<string>(() => {
  if (dragHeight.value !== null) return `${dragHeight.value}px`;
  const point = props.snapPoints[currentSnap.value];
  if (typeof point === 'number') return `${point}px`;
  return point ?? '40vh';
});

/** Own declarations first so a caller's `style` still wins — React's `style={{…}}` then `{...rest}`. */
const panelStyle = computed(() =>
  normalizeStyle([
    {
      height: heightStyle.value,
      transition:
        dragHeight.value === null ? 'height 220ms ease-out, transform var(--duration-base) var(--ease-out)' : 'none',
    },
    attrs.style,
  ]),
);

const classes = computed(() =>
  cn(
    'fixed inset-x-0 bottom-0 z-modal flex flex-col rounded-t-xl border-t outline-hidden',
    'will-change-transform',
    'motion-safe:data-[state=closed]:translate-y-full',
    'motion-reduce:translate-y-0',
    surfaceVariants({
      variant: props.variant ?? 'elevated',
      tone: props.tone,
      radius: props.radius ?? 'none',
      padding: props.padding ?? 'none',
      elevation: props.elevation ?? 5,
    }),
    attrs.class as string | undefined,
  ),
);

/** Everything but `class` / `style`, both re-applied above. */
const rest = computed(() => {
  const { class: _class, style: _style, ...others } = attrs;
  return others;
});

const el = computed(() => panelEl());

defineExpose({ el });
</script>

<template>
  <!--
    React nested `Portal` + `ScrollLockProvider` inside the Presence-cloned
    surface and forwarded the injected `ref` past them onto the panel with
    `forwardRef`. Vue resolves a cloned `ref` through `$el`, and a Teleport /
    renderless root has no element, so both are hoisted above `Presence` and the
    lock now follows open state rather than mount. Presence's cloned child is the
    sheet panel itself — the node that carries `data-state` and the
    `transition-transform` whose end defers the unmount.
  -->
  <Portal>
    <ScrollLockProvider :is-enabled="resolvedOpen">
      <!-- The scrim runs on `BackdropOverlay`'s own `Presence` (its `open` prop) so the
           fade-out plays before it unmounts. -->
      <BackdropOverlay is-inline :is-open="resolvedOpen" @click="handleBackdropClick" />
      <Presence :is-present="resolvedOpen">
        <!--
          `FocusScope as-child` merges into `DismissableLayer`, whose own root div
          *is* the sheet panel — React kept the layer div and the panel div separate
          and forwarded `data-state` down to the inner one. Collapsing them keeps
          every attribute of React's panel on the node `Presence` clones.
        -->
        <FocusScope as-child is-trapped can-loop is-modal :on-mount-auto-focus="handleMountAutoFocus">
          <DismissableLayer
            ref="panel"
            :is-escape-disabled="!dismissesOnEscape"
            is-outside-click-disabled
            :on-escape="handleEscape"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="titleId"
            :aria-describedby="descriptionId"
            :style="panelStyle"
            v-bind="rest"
            :class="classes"
          >
            <div
              ref="handle"
              role="separator"
              aria-orientation="horizontal"
              :aria-valuenow="currentSnap"
              :aria-valuemin="0"
              :aria-valuemax="props.snapPoints.length - 1"
              :aria-valuetext="handleValueText"
              :aria-label="locale.t('BottomSheet.resize', undefined, 'Resize sheet')"
              tabindex="0"
              class="flex h-7 cursor-ns-resize items-center justify-center focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
              @pointerdown="handlePointerDown"
              @pointermove="handlePointerMove"
              @pointerup="handlePointerUp"
              @pointercancel="handlePointerUp"
              @keydown="handleKeyDown"
            >
              <span class="h-1 w-10 rounded-full bg-border-strong" aria-hidden="true" />
            </div>
            <div class="flex-1 overflow-y-auto px-4 pb-4"><slot /></div>
          </DismissableLayer>
        </FocusScope>
      </Presence>
    </ScrollLockProvider>
  </Portal>
</template>
