<script lang="ts">
import type { FeedbackBus } from '../../../feedback';

/** Defines props for the notification center's bell button. */
export interface NotificationCenterButtonProps {
  /** The bus whose unread count and pop-up pause the bell shows. */
  readonly bus: FeedbackBus;

  /** The open state of the panel the bell controls; an open panel hides the unread badge and, on close, marks read. */
  readonly isExpanded?: boolean;

  /** The accessible name before the unread and pause suffixes. Default `"Notifications"`. */
  readonly label?: string;
}

/** @internal The classes of the pause cue that pulses when a notice is suppressed. */
const CueClasses = [
  'pointer-events-none absolute inset-0 rounded-full border border-primary/60 bg-primary/20 opacity-0',
  'forced-colors:border-[Highlight]',
];

/** @internal The classes of the unread count badge. */
const UnreadBadgeClasses = [
  'pointer-events-none absolute -end-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1',
  'text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums ring-2 ring-background',
];
</script>

<script setup lang="ts">
import { computed, onUnmounted, shallowRef, useTemplateRef, watch } from 'vue';
import { Bell, BellOff } from 'lucide-vue-next';

import { animate, type AnimationHandle } from '../../../foundation/animation';
import { useReducedMotion } from '../../../foundation/device';
import { useLocale } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { Button } from '../../actions/button';

/** Renders the notification bell with its unread count and pop-up pause cue. Pass `aria-controls` for its panel. */
defineOptions({ name: 'NotificationCenterButton' });

const props = defineProps<NotificationCenterButtonProps>();

const emit = defineEmits<{
  /** Requests opening or closing the notification panel. */
  toggle: [];
}>();

const locale = useLocale();
const reducedMotion = useReducedMotion();
const button = useTemplateRef<InstanceType<typeof Button>>('button');
const cue = useTemplateRef<HTMLSpanElement>('cue');

const state = shallowRef(props.bus.notificationState());
let openBus: FeedbackBus | undefined;

const isPaused = computed(() => state.value.pausedUntil !== null);
const unreadCount = computed(() => (props.isExpanded ? 0 : state.value.unreadCount));
const name = computed(() => {
  let label = props.label ?? locale.t('NotificationCenterButton.label', undefined, 'Notifications');
  const count = unreadCount.value;
  if (count > 0) label = locale.t('NotificationCenterButton.unread', { label, count }, '{label}, {count} unread');
  return isPaused.value ? locale.t('NotificationCenterButton.paused', { label }, '{label}, pop-ups paused') : label;
});

defineExpose({ el: computed(() => button.value?.el ?? null) });

/** Syncs the bus's notification state and pulses the pause cue for each notice the pause suppresses. */
watch(
  () => props.bus,
  (bus, _previous, onCleanup) => {
    state.value = bus.notificationState();
    if (typeof document === 'undefined') return;
    let pulse: AnimationHandle | undefined;
    const stopState = bus.subscribeNotificationState((next) => {
      state.value = next;
      if (next.pausedUntil === null) pulse?.cancel();
    });
    const stopDelivery = bus.subscribe((notice) => {
      if (!bus.suppresses(notice)) return;
      pulse?.cancel();
      pulse = animate(
        cue.value,
        reducedMotion.value
          ? [{ opacity: 1 }, { opacity: 1 }]
          : [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }],
        { duration: reducedMotion.value ? 600 : 1200, easing: 'linear' },
      );
    });
    onCleanup(() => {
      pulse?.cancel();
      stopState();
      stopDelivery();
    });
  },
  { immediate: true },
);

/** Marks the open bus read when its panel closes, another bus replaces it or the bell unmounts. */
watch(
  [() => props.bus, () => props.isExpanded],
  ([bus, expanded]) => {
    if (typeof document === 'undefined') return;
    if (openBus && (openBus !== bus || !expanded)) openBus.markNotificationsRead();
    openBus = expanded ? bus : undefined;
  },
  { immediate: true },
);

onUnmounted(() => openBus?.markNotificationsRead());
</script>

<template>
  <Button
    ref="button"
    :variant="props.isExpanded ? 'soft' : 'ghost'"
    size="sm"
    shape="circle"
    class="relative shrink-0"
    :class="isPaused && 'text-muted-foreground'"
    :aria-label="name"
    :aria-expanded="props.isExpanded ?? false"
    @click="emit('toggle')"
  >
    <span ref="cue" aria-hidden="true" data-notification-cue :class="CueClasses" />
    <Icon :icon="isPaused ? BellOff : Bell" :size="16" class="relative" />
    <span v-if="unreadCount" aria-hidden="true" data-notification-unread :class="UnreadBadgeClasses">
      {{ unreadCount > 99 ? '99+' : unreadCount }}
    </span>
  </Button>
</template>
