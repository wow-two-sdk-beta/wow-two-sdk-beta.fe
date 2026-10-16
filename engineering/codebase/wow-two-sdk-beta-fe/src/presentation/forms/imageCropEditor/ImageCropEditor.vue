<script lang="ts">
/** Defines a crop in the image's natural pixels. */
export interface CropRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Defines props for the image crop editor. */
export interface ImageCropEditorProps {
  /** The image to crop. Cross-origin images need CORS for `toDataURL()`. */
  readonly src: string;

  /** The image's text alternative. Default empty — the crop area carries the name. */
  readonly alt?: string;

  /** The crop in natural pixels, controlled. The `v-model` binding target; `null` shows the default crop. */
  readonly modelValue?: CropRect | null;

  /** The initial crop when uncontrolled. */
  readonly defaultValue?: CropRect | null;

  /** The locked width-to-height ratio (`1`, `16 / 9`); unset crops freely. */
  readonly aspectRatio?: number;

  /** The smallest crop side in natural pixels. Default 16. */
  readonly minSize?: number;

  /** The tallest the image renders, as a CSS length. Default `24rem`. */
  readonly maxHeight?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Shows the crop but blocks changes. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;
}

/** @internal A drag's handle: the move body, a corner or an edge. */
type CropHandle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** @internal The corner handles, which keep a locked ratio. */
const CornerHandles: ReadonlyArray<CropHandle> = ['nw', 'ne', 'sw', 'se'];

/** @internal The edge handles, offered only when the ratio is free. */
const EdgeHandles: ReadonlyArray<CropHandle> = ['n', 's', 'e', 'w'];

/** @internal Where each handle sits and which cursor it shows. */
const HandleClass: Readonly<Record<Exclude<CropHandle, 'move'>, string>> = {
  nw: '-start-1.5 -top-1.5 cursor-nwse-resize',
  ne: '-end-1.5 -top-1.5 cursor-nesw-resize',
  sw: '-start-1.5 -bottom-1.5 cursor-nesw-resize',
  se: '-end-1.5 -bottom-1.5 cursor-nwse-resize',
  n: 'start-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize',
  s: 'start-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize',
  e: '-end-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
  w: '-start-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize',
};

/** @internal Clamps a number into a range. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** @internal Rounds a crop to whole pixels. */
function roundRect(rect: CropRect): CropRect {
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}
</script>

<script setup lang="ts">
import { computed, ref, shallowRef, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { useId } from '../../../foundation/identifiers';
import { useResizeObserver } from '../../../foundation/observers';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';

/**
 * Renders an image with a movable, resizable crop box — pointer and keyboard — and reports the crop in the
 * image's natural pixels; `toDataURL()` renders the cropped pixels.
 */
defineOptions({ name: 'ImageCropEditor', inheritAttrs: false });

const props = withDefaults(defineProps<ImageCropEditorProps>(), {
  alt: '',
  modelValue: undefined,
  defaultValue: null,
  aspectRatio: undefined,
  minSize: 16,
  maxHeight: '24rem',
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when a drag or a key press finishes changing the crop — the `v-model` half. */
  'update:modelValue': [crop: CropRect];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();
const hintId = useId('crop-hint');

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const locked = computed(() => disabled.value || readOnly.value);

const controlled = useControlled<CropRect | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    if (next) emit('update:modelValue', next);
  },
});
const value = controlled.value;

const image = useTemplateRef<HTMLImageElement>('image');
const natural = shallowRef({ width: 0, height: 0 });

/** The rectangle being dragged, shown instead of the value until the drag ends. */
const draft = shallowRef<CropRect | null>(null);

const ratio = computed(() =>
  props.aspectRatio !== undefined && Number.isFinite(props.aspectRatio) && props.aspectRatio > 0
    ? props.aspectRatio
    : undefined,
);
const minSide = computed(() => Math.max(1, props.minSize));

/** The largest centered crop at the locked ratio, or 80% of the image when free. */
const defaultCrop = computed<CropRect>(() => {
  const { width, height } = natural.value;
  if (ratio.value === undefined) {
    return { x: width * 0.1, y: height * 0.1, width: width * 0.8, height: height * 0.8 };
  }
  const fitWidth = Math.min(width, height * ratio.value);
  const fitHeight = fitWidth / ratio.value;
  return { x: (width - fitWidth) / 2, y: (height - fitHeight) / 2, width: fitWidth, height: fitHeight };
});

/** The crop on screen — a live drag, else the value, else the default. */
const crop = computed<CropRect>(() => draft.value ?? value.value ?? defaultCrop.value);

const isLoaded = computed(() => natural.value.width > 0 && natural.value.height > 0);

/* Sized from the natural width, capped by the container and by `maxHeight` through the ratio — never by
   `max-height`, which would squash a width-sized image. The px width also gives shrink-wrapping ancestors a
   preferred size, which an SVG with only a viewBox lacks. */
