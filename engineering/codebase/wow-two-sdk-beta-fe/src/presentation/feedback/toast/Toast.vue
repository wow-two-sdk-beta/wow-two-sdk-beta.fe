<script lang="ts">
import { ChevronDown, Pin, Trash2, X } from 'lucide-vue-next';

import type { NoticeProgress } from '../../../feedback';
import { cn, Severity } from '../../../foundation/styles';
import { ToastSurface } from './ToastSurface';

/** Defines props for the toast card. */
export interface ToastProps {
  /** The semantic severity palette. */
  readonly severity?: Severity;

  /** The optional leading icon. Rich content → the `icon` slot. */
  readonly icon?: string;

  /** The bold heading line. Rich content → the `title` slot. */
  readonly title?: string;

  /** The body text below the title. Rich content → the `description` slot. */
  readonly description?: string;

  /** The action area below the body. Rich content → the `actions` slot. */
  readonly actions?: string;

  /** The accessible label for the close button. Default `"Dismiss"`. */
  readonly closeLabel?: string;

  /** The accessible label for removing a retained notice. Default "Delete notification". */
  readonly deleteLabel?: string;

  /** The pin toggle's pressed state; the toggle renders only when this is supplied. */
  readonly isPinned?: boolean;

  /** The accessible label for the pin toggle. Default "Pin notification". */
  readonly pinLabel?: string;

  /** The tooltip shown on a pinned toggle. Default "Unpin notification". */
  readonly unpinLabel?: string;

  /** The details disclosure's open state; supplying it makes the disclosure controlled. */
  readonly detailsOpen?: boolean;

  /** The compact layout, which places actions alongside the copy and wraps them as space requires. */
  readonly isCompact?: boolean;

  /** @internal The grouped layout, which fits the details viewport to at most three complete rows. */
  readonly isGrouped?: boolean;

  /** The switch for the severity's own glyph, shown when no `icon` is given; `neutral` has none. Default `true`. */
  readonly showSeverityIcon?: boolean;

  /** The card material. Default `ToastSurface.Solid`. */
  readonly surface?: ToastSurface;

  /** The running operation's progress, shown under the copy when supplied. */
  readonly progress?: NoticeProgress;

  /** Fires when the close button is activated; the button renders only when this is supplied. */
  readonly onClose?: () => void;

  /** Fires when the delete button is activated; the button renders only when this is supplied. */
  readonly onDelete?: () => void;
}

/** @internal The glyph on the close button. */
const CloseIcon = X;

/** @internal The glass material's utilities, keyed on `data-toast-surface`. */
const GlassClasses = [
  'data-[toast-surface=glass]:surface-glass-menu',
  'data-[toast-surface=glass]:[box-shadow:var(--glass-menu-shadow,0_10px_15px_-3px_rgb(0_0_0/0.1),0_4px_6px_-4px_rgb(0_0_0/0.1)),inset_0_1px_0_var(--glass-highlight,transparent)]',
];

/** @internal The glass hairline, taken only by the neutral card — a severity's own border keeps its accent. */
const GlassEdgeClass = 'data-[toast-surface=glass]:border-glass-edge';

/**
 * @internal The classes shared by the card's icon-only controls: 24px under either pointer, with an invisible 44px
 * square centred on the button taking a finger's tap, so the card keeps its height and the icons their place.
 */
const IconControlClass =
  'grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors ' +
  'hover:bg-muted hover:text-foreground focus-visible:outline-hidden focus-visible:ring-1 ' +
  'focus-visible:ring-ring pointer-coarse:relative pointer-coarse:after:absolute ' +
  'pointer-coarse:after:top-1/2 pointer-coarse:after:left-1/2 pointer-coarse:after:size-11 ' +
  'pointer-coarse:after:-translate-1/2';
</script>

<script setup lang="ts">
import { computed, onBeforeUpdate, onUpdated, ref, useAttrs, useId, useSlots, useTemplateRef, watch } from 'vue';

