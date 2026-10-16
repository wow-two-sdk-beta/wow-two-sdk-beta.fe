<script lang="ts">
/** Defines which side of the conversation a bubble sits on. */
export const ChatSide = {
  /** Refers to the inbound side (them). */
  Start: 'start',
  /** Refers to the outbound side (me). */
  End: 'end',
} as const;

export type ChatSide = (typeof ChatSide)[keyof typeof ChatSide];

/** Defines the delivery state of a chat message. */
export const ChatStatus = {
  /** Refers to a message in flight. */
  Sending: 'sending',
  /** Refers to a message sent to the server. */
  Sent: 'sent',
  /** Refers to a message delivered to the recipient. */
  Delivered: 'delivered',
  /** Refers to a message read by the recipient. */
  Read: 'read',
  /** Refers to a message that failed to send. */
  Failed: 'failed',
} as const;

export type ChatStatus = (typeof ChatStatus)[keyof typeof ChatStatus];

/** Defines the chat bubble color tone. */
export const ChatTone = {
  /** Refers to the neutral inbound bubble. */
  Default: 'default',
  /** Refers to the primary outbound bubble. */
  Primary: 'primary',
  /** Refers to a centered, muted system row. */
  System: 'system',
  /** Refers to a subtle bordered bubble. */
  Subtle: 'subtle',
} as const;

export type ChatTone = (typeof ChatTone)[keyof typeof ChatTone];

export interface ChatBubbleCardProps {
  /** The side of the conversation. `start` = them, `end` = me. */
  readonly side?: ChatSide;

  /** The bubble color tone. `system` is centered + muted (e.g. "Alex joined"). */
  readonly tone?: ChatTone;

  /** The author label (rendered above the bubble). Rich content → the `author` slot. */
  readonly author?: string | number;

  /** The timestamp (rendered next to the status row). Rich content → the `timestamp` slot. */
  readonly timestamp?: string | number;

  /** The delivery state. Hidden when `side === 'start'` by default. */
  readonly status?: ChatStatus;

  /** The status-on-inbound override — force-shows status even on the inbound side. */
  readonly canShowStatusOnStart?: boolean;

  /** The tailless mode — hides the bubble's tail (for stacked / grouped messages). */
  readonly isTailless?: boolean;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, useAttrs, useSlots, useTemplateRef, type Component } from 'vue';
import { Check, CheckCheck, Clock, AlertTriangle } from 'lucide-vue-next';
import { cn, Tones } from '../../../foundation/styles';

const locale = useLocale();

/**
 * Renders one chat message bubble with author, timestamp, delivery status, and a footer slot.
 *
 * Compose `<ChatBubbleCard side="end" tone="primary" status="read" timestamp="9:42 AM">…</ChatBubbleCard>` inside a
 * `MessageGroup`. Use `system` tone for join / leave / metadata rows. Pair the `footer` slot with
 * `display/ReactionBar`.
 *
 * React's `avatar` / `footer` were structural `ReactNode` props with no string form worth keeping; they are slots
 * only. `author` / `timestamp` keep their prop form and gain same-named slots.
 */
defineOptions({ name: 'ChatBubbleCard', inheritAttrs: false });

defineSlots<{
  /** The avatar, rendered next to the bubble on the same side. */
  avatar(): unknown;

  /** The author-label override, when a plain string is not enough. */
  author(): unknown;

  /** The bubble body — React's required `children`. */
  default(): unknown;

  /** The timestamp override, when a plain string is not enough. */
  timestamp(): unknown;

  /** The reactions / footer region (e.g. a `ReactionBar`). */
  footer(): unknown;
}>();

const props = withDefaults(defineProps<ChatBubbleCardProps>(), {
  side: ChatSide.Start,
  tone: undefined,
  author: undefined,
  timestamp: undefined,
  status: undefined,
  canShowStatusOnStart: undefined,
  isTailless: undefined,
});

const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