const imageStyle = computed(() => {
  const { width, height } = natural.value;
  if (!isLoaded.value) return { maxWidth: '100%', maxHeight: props.maxHeight };
  return { width: `${width}px`, height: 'auto', maxWidth: `min(100%, calc(${props.maxHeight} * ${width / height}))` };
});

/* The frame tracks the image's rendered box, so the crop never depends on a wrapper shrinking to fit an image
   that has no intrinsic width (an SVG with only a viewBox collapses a fit-content wrapper to zero). */
const frameStyle = shallowRef<Record<string, string>>({});

function measureFrame(): void {
  const element = image.value;
  if (!element) return;
  frameStyle.value = {
    left: `${element.offsetLeft}px`,
    top: `${element.offsetTop}px`,
    width: `${element.offsetWidth}px`,
    height: `${element.offsetHeight}px`,
  };
}

useResizeObserver(image, measureFrame);

function onLoad(): void {
  const element = image.value;
  if (!element) return;
  natural.value = { width: element.naturalWidth, height: element.naturalHeight };
  measureFrame();
}

/** The crop box's placement as percentages of the rendered image. */
const boxStyle = computed(() => {
  const { width, height } = natural.value;
  if (!isLoaded.value) return { display: 'none' };
  const rect = crop.value;
  return {
    left: `${(rect.x / width) * 100}%`,
    top: `${(rect.y / height) * 100}%`,
    width: `${(rect.width / width) * 100}%`,
    height: `${(rect.height / height) * 100}%`,
  };
});

/** Natural pixels per rendered pixel. */
function scale(): number {
  const box = image.value?.getBoundingClientRect();
  return box && box.width > 0 ? natural.value.width / box.width : 1;
}

/** A pointer's position in natural pixels, clamped into the image. */
function naturalPoint(event: PointerEvent): { x: number; y: number } {
  const box = image.value!.getBoundingClientRect();
  const factor = scale();
  return {
    x: clamp((event.clientX - box.left) * factor, 0, natural.value.width),
    y: clamp((event.clientY - box.top) * factor, 0, natural.value.height),
  };
}

/** Moves a crop by an offset, kept inside the image. */
function moved(rect: CropRect, dx: number, dy: number): CropRect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, natural.value.width - rect.width),
    y: clamp(rect.y + dy, 0, natural.value.height - rect.height),
  };
}

/** Resizes a crop by dragging one handle to a point; the opposite side stays anchored. */
function resized(rect: CropRect, handle: Exclude<CropHandle, 'move'>, point: { x: number; y: number }): CropRect {
  const { width: imageWidth, height: imageHeight } = natural.value;
  const east = handle.includes('e');
  const west = handle.includes('w');
  const south = handle.includes('s');
  const north = handle.includes('n');
  const anchorX = west ? rect.x + rect.width : rect.x;
  const anchorY = north ? rect.y + rect.height : rect.y;
  const roomX = west ? anchorX : imageWidth - anchorX;
  const roomY = north ? anchorY : imageHeight - anchorY;
  let width = east || west ? clamp(west ? anchorX - point.x : point.x - anchorX, minSide.value, roomX) : rect.width;
  let height =
    north || south ? clamp(north ? anchorY - point.y : point.y - anchorY, minSide.value, roomY) : rect.height;
  if (ratio.value !== undefined) {
    height = width / ratio.value;
    if (height > roomY) {
      height = roomY;
      width = height * ratio.value;
    }
    if (height < minSide.value) {
      height = Math.min(minSide.value, roomY);
      width = Math.min(height * ratio.value, roomX);
    }
  }
  return {
    x: west ? anchorX - width : east ? anchorX : rect.x,
    y: north ? anchorY - height : south ? anchorY : rect.y,
    width,
    height,
  };
}

let drag: { handle: CropHandle; pointerId: number; origin: { x: number; y: number }; start: CropRect } | null = null;

function onPointerDown(event: PointerEvent, handle: CropHandle): void {
  if (locked.value || !isLoaded.value || event.button !== 0 || drag) return;
  event.preventDefault();
  event.stopPropagation();
  try {
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  } catch {
    /* A pointer the browser no longer tracks has nothing to capture. */
  }
  drag = { handle, pointerId: event.pointerId, origin: naturalPoint(event), start: crop.value };
  draft.value = crop.value;
}

function onPointerMove(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const point = naturalPoint(event);
  draft.value =
    drag.handle === 'move'
      ? moved(drag.start, point.x - drag.origin.x, point.y - drag.origin.y)
      : resized(drag.start, drag.handle, point);
}

function onPointerEnd(event: PointerEvent): void {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag = null;
  const next = draft.value;
  draft.value = null;
  if (next) commit(next);
}

/** Reports a crop, rounded to whole pixels. */
function commit(rect: CropRect): void {
  controlled.setValue(roundRect(rect));
  announcement.value = describe(roundRect(rect));
}

