<script lang="ts">
import type { SVGAttributes } from 'vue';
export interface SpinnerProps extends /* @vue-ignore */ SVGAttributes {
  /** The extra classes merged onto the underlying SVG. */
  readonly className?: string;
}
</script>

<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import type { ClassValue } from 'clsx';
import { Loader2 } from 'lucide-vue-next';
import { cn } from '../../styles';

/** Renders a spinning loader icon — for inline action-loading feedback or standalone progress indication. */
defineOptions({ name: 'Spinner', inheritAttrs: false });

const props = defineProps<SpinnerProps>();
const attrs = useAttrs();
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});
</script>

<template>
  <!--
    Sized by class, not by the `size` prop: `lucide-vue-next` types `size` as `number`, so the
    original's `size="1em"` (which `lucide-react` accepted) has no Vue equivalent. `size-[1em]`
    wins over the icon's default `width`/`height` attributes, keeping the spinner scaled to the
    current font-size — and `cn` puts it first, so a caller's own sizing class still overrides it.
  -->
  <Loader2
    v-bind="rest"
    :class="cn('animate-spin motion-reduce:animate-none size-[1em]', props.className, attrs.class as ClassValue)"
    aria-hidden="true"
  />
</template>
