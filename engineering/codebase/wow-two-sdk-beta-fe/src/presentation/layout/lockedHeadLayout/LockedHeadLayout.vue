<script lang="ts">
import type { HTMLAttributes } from 'vue';

/** Defines props for a page whose head holds still while its body scrolls. */
export interface LockedHeadLayoutProps {
  /** Extra classes on the head. */
  readonly headClass?: HTMLAttributes['class'];

  /** Extra classes on the body, the page's own scroll region on a tablet and a desktop. */
  readonly bodyClass?: HTMLAttributes['class'];
}
</script>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, useAttrs, useTemplateRef } from 'vue';
import type { ClassValue } from 'clsx';
import { ScrollRegionAttribute } from '../../../foundation/dom';
import { cn } from '../../../foundation/styles';
import { appFramePageKey } from '../appFrame/AppFrame.vue';

/**
 * Renders a page that owns its scrolling inside an `AppFrame`: on a tablet and a desktop the head holds still and only
 * the body scrolls; on a phone, and outside a frame, both flow and main scrolls the page.
 */
defineOptions({ name: 'LockedHeadLayout', inheritAttrs: false });

defineSlots<{
  /** What holds still above the body: a banner, the tabs, a page header. */
  head?(): unknown;
  /** The page's body, which scrolls under the head. */
  default?(): unknown;
}>();

const props = withDefaults(defineProps<LockedHeadLayoutProps>(), { headClass: undefined, bodyClass: undefined });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');
const bodyEl = useTemplateRef<HTMLDivElement>('body');

/* Optional: outside a frame the page stays in the flow. */
const frame = inject(appFramePageKey, null);

const isLocked = computed(() => frame?.isLocked.value === true);

/* Registered on mount only: the server and the first render keep the phone flow, as the frame does. */
let unregister: (() => void) | undefined;
onMounted(() => {
  unregister = frame?.register();
});
onBeforeUnmount(() => {
  unregister?.();
  unregister = undefined;
});

/* The page takes the height main leaves it; the head keeps its own and paints no fill, as nothing scrolls under it. */
const classes = computed(() => cn(isLocked.value && 'flex min-h-0 flex-1 flex-col', attrs.class as ClassValue));

const headClasses = computed(() => cn(isLocked.value && 'shrink-0', props.headClass as ClassValue));

/* The body is the one scroll container while locked, padded at its end by what the frame's column gave up; its
   gutter is reserved, so content never narrows as it grows past the fold. */
const bodyClasses = computed(() =>
  cn(
    isLocked.value && [
      'min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] print:overflow-visible',
      frame?.endClass.value,
    ],
    props.bodyClass as ClassValue,
  ),
);

/* The app router saves, restores and resets a marked region's scroll as it does main's. */
const bodyAttrs = computed(() => (isLocked.value ? { [ScrollRegionAttribute]: '' } : {}));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el, bodyEl, isLocked });
</script>

<template>
  <div ref="el" v-bind="rest" :class="classes" data-locked-head-layout>
    <div v-if="$slots.head" :class="headClasses" data-locked-head>
      <slot name="head" />
    </div>
    <div ref="body" v-bind="bodyAttrs" :class="bodyClasses" data-locked-body>
      <slot />
    </div>
  </div>
</template>