function onKeydown(event: KeyboardEvent): void {
  const steps: Readonly<Record<string, readonly [number, number]>> = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  };
  const step = steps[event.key];
  if (!step || locked.value || !isLoaded.value) return;
  event.preventDefault();
  const distance = Math.max(1, (event.shiftKey ? 10 : 1) * scale());
  const rect = crop.value;
  if (!event.altKey) {
    commit(moved(rect, step[0] * distance, step[1] * distance));
    return;
  }
  const corner = { x: rect.x + rect.width + step[0] * distance, y: rect.y + rect.height + step[1] * distance };
  if (ratio.value !== undefined && step[0] === 0) corner.x = rect.x + (rect.height + step[1] * distance) * ratio.value;
  commit(resized(rect, 'se', corner));
}

const handles = computed(() => (ratio.value === undefined ? [...CornerHandles, ...EdgeHandles] : CornerHandles));

const announcement = ref('');

function describe(rect: CropRect): string {
  return locale.t(
    'ImageCropEditor.status',
    { width: rect.width, height: rect.height, x: rect.x, y: rect.y },
    '{width} × {height} at {x}, {y}',
  );
}

/** Renders the cropped pixels at natural size; `null` before the image loads or when the canvas is tainted. */
function toDataURL(type = 'image/png', quality?: number): string | null {
  const element = image.value;
  if (!element || !isLoaded.value || typeof document === 'undefined') return null;
  const rect = roundRect(crop.value);
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.drawImage(element, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
  try {
    return canvas.toDataURL(type, quality);
  } catch {
    return null;
  }
}

defineExpose({ toDataURL });

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const areaName = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('ImageCropEditor.label', undefined, 'Crop area'),
);

const rest = computed(() => {
  const { class: _class, [AriaAttribute.Label]: _label, ...others } = attrs;
  return others;
});

const rootClass = computed(() =>
  cn('relative block w-full select-none', disabled.value && 'opacity-60', attrs.class as ClassValue),
);

const boxClass = computed(() =>
  cn(
    'absolute outline-2 outline-white',
    'focus-visible:outline-primary',
    locked.value ? 'cursor-default' : 'cursor-move touch-none',
  ),
);
</script>

<template>
  <div v-bind="rest" :class="rootClass" :data-dragging="draft ? '' : undefined">
    <img
      ref="image"
      :src="props.src"
      :alt="props.alt"
      draggable="false"
      class="block rounded-md"
      :style="imageStyle"
      @load="onLoad"
    />
    <!-- The dimmed surround is clipped to the image; the interactive box sits in an unclipped layer so its
         handles stay whole at the image edge. -->
    <div class="pointer-events-none absolute overflow-hidden rounded-md" :style="frameStyle" aria-hidden="true">
      <div class="absolute shadow-[0_0_0_9999px_rgb(0_0_0/0.5)]" :style="boxStyle" />
    </div>
    <div class="absolute" :style="frameStyle">
      <div
        role="group"
        :aria-label="areaName"
        :aria-describedby="hintId"
        :aria-disabled="disabled || undefined"
        :tabindex="disabled || !isLoaded ? -1 : 0"
        :class="boxClass"
        :style="boxStyle"
        data-crop-box
        @pointerdown="onPointerDown($event, 'move')"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
        @keydown="onKeydown"
      >
        <!-- Thirds guides while dragging. -->
        <template v-if="draft">
          <span class="pointer-events-none absolute inset-y-0 start-1/3 border-s border-white/60" aria-hidden="true" />
          <span class="pointer-events-none absolute inset-y-0 start-2/3 border-s border-white/60" aria-hidden="true" />
          <span class="pointer-events-none absolute inset-x-0 top-1/3 border-t border-white/60" aria-hidden="true" />
          <span class="pointer-events-none absolute inset-x-0 top-2/3 border-t border-white/60" aria-hidden="true" />
        </template>
        <template v-if="!locked">
          <span
            v-for="handle in handles"
            :key="handle"
            :class="
              cn(
                'absolute size-3 rounded-sm border border-primary bg-white',
                HandleClass[handle as Exclude<CropHandle, 'move'>],
              )
            "
            :data-handle="handle"
            aria-hidden="true"
            @pointerdown="onPointerDown($event, handle)"
            @pointermove="onPointerMove"
            @pointerup="onPointerEnd"
            @pointercancel="onPointerEnd"
          />
        </template>
      </div>
    </div>
    <span :id="hintId" class="sr-only">
      {{
        locale.t(
          'ImageCropEditor.hint',
          undefined,
          'Arrow keys move the crop; Alt with arrow keys resizes it; Shift moves ten times farther.',
        )
      }}
    </span>
    <span class="sr-only" aria-live="polite">{{ announcement }}</span>
  </div>
</template>
