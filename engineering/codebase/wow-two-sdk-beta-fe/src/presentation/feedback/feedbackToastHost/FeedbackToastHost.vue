<script lang="ts">
import { computed, Fragment, h, shallowRef, TransitionGroup, useAttrs, useId, watch, type ShallowRef } from 'vue';

import {
  feedbackBus,
  NoticeCategory,
  NoticePriority,
  NoticePriorityRank,
  NoticeTone,
  type FeedbackBus,
  type PublishedNotice,
} from '../../../feedback';
import { toastHost, type ToastHostProps, type ToastOptions } from '../toastHost';

/** Defines props for the bus-fed toast viewport — `bus` plus every `ToastHost` prop. */
export interface FeedbackToastHostProps extends /* @vue-ignore */ ToastHostProps {
  /** The bus to render. Default: the app-wide `feedbackBus` singleton (what `notify()` publishes on). */
  readonly bus?: FeedbackBus;
}

/** @internal A live toast and the notices it stands for. */
interface LiveToast {
  id?: string;
  readonly groupKey?: string;
  readonly notices: Map<string, PublishedNotice>;
  readonly pending: ShallowRef<number>;
}

/** @internal Maps a bus notice onto the toast payload. */
function toToastOptions(notice: PublishedNotice): ToastOptions {
  return {
    title: notice.title,
    description: notice.description,
    compact: notice.compact,
    details: notice.details,
    severity: notice.tone,
    priority: notice.priority,
    duration: notice.durationMs,
    expiresAtMs: notice.expiresAtMs,
    canPin: notice.canPin,
    action: notice.action,
    report: notice.report,
    progress: notice.progress,
  };
}
</script>

<script setup lang="ts">
import { ElementTag } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import ReportAction from '../reportAction/ReportAction.vue';
import ToastContent from '../toast/ToastContent.vue';
import ToastRunningProgress from '../toast/ToastRunningProgress.vue';
import ToastHost from '../toastHost/ToastHost.vue';
import RemindLaterButton from './RemindLaterButton.vue';

/**
 * Renders the app's transient notification stack from the feedback bus; every `ToastHostProps` prop passes through.
 * Mount once per app at the root, in place of a bare `<ToastHost/>`; notices published before mount are dropped.
 */
defineOptions({ name: 'FeedbackToastHost', inheritAttrs: false });

const props = defineProps<FeedbackToastHostProps>();

const attrs = useAttrs();
const locale = useLocale();
const rowIdBase = useId();

/** The bus in use — the prop, else the app-wide `feedbackBus`. */
const bus = computed(() => props.bus ?? feedbackBus);

