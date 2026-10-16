<script lang="ts">
/* `Orientation` is imported here (not in `<script setup>`) so the one binding
   serves as both the type below and the runtime value used in `withDefaults`. */
import { Orientation } from '../../../foundation/styles';

/** Defines props for a labelled group of controls. */
export interface ControlGroupFieldProps {
  /**
   * The group's label — muted; sits beside the control(s) when horizontal, above them when vertical.
   * React typed this `ReactNode`; a Vue prop renders text, so richer content goes through the
   * same-named `label` slot, which overrides this value.
   */
  readonly label: string | number;

  /** The label-to-control layout — `horizontal` (label beside) or `vertical` (label above). Default `horizontal`. */
  readonly orientation?: Orientation;

  /** The hairline between this and the next group (settings-list look). Default `true`. */
  readonly hasDivider?: boolean;
  /** @deprecated Use `hasDivider`; this alias is removed next release. */
  readonly divided?: boolean;

  /** The fixed label width in the horizontal layout, e.g. `"6rem"` — aligns rows. Omit for content-driven width. */
  readonly labelWidth?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type CSSProperties } from 'vue';
import { cn } from '../../../foundation/styles';
import { controlGroupVariants } from './ControlGroupField.variants';

/**
 * Renders a labelled group of controls — a muted label bound to its control(s),
 * laid out horizontally (label beside) or vertically (label above). Stacked
 * groups auto-divide via a hairline unless `:has-divider="false"`.
 */
defineOptions({ name: 'ControlGroupField', inheritAttrs: false });

defineSlots<{
  /** Rich-content override for the `label` prop. */
  label?(): unknown;
  /** The control(s) bound to the label — React's required `children`. */
  default(): unknown;
}>();

const props = withDefaults(defineProps<ControlGroupFieldProps>(), {
  orientation: Orientation.Horizontal,
  hasDivider: undefined,
  divided: undefined,
  labelWidth: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

const styles = computed(() =>
  controlGroupVariants({ orientation: props.orientation, divided: props.hasDivider ?? props.divided ?? true }),
);

const rootClasses = computed(() => cn(styles.value.root(), attrs.class as string | undefined));

const labelStyle = computed<CSSProperties | undefined>(() =>
  props.labelWidth ? { flex: `0 0 ${props.labelWidth}` } : undefined,
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div ref="el" v-bind="rest" :class="rootClasses">
    <span :class="styles.label()" :style="labelStyle">
      <slot name="label">{{ props.label }}</slot>
    </span>
    <div :class="styles.content()"><slot /></div>
  </div>
</template>