import { useLocale, useLocaleDefaults } from '../../../foundation/i18n';
import { Icon, SeverityIconClasses, SeverityIcons } from '../../../foundation/icons';
import { Button } from '../../actions/button';
import ToastSimple from '../toastSimple/ToastSimple.vue';
import ToastContent from './ToastContent.vue';
import ToastRunningProgress from './ToastRunningProgress.vue';

/** Renders a transient toast card — icon, title, description, actions and close. */
defineOptions({ name: 'Toast', inheritAttrs: false });

const componentProps = withDefaults(defineProps<ToastProps>(), {
  showSeverityIcon: true,
  isPinned: undefined,
  detailsOpen: undefined,
});
const props = useLocaleDefaults(componentProps, 'Toast', {
  closeLabel: 'Dismiss',
  deleteLabel: 'Delete notification',
  pinLabel: 'Pin notification',
  unpinLabel: 'Unpin notification',
});

const emit = defineEmits<{
  /** Requests a change to the pin toggle's pressed state. */
  togglePin: [];
  /** Requests expanding or collapsing the details panel. */
  'update:detailsOpen': [value: boolean];
}>();

defineSlots<{
  /** The extra content below the description. */
  default?(): unknown;
  /** The leading icon. Falls back to the `icon` prop. */
  icon?(): unknown;
  /** The heading line. Falls back to the `title` prop. */
  title?(): unknown;
  /** The body text below the title. Falls back to the `description` prop. */
  description?(): unknown;
  /** The action row. Falls back to the `actions` prop. */
  actions?(): unknown;
  /** Extra content shown on demand below the summary and its controls. */
  details?(): unknown;
  /** The adornment beside the close button — a countdown, a timestamp. */
  trailing?(): unknown;
  /** The decorative indicator wrapping the close glyph. */
  closeIndicator?(): unknown;
}>();

const attrs = useAttrs();
const slots = useSlots();
const locale = useLocale();
const inner = useTemplateRef<InstanceType<typeof ToastSimple>>('inner');
const header = useTemplateRef<HTMLDivElement>('header');
const details = useTemplateRef<HTMLDivElement>('details');
const detailsId = useId();
const titleId = useId();

const localExpanded = ref(false);
let readingAnchor: { row: HTMLElement; offset: number } | undefined;

/** Whether the details disclosure is open — the controlled `detailsOpen`, else the card's own state. */
const isDetailsOpen = computed(() => props.detailsOpen ?? localExpanded.value);

/** The glyph standing in for a missing `icon`, or `null` when switched off or for a neutral toast. */
const severityIcon = computed(() =>
  props.showSeverityIcon && !props.icon ? SeverityIcons[props.severity ?? Severity.Neutral] : null,
);
const severityIconClass = computed(() => SeverityIconClasses[props.severity ?? Severity.Neutral]);

const isGlass = computed(() => props.surface === ToastSurface.Glass);

const classes = computed(() =>
  cn(
    'min-w-0 [overflow-wrap:anywhere]',
    isGlass.value && GlassClasses,
    isGlass.value && (props.severity ?? Severity.Neutral) === Severity.Neutral && GlassEdgeClass,
    props.isCompact && 'py-2',
    props.isGrouped && 'flex max-h-(--toast-available-height) flex-col overflow-hidden p-0',
    attrs.class as string | undefined,
  ),
);

/** Everything but `class`, which is re-applied through `cn` above. */
const rest = computed(() => {
  const { class: _class, ...others } = attrs;
  return others;
});

/** The underlying `ToastSimple` root element. */
const el = computed(() => inner.value?.el ?? null);

defineExpose({ el });

