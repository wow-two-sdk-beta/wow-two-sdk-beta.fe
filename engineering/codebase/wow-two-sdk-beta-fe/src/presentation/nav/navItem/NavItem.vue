<script lang="ts">
import type { Size } from '../../../foundation/styles';

export interface NavItemProps {
  /** The escape hatch to render the child element instead of an `<a>` (router LinkItem). */
  readonly asChild?: boolean;

  /** The active state (visual + `aria-current="page"`). */
  readonly isActive?: boolean;

  /** The visual size. Default `md`. */
  readonly size?: Size;
}

const SizeClass: Record<Size, string> = {
  xs: 'h-7 px-1.5 text-xs gap-1.5',
  sm: 'h-8 px-2 text-sm gap-2',
  md: 'h-9 px-2.5 text-sm gap-2.5',
  lg: 'h-11 px-3 text-base gap-3',
  xl: 'h-12 px-3.5 text-base gap-3.5',
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, type ComponentPublicInstance } from 'vue';
import { cn, Size as SizeToken } from '../../../foundation/styles';
import { dataAttr, resolveElement } from '../../../foundation/dom';
import { Primitive, Slottable } from '../../../foundation/primitives';
import { useNavbar } from '../../layout/navbar/NavbarContext';

/**
 * Renders a sidebar / nav row — icon, label, trailing slot, and an active state.
 * Default `<a>`; pass `asChild` to forward to a router LinkItem. Sets `aria-current="page"` when `isActive`.
 */
defineOptions({ name: 'NavItem', inheritAttrs: false });

defineSlots<{
  /** The visual label. */
  default(): unknown;

  /** The leading icon. */
  icon?(): unknown;

  /** The trailing slot — typically a count badge or status dot. */
  trailing?(): unknown;
}>();

/** `isActive` defaults to `undefined`, not `false` — an absent optional boolean must stay absent. */
const props = withDefaults(defineProps<NavItemProps>(), {
  asChild: false,
  isActive: undefined,
  size: SizeToken.Md,
});

const attrs = useAttrs();
const inner = useTemplateRef<ComponentPublicInstance>('inner');

/* A top bar lays items in a row, each as wide as its label; a rail or sidebar gives each the full row. */
const navbar = useNavbar();
const isInRow = computed(() => navbar?.orientation.value === 'horizontal');

const classes = computed(() =>
  cn(
    'group inline-flex items-center rounded-md font-medium text-foreground transition-colors',
    isInRow.value ? 'w-auto shrink-0 whitespace-nowrap' : 'w-full',
    'hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    'data-[active]:bg-primary-soft data-[active]:text-primary-soft-foreground',
    SizeClass[props.size],
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/*
 * Under `as-child` the consumer's element (a router LinkItem) becomes the row, and
 * `Slottable` marks it as the merge target so the icon / trailing spans compose
 * *inside* it. A template cannot reach into a slot child's children, so the label
 * rides as a bare node there and the trailing span takes `ms-auto` to keep the
 * right-aligned layout. The `<a>` path wraps the label in the `flex-1 truncate` span.
 */
const trailingClasses = computed(() => cn('shrink-0', props.asChild && 'ms-auto'));

/** `Primitive` renders the real element, so its `$el` is this component's root. */
const el = computed(() => resolveElement(inner.value));

defineExpose({ el });
</script>

<template>
  <Primitive
    ref="inner"
    as="a"
    :as-child="props.asChild"
    :aria-current="props.isActive ? 'page' : undefined"
    :data-active="dataAttr(props.isActive)"
    v-bind="rest"
    :class="classes"
  >
    <span v-if="$slots.icon" class="text-muted-foreground group-data-[active]:text-current">
      <slot name="icon" />
    </span>
    <Slottable v-if="props.asChild"><slot /></Slottable>
    <span v-else class="flex-1 truncate text-left"><slot /></span>
    <span v-if="$slots.trailing" :class="trailingClasses"><slot name="trailing" /></span>
  </Primitive>
</template>
