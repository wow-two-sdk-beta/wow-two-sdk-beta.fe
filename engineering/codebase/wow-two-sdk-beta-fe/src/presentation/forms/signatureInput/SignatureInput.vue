<script lang="ts">
/** Names the image format a signature is exported as. */
export const SignatureFormat = {
  /** A vector `image/svg+xml` data URL — crisp at any size, produced without a canvas. */
  Svg: 'svg',
  /** A raster `image/png` data URL at the device pixel ratio. */
  Png: 'png',
} as const;
export type SignatureFormat = (typeof SignatureFormat)[keyof typeof SignatureFormat];

/** Defines props for the drawn-signature field. */
export interface SignatureInputProps {
  /** The signature as a data URL, controlled. The `v-model` binding target; `null` is unsigned. */
  readonly modelValue?: string | null;

  /** The initial signature when uncontrolled — shown until the reader signs again. */
  readonly defaultValue?: string | null;

  /** The export format. Default `svg`. */
  readonly format?: SignatureFormat;

  /** The ink color, as any CSS color. Default the field's text color. */
  readonly penColor?: string;

  /** The stroke width in CSS pixels. Default 2.5. */
  readonly penWidth?: number;

  /** The hint drawn on an empty pad. Default `"Sign here"`, localized. */
  readonly placeholder?: string;

  /** The disabled state. Falls back to the surrounding field's state. */
  readonly isDisabled?: boolean;

  /** Keeps the signature but blocks drawing. Falls back to the surrounding field's state. */
  readonly isReadOnly?: boolean;

  /** The invalid state. Falls back to the surrounding field's state. */
  readonly isInvalid?: boolean;

  /** The hidden input name; the data URL ships with the form. */
  readonly name?: string;
}

/** @internal One sampled pen position, in CSS pixels from the pad's top-left corner. */
interface SignaturePoint {
  readonly x: number;
  readonly y: number;
}

/** @internal The closest two samples may sit before the second is dropped. */
const MinPointGap = 0.5;

/** @internal Rounds a coordinate for compact SVG output. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}
</script>

<script setup lang="ts">
import { computed, onMounted, ref, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { useResizeObserver } from '../../../foundation/observers';
import { useFormControl } from '../../../foundation/primitives';
import { useControlled } from '../../../foundation/state';
import { cn } from '../../../foundation/styles';
import { Button } from '../../actions';

/**
 * Renders a pad the reader signs with a pointer — mouse, pen or finger — plus undo and clear, and reports the
 * signature as an image data URL.
 */
defineOptions({ name: 'SignatureInput', inheritAttrs: false });

const componentProps = withDefaults(defineProps<SignatureInputProps>(), {
  modelValue: undefined,
  defaultValue: null,
  format: SignatureFormat.Svg,
  penColor: undefined,
  penWidth: 2.5,
  isDisabled: undefined,
  isReadOnly: undefined,
  isInvalid: undefined,
  name: undefined,
});
const props = useLocaleDefaults(componentProps, 'SignatureInput', { placeholder: 'Sign here' });

const emit = defineEmits<{
  /** Fires when the reader finishes a stroke, undoes one or clears the pad — the `v-model` half. */
  'update:modelValue': [signature: string | null];
}>();

const attrs = useAttrs();
const locale = useLocale();
const field = useFormControl();

const disabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);
const readOnly = computed(() => props.isReadOnly ?? field?.isReadOnly ?? false);
const invalid = computed(() => props.isInvalid ?? field?.isInvalid ?? false);
const locked = computed(() => disabled.value || readOnly.value);

const controlled = useControlled<string | null>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});
const value = controlled.value;

const canvas = useTemplateRef<HTMLCanvasElement>('canvas');

/** The strokes drawn this session; `strokeCount` is their reactive shadow. */
const strokes: SignaturePoint[][] = [];
const strokeCount = ref(0);
let activePointer: number | null = null;