watch(
  [details, isDetailsOpen, () => props.isGrouped],
  ([viewport, open, grouped], _previous, onCleanup) => {
    if (!viewport || !open || !grouped) {
      if (viewport?.style.maxHeight) viewport.style.removeProperty('max-height');
      return;
    }
    fitGroupDetails();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fitGroupDetails);
    if (header.value) observer?.observe(header.value);
    if (viewport.firstElementChild) observer?.observe(viewport.firstElementChild);
    window.addEventListener('resize', fitGroupDetails);
    onCleanup(() => {
      observer?.disconnect();
      window.removeEventListener('resize', fitGroupDetails);
    });
  },
  { flush: 'post' },
);

onBeforeUpdate(() => {
  const viewport = details.value;
  if (!props.isGrouped || !isDetailsOpen.value || !viewport) return;
  if (viewport.scrollTop === 0 && !viewport.contains(document.activeElement)) return;
  const row = Array.from(groupRows(viewport)).find((item) => item.offsetTop + item.offsetHeight > viewport.scrollTop);
  if (row) readingAnchor = { row, offset: row.offsetTop - viewport.scrollTop };
});

onUpdated(() => {
  fitGroupDetails();
  const viewport = details.value;
  if (viewport && readingAnchor && viewport.contains(readingAnchor.row)) {
    viewport.scrollTop = readingAnchor.row.offsetTop - readingAnchor.offset;
  }
  readingAnchor = undefined;
});

/** Opens or closes the details panel, announcing the change through `update:detailsOpen`. */
function toggleDetails(): void {
  const next = !isDetailsOpen.value;
  localExpanded.value = next;
  emit('update:detailsOpen', next);
}

// Slot presence is read through calls, never cached — `slots` is not reactive.
function hasIcon(): boolean {
  return Boolean(props.icon) || Boolean(slots.icon) || severityIcon.value !== null;
}

function hasTitle(): boolean {
  return Boolean(props.title) || Boolean(slots.title);
}

function hasDescription(): boolean {
  return Boolean(props.description) || Boolean(slots.description);
}

function hasActions(): boolean {
  return Boolean(props.actions) || Boolean(slots.actions);
}

/** Lists the member rows of an expanded group's details viewport. */
function groupRows(viewport: HTMLElement): NodeListOf<HTMLElement> {
  return viewport.querySelectorAll<HTMLElement>(':scope > ul > [data-toast-group-row]');
}

/** Sums an element's vertical padding and border widths, in px. */
function blockEdges(style: CSSStyleDeclaration): number {
  return [style.paddingTop, style.paddingBottom, style.borderTopWidth, style.borderBottomWidth].reduce(
    (sum, value) => sum + (Number.parseFloat(value) || 0),
    0,
  );
}

/** Caps the grouped details viewport at its first three complete rows, within the card's available height. */
function fitGroupDetails(): void {
  if (!props.isGrouped || !isDetailsOpen.value || !details.value || !header.value || !el.value) return;
  const viewport = details.value;
  const rows = groupRows(viewport);
  const first = rows[0];
  if (!first) return;

  const surfaceStyle = getComputedStyle(el.value);
  const viewportStyle = getComputedStyle(viewport);
  const boxEdges = blockEdges(viewportStyle);
  const limit = Number.parseFloat(surfaceStyle.maxHeight);
  const chrome =
    header.value.offsetHeight + blockEdges(surfaceStyle) + (Number.parseFloat(viewportStyle.marginTop) || 0);
  const room = Number.isFinite(limit) ? Math.max(0, limit - chrome - boxEdges) : window.innerHeight * 0.55;
  let height = 0;
  for (const row of Array.from(rows).slice(0, 3)) {
    if (height + row.offsetHeight > room) break;
    height += row.offsetHeight;
  }
  // A single long row can scroll when even that row exceeds the viewport.
  const cap = `${boxEdges + (height || Math.min(first.offsetHeight, room))}px`;
  if (viewport.style.maxHeight !== cap) viewport.style.maxHeight = cap;
}
</script>

