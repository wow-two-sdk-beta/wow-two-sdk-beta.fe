<script lang="ts">
import {
  computed,
  defineComponent,
  nextTick,
  onBeforeUpdate,
  onUpdated,
  shallowRef,
  useAttrs,
  useId,
  useSlots,
  useTemplateRef,
  watch,
  type PropType,
} from 'vue';

import type { FeedbackBus, NoticeNode, NoticeProgress, PublishedNotice, ToastPauseUntil } from '../../../feedback';
import { CoarseHitArea, cn, surfaceVariants } from '../../../foundation/styles';

/** Defines props for the notification center panel. */
export interface NotificationCenterGroupProps {
  /** Explicit bus to browse; omitted keeps the slot-only presentation contract. */
  readonly bus?: FeedbackBus;

  /** The header title. Default `"Notifications"`. Rich content → the `title` slot. */
  readonly title?: string;

  /** The badge / count rendered next to the title. Rich content → the `count` slot. */
  readonly count?: string | number;

  /** Shows pause and resume controls for the supplied bus. */
  readonly canPause?: boolean;

  /** Shows the "Clear all" header action for the supplied bus. Default `true`. */
  readonly canClear?: boolean;

  /** Fires when the close button is activated; the button renders only when this is supplied. Never clears. */
  readonly onClose?: () => void;
}

/** @internal The progress a history row's bar renders — `max` repaired, `value` clamped. */
interface NoticeBarProgress {
  value?: number;
  max: number;
  label?: string;
}

/**
 * @internal The classes shared by the header's icon buttons: 28px under either pointer, with an invisible 44px hit
 * area centred on each under a coarse one, so the icons keep their place.
 */
const HeaderActionClasses = [
  'relative inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted',
  'hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
  CoarseHitArea.After,
];

/** @internal The classes of the title's count badge. */
const CountBadgeClasses = [
  'inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5',
  'text-primary-foreground',
];

/** @internal The classes of the pop-up pause select. */
const PauseSelectClasses = [
  'min-w-0 max-w-full rounded-md border border-border bg-background px-2 py-1',
  'focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:min-h-11',
];

/** @internal Renders a `NoticeNode` — either a plain string or a caller-built VNode. */
const NoticeNodeView = defineComponent({
  name: 'NoticeNodeView',
  props: { node: { type: [String, Object] as PropType<NoticeNode>, required: true } },
  setup: (nodeProps) => () => nodeProps.node,
});
</script>

<script setup lang="ts">
import { Bell, CheckCheck, ListX, X } from 'lucide-vue-next';

import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { Icon } from '../../../foundation/icons';
import { renderableChildren } from '../../../foundation/primitives';
import ProgressBar from '../../feedback/progressBar/ProgressBar.vue';
import ReportAction from '../../feedback/reportAction/ReportAction.vue';
import RelativeTime from '../relativeTime/RelativeTime.vue';
import NotificationCenterGroupItem from './NotificationCenterGroupItem.vue';

/** Renders a notification panel — title and count header, a scrolling item list, optional footer. */
defineOptions({ name: 'NotificationCenterGroup', inheritAttrs: false });

const componentProps = withDefaults(defineProps<NotificationCenterGroupProps>(), { canClear: true });
const props = useLocaleDefaults(componentProps, 'NotificationCenterGroup', { title: 'Notifications' });

defineSlots<{
  /** The `NotificationCenterGroupItem` children filling the scrolling list. */
  default?(): unknown;
  /** The header title. Falls back to the `title` prop. */
  title?(): unknown;
  /** The header badge. Falls back to the `count` prop. */
  count?(): unknown;
  /** The controls at the right of the header. */
  headerActions?(): unknown;
  /** Replaces the built-in "all caught up" placeholder shown with no items. */
  emptyState?(): unknown;
  /** The footer band under the list. Omitting it drops the band. */
  footer?(): unknown;
}>();

const locale = useLocale();
const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');
const pauseLabelId = useId();
const rowId = useId();

const pausedUntil = shallowRef<ToastPauseUntil>(null);
const unreadIds = shallowRef<ReadonlySet<string>>(new Set());
/** The retained notices of the bus, newest first. */
const notices = shallowRef<ReadonlyArray<PublishedNotice>>([]);
const now = shallowRef(Date.now());
let focusedRow: HTMLElement | undefined;

const resolvedCount = computed(() => props.count ?? (props.bus ? notices.value.length : undefined));
const canMarkRead = computed(() => Boolean(props.bus) && unreadIds.value.size > 0);
const canClearAll = computed(() => Boolean(props.bus) && props.canClear && notices.value.length > 0);