/** A saved signature shows until the reader signs again. */
const showsSaved = computed(() => value.value !== null && strokeCount.value === 0);
const isEmpty = computed(() => value.value === null && strokeCount.value === 0);

/** The ink color — the prop, else the pad's computed text color. */
function inkColor(): string {
  if (props.penColor) return props.penColor;
  return canvas.value ? getComputedStyle(canvas.value).color || '#000' : '#000';
}

function context2d(): CanvasRenderingContext2D | null {
  return canvas.value?.getContext('2d') ?? null;
}

/** Draws one stroke — a dot for a single sample, else a round-jointed polyline. */
function drawStroke(context: CanvasRenderingContext2D, stroke: ReadonlyArray<SignaturePoint>): void {
  const [first, ...others] = stroke;
  if (!first) return;
  context.beginPath();
  if (others.length === 0) {
    context.arc(first.x, first.y, props.penWidth / 2, 0, Math.PI * 2);
    context.fill();
    return;
  }
  context.moveTo(first.x, first.y);
  for (const point of others) context.lineTo(point.x, point.y);
  context.stroke();
}

function prepare(context: CanvasRenderingContext2D): void {
  const color = inkColor();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = props.penWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';
}

/** Repaints every stroke — after a resize, an undo or a clear. */
function redraw(): void {
  const element = canvas.value;
  const context = context2d();
  if (!element || !context) return;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, element.width, element.height);
  context.restore();
  prepare(context);
  for (const stroke of strokes) drawStroke(context, stroke);
}