<template>
  <ToastSimple
    ref="inner"
    :severity="props.severity"
    data-toast-card
    :data-toast-surface="isGlass ? ToastSurface.Glass : undefined"
    v-bind="rest"
    :class="classes"
  >
    <div
      ref="header"
      class="flex shrink-0 items-start gap-3"
      :class="props.isGrouped && ['px-3', props.isCompact ? 'py-2' : 'py-3']"
    >
      <span v-if="hasIcon()" data-toast-icon class="mt-0.5 shrink-0">
        <slot name="icon">
          <Icon v-if="severityIcon" :icon="severityIcon" :size="16" :class="severityIconClass" />
          <template v-else>{{ props.icon }}</template>
        </slot>
      </span>
      <ToastContent class="min-w-0 flex-1" :is-compact="props.isCompact" :title-id="titleId">
        <template v-if="hasTitle()" #title>
          <slot name="title">{{ props.title }}</slot>
        </template>
        <template v-if="hasDescription()" #description>
          <slot name="description">{{ props.description }}</slot>
        </template>
        <template v-if="props.progress" #progress>
          <ToastRunningProgress
            :progress="props.progress"
            :severity="props.severity"
            :is-compact="props.isCompact"
            :aria-labelledby="hasTitle() ? titleId : undefined"
          />
        </template>
        <template v-if="hasActions() || slots.details" #actions>
          <slot name="actions">{{ props.actions }}</slot>
          <Button
            v-if="slots.details"
            size="xs"
            variant="ghost"
            class="pointer-coarse:min-h-11"
            :aria-expanded="isDetailsOpen"
            :aria-controls="detailsId"
            @click="toggleDetails"
          >
            <template #trailing
              ><Icon :icon="ChevronDown" :size="12" :class="{ 'rotate-180': isDetailsOpen }"
            /></template>
            {{
              isDetailsOpen
                ? locale.t('Toast.hideDetails', undefined, 'Hide details')
                : locale.t('Toast.showDetails', undefined, 'Show details')
            }}
          </Button>
        </template>
        <template v-if="slots.default" #default><slot /></template>
      </ToastContent>
      <button
        v-if="props.isPinned !== undefined"
        type="button"
        :aria-label="props.pinLabel"
        :aria-pressed="props.isPinned"
        :title="props.isPinned ? props.unpinLabel : props.pinLabel"
        :class="cn(IconControlClass, props.isPinned && 'bg-primary-soft text-primary-soft-foreground')"
        @mousedown.prevent
        @click="emit('togglePin')"
      >
        <Icon :icon="Pin" :size="14" :class="props.isPinned ? 'fill-current' : undefined" />
      </button>
      <button
        v-if="props.onDelete"
        type="button"
        :aria-label="props.deleteLabel"
        :class="IconControlClass"
        @click="props.onDelete()"
      >
        <Icon :icon="Trash2" :size="14" />
      </button>
      <span v-if="slots.trailing" class="flex h-5 shrink-0 items-center">
        <slot name="trailing" />
      </span>
      <button
        v-if="props.onClose"
        type="button"
        :aria-label="props.closeLabel"
        :class="cn(IconControlClass, 'relative -mr-1')"
        @click="props.onClose()"
      >
        <span v-if="slots.closeIndicator" aria-hidden="true" class="pointer-events-none absolute inset-0">
          <slot name="closeIndicator" />
        </span>
        <Icon :icon="CloseIcon" :size="14" />
      </button>
    </div>
    <div
      v-if="slots.details"
      v-show="isDetailsOpen"
      :id="detailsId"
      ref="details"
      data-toast-details
      class="relative max-h-[min(18rem,55dvh)] overflow-y-auto overscroll-contain border-t border-border"
      :class="props.isGrouped ? 'scroll-py-1 [overflow-anchor:none]' : 'mt-2 pt-2'"
    >
      <slot v-if="isDetailsOpen" name="details" />
    </div>
  </ToastSimple>
</template>