const pauseChoice = computed(() => (typeof pausedUntil.value === 'number' ? 'timed' : (pausedUntil.value ?? 'on')));
const resumeTime = computed(() => {
  if (typeof pausedUntil.value !== 'number') return '';
  return new Intl.DateTimeFormat(locale.locale.value, { hour: 'numeric', minute: '2-digit' }).format(pausedUntil.value);
});

const rows = computed(() =>
  notices.value.map((notice) => ({
    notice,
    isUnread: unreadIds.value.has(notice.id),
    progress: notice.progress ? barProgress(notice.progress) : undefined,
    action:
      notice.expiresAtMs === undefined || !Number.isFinite(notice.expiresAtMs) || notice.expiresAtMs > now.value
        ? (notice.historyAction ?? notice.action)
        : undefined,
  })),
);

const markAllReadLabel = computed(() => locale.t('NotificationCenterGroup.markAllRead', undefined, 'Mark all read'));
const clearAllLabel = computed(() => locale.t('NotificationCenterGroup.clearAll', undefined, 'Clear all'));

const classes = computed(() =>
  cn('flex w-80 flex-col', surfaceVariants({ variant: 'surface', radius: 'md' }), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });

/** Syncs the bus's retained notices, pause and unread ids into the panel. */
watch(
  () => props.bus,
  (bus, _previous, onCleanup) => {
    notices.value = bus?.retained() ?? [];
    const initial = bus?.notificationState();
    pausedUntil.value = initial?.pausedUntil ?? null;
    unreadIds.value = new Set(initial?.unreadIds);
    if (!bus || typeof document === 'undefined') return;
    const stopHistory = bus.subscribeRetained((snapshot) => {
      notices.value = snapshot;
    });
    const stopState = bus.subscribeNotificationState((state) => {
      pausedUntil.value = state.pausedUntil;
      unreadIds.value = new Set(state.unreadIds);
    });
    onCleanup(() => {
      stopHistory();
      stopState();
    });
  },
  { immediate: true },
);

/** Syncs the clock to the next retained deadline, so an expired action leaves its row on time. */
watch(
  notices,
  (entries, _previous, onCleanup) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function updateDeadlines(): void {
      now.value = Date.now();
      if (typeof window === 'undefined') return;
      let next = Infinity;
      for (const entry of entries) {
        const deadline = entry.expiresAtMs;
        if (deadline !== undefined && deadline > now.value) next = Math.min(next, deadline);
      }
      if (Number.isFinite(next)) timer = setTimeout(updateDeadlines, Math.min(next - now.value, 2_147_483_647));
    }
    updateDeadlines();
    onCleanup(() => clearTimeout(timer));
  },
  { immediate: true },
);

onBeforeUpdate(() => {
  const active = document.activeElement;
  if (active && el.value?.contains(active))
    focusedRow = active.closest<HTMLElement>('[data-notification-history-row]') ?? undefined;
});

onUpdated(() => {
  if (focusedRow && document.activeElement === document.body) {
    (focusedRow.isConnected ? focusedRow : el.value)?.focus({ preventScroll: true });
  }
  focusedRow = undefined;
});

/** Names a running row's progress bar after its title. */
function titleId(index: number): string {
  return `${rowId}-title-${index}`;
}

/** Reports whether the panel has nothing to show — no renderable default slot, else no retained notices. */
function isEmpty(): boolean {
  return slots.default ? renderableChildren(slots.default()).length === 0 : notices.value.length === 0;
}

/** Applies the pop-up pause the select chose, then restores the select to the state in effect. */
function changePause(event: Event): void {
  const select = event.currentTarget as HTMLSelectElement;
  const choice = select.value;
  if (choice === '15m') props.bus?.setToastPause(Date.now() + 15 * 60_000);
  else if (choice === '1h') props.bus?.setToastPause(Date.now() + 60 * 60_000);
  else if (choice === 'manual') props.bus?.setToastPause('manual');
  else if (choice === 'on') props.bus?.setToastPause(null);
  // A timed selection inserts a new option that shows the actual resume time.
  void nextTick(() => {
    select.value = pauseChoice.value;
  });
}

/** Normalizes a running notice's progress for the bar: `max` defaults to 1, a bad `max` or `value` is repaired. */
function barProgress(progress: NoticeProgress): NoticeBarProgress {
  const max = progress.max !== undefined && Number.isFinite(progress.max) && progress.max > 0 ? progress.max : 1;
  const value =
    typeof progress.value === 'number' && Number.isFinite(progress.value)
      ? Math.min(Math.max(progress.value, 0), max)
      : undefined;
  return { value, max, label: progress.label };
}

/** Runs a header action whose button leaves the header afterwards, keeping keyboard focus inside the panel. */
function runHeaderAction(event: Event, action: () => void): void {
  const hadFocus = document.activeElement === event.currentTarget;
  action();
  if (!hadFocus) return;
  void nextTick(() => {
    if (!el.value?.contains(document.activeElement)) el.value?.focus({ preventScroll: true });
  });
}
</script>

