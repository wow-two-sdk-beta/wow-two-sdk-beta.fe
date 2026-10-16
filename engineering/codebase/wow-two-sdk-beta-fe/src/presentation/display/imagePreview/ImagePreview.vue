<script lang="ts">
import type { ImgHTMLAttributes } from 'vue';

/** The `<img>` attributes; the error fallback is a named slot. */
export type ImagePreviewProps = ImgHTMLAttributes;
</script>

<script setup lang="ts">
import { UrlExtensions } from '../../../foundation/dom';
import { computed, ref, useAttrs, useTemplateRef, watch } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders an `<img>` that swaps to the fallback slot when the source fails to load.
 *
 * Covers a broken `src` or a network failure. Wrap in `AspectRatioLayout` for aspect-locked images.
 */
defineOptions({ name: 'ImagePreview', inheritAttrs: false });

defineSlots<{
  /** The element rendered when the image fails to load. */
  fallback?(): unknown;
}>();

const attrs = useAttrs();
const el = useTemplateRef<HTMLImageElement>('el');

const errored = ref(false);

/* A new src deserves a fresh load attempt — reset the error latch. `src` is a
   fallthrough attr here, not a declared prop, so the watch reads it off `attrs`. */
watch(
  () => attrs.src,
  () => {
    errored.value = false;
  },
);

/** A fallthrough attr, not a declared prop; defaults to `''`. */
const alt = computed(() => (attrs.alt as string | undefined) ?? '');

const classes = computed(() => cn('block max-w-full', attrs.class as string | undefined));

/** Everything but `class` / `alt`, both re-applied explicitly below. */
const rest = computed(() => {
  const { class: _class, alt: _alt, ...others } = attrs;
  return { ...others, src: UrlExtensions.safeResource(others.src) };
});

/**
 * A consumer-supplied `onError` rides in `rest`; Vue's `mergeProps` chains it
 * with this one rather than replacing it.
 */
const onError = (): void => {
  errored.value = true;
};

defineExpose({ el });
</script>

<template>
  <slot v-if="errored && $slots.fallback" name="fallback" />
  <img v-else ref="el" v-bind="rest" :alt="alt" :class="classes" @error="onError" />
</template>
