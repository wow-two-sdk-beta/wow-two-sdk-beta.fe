<script lang="ts">
import type { ButtonHTMLAttributes } from 'vue';
import { AriaAttribute } from '../../../foundation/dom';
import { type OverlayPosition } from '../../../foundation/styles';
import type { FabButtonVariants, FabButtonVariant, FabButtonSize } from './FabButton.variants';

/** @internal An attribute name this component derives or requires. */
type RequiredAttribute = typeof AriaAttribute.Label;

/* The required accessible label rides on the ignored heritage rather than the body — FabButton content
   is typically icon-only, so the name is mandatory, but it must reach the DOM as an attribute. */
type FabButtonAttributes = ButtonHTMLAttributes & Record<RequiredAttribute, string>;

/* Both heritage types are `@vue-ignore`d — native button attributes belong in attribute
   fallthrough, and `FabButtonVariants` resolves through `typeof fabVariants`, which the SFC prop
   compiler cannot walk. */
type FabButtonBase = FabButtonAttributes & Omit<FabButtonVariants, 'variant' | 'size' | 'position'>;

export interface FabButtonProps extends /* @vue-ignore */ FabButtonBase {
  /** The visual surface style. */
  readonly variant?: FabButtonVariant;
  /** The button diameter. */
  readonly size?: FabButtonSize;
  /** The anchor position on the viewport. */
  readonly position?: OverlayPosition;
  /** The button type. Default `ButtonType.Button`. */
  readonly type?: ButtonType;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ButtonType } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { fabVariants } from './FabButton.variants';

/* `inheritAttrs: false` so `class` folds into the component's own `cn()` call — plain fallthrough
   appends outside it and loses tailwind-merge conflict resolution. */
/** Renders a floating action button — a circular, shadowed control pinned to a corner of the viewport. */
defineOptions({ name: 'FabButton', inheritAttrs: false });

/* `aria-label` is deliberately NOT a declared prop: Vue camelizes prop keys, so a declared
   `'aria-label'` would arrive as `props.ariaLabel` and never render. It stays a fallthrough attr;
   the interface keeps the requirement through the `@vue-ignore`d heritage. */
/* `children` has no prop counterpart — it is the default slot. */
const props = withDefaults(defineProps<FabButtonProps>(), { type: ButtonType.Button });

defineSlots<{
  /** The button's content — typically a single icon. */
  default(): unknown;
}>();

const attrs = useAttrs();

const OwnedAttributes: ReadonlySet<string> = new Set(['class']);
const passthroughAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => !OwnedAttributes.has(key))),
);

const rootClass = computed(() =>
  cn(fabVariants({ variant: props.variant, size: props.size, position: props.position }), attrs.class as ClassValue),
);

const root = useTemplateRef<HTMLButtonElement>('root');

/** The rendered element — the Vue stand-in for the React original's forwarded ref. */
defineExpose({ el: root });
</script>

<template>
  <!-- Floating Action Button — fixed-position circular button with shadow. -->
  <button ref="root" :type="type" :class="rootClass" v-bind="passthroughAttrs">
    <slot />
  </button>
</template>
