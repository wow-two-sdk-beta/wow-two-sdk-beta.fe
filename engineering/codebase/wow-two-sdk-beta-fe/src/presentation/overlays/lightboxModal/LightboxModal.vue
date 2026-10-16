<script lang="ts">
/** Defines one image the lightbox shows. */
export interface LightboxImage {
  /** The image URL. */
  readonly src: string;

  /** The text alternative; also announced when the image changes. */
  readonly alt: string;

  /** The caption shown under the image. */
  readonly caption?: string;

  /** The responsive image candidates. */
  readonly srcset?: string;
}

/** Defines props for the full-screen image viewer. */
export interface LightboxModalProps {
  /** The images, in viewing order. */
  readonly images: ReadonlyArray<LightboxImage>;

  /** The open state, controlled. The `v-model:open` binding target. */
  readonly open?: boolean;

  /** The initial open state when uncontrolled. Default `false`. */
  readonly defaultOpen?: boolean;

  /** The shown image's position, controlled. The `v-model:index` binding target. */
  readonly index?: number;

  /** The initial position when uncontrolled. Default 0. */
  readonly defaultIndex?: number;

  /** Whether stepping past either end wraps around. Default `true`. */
  readonly isLooping?: boolean;

  /** The dialog's name. Default `"Image viewer"`, localized. */
  readonly label?: string;
}

/** @internal The horizontal travel, in CSS pixels, that turns a touch drag into a swipe. */
const SwipeDistance = 48;

/** @internal The step buttons' shared look. */
const StepButtonClass =
  'absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/50 text-white ' +
  'transition-colors hover:bg-black/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-white ' +
  'disabled:pointer-events-none disabled:opacity-30';
</script>

<script setup lang="ts">
import { computed, useAttrs, watch } from 'vue';
import type { ClassValue } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { Modal, ModalClose, ModalContent, ModalTitle } from '../modal';

/**
 * Renders a full-screen viewer that steps through images by button, arrow key or swipe, with captions and a
 * position counter.
 */
defineOptions({ name: 'LightboxModal', inheritAttrs: false });

defineSlots<{
  /** The triggers — typically thumbnails; `openAt(index)` opens the viewer on that image. */
  default?(props: { openAt: (index: number) => void }): unknown;
}>();

const componentProps = withDefaults(defineProps<LightboxModalProps>(), {
  open: undefined,
  defaultOpen: false,
  index: undefined,
  defaultIndex: 0,
  isLooping: true,
});
const props = useLocaleDefaults(componentProps, 'LightboxModal', { label: 'Image viewer' });

const emit = defineEmits<{
  /** Fires when the viewer opens or closes — the `v-model:open` half. */
  'update:open': [open: boolean];

  /** Fires when the reader steps to another image — the `v-model:index` half. */
  'update:index': [index: number];
}>();

const attrs = useAttrs();
const locale = useLocale();

const openState = useControlled<boolean>({
  controlled: () => props.open,
  default: () => props.defaultOpen,
  onChange: (next) => {
    emit('update:open', next);
  },
});
const isOpen = openState.value;

const indexState = useControlled<number>({
  controlled: () => props.index,
  default: () => props.defaultIndex,
  onChange: (next) => {
    emit('update:index', next);
  },
});

const count = computed(() => props.images.length);
const lastIndex = computed(() => Math.max(0, count.value - 1));
const current = computed(() => {
  const requested = Number.isFinite(indexState.value.value) ? Math.round(indexState.value.value) : 0;
  return Math.min(Math.max(0, requested), lastIndex.value);
});
const image = computed<LightboxImage | undefined>(() => props.images[current.value]);
const hasMany = computed(() => count.value > 1);
const canGoBack = computed(() => hasMany.value && (props.isLooping || current.value > 0));
const canGoForward = computed(() => hasMany.value && (props.isLooping || current.value < lastIndex.value));

/** Shows the image at a position — wrapped when looping, clamped otherwise. */
function show(next: number): void {
  if (count.value === 0) return;
  const target = props.isLooping
    ? ((next % count.value) + count.value) % count.value
    : Math.min(Math.max(0, next), lastIndex.value);
  if (target !== current.value) indexState.setValue(target);
}

/** Opens the viewer on one image — handed to the trigger slot. */
function openAt(index: number): void {
  show(index);
  openState.setValue(true);
}

