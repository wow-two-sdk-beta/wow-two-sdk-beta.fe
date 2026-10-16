<script lang="ts">
/** Defines the geometry of a CSS gradient. */
export const GradientKind = {
  /** Refers to a linear gradient. */
  Linear: 'linear',
  /** Refers to a radial gradient. */
  Radial: 'radial',
  /** Refers to a conic gradient. */
  Conic: 'conic',
} as const;

export type GradientKind = (typeof GradientKind)[keyof typeof GradientKind];

export interface GradientStop {
  readonly color: string;
  readonly position: number;
}

export interface Gradient {
  readonly kind: GradientKind;
  readonly angle: number;
  readonly stops: ReadonlyArray<GradientStop>;
}

export interface GradientPickerProps {
  /** The gradient, controlled. The `v-model` binding target. */
  readonly modelValue?: Gradient;

  /** The initial gradient when uncontrolled. */
  readonly defaultValue?: Gradient;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevent gradient edits; inherits the surrounding Field. */
  readonly isReadOnly?: boolean;

  /** The hidden input name; the hidden input emits the CSS string. */
  readonly name?: string;

  /** The control's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}

const DefaultGradient: Gradient = {
  kind: GradientKind.Linear,
  angle: 90,
  stops: [
    { color: '#3b82f6', position: 0 },
    { color: '#a855f7', position: 100 },
  ],
};

export function gradientToCss(g: Gradient): string {
  const stops = [...g.stops].sort((a, b) => a.position - b.position);
  const stopsStr = stops.map((s) => `${s.color} ${s.position}%`).join(', ');
  if (g.kind === GradientKind.Linear) return `linear-gradient(${g.angle}deg, ${stopsStr})`;
  if (g.kind === GradientKind.Radial) return `radial-gradient(circle, ${stopsStr})`;
  return `conic-gradient(from ${g.angle}deg, ${stopsStr})`;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { Plus, Trash } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { Icon } from '../../../foundation/icons';
import { useFormControl } from '../../../foundation/primitives';
import { inputBaseVariants, InputSize } from '../InputStyles';

/**
 * Renders a live gradient preview over editors for its kind, angle and colour stops.
 *
 * Emits a `Gradient` object; giving it a `name` also writes the CSS string into a hidden input.
 *
 * Form-aware at GROUP level: inside a `Field`/`form.Field` the root (`role="group"`)
 * takes the context id + `aria-labelledby`/`aria-describedby`/`aria-invalid`, and
 * the disabled flag cascades to every inner control.
 */
/* `inheritAttrs: false` so `class` folds into the root's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'GradientPicker', inheritAttrs: false });

const props = withDefaults(defineProps<GradientPickerProps>(), {
  /* Explicit `undefined` defaults: `useControlled` keys on `=== undefined`, and Vue casts an
     absent `boolean` prop to `false` — which would shadow the form control context. */
  modelValue: undefined,
  defaultValue: undefined,
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader edits the kind, angle or any stop — the `v-model` half. */
  'update:modelValue': [value: Gradient];
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const ctx = useFormControl();
const isDisabled = computed(() => props.isDisabled ?? ctx?.isDisabled);
const isReadOnly = computed(() => props.isReadOnly ?? ctx?.isReadOnly);
const inactive = computed(() => isDisabled.value || isReadOnly.value);

const controlled = useControlled<Gradient>({
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? DefaultGradient,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const gradient = controlled.value;

const css = computed(() => gradientToCss(gradient.value));

/* `Object.values` hoisted out of the template — the runtime template compiler resolves plain
   identifiers, not arbitrary global calls. */
const kinds = Object.values(GradientKind);

function update(patch: Partial<Gradient>): void {
  if (inactive.value) return;
  controlled.setValue({ ...gradient.value, ...patch });
}

function updateStop(index: number, patch: Partial<GradientStop>): void {
  if (inactive.value) return;
  controlled.setValue({
    ...gradient.value,
    stops: gradient.value.stops.map((s, i) => (i === index ? { ...s, ...patch } : s)),
  });
}

function addStop(): void {
  if (inactive.value) return;
  const last = gradient.value.stops[gradient.value.stops.length - 1];
  const newPos = last ? Math.min(100, last.position + 25) : 50;
  controlled.setValue({
    ...gradient.value,
    stops: [...gradient.value.stops, { color: '#ffffff', position: newPos }],
  });
}

function removeStop(index: number): void {
  if (inactive.value) return;
  if (gradient.value.stops.length <= 2) return;
  controlled.setValue({
    ...gradient.value,
    stops: gradient.value.stops.filter((_, i) => i !== index),
  });
}

function onAngleInput(event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value) || 0;
  update({ angle: Math.max(0, Math.min(360, raw)) });
}

function onStopColorInput(index: number, event: Event): void {
  updateStop(index, { color: (event.target as HTMLInputElement).value });
}

function onStopPositionInput(index: number, event: Event): void {
  const raw = Number((event.target as HTMLInputElement).value) || 0;
  updateStop(index, { position: Math.max(0, Math.min(100, raw)) });
}

function kindClass(kind: GradientKind): string {
  return cn(
    'inline-flex h-6 items-center rounded px-2 text-xs font-medium transition-colors',
    gradient.value.kind === kind ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
  );
}

const rootId = computed(() => props.id ?? ctx?.id);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(
    'flex flex-col gap-3 rounded-md border border-border bg-card p-3 text-card-foreground shadow-sm',
    isDisabled.value && 'opacity-60',
    attrs.class as ClassValue,
  ),
);

const angleInputClass = cn(inputBaseVariants({ size: InputSize.Sm }), 'w-20');
const hexInputClass = cn(inputBaseVariants({ size: InputSize.Sm }), 'flex-1 font-mono');
const positionInputClass = cn(inputBaseVariants({ size: InputSize.Sm }), 'w-16');

const PlusIcon = Plus;
const TrashIcon = Trash;

/** The rendered root `<div>` — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});

const locale = useLocale();
</script>

<template>
  <div
    :key="formResetRevision"
    ref="el"
    role="group"
    :id="rootId"
    :aria-labelledby="ctx?.labelledBy"
    :aria-describedby="ctx?.describedBy"
    :aria-invalid="ctx?.isInvalid || undefined"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <!-- Kind + angle -->
    <div class="flex items-center gap-2 text-sm">
      <div
        role="radiogroup"
        :aria-label="locale.t('GradientPicker.gradientKind', undefined, 'Gradient kind')"
        class="flex items-center gap-0.5 rounded-md bg-muted/40 p-0.5 ring-1 ring-border"
      >
        <button
          v-for="k in kinds"
          :key="k"
          type="button"
          role="radio"
          :aria-checked="gradient.kind === k"
          :disabled="inactive"
          :class="kindClass(k)"
          @click="update({ kind: k })"
        >
          {{ k }}
        </button>
      </div>
      <label v-if="gradient.kind !== 'radial'" class="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        {{ locale.t('GradientPicker.angle', undefined, 'Angle') }}
        <input
          type="number"
          :min="0"
          :max="360"
          :value="gradient.angle"
          :disabled="inactive"
          :class="angleInputClass"
          @input="onAngleInput"
        />
        °
      </label>
    </div>

    <!-- Preview bar -->
    <div aria-hidden="true" class="h-12 rounded-md border border-border" :style="{ background: css }" />

    <!-- Stops -->
    <ul class="flex flex-col gap-2">
      <!-- Keyed on the index: `GradientStop` has no id, and keying on the edited colour drops focus. -->
      <li v-for="(stop, i) in gradient.stops" :key="i" class="flex items-center gap-2">
        <input
          type="color"
          :aria-label="locale.t('GradientPicker.stopColor', undefined, 'Stop color')"
          :value="stop.color"
          :disabled="inactive"
          class="h-7 w-10 cursor-pointer rounded-sm border border-input bg-background"
          @input="onStopColorInput(i, $event)"
        />
        <input
          type="text"
          :aria-label="locale.t('GradientPicker.stopColorHex', undefined, 'Stop color hex')"
          :value="stop.color"
          :disabled="inactive"
          :class="hexInputClass"
          @input="onStopColorInput(i, $event)"
        />
        <input
          type="number"
          :aria-label="locale.t('GradientPicker.stopPosition', undefined, 'Stop position')"
          :min="0"
          :max="100"
          :value="stop.position"
          :disabled="inactive"
          :class="positionInputClass"
          @input="onStopPositionInput(i, $event)"
        />
        <span class="text-xs text-muted-foreground">%</span>
        <button
          type="button"
          :aria-label="locale.t('GradientPicker.removeStop', undefined, 'Remove stop')"
          :disabled="inactive || gradient.stops.length <= 2"
          class="inline-flex h-7 w-7 items-center justify-center rounded text-destructive-soft-foreground hover:bg-destructive-soft disabled:pointer-events-none disabled:opacity-40"
          @click="removeStop(i)"
        >
          <Icon :icon="TrashIcon" :size="12" />
        </button>
      </li>
    </ul>

    <button
      type="button"
      :disabled="inactive"
      class="inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
      @click="addStop"
    >
      <Icon :icon="PlusIcon" :size="12" /> {{ locale.t('GradientPicker.addStop', undefined, 'Add stop') }}
    </button>

    <!-- CSS output -->
    <code class="block break-all rounded-md bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground">
      {{ css }}
    </code>
    <input
      v-if="name"
      type="hidden"
      :disabled="isDisabled"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      :name="name"
      :value="css"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </div>
</template>
