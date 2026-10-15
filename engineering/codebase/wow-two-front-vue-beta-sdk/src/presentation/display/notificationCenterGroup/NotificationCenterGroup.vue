<script lang="ts">
import type { FeedbackBus } from '../../../feedback';
export interface NotificationCenterGroupProps {
  /** Explicit bus to browse; omitted keeps the slot-only presentation contract. */
  readonly bus?: FeedbackBus;
  /** The header title. Default `"Notifications"`. Rich content → the `title` slot. */
  readonly title?: string;

  /** The badge / count rendered next to the title. Rich content → the `count` slot. */
  readonly count?: string | number;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { useLocaleDefaults } from '../../../foundation/i18n';
import {
  computed,
  defineComponent,
  getCurrentInstance,
  shallowRef,
  useAttrs,
  useSlots,
  useTemplateRef,
  watch,
  type PropType,
} from 'vue';
import type { NoticeNode, PublishedNotice } from '../../../feedback';
import NotificationItem from './NotificationItem.vue';
import ReportAction from '../../feedback/reportAction/ReportAction.vue';
import { Bell, X } from 'lucide-vue-next';
import { Icon } from '../../../foundation/icons';
import { cn, surfaceVariants } from '../../../foundation/styles';
import { renderableChildren } from '../../../foundation/primitives';

const locale = useLocale();

/**
 * Renders a notification panel — title and count header, a scrolling item list, optional footer.
 * The default slot holds `NotificationItem` children.
 *
 * React's `headerActions` / `emptyState` / `footer` were `ReactNode` props with
 * no string form worth keeping; they are slots only. `title` / `count` keep
 * their prop form and gain same-named slots.
 */
defineOptions({ name: 'NotificationCenterGroup', inheritAttrs: false });

const componentProps = withDefaults(defineProps<NotificationCenterGroupProps>(), {});
const props = useLocaleDefaults(componentProps, 'NotificationCenterGroup', { title: 'Notifications' });
const emit = defineEmits<{
  /** Requests closing the containing panel; never deletes or clears retained notifications. */
  close: [];
}>();
const instance = getCurrentInstance();
const hasClose = () => Boolean(instance?.vnode.props?.onClose);

defineSlots<{
  /** The `NotificationItem` children filling the scrolling list. */
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

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

/**
 * Replaces React's `Children.toArray(children).filter(isValidElement)`. Called
 * per render rather than cached — a slot's content is only knowable at render
 * time, and `renderableChildren` drops the comment/whitespace vnodes that would
 * otherwise read as content.
 */
const notices = shallowRef<ReadonlyArray<PublishedNotice>>([]);
watch(
  () => props.bus,
  (bus, _previous, onCleanup) => {
    notices.value = bus?.retained() ?? [];
    if (bus && typeof document !== 'undefined')
      onCleanup(
        bus.subscribeRetained((snapshot) => {
          notices.value = snapshot;
        }),
      );
  },
  { immediate: true },
);
const isEmpty = () => (slots.default ? renderableChildren(slots.default()).length === 0 : notices.value.length === 0);
const resolvedCount = computed(() => props.count ?? (props.bus ? notices.value.length : undefined));

const NoticeNodeView = defineComponent({
  name: 'NoticeNodeView',
  props: { node: { type: [String, Object] as PropType<NoticeNode>, required: true } },
  setup: (nodeProps) => () => nodeProps.node,
});

const classes = computed(() =>
  cn('flex w-80 flex-col', surfaceVariants({ variant: 'surface', radius: 'md' }), attrs.class as string | undefined),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div
    ref="el"
    role="region"
    :aria-label="locale.t('NotificationCenterGroup.notifications', undefined, 'Notifications')"
    v-bind="rest"
    :class="classes"
  >
    <header class="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold">
          <slot name="title">{{ props.title }}</slot>
        </span>
        <span
          v-if="resolvedCount != null || $slots.count"
          class="inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-primary-foreground"
        >
          <slot name="count">{{ resolvedCount }}</slot>
        </span>
      </div>
      <div v-if="$slots.headerActions || hasClose()" class="flex items-center gap-2">
        <slot name="headerActions" />
        <button
          v-if="hasClose()"
          type="button"
          :aria-label="locale.t('NotificationCenterGroup.closeNotifications', undefined, 'Close notifications')"
          class="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          @click="emit('close')"
        >
          <Icon :icon="X" :size="14" />
        </button>
      </div>
    </header>
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
          <NotificationItem
            v-for="notice in notices"
            :key="notice.id"
            :severity="notice.tone"
            @delete="props.bus?.remove(notice.id)"
          >
            <template #title><NoticeNodeView :node="notice.title" /></template>
            <template v-if="notice.description" #description><NoticeNodeView :node="notice.description" /></template>
            <template v-if="notice.action || notice.report" #actions>
              <NoticeNodeView v-if="notice.action" :node="notice.action" />
              <ReportAction v-if="notice.report" :send="notice.report" />
            </template>
          </NotificationItem>
        </slot>
      </div>
    </div>
    <div v-if="$slots.footer" class="border-t border-border px-3 py-2 text-center text-xs">
      <slot name="footer" />
    </div>
  </div>
</template>
