<script lang="ts">
import type { Component, SVGAttributes } from 'vue';
import { AriaAttribute } from '../../dom';

export interface IconAdapterProps extends SVGAttributes {
  /**
   * The pixel size handed to the adapter. `number` only, NOT `number | string`.
   *
   * Component props are contravariant: an adapter satisfies this type only if it accepts every
   * prop declared here. `lucide-vue-next` types its own `size` as `number`, so widening this to
   * `number | string` — as the React original did, where the looser `SVGProps` made it moot —
   * makes every lucide icon unassignable to `IconAdapter` and forces an `as unknown as` cast at
   * each import site. Narrow is the fix; a CSS-unit size belongs on `class`, not on this prop.
   */
  readonly size?: number;
}

export type IconAdapter = Component<IconAdapterProps>;

/** @internal An attribute name this component derives or requires. */
type DerivedAttribute = typeof AriaAttribute.Hidden;

/** @internal An attribute name this component derives or requires. */
type NameAttribute = typeof AriaAttribute.Label;

/**
 * Defines the accessible name for when the icon stands alone (decorative siblings should pass it via
 * parent). Sets `role="img"` and unhides from AT. Without it, the icon is `aria-hidden` and decorative.
 */
type IconNameAttributes = Readonly<Partial<Record<NameAttribute, string>>>;

type NativeIconAttributes = Omit<SVGAttributes, DerivedAttribute | NameAttribute> & IconNameAttributes;

export interface IconProps extends /* @vue-ignore */ NativeIconAttributes {
  /** The icon component — pass a `lucide-vue-next` icon, custom SVG component, or any matching shape. */
  readonly icon: IconAdapter;

  /** The pixel size of the rendered SVG. Default 20. */
  readonly size?: number;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { cn } from '../../styles/Cn';

/**
 * Renders a caller-supplied icon component at a fixed pixel size — any icon matching the lucide-vue-next
 * shape (`{ size, color, class, ...svgAttrs }`).
 *
 * - Without `aria-label` → decorative, `aria-hidden`.
 * - With `aria-label` → semantic, `role="img"`.
 *
 * Every other SVG attribute falls through to the rendered icon, and — as with
 * the React original's trailing `{...rest}` — a caller-supplied attribute wins
 * over the wrapper's own binding.
 */
defineOptions({ name: 'Icon', inheritAttrs: false });

withDefaults(defineProps<IconProps>(), { size: 20 });

const attrs = useAttrs();

/** `aria-label` arrives as a fallthrough attr; its presence flips the icon from decorative to semantic. */
const labelled = computed(() => attrs[AriaAttribute.Label] != null);
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <component
    :is="icon"
    :size="size"
    v-bind="rest"
    :class="cn('shrink-0', attrs.class as ClassValue)"
    :aria-hidden="labelled ? undefined : true"
    :role="labelled ? 'img' : undefined"
    focusable="false"
  />
</template>
