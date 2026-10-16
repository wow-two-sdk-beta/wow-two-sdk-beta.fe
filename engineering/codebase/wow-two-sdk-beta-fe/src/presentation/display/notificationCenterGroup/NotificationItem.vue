<script lang="ts">
import type { Severity } from '../../../foundation/styles';
export interface NotificationItemProps {
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

  /** The unread flag (bold + leading dot). */
  readonly isUnread?: boolean;

  /** The trailing actions. Rich content → the `actions` slot. */
  readonly actions?: string;
}
</script>

<script setup lang="ts">
import { useLocale } from '../../../foundation/i18n';
import { computed, getCurrentInstance, useAttrs, useSlots, useTemplateRef } from 'vue';
import { Trash2, X } from 'lucide-vue-next';
import { Icon, SeverityIcons, SeverityIconClasses } from '../../../foundation/icons';
import { cn } from '../../../foundation/styles';
import { Key } from '../../../foundation/dom';

const locale = useLocale();

/** Renders one notification row — icon, title, description, timestamp, and an unread dot. */
defineOptions({ name: 'NotificationItem', inheritAttrs: false });

const props = defineProps<NotificationItemProps>();

const emit = defineEmits<{
  /**
   * Fires when the reader activates the row by click, Enter, or Space; binding it
   * makes the row interactive (`role="button"`, `tabindex="0"`).
   *
   * Declared as an emit even though `select` is also a DOM event name — the
   * React prop was a custom callback, not the native `select`, and an emit is
   * the only way to keep the name. A `@select` binding reaches this emit, not
   * the (never-fired-on-a-div) native event.
   */
  select: [];
  /** Fires when the reader presses the dismiss button, which renders on hover only when bound. */
  dismiss: [];
  /** Removes a retained notice; only rendered when this event is bound. */
  delete: [];
}>();

defineSlots<{
  /** The leading icon. Falls back to the `icon` prop. */
  icon?(): unknown;
  /** The title line. Falls back to the `title` prop. */
  title?(): unknown;
  /** The right-aligned timestamp. Falls back to the `timestamp` prop. */
  timestamp?(): unknown;
  /** The body text under the title. Falls back to the `description` prop. */
  description?(): unknown;
  /** The action row under the description. Falls back to the `actions` prop. */
  actions?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const instance = getCurrentInstance();
const el = useTemplateRef<HTMLDivElement>('el');

/**
 * Mirror React's `!!onSelect` / `onDismiss &&` guards. Read through a call, not
 * a cached computed: `instance.vnode` is replaced on every re-render.
 */
const interactive = () => Boolean(instance?.vnode.props?.onSelect);
const hasDismiss = () => Boolean(instance?.vnode.props?.onDismiss);
const hasDelete = () => Boolean(instance?.vnode.props?.onDelete);
const severityIcon = computed(() => (props.severity ? SeverityIcons[props.severity] : null));

const hasIcon = () => Boolean(props.icon) || Boolean(slots.icon) || Boolean(severityIcon.value);
const hasTimestamp = () => Boolean(props.timestamp) || Boolean(slots.timestamp);
const hasDescription = () => Boolean(props.description) || Boolean(slots.description);
const hasActions = () => Boolean(props.actions) || Boolean(slots.actions);

const classes = computed(() =>
  cn(
    'group/notif relative flex gap-3 rounded-md px-3 py-2.5 text-sm',
    interactive() &&
      'cursor-pointer hover:bg-muted focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
    props.isUnread && 'bg-primary-soft/30',
    attrs.class as string | undefined,
  ),
);

const titleClasses = computed(() => cn('truncate text-foreground', props.isUnread ? 'font-semibold' : 'font-medium'));

const bodyClasses = computed(() => cn('min-w-0 flex-1', !hasIcon() && 'pl-3'));

/** The dismiss button's resting classes — corner placement, box, and the hidden-until-hover opacity. */
const DismissRestingClasses =
  'absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0';

/** The dismiss button's hover / focus classes — the raised surface and the focus ring. */
const DismissInteractionClasses =
  'hover:bg-background hover:text-foreground focus-visible:opacity-100 ' +
  'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring';

const onKeyDown = (event: KeyboardEvent) => {
  if (!interactive()) return;
  if (event.target !== event.currentTarget) return;
  if (event.key === Key.Enter || event.key === Key.Space) {
    event.preventDefault();
    emit('select');
  }
};

const onDismissClick = (event: MouseEvent) => {
  event.stopPropagation();
  emit('dismiss');
};

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
    :role="interactive() ? 'button' : undefined"
    :tabindex="interactive() ? 0 : undefined"
    :data-unread="props.isUnread ? '' : undefined"
    v-bind="rest"
    :class="classes"
    @click="emit('select')"
    @keydown="onKeyDown"
  >
    <span
      v-if="props.isUnread"
      aria-hidden="true"
      class="absolute left-1 top-3 inline-block h-2 w-2 rounded-full bg-primary"
    />
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
      <div v-if="hasActions()" class="mt-1.5 flex items-center gap-2">
        <slot name="actions">{{ props.actions }}</slot>
      </div>
    </div>
    <button
      v-if="hasDelete()"
      type="button"
      :aria-label="locale.t('NotificationItem.deleteNotification', undefined, 'Delete notification')"
      class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
      @click.stop="emit('delete')"
    >
      <Icon :icon="Trash2" :size="14" />
    </button>
    <button
      v-if="hasDismiss()"
      type="button"
      :aria-label="locale.t('NotificationItem.dismissNotification', undefined, 'Dismiss notification')"
      :class="
        cn(
          DismissRestingClasses,
          'group-hover/notif:opacity-100 group-focus-within/notif:opacity-100',
          DismissInteractionClasses,
        )
      "
      @click="onDismissClick"
    >
      <X class="h-3.5 w-3.5" />
    </button>
  </div>
</template>
