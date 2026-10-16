<script lang="ts">
import type { CornerPosition, Size } from '../../../foundation/styles';

/** Defines a person's presence state. */
export const PresenceStatus = {
  /** Refers to actively available. */
  Online: 'online',
  /** Refers to present but inactive. */
  Idle: 'idle',
  /** Refers to present but do-not-disturb. */
  Busy: 'busy',
  /** Refers to not connected. */
  Offline: 'offline',
  /** Refers to connected but appearing offline. */
  Invisible: 'invisible',
} as const;

export type PresenceStatus = (typeof PresenceStatus)[keyof typeof PresenceStatus];

export interface PresenceIndicatorProps {
  readonly status?: PresenceStatus;
  /** The dot diameter. */
  readonly size?: Size;

  /** The pulsing-ring toggle (only meaningful for `online`). */
  readonly hasPulse?: boolean;

  /** The corner position on a parent (use inside an Avatar wrapper). */
  readonly position?: CornerPosition;

  /** The accessible-label override. Defaults to status name. */
  readonly label?: string;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useTemplateRef } from 'vue';
import { cn, Size as SizeToken } from '../../../foundation/styles';

const locale = useLocale();

const StatusBackground: Record<PresenceStatus, string> = {
  online: 'bg-success',
  idle: 'bg-warning',
  busy: 'bg-destructive',
  offline: 'bg-muted-foreground',
  invisible: 'bg-transparent border border-muted-foreground',
};

/* Only xs/sm/md/lg carry a dot size; other `Size` members fall through to `sm`. */
const SizeDot: Partial<Record<Size, string>> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

const PositionClass: Record<CornerPosition, string> = {
  'top-right': 'absolute top-0 right-0',
  'top-left': 'absolute top-0 left-0',
  'bottom-right': 'absolute bottom-0 right-0',
  'bottom-left': 'absolute bottom-0 left-0',
};

const StatusLabel: Record<PresenceStatus, string> = {
  online: 'Online',
  idle: 'Idle',
  busy: 'Busy',
  offline: 'Offline',
  invisible: 'Invisible',
};

/**
 * Renders a colored dot encoding a person's presence — online / idle / busy / offline / invisible.
 * Includes a `ring-background` so it pops cleanly when overlaid on an `Avatar`.
 * Pass `position` to absolutely place it on a positioned parent.
 */
defineOptions({ name: 'PresenceIndicator', inheritAttrs: false });

const props = withDefaults(defineProps<PresenceIndicatorProps>(), {
  status: PresenceStatus.Online,
  size: SizeToken.Sm,
});

const attrs = useAttrs();
const el = useTemplateRef<HTMLSpanElement>('el');

const showPulse = computed(() => Boolean(props.hasPulse) && props.status === PresenceStatus.Online);

const classes = computed(() =>
  cn(
    'inline-flex rounded-full ring-2 ring-background',
    StatusBackground[props.status],
    SizeDot[props.size] ?? SizeDot.sm,
    props.position && PositionClass[props.position],
    'relative',
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
  <span
    ref="el"
    role="status"
    :aria-label="props.label ?? locale.t('PresenceIndicator.' + props.status, undefined, StatusLabel[props.status])"
    :data-status="props.status"
    v-bind="rest"
    :class="classes"
  >
    <span
      v-if="showPulse"
      aria-hidden="true"
      :class="cn('absolute inset-0 rounded-full opacity-75 motion-safe:animate-ping', StatusBackground.online)"
    />
  </span>
</template>
