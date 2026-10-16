<script lang="ts">
/* `StatusTone` is imported here (not in `<script setup>`) so the one binding serves as both
   the prop type below and the runtime value used in `withDefaults`. */
import { StatusTone } from '../../../foundation/styles';

/** Defines the Status visual size. */
export const StatusSize = {
  /** Refers to the extra-small indicator. */
  Xs: 'xs',
  /** Refers to the small indicator. */
  Sm: 'sm',
  /** Refers to the medium indicator. */
  Md: 'md',
} as const;

export type StatusSize = (typeof StatusSize)[keyof typeof StatusSize];

export interface StatusProps {
  /** The semantic tone of the dot. Default `success`. */
  readonly tone?: StatusTone;

  /** The optional pulsing ring around the dot. */
  readonly hasPulse?: boolean;

  /** The visual size — drives dot dimensions, text size, and gap. Default `md`. */
  readonly size?: StatusSize;
}

const ToneClass: Record<StatusTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  info: 'bg-info',
  neutral: 'bg-muted-foreground',
};

const SizeClasses: Record<StatusSize, { wrapper: string; dot: string }> = {
  xs: { wrapper: 'gap-1.5 text-xs', dot: 'h-1.5 w-1.5' },
  sm: { wrapper: 'gap-1.5 text-sm', dot: 'h-2 w-2' },
  md: { wrapper: 'gap-2 text-sm', dot: 'h-2 w-2' },
};
</script>

<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn } from '../../../foundation/styles';

/**
 * Renders a coloured dot beside a text label — server status, online presence, build state.
 *
 * Use `Status` for labelled indicators; `NotificationIndicator` for the bare positioned dot.
 */
defineOptions({ name: 'Status', inheritAttrs: false });

/** The label rendered after the dot — React's optional `children`. */
defineSlots<{ default?(): unknown }>();

const props = withDefaults(defineProps<StatusProps>(), {
  tone: StatusTone.Success,
  size: StatusSize.Md,
  hasPulse: undefined,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const size = computed(() => SizeClasses[props.size]);

const classes = computed(() =>
  cn('inline-flex items-center text-foreground', size.value.wrapper, attrs.class as string | undefined),
);

const dotClasses = computed(() => cn('inline-block rounded-full', size.value.dot, ToneClass[props.tone]));

const pulseClasses = computed(() =>
  cn('absolute inset-0 inline-block rounded-full opacity-75 animate-ping', ToneClass[props.tone]),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <span ref="el" v-bind="rest" :class="classes">
    <span class="relative inline-flex">
      <span :class="dotClasses" />
      <span v-if="props.hasPulse" :class="pulseClasses" />
    </span>
    <slot />
  </span>
</template>