function setOpen(next: boolean): void {
  openState.setValue(next);
}

/** `1` in a left-to-right layout, `-1` in a right-to-left one — the direction "next" travels on screen. */
function forward(element: Element): 1 | -1 {
  return getComputedStyle(element).direction === 'rtl' ? -1 : 1;
}

function onKeydown(event: KeyboardEvent): void {
  const step = forward(event.currentTarget as Element);
  if (event.key === 'ArrowRight') show(current.value + step);
  else if (event.key === 'ArrowLeft') show(current.value - step);
  else if (event.key === 'Home') show(0);
  else if (event.key === 'End') show(lastIndex.value);
  else return;
  event.preventDefault();
}

let swipe: { readonly x: number; readonly y: number; readonly pointerId: number } | null = null;

function onPointerDown(event: PointerEvent): void {
  swipe = event.pointerType === 'mouse' ? null : { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
}

function onPointerUp(event: PointerEvent): void {
  const start = swipe;
  swipe = null;
  if (!start || start.pointerId !== event.pointerId) return;
  const travel = event.clientX - start.x;
  if (Math.abs(travel) < SwipeDistance || Math.abs(travel) < Math.abs(event.clientY - start.y)) return;
  const step = forward(event.currentTarget as Element);
  show(current.value + (travel < 0 ? step : -step));
}

function cancelSwipe(): void {
  swipe = null;
}

/* Warms the neighbours so a step shows its image at once. Client-only: watchers never fire during SSR. */
watch([isOpen, current], () => {
  if (!isOpen.value || !hasMany.value || typeof Image === 'undefined') return;
  for (const offset of [-1, 1]) {
    const neighbour = props.images[(current.value + offset + count.value) % count.value];
    if (neighbour) new Image().src = neighbour.src;
  }
});

const counterText = computed(() =>
  locale.t('LightboxModal.counter', { current: current.value + 1, total: count.value }, '{current} of {total}'),
);
const announcement = computed(() =>
  image.value ? (hasMany.value ? `${counterText.value}: ${image.value.alt}` : image.value.alt) : '',
);

const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

const contentClass = computed(() =>
  cn(
    'flex h-[min(90vh,60rem)] w-[min(96vw,80rem)] max-w-none flex-col gap-2 bg-black/90 p-3 text-white shadow-none',
    attrs.class as ClassValue,
  ),
);
</script>

<template>
  <Modal :open="isOpen" @update:open="setOpen">
    <slot :open-at="openAt" />
    <ModalContent v-bind="rest" is-blurred :class="contentClass" @keydown="onKeydown">
      <ModalTitle class="sr-only">{{ props.label }}</ModalTitle>
      <div class="flex min-h-10 items-center gap-2 text-sm text-white/80">
        <span v-if="hasMany" aria-hidden="true" data-counter>{{ counterText }}</span>
        <ModalClose class="ms-auto text-white hover:bg-white/10" />
      </div>
      <figure
        class="relative flex min-h-0 flex-1 touch-pan-y touch-pinch-zoom flex-col items-center justify-center gap-2"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="cancelSwipe"
      >
        <img
          v-if="image"
          :key="image.src"
          :src="image.src"
          :srcset="image.srcset"
          :alt="image.alt"
          draggable="false"
          class="min-h-0 max-w-full flex-1 rounded-md object-contain select-none"
        />
        <figcaption v-if="image?.caption" class="text-center text-sm text-white/90">{{ image.caption }}</figcaption>
        <button
          v-if="hasMany"
          type="button"
          :aria-label="locale.t('LightboxModal.previous', undefined, 'Previous image')"
          :disabled="!canGoBack"
          :class="cn(StepButtonClass, 'start-2')"
          @click="show(current - 1)"
        >
          <ChevronLeft class="size-5 rtl:-scale-x-100" />
        </button>
        <button
          v-if="hasMany"
          type="button"
          :aria-label="locale.t('LightboxModal.next', undefined, 'Next image')"
          :disabled="!canGoForward"
          :class="cn(StepButtonClass, 'end-2')"
          @click="show(current + 1)"
        >
          <ChevronRight class="size-5 rtl:-scale-x-100" />
        </button>
      </figure>
      <p class="sr-only" aria-live="polite">{{ announcement }}</p>
    </ModalContent>
  </Modal>
</template>
