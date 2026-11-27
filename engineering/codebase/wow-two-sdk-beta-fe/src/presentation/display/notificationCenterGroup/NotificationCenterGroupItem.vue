<script lang="ts">
import { cn, type Severity } from '../../../foundation/styles';

/** Defines props for one notification row of the notification center. */
export interface NotificationCenterGroupItemProps {
  /** The semantic severity; supplies a leading glyph when no icon is provided. */
  readonly severity?: Severity;

  /** The leading icon / avatar. Rich content → the `icon` slot. */
  readonly icon?: string;

  /** The primary title. Rich content → the `title` slot. Supply this or the slot. */
  readonly title?: string;

  /** The body / description. Rich content → the `description` slot. */
  readonly description?: string;

  /** The timestamp / relative time label. Rich content → the `timestamp` slot. */
  readonly timestamp?: string;

  /** The unread flag: bold title, a leading dot and visually hidden "Unread" text. */
  readonly isUnread?: boolean;

  /** The trailing actions. Rich content → the `actions` slot. */
  readonly actions?: string;

  /** Fires when the row is activated by click, Enter or Space; supplying it makes the row interactive. */
  readonly onSelect?: () => void;

  /** Fires when the dismiss button is pressed; the button renders on hover only when this is supplied. */
  readonly onDismiss?: () => void;

  /** Fires when the delete button is pressed; the button renders only when this is supplied. */
  readonly onDelete?: () => void;
}

/** @internal The dismiss button's resting classes — corner placement, box, and the hidden-until-hover opacity. */
const DismissRestingClasses =
  'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0';

/** @internal The dismiss button's hover / focus classes — the raised surface and the focus ring. */
const DismissInteractionClasses =
  'hover:bg-background active:bg-background hover:text-foreground active:text-foreground focus-visible:opacity-100 ' +
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

/** @internal The delete button's classes. */
const DeleteButtonClasses =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground ' +
  'hover:bg-muted active:bg-muted hover:text-foreground active:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';
</script>

<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue';
import { Trash2, X } from 'lucide-vue-next';

import { dataAttr, Key } from '../../../foundation/dom';
import { useLocale } from '../../../foundation/i18n';
import { Icon, SeverityIcons, SeverityIconClasses } from '../../../foundation/icons';

/** Renders one notification row — icon, title, description, timestamp, and an unread dot. */
defineOptions({ name: 'NotificationCenterGroupItem', inheritAttrs: false });

const props = defineProps<NotificationCenterGroupItemProps>();

defineSlots<{
  /** The leading icon. Falls back to the `icon` prop. */
  icon?(): unknown;
  /** The title line. Falls back to the `title` prop. */
  title?(): unknown;
  /** The right-aligned timestamp. Falls back to the `timestamp` prop. */
  timestamp?(): unknown;
  /** The body text under the title. Falls back to the `description` prop. */
  description?(): unknown;
  /** The running-progress indicator under the description. Omitting it drops the band. */
  progress?(): unknown;
  /** The action row under the description. Falls back to the `actions` prop. */
  actions?(): unknown;
}>();

const locale = useLocale();
const attrs = useAttrs();
const slots = useSlots();
const el = useTemplateRef<HTMLDivElement>('el');

/** Whether the row is interactive — it has a select handler. */
const isInteractive = computed(() => Boolean(props.onSelect));
const severityIcon = computed(() => (props.severity ? SeverityIcons[props.severity] : null));

const classes = computed(() =>
  cn(
    'group/notif relative flex gap-3 rounded-md px-3 py-2.5 text-sm',
    isInteractive.value &&
      'cursor-pointer hover:bg-muted active:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    props.isUnread && 'bg-primary-soft/30',
    attrs.class as string | undefined,
  ),
);

const titleClasses = computed(() => cn('truncate text-foreground', props.isUnread ? 'font-semibold' : 'font-medium'));

const bodyClasses = computed(() => cn('min-w-0 flex-1', !hasIcon() && 'pl-3'));

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

defineExpose({ el });

function hasIcon(): boolean {
  return Boolean(props.icon) || Boolean(slots.icon) || Boolean(severityIcon.value);
}

function hasTimestamp(): boolean {
  return Boolean(props.timestamp) || Boolean(slots.timestamp);
}

function hasDescription(): boolean {
  return Boolean(props.description) || Boolean(slots.description);
}

function hasProgress(): boolean {
  return Boolean(slots.progress);
}

function hasActions(): boolean {
  return Boolean(props.actions) || Boolean(slots.actions);
}

/** Selects an interactive row on Enter or Space pressed on the row itself. */
function onKeyDown(event: KeyboardEvent): void {
  if (!props.onSelect) return;
  if (event.target !== event.currentTarget) return;
  if (event.key === Key.Enter || event.key === Key.Space) {
    event.preventDefault();
    props.onSelect();
  }
}

/** Dismisses the row without also selecting it. */
function onDismissClick(event: MouseEvent): void {
  event.stopPropagation();
  props.onDismiss?.();
}
</script>

<template>
  <div
    ref="el"
    :role="isInteractive ? 'button' : undefined"
    :tabindex="isInteractive ? 0 : undefined"
    :data-unread="dataAttr(props.isUnread)"
    v-bind="rest"
    :class="classes"
    @click="props.onSelect?.()"
    @keydown="onKeyDown"
  >
    <span
      v-if="props.isUnread"
      aria-hidden="true"
      class="absolute left-1 top-3 inline-block h-2 w-2 rounded-full bg-primary forced-colors:bg-[Highlight]"
    />
    <span v-if="props.isUnread" class="sr-only">{{ locale.t('NotificationItem.unread', undefined, 'Unread') }}</span>
    <div v-if="hasIcon()" class="shrink-0 self-start pl-3">
      <slot name="icon">
        <template v-if="props.icon">{{ props.icon }}</template>
        <Icon v-else-if="severityIcon" :icon="severityIcon" :size="16" :class="SeverityIconClasses[props.severity!]" />
      </slot>
    </div>
    <div :class="bodyClasses">
      <div class="flex items-baseline gap-2">
        <span :class="titleClasses">
          <slot name="title">{{ props.title }}</slot>
        </span>
        <span v-if="hasTimestamp()" class="ml-auto whitespace-nowrap text-xs text-muted-foreground">
          <slot name="timestamp">{{ props.timestamp }}</slot>
        </span>
      </div>
      <div v-if="hasDescription()" class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </div>
      <div v-if="hasProgress()" class="mt-1.5">
        <slot name="progress" />
      </div>
      <div v-if="hasActions()" class="mt-1.5 flex items-center gap-2">
        <slot name="actions">{{ props.actions }}</slot>
      </div>
    </div>
    <button
      v-if="props.onDelete"
      type="button"
      :aria-label="locale.t('NotificationItem.deleteNotification', undefined, 'Delete notification')"
      :class="DeleteButtonClasses"
      @click.stop="props.onDelete()"
    >
      <Icon :icon="Trash2" :size="14" />
    </button>
    <button
      v-if="props.onDismiss"
      type="button"
      :aria-label="locale.t('NotificationItem.dismissNotification', undefined, 'Dismiss notification')"
      :class="
        cn(
          DismissRestingClasses,
          'group-hover/notif:opacity-100 group-focus-within/notif:opacity-100 [@media(hover:none)]:opacity-100',
          DismissInteractionClasses,
        )
      "
      @click="onDismissClick"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