/** Maps each chat tone to the shared `Tones` palette (system stays custom — transparent + italic). */
const ToneBase: Record<ChatTone, string> = {
  default: Tones.soft.neutral,
  primary: Tones.solid.primary,
  system: 'bg-transparent text-muted-foreground italic',
  subtle: `border ${Tones.surface.neutral}`,
};

/* React inlined the sized JSX per status; Vue splits the component from the class it carries. */
const StatusIcon: Record<ChatStatus, Component> = {
  sending: Clock,
  sent: Check,
  delivered: CheckCheck,
  read: CheckCheck,
  failed: AlertTriangle,
};

const StatusIconClass: Record<ChatStatus, string> = {
  sending: 'h-3 w-3',
  sent: 'h-3 w-3',
  delivered: 'h-3 w-3',
  read: 'h-3 w-3 text-info-soft-foreground',
  failed: 'h-3 w-3 text-destructive-soft-foreground',
};

const isEnd = computed(() => props.side === ChatSide.End);

const effectiveTone = computed<ChatTone>(() => props.tone ?? (isEnd.value ? ChatTone.Primary : ChatTone.Default));

const isSystem = computed(() => effectiveTone.value === ChatTone.System);

const showStatus = computed(() => Boolean(props.status) && (isEnd.value || Boolean(props.canShowStatusOnStart)));

const statusIcon = computed(() => (props.status ? StatusIcon[props.status] : undefined));

const statusIconClass = computed(() => (props.status ? StatusIconClass[props.status] : undefined));

const hasAuthor = computed(() => props.author != null || Boolean(slots.author));

const hasTimestamp = computed(() => props.timestamp != null || Boolean(slots.timestamp));

const classes = computed(() =>
  isSystem.value
    ? cn('flex w-full justify-center', attrs.class as string | undefined)
    : cn('flex w-full gap-2', isEnd.value ? 'flex-row-reverse' : 'flex-row', attrs.class as string | undefined),
);

const systemInnerClasses = computed(() => cn('text-center text-xs', ToneBase.system));

const columnClasses = computed(() => cn('flex max-w-[75%] flex-col gap-1', isEnd.value ? 'items-end' : 'items-start'));

const bubbleClasses = computed(() =>
  cn(
    'relative inline-block px-3 py-2 text-sm break-words',
    ToneBase[effectiveTone.value],
    props.isTailless ? 'rounded-2xl' : isEnd.value ? 'rounded-2xl rounded-br-sm' : 'rounded-2xl rounded-bl-sm',
  ),
);

const metaClasses = computed(() =>
  cn('flex items-center gap-1 text-[11px] text-muted-foreground', isEnd.value ? 'flex-row-reverse' : 'flex-row'),
);

const footerClasses = computed(() => cn(isEnd.value && 'self-end'));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });
</script>

<template>
  <div v-if="isSystem" ref="el" :data-side="props.side" v-bind="rest" :class="classes">
    <div :class="systemInnerClasses"><slot /></div>
  </div>
  <div v-else ref="el" :data-side="props.side" v-bind="rest" :class="classes">
    <div v-if="$slots.avatar" class="shrink-0 self-end"><slot name="avatar" /></div>
    <div :class="columnClasses">
      <div v-if="hasAuthor" class="text-xs font-medium text-muted-foreground">
        <slot name="author">{{ props.author }}</slot>
      </div>
      <div :class="bubbleClasses"><slot /></div>
      <div v-if="hasTimestamp || showStatus" :class="metaClasses">
        <span v-if="hasTimestamp"
          ><slot name="timestamp">{{ props.timestamp }}</slot></span
        >
        <!-- aria-label is prohibited on a generic span — img role carries it. -->
        <span
          v-if="showStatus && statusIcon"
          role="img"
          :aria-label="
            locale.t(
              'ChatBubbleCard.status',
              { status: locale.t('ChatBubbleCard.' + props.status, undefined, props.status) },
              'Status: {status}',
            )
          "
        >
          <component :is="statusIcon" :class="statusIconClass" />
        </span>
      </div>
      <div v-if="$slots.footer" :class="footerClasses"><slot name="footer" /></div>
    </div>
  </div>
</template>
