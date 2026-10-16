<script lang="ts">
export interface CommentProps {
  /** The author name. Rich content → the `author` slot. */
  readonly author: string | number;

  /** The timestamp / metadata. Rich content → the `timestamp` slot. */
  readonly timestamp?: string | number;

  /** The initial collapsed state for replies. */
  readonly defaultCollapsed?: boolean;

  /** The highlighted state — marks as the OP / highlighted comment. */
  readonly isHighlighted?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, ref, useAttrs, useSlots, useTemplateRef } from 'vue';
import { ChevronDown, ChevronRight } from 'lucide-vue-next';
import { cn } from '../../../foundation/styles';
import { dataAttr } from '../../../foundation/dom';
import { renderableChildren } from '../../../foundation/primitives';

const locale = useLocale();

/**
 * Renders one comment: avatar and collapse rail, header line, body, actions, and nested replies.
 *
 * React's `avatar` / `badge` / `actions` / `replies` were structural `ReactNode` props with no string form worth
 * keeping; they are slots only. `author` / `timestamp` keep their prop form and gain same-named slots.
 */
defineOptions({ name: 'Comment', inheritAttrs: false });

defineSlots<{
  /** The avatar / author photo. */
  avatar(): unknown;

  /** The author-name override, when a plain string is not enough. */
  author(): unknown;

  /** The trailing chip for badges (e.g. "OP", "Author"). */
  badge(): unknown;

  /** The timestamp override, when a plain string is not enough. */
  timestamp(): unknown;

  /** The body / content — React's required `children`. */
  default(): unknown;

  /** The footer actions (e.g. Reply / Vote / Report). */
  actions(): unknown;

  /** The nested replies — pass `Comment` items. */
  replies(): unknown;
}>();

const props = withDefaults(defineProps<CommentProps>(), {
  timestamp: undefined,
  defaultCollapsed: false,
  isHighlighted: undefined,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

const collapsed = ref(props.defaultCollapsed);

/**
 * Replaces React's `Children.toArray(replies).filter(isValidElement).length`.
 * Called per render rather than cached — a slot's content is only knowable at
 * render time, and `renderableChildren` drops the comment/whitespace vnodes
 * that would otherwise read as replies.
 */
const replyCount = (): number => renderableChildren(slots.replies?.()).length;

const hasReplies = (): boolean => replyCount() > 0;

const hasTimestamp = computed(() => props.timestamp != null || Boolean(slots.timestamp));

const classes = computed(() =>
  cn(
    'flex gap-2 rounded-md',
    props.isHighlighted && 'bg-primary-soft/30 ring-1 ring-primary/20 p-2',
    attrs.class as string | undefined,
  ),
);

const repliesWrapClasses = computed(() => cn('mt-2', collapsed.value && 'hidden'));

const railTrackClasses = computed(() =>
  cn(
    'mx-auto w-px flex-1 bg-border transition-colors group-hover/rail:bg-foreground/30',
    collapsed.value && 'opacity-40',
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
  <div
    ref="el"
    role="treeitem"
    :aria-expanded="hasReplies() ? !collapsed : undefined"
    :data-highlighted="dataAttr(props.isHighlighted)"
    v-bind="rest"
    :class="classes"
  >
    <!-- Avatar + collapse rail -->
    <div class="flex flex-col items-center gap-1">
      <div class="shrink-0"><slot name="avatar" /></div>
      <button
        v-if="hasReplies()"
        type="button"
        :aria-label="
          locale.t(
            collapsed ? 'Comment.expandReplies' : 'Comment.collapseReplies',
            undefined,
            collapsed ? 'Expand replies' : 'Collapse replies',
          )
        "
        class="flex flex-1 items-stretch -my-1 group/rail focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-full"
        @click="collapsed = !collapsed"
      >
        <span aria-hidden="true" :class="railTrackClasses" />
      </button>
    </div>

    <div class="flex-1 min-w-0">
      <div class="flex flex-wrap items-baseline gap-x-2 text-sm">
        <span class="font-medium text-foreground">
          <slot name="author">{{ props.author }}</slot>
        </span>
        <slot name="badge" />
        <span v-if="hasTimestamp" class="text-xs text-muted-foreground">
          <slot name="timestamp">{{ props.timestamp }}</slot>
        </span>
      </div>
      <div class="mt-1 text-sm text-foreground"><slot /></div>
      <div v-if="$slots.actions" class="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        <slot name="actions" />
      </div>

      <div v-if="hasReplies()" :class="repliesWrapClasses">
        <!-- treeitem children must sit in a role=group per the ARIA tree pattern -->
        <div role="group" class="flex flex-col gap-3 border-l border-border pl-3">
          <slot name="replies" />
        </div>
      </div>

      <button
        v-if="hasReplies() && collapsed"
        type="button"
        class="mt-1 inline-flex items-center gap-1 text-xs text-primary-soft-foreground hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
        @click="collapsed = false"
      >
        <ChevronRight class="h-3 w-3" />
        {{
          locale.t(
            replyCount() === 1 ? 'Comment.showReply' : 'Comment.showReplies',
            { count: replyCount() },
            replyCount() === 1 ? 'Show {count} reply' : 'Show {count} replies',
          )
        }}
      </button>
      <button
        v-if="hasReplies() && !collapsed"
        type="button"
        class="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded"
        @click="collapsed = true"
      >
        <ChevronDown class="h-3 w-3" /> {{ locale.t('Comment.collapse', undefined, 'Collapse') }}
      </button>
    </div>
  </div>
</template>