/** Syncs the bus's notices into the toast store, resubscribing when `bus` changes. */
watch(
  bus,
  (current, _previous, onCleanup) => {
    // Client-only — a server render has no viewport to forward into.
    if (typeof document === 'undefined') return;
    const members = new Map<string, LiveToast>();
    const groups = new Map<string, LiveToast>();
    let active = true;

    function forget(entry: LiveToast): void {
      if (entry.groupKey && groups.get(entry.groupKey) === entry) groups.delete(entry.groupKey);
      for (const id of entry.notices.keys()) {
        if (members.get(id) === entry) members.delete(id);
      }
    }

    function reminderFor(entry: LiveToast, notice: PublishedNotice) {
      const remind = current.remindLater;
      if (!remind || !notice.reminderKey || Number.isFinite(notice.expiresAtMs)) return undefined;
      return h(RemindLaterButton, {
        key: notice.id,
        schedule: async () => {
          entry.pending.value += 1;
          try {
            await remind(notice);
            if (active) {
              current.notify({
                tone: NoticeTone.Info,
                title: locale.t('FeedbackToastHost.reminderScheduled', undefined, 'Reminder scheduled.'),
                canPin: false,
              });
            }
          } finally {
            entry.pending.value -= 1;
          }
        },
      });
    }

    function renderGroup(entry: LiveToast, rows: ReadonlyArray<PublishedNotice>) {
      return h(
        TransitionGroup,
        {
          tag: ElementTag.Ul,
          class: 'divide-y divide-border px-3',
          enterActiveClass:
            'motion-safe:transition-[opacity,translate] motion-safe:duration-(--toast-group-duration) ease-out',
          enterFromClass: 'motion-safe:translate-y-2 motion-safe:opacity-0',
        },
        {
          default: () =>
            [...rows].reverse().map((notice) => {
              const reminder = reminderFor(entry, notice);
              const report = notice.report ? h(ReportAction, { send: notice.report }) : undefined;
              const copy = notice.compact ?? notice;
              const running = notice.progress;
              const titleId = `${rowIdBase}-title-${notice.id}`;
              return h(ElementTag.Li, { key: notice.id, 'data-toast-group-row': notice.id, class: 'py-1.5' }, [
                h(
                  ToastContent,
                  { isCompact: true, titleId },
                  {
                    title: () => copy.title,
                    description: copy.description ? () => copy.description : undefined,
                    progress: running
                      ? () =>
                          h(ToastRunningProgress, {
                            progress: running,
                            severity: notice.tone,
                            isCompact: true,
                            'aria-labelledby': titleId,
                          })
                      : undefined,
                    actions: notice.action || reminder || report ? () => [notice.action, reminder, report] : undefined,
                    default: notice.details ? () => notice.details : undefined,
                  },
                ),
              ]);
            }),
        },
      );
    }

    function render(entry: LiveToast): void {
      const rows = [...entry.notices.values()];
      const first = rows[0];
      if (!first) {
        forget(entry);
        if (entry.id) toastHost.dismiss(entry.id);
        return;
      }
      const options: ToastOptions = {
        ...toToastOptions(first),
        pauseExpiry: () => entry.pending.value > 0,
        onDismiss: () => forget(entry),
      };
      if (entry.groupKey) {
        const latest = rows.at(-1) ?? first;
        options.group = {
          count: rows.length,
          latest: {
            title: typeof latest.title === 'string' ? latest.title : undefined,
            description: typeof latest.description === 'string' ? latest.description : undefined,
            severity: latest.tone,
          },
        };
      }
      if (rows.length === 1) {
        const reminder = reminderFor(entry, first);
        if (reminder) options.action = h(Fragment, null, [first.action, reminder]);
        options.onDelete = first.category === NoticeCategory.Retained ? () => current.remove(first.id) : undefined;
      } else {
        options.title = first.group?.title ?? first.title;
        options.description = locale.t(
          'FeedbackToastHost.groupedCount',
          { count: rows.length },
          '{count} notifications',
        );
        options.details = renderGroup(entry, rows);
        options.compact = undefined;
        options.canPin = rows.some((notice) => notice.canPin === false) ? false : first.canPin;
        // The highest explicit priority; unclassified members leave the host's severity durations in charge.
        options.priority = rows.reduce<NoticePriority | undefined>((highest, { priority }) => {
          if (priority === undefined) return highest;
          return highest === undefined || NoticePriorityRank[priority] > NoticePriorityRank[highest]
            ? priority
            : highest;
        }, undefined);
        options.action = undefined;
        options.report = undefined;
        options.progress = undefined;
        options.onDelete = undefined;
        // Rows own their progress; the card stays up while any member runs and takes its duration back after.
        if (rows.some((notice) => notice.progress)) options.duration = Infinity;
      }
      if (entry.id) toastHost.update(entry.id, options);
      else entry.id = toastHost.toast(options);
    }

    function removeMember(id: string, entry: LiveToast): void {
      members.delete(id);
      entry.notices.delete(id);
      render(entry);
    }

    function close(id: string | null): void {
      if (id !== null) {
        const entry = members.get(id);
        if (entry) removeMember(id, entry);
        return;
      }
      for (const entry of new Set(members.values())) if (entry.id) toastHost.dismiss(entry.id);
    }

    const unsubscribe = current.subscribe((notice) => {
      if (current.suppresses(notice)) return;
      const groupKey = Number.isFinite(notice.expiresAtMs) ? undefined : notice.group?.key || undefined;
      let entry = members.get(notice.id);
      if (entry && entry.groupKey !== groupKey) {
        removeMember(notice.id, entry);
        entry = undefined;
      }
      entry ??= groupKey ? groups.get(groupKey) : undefined;
      if (!entry) {
        entry = { groupKey, notices: new Map(), pending: shallowRef(0) };
        if (groupKey) groups.set(groupKey, entry);
      }
      members.set(notice.id, entry);
      entry.notices.set(notice.id, notice);
      render(entry);
    });
    const unsubscribeDismiss = current.subscribeDismiss(close);
    onCleanup(() => {
      active = false;
      unsubscribe();
      unsubscribeDismiss();
      close(null);
    });
  },
  { immediate: true },
);
</script>

<template>
  <!-- Every non-`bus` attr is a `ToastHost` prop by construction — see `FeedbackToastHostProps`. -->
  <ToastHost v-bind="attrs" />
</template>