<template>
  <div
    ref="el"
    role="region"
    tabindex="-1"
    :aria-label="locale.t('NotificationCenterGroup.notifications', undefined, 'Notifications')"
    v-bind="rest"
    :class="classes"
  >
    <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
      <div class="flex min-w-0 items-center gap-2">
        <span class="truncate text-sm font-semibold">
          <slot name="title">{{ props.title }}</slot>
        </span>
        <span v-if="resolvedCount != null || $slots.count" :class="CountBadgeClasses">
          <slot name="count">{{ resolvedCount }}</slot>
        </span>
      </div>
      <div
        v-if="$slots.headerActions || canMarkRead || canClearAll || props.onClose"
        class="flex shrink-0 items-center gap-1"
      >
        <slot name="headerActions" />
        <button
          v-if="canMarkRead"
          type="button"
          :aria-label="markAllReadLabel"
          :title="markAllReadLabel"
          :class="HeaderActionClasses"
          @click="runHeaderAction($event, () => props.bus?.markNotificationsRead())"
        >
          <Icon :icon="CheckCheck" :size="14" />
        </button>
        <button
          v-if="canClearAll"
          type="button"
          :aria-label="clearAllLabel"
          :title="clearAllLabel"
          :class="HeaderActionClasses"
          @click="runHeaderAction($event, () => props.bus?.clearRetained())"
        >
          <Icon :icon="ListX" :size="14" />
        </button>
        <button
          v-if="props.onClose"
          type="button"
          :aria-label="locale.t('NotificationCenterGroup.closeNotifications', undefined, 'Close notifications')"
          :class="HeaderActionClasses"
          @click="props.onClose()"
        >
          <Icon :icon="X" :size="14" />
        </button>
      </div>
    </header>
    <div
      v-if="props.canPause && props.bus"
      class="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 text-sm"
    >
      <label :for="pauseLabelId">{{ locale.t('NotificationCenterGroup.popups', undefined, 'Toast pop-ups') }}</label>
      <select :id="pauseLabelId" :value="pauseChoice" :class="PauseSelectClasses" @change="changePause">
        <option value="on">{{ locale.t('NotificationCenterGroup.popupsOn', undefined, 'On') }}</option>
        <option v-if="pauseChoice === 'timed'" value="timed" disabled>
          {{ locale.t('NotificationCenterGroup.pausedUntil', { time: resumeTime }, 'Paused until {time}') }}
        </option>
        <option value="15m">
          {{ locale.t('NotificationCenterGroup.pause15', undefined, 'Pause for 15 minutes') }}
        </option>
        <option value="1h">{{ locale.t('NotificationCenterGroup.pause60', undefined, 'Pause for 1 hour') }}</option>
        <option value="manual">
          {{ locale.t('NotificationCenterGroup.pauseManual', undefined, 'Off until resumed') }}
        </option>
      </select>
    </div>
    <div class="max-h-96 overflow-y-auto py-1">
      <template v-if="isEmpty()">
        <slot name="emptyState">
          <div class="flex flex-col items-center gap-2 px-4 py-10 text-center text-muted-foreground">
            <Bell class="h-6 w-6" />
            <p class="text-sm">
              {{ locale.t('NotificationCenterGroup.youreAllCaughtUp', undefined, "You're all caught up.") }}
            </p>
          </div>
        </slot>
      </template>
      <div v-else class="flex flex-col">
        <slot>
          <NotificationCenterGroupItem
            v-for="({ notice, action, isUnread, progress }, index) in rows"
            :key="notice.id"
            :severity="notice.tone"
            :is-unread="isUnread"
            data-notification-history-row
            tabindex="-1"
            @delete="props.bus?.remove(notice.id)"
          >
            <template #title>
              <span :id="progress ? titleId(index) : undefined"><NoticeNodeView :node="notice.title" /></span>
            </template>
            <template #timestamp><RelativeTime is-live :value="notice.publishedAtMs" /></template>
            <template v-if="notice.description" #description><NoticeNodeView :node="notice.description" /></template>
            <template v-if="progress" #progress>
              <ProgressBar size="sm" :value="progress.value" :max="progress.max" :aria-labelledby="titleId(index)" />
              <p v-if="progress.label" class="mt-1 text-xs text-muted-foreground">{{ progress.label }}</p>
            </template>
            <template v-if="action || notice.report" #actions>
              <NoticeNodeView v-if="action" :node="action" />
              <ReportAction v-if="notice.report" :send="notice.report" />
            </template>
          </NotificationCenterGroupItem>
        </slot>
      </div>
    </div>
    <div v-if="$slots.footer" class="border-t border-border px-3 py-2 text-center text-xs">
      <slot name="footer" />
    </div>
  </div>
</template>
