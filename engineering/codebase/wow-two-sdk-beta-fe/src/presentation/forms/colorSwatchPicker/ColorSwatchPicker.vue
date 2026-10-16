<script lang="ts">
import type { ColorSwatchPreviewSize, SwatchShape } from '../../display/colorSwatchPreview';

/**
 * Defines props for a `ColorSwatchPicker`.
 *
 * `swatchSize` / `swatchShape` are the NAMED axis types, not `ColorSwatchPreviewVariants['size']`
 * as the React original spelled them — the SFC prop resolver cannot follow an indexed access
 * into an imported interface, and the build fails on it while `vue-tsc` stays green.
 */
export interface ColorSwatchPickerProps {
  /** The palette rendered as swatches. */
  readonly colors: ReadonlyArray<string>;

  /** The selected hex, controlled. The `v-model` binding target. */
  readonly modelValue?: string | null;

  /** The initial selection when uncontrolled. */
  readonly defaultValue?: string | null;

  /** The size step every swatch renders at. */
  readonly swatchSize?: ColorSwatchPreviewSize;

  /** The outline shape every swatch renders with. */
  readonly swatchShape?: SwatchShape;

  /** The disabled state. Falls back to the surrounding form control's `isDisabled`. */
  readonly isDisabled?: boolean;
  /** Prevents selecting a different swatch. */
  readonly isReadOnly?: boolean;

  /** The group's id. Auto-filled from `FormControl` context when omitted. */
  readonly id?: string;
}
</script>

<script setup lang="ts">
import { useNativeFormReset } from '../UseNativeFormReset';
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { AriaAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { useControlled } from '../../../foundation/state';
import { Orientation, RovingFocusGroup, useFormControl } from '../../../foundation/primitives';
import ColorSwatchItem from './ColorSwatchItem.vue';

/** Renders an inline palette of selectable color swatches, arrow-key navigable in both axes. */
/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
defineOptions({ name: 'ColorSwatchPicker', inheritAttrs: false });

const props = withDefaults(defineProps<ColorSwatchPickerProps>(), {
  swatchSize: 'md',
  swatchShape: 'square',
  /* Explicit `undefined` default: the flag falls back to the form control context, and Vue
     casts an absent `boolean` prop to `false` — which would shadow the context. */
  isDisabled: undefined,
  isReadOnly: undefined,
});

const emit = defineEmits<{
  /** Fires when the reader picks a swatch from the palette — the `v-model` half. */
  'update:modelValue': [value: string | null];
}>();

const attrs = useAttrs();

/*
 * InlineLayout swatch group (no popover trigger) — the `role="group"` node is the control:
 * it takes the context id (so a Field label's `htmlFor` resolves), is named via
 * `aria-labelledby`, and described via `aria-describedby`. `aria-invalid` is not valid
 * on `group`; invalid state surfaces through the describedby swap to the error chrome.
 * Disabled flows to every swatch button.
 */
const field = useFormControl();
const finalDisabled = computed(() => props.isDisabled ?? field?.isDisabled ?? false);

const controlled = useControlled<string | null>({
  /* `??` is wrong here — `null` is a MEANINGFUL selection ("nothing selected"), and `??`
     would fall through it to `modelValue`. Only `undefined` means "not controlled". */
  controlled: () => props.modelValue,
  default: () => props.defaultValue ?? null,
  onChange: (next) => {
    emit('update:modelValue', next);
  },
});

const selected = controlled.value;

function onSelect(color: string): void {
  if (finalDisabled.value || (props.isReadOnly ?? field?.isReadOnly)) return;
  controlled.setValue(color);
}

/* Never a declared prop — a declared `'aria-label'` would arrive as `props.ariaLabel` and
   stop reaching the DOM. It is read off the attrs so `aria-labelledby` can defer to it. */
const ariaLabel = computed(() => attrs[AriaAttribute.Label] as string | undefined);

const groupId = computed(() => props.id ?? field?.id);
/* Names the group from the Field label when present; an explicit aria-label always wins. */
const labelledBy = computed(() => (ariaLabel.value ? undefined : field?.labelledBy));
const describedBy = computed(() => field?.describedBy);

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() => cn('flex flex-wrap gap-1.5', attrs.class as ClassValue));

const root = useTemplateRef<InstanceType<typeof RovingFocusGroup>>('root');

/** The rendered group element. */
defineExpose({ el: computed(() => root.value?.el ?? null) });

const formResetAnchor = useTemplateRef<HTMLInputElement>('formResetAnchor');
const formResetRevision = useNativeFormReset(formResetAnchor, () => {
  controlled.reset();
});
</script>

<template>
  <RovingFocusGroup
    :key="formResetRevision"
    ref="root"
    :orientation="Orientation.Both"
    can-loop
    :id="groupId"
    :aria-labelledby="labelledBy"
    :aria-describedby="describedBy"
    :class="rootClass"
    v-bind="passthroughAttrs"
  >
    <ColorSwatchItem
      v-for="c in colors"
      :key="c"
      :color="c"
      :is-selected="selected === c"
      :is-disabled="finalDisabled || (props.isReadOnly ?? field?.isReadOnly ?? false)"
      :size="swatchSize"
      :shape="swatchShape"
      @select="onSelect"
    />
    <input
      ref="formResetAnchor"
      type="hidden"
      :form="typeof $attrs.form === 'string' ? $attrs.form : undefined"
      aria-hidden="true"
    />
  </RovingFocusGroup>
</template>
