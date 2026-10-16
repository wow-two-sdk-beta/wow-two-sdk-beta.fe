<script lang="ts">
import type { ProgressTone } from '../../../foundation/styles';

export interface SplashScreenProps {
  /** The mount state. Default `true`; closing fades the screen out before it unmounts. */
  readonly isOpen?: boolean;

  /** The overlay toggle — the screen covers the viewport above the app instead of filling its parent as a page. */
  readonly isOverlay?: boolean;

  /** The load progress, 0–`max`. Omit for indeterminate. */
  readonly value?: number;

  /** The value that completes the progress. Default `100`. */
  readonly max?: number;

  /** The progress fill tone. Default `brand`. */
  readonly tone?: ProgressTone;

  /** The accessible name of the progress. Default `"Loading…"`. */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { useLocaleDefaults } from '../../../foundation/i18n';
import { FocusScope, Presence } from '../../../foundation/primitives';
import { cn, ProgressTone as ProgressToneToken, Size } from '../../../foundation/styles';
import ProgressBar from '../progressBar/ProgressBar.vue';

/**
 * Renders an app's first-load screen: the product logo centred above a slim progress bar.
 * The default fills its parent as a page; `isOverlay` covers the viewport while the app mounts beneath it,
 * so closing it reveals the app with a fade. It appears without one.
 *
 * `role="status"` is bound before `v-bind="rest"`, so a caller-supplied `role` still wins. The overlay holds keyboard
 * focus the way `LoadingOverlay` does, then hands it back when it lifts.
 */
defineOptions({ name: 'SplashScreen', inheritAttrs: false });

defineSlots<{
  /** The product logo, centred above the progress bar. */
  logo?(): unknown;
  /** Extra content below the progress bar. */
  default?(): unknown;
}>();

const componentProps = withDefaults(defineProps<SplashScreenProps>(), {
  isOpen: true,
  isOverlay: false,
  max: 100,
  tone: ProgressToneToken.Brand,
});
const props = useLocaleDefaults(componentProps, 'SplashScreen', { label: 'Loading…' });

const attrs = useAttrs();
const el = useTemplateRef<HTMLDivElement>('el');

/* No enter fade: the screen shows at once, so it can take over from a static twin in the mount node without a
   flash. <Presence> mounts children as `data-state="closed"`, so the exit fade keys on `isOpen`, not on that state;
   Presence then defers the unmount until the fade ends. */
const classes = computed(() =>
  cn(
    'flex flex-col items-center justify-center gap-6 bg-background px-6 text-center outline-hidden',
    !props.isOpen && 'motion-safe:animate-(--animate-fade-out)',
    props.isOverlay ? 'fixed inset-0 z-modal' : 'min-h-dvh w-full',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <Presence :is-present="props.isOpen">
    <!-- The overlay covers the pointer; the trap covers the keyboard, so Tab cannot reach the app mounting
         beneath it. Focus returns where it was when the overlay lifts. -->
    <FocusScope v-if="props.isOverlay" as-child is-trapped can-loop>
      <div ref="el" role="status" tabindex="-1" v-bind="rest" :class="classes">
        <slot name="logo" />
        <ProgressBar
          :value="props.value"
          :max="props.max"
          :tone="props.tone"
          :size="Size.Sm"
          :label="props.label"
          class="w-48 max-w-full"
        />
        <slot />
      </div>
    </FocusScope>
    <div v-else ref="el" role="status" v-bind="rest" :class="classes">
      <slot name="logo" />
      <ProgressBar
        :value="props.value"
        :max="props.max"
        :tone="props.tone"
        :size="Size.Sm"
        :label="props.label"
        class="w-48 max-w-full"
      />
      <slot />
    </div>
  </Presence>
</template>