/** Matches the bitmap to the pad's CSS size at the device pixel ratio, then repaints. */
function fitBitmap(): void {
  const element = canvas.value;
  const context = context2d();
  if (!element || !context) return;
  const ratio = window.devicePixelRatio || 1;
  const box = element.getBoundingClientRect();
  element.width = Math.max(1, Math.round(box.width * ratio));
  element.height = Math.max(1, Math.round(box.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  redraw();
}

onMounted(fitBitmap);
useResizeObserver(canvas, fitBitmap);

function pointOf(event: PointerEvent): SignaturePoint {
  const box = canvas.value!.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

function onPointerDown(event: PointerEvent): void {
  if (locked.value || event.button !== 0 || activePointer !== null) return;
  event.preventDefault();
  try {
    canvas.value?.setPointerCapture(event.pointerId);
  } catch {
    /* A pointer the browser no longer tracks (a synthetic or already-lifted one) has nothing to capture. */
  }
  activePointer = event.pointerId;
  const stroke = [pointOf(event)];
  strokes.push(stroke);
  strokeCount.value = strokes.length;
  const context = context2d();
  if (context) {
    prepare(context);
    drawStroke(context, stroke);
  }
}

function onPointerMove(event: PointerEvent): void {
  if (event.pointerId !== activePointer) return;
  const stroke = strokes[strokes.length - 1]!;
  const previous = stroke[stroke.length - 1]!;
  const point = pointOf(event);
  if (Math.hypot(point.x - previous.x, point.y - previous.y) < MinPointGap) return;
  stroke.push(point);
  const context = context2d();
  if (!context) return;
  prepare(context);
  context.beginPath();
  context.moveTo(previous.x, previous.y);
  context.lineTo(point.x, point.y);
  context.stroke();
}

function onPointerEnd(event: PointerEvent): void {
  if (event.pointerId !== activePointer) return;
  activePointer = null;
  commit();
}

/** The strokes as an SVG data URL sized to the pad. */
function toSvg(): string {
  const box = canvas.value?.getBoundingClientRect();
  const points = strokes.flat();
  const width = Math.ceil(box?.width || Math.max(...points.map((point) => point.x)) + props.penWidth);
  const height = Math.ceil(box?.height || Math.max(...points.map((point) => point.y)) + props.penWidth);
  const paths = strokes
    .map((stroke) => {
      const [first, ...others] = stroke;
      const tail = (others.length > 0 ? others : [first!]).map((point) => `L${round(point.x)} ${round(point.y)}`);
      return `<path d="M${round(first!.x)} ${round(first!.y)} ${tail.join(' ')}"/>`;
    })
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" ` +
    `height="${height}"><g fill="none" stroke="${inkColor()}" stroke-width="${props.penWidth}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${paths}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Exports the strokes — `null` once none remain. */
function exportSignature(): string | null {
  if (strokes.length === 0) return null;
  if (props.format === SignatureFormat.Png && canvas.value && context2d()) return canvas.value.toDataURL('image/png');
  return toSvg();
}

function commit(): void {
  controlled.setValue(exportSignature());
}

function undo(): void {
  if (locked.value || strokes.length === 0) return;
  strokes.pop();
  strokeCount.value = strokes.length;
  redraw();
  commit();
}

function clear(): void {
  if (locked.value || isEmpty.value) return;
  strokes.length = 0;
  strokeCount.value = 0;
  redraw();
  controlled.setValue(null);
}

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel`. */
const padName = computed(
  () => (attrs[AriaAttribute.Label] as string | undefined) ?? locale.t('SignatureInput.label', undefined, 'Signature'),
);
const statusText = computed(() =>
  isEmpty.value
    ? locale.t('SignatureInput.unsigned', undefined, 'Not signed')
    : locale.t('SignatureInput.signed', undefined, 'Signed'),
);
const formId = computed(() => (typeof attrs.form === 'string' ? attrs.form : undefined));

const OwnedAttributes: ReadonlySet<string> = new Set(['class', 'form', AriaAttribute.Label]);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const padClass = computed(() =>
  cn(
    'relative h-40 w-full overflow-hidden rounded-md border bg-field text-foreground',
    invalid.value ? 'border-destructive-soft-foreground' : 'border-input',
    disabled.value && 'opacity-60',
    readOnly.value && 'bg-muted',
  ),
);
const canvasClass = computed(() =>
  cn('absolute inset-0 size-full touch-none', locked.value ? 'cursor-not-allowed' : 'cursor-crosshair'),
);
</script>

<template>
  <div :class="cn('flex flex-col gap-1.5', attrs.class as ClassValue)" v-bind="passthroughAttrs">
    <div :class="padClass" :data-empty="isEmpty ? '' : undefined">
      <span
        v-if="isEmpty"
        class="pointer-events-none absolute inset-x-4 bottom-6 border-b border-dashed border-border pb-1 text-xs text-subtle-foreground"
        aria-hidden="true"
      >
        {{ props.placeholder }}
      </span>
      <img
        v-if="showsSaved"
        :src="value!"
        alt=""
        class="pointer-events-none absolute inset-0 size-full object-contain"
        data-saved
      />
      <canvas
        ref="canvas"
        role="img"
        :aria-label="padName"
        :aria-labelledby="attrs[AriaAttribute.Label] ? undefined : field?.labelledBy"
        :aria-describedby="field?.describedBy"
        :aria-invalid="invalid || undefined"
        :aria-disabled="disabled || undefined"
        :class="canvasClass"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerEnd"
        @pointercancel="onPointerEnd"
      />
    </div>
    <div class="flex items-center gap-1">
      <span class="me-auto text-xs text-muted-foreground" aria-live="polite">{{ statusText }}</span>
      <Button size="sm" variant="ghost" :disabled="locked || strokeCount === 0" @click="undo">
        {{ locale.t('SignatureInput.undo', undefined, 'Undo') }}
      </Button>
      <Button size="sm" variant="ghost" :disabled="locked || isEmpty" @click="clear">
        {{ locale.t('SignatureInput.clear', undefined, 'Clear') }}
      </Button>
    </div>
    <input
      v-if="props.name"
      type="hidden"
      :disabled="disabled"
      :form="formId"
      :name="props.name"
      :value="value ?? ''"
    />
  </div>
</template>
