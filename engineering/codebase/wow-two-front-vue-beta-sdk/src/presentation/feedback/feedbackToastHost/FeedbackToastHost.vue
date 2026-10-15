<script lang="ts">
import type { FeedbackBus, PublishedNotice } from '../../../feedback';
import type { ToastHostProps, ToastOptions } from '../toastHost';

/**
 * The prop surface of `FeedbackToastHost` — `bus`, plus every `ToastHost` prop.
 *
 * The `ToastHostProps` heritage is marked `@vue-ignore` so only `bus` becomes a
 * runtime prop and the rest arrive as attrs; the template hands those to
 * `<ToastHost>`, which declares them and resolves them back into props. Consumers
 * still get the full checked surface, because the heritage is real to
 * TypeScript — it is only the SFC compiler's runtime-props pass that skips it.
 */
export interface FeedbackToastHostProps extends /* @vue-ignore */ ToastHostProps {
  /** The bus to render. Default: the app-wide `feedbackBus` singleton (what `notify()` publishes on). */
  readonly bus?: FeedbackBus;
}

/**
 * Maps a bus notice onto the imperative toast payload. `NoticeTone` is a subset of the toast
 * `Severity` vocabulary and `NoticeNode` is `ToastNode` — drift in either is a compile error.
 */
function toToastOptions(notice: PublishedNotice): ToastOptions {
  return {
    title: notice.title,
    description: notice.description,
    severity: notice.tone,
    duration: notice.durationMs,
    action: notice.action,
    report: notice.report,
  };
}
</script>

<script setup lang="ts">
import { computed, useAttrs, watch } from 'vue';
import { feedbackBus, NoticeCategory } from '../../../feedback';
import ToastHost from '../toastHost/ToastHost.vue';
import { toastHost } from '../toastHost';

/**
 * Renders the toast viewport and forwards every `/feedback` bus notice into `toastHost.toast()`.
 * All `ToastHostProps` pass through. Mount once per app **in place of** a bare `<ToastHost/>` —
 * mounting both would render every toast twice. Nothing toasts until this (or another subscriber)
 * is mounted; notices published before mount are dropped, so mount it at the app root.
 */
defineOptions({ name: 'FeedbackToastHost', inheritAttrs: false });

const props = defineProps<FeedbackToastHostProps>();

const attrs = useAttrs();

/** A `computed` keeps the fallback reactive, so a swapped `bus` re-subscribes. */
const bus = computed(() => props.bus ?? feedbackBus);

/*
 * React's `useEffect(() => bus.subscribe(...), [bus])`: `onCleanup` receives the
 * unsubscribe, so a changed `bus` drops the old subscription before opening the
 * new one, and scope disposal drops the last.
 */
watch(
  bus,
  (current, _previous, onCleanup) => {
    // Client-only, as the effect was: a server render has no viewport to forward into.
    if (typeof document === 'undefined') return;
    const toastIds = new Map<string, string>();
    const close = (id: string | null): void => {
      if (id !== null) {
        const toastId = toastIds.get(id);
        if (toastId) toastHost.dismiss(toastId);
        return;
      }
      for (const toastId of [...toastIds.values()]) toastHost.dismiss(toastId);
    };
    const unsubscribe = current.subscribe((notice) => {
      const options: ToastOptions = {
        ...toToastOptions(notice),
        onDelete: notice.category === NoticeCategory.Retained ? () => current.remove(notice.id) : undefined,
        onDismiss: () => {
          toastIds.delete(notice.id);
        },
      };
      const existing = toastIds.get(notice.id);
      if (existing) toastHost.update(existing, options);
      else toastIds.set(notice.id, toastHost.toast(options));
    });
    const unsubscribeDismiss = current.subscribeDismiss(close);
    onCleanup(() => {
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
